import { ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { IotDeviceType, IotProvider, IotReadingQuality, Prisma } from '../../generated/prisma';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateIotDeviceDto, IotDeviceQueryDto, IotTelemetryQueryDto, UpdateIotDeviceDto } from './dto/iot-device.dto';
import { DeviceCredentialService } from './device-credential.service';
import { TuyaClientService } from './tuya/tuya-client.service';
import { getTuyaStatusDefinitions, isSupportedTuyaStatusCode, normalizeTuyaStatus, tuyaObservedAt } from './tuya/tuya-normalizer';
import { createHash } from 'crypto';
import { SettingsService } from '../settings/settings.service';
import { getUtilityAllowanceMonths, getUtilityBillingCycle, toUtilityCycleInstantRange } from '../../common/business/utility-billing-cycle.helper';

const deviceInclude = {
  room: { select: { id: true, code: true, name: true } },
  ingestMessages: {
    take: 1,
    orderBy: { observedAt: 'desc' as const },
    include: { telemetry: { orderBy: { metric: 'asc' as const } } },
  },
};

type TenantElectricityTimelineRow = {
  dateKey: string;
  observedAt: Date;
  valueDecimal: { toString(): string } | number | string;
  quality: IotReadingQuality;
};

export function resolveIotStaleAfterMinutes(raw = process.env.IOT_STALE_AFTER_MINUTES): number {
  const parsed = Number(raw ?? 30);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(1_440, parsed)) : 30;
}

export function resolveTenantElectricityUsage(
  meterUsage: number | null,
  telemetryUsage: number | null,
) {
  const meterResetDetected = meterUsage !== null && meterUsage < 0;
  const telemetryResetDetected = telemetryUsage !== null && telemetryUsage < 0;
  const usableMeter = meterResetDetected ? null : meterUsage;
  const usableTelemetry = telemetryResetDetected ? null : telemetryUsage;
  const source = usableMeter !== null
    ? 'METER_READING' as const
    : usableTelemetry !== null
      ? 'IOT_TELEMETRY' as const
      : 'NONE' as const;

  return {
    source,
    usageKwh: usableMeter ?? usableTelemetry,
    usableMeter,
    usableTelemetry,
    billingReady: usableMeter !== null,
    resetDetected: meterResetDetected || telemetryResetDetected,
  };
}

const IOT_TUYA_DEVICE_LOCK_BASE = 48_150_000;

@Injectable()
export class IotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly tuya: TuyaClientService,
    private readonly credentials: DeviceCredentialService,
    private readonly settings: SettingsService,
  ) {}

  async overview(query: IotDeviceQueryDto = {}) {
    const devices = await this.listDevices(query);
    const now = Date.now();
    const staleAfterMinutes = resolveIotStaleAfterMinutes();
    const staleAfterMs = staleAfterMinutes * 60_000;
    return {
      staleAfterMinutes,
      configuration: {
        tuya: this.tuya.getConfigurationStatus(),
        esp32CredentialVaultConfigured: this.credentials.isConfigured(),
        waterIngestPath: '/api/iot/v1/readings',
        billingIsolation: true,
      },
      summary: {
        total: devices.length,
        enabled: devices.filter((item) => item.enabled).length,
        online: devices.filter((item) => item.enabled && item.online === true).length,
        stale: devices.filter((item) => item.enabled && (!item.lastSeenAt || now - new Date(item.lastSeenAt).getTime() > staleAfterMs)).length,
        tuya: devices.filter((item) => item.provider === IotProvider.TUYA).length,
        water: devices.filter((item) => item.deviceType === IotDeviceType.WATER_FLOW_METER).length,
      },
      devices,
    };
  }

  // In-memory rate limit map for tenant refresh (prevents Tuya API abuse)
  private readonly tenantRefreshCooldown = new Map<number, number>();

  /**
   * Tenant-triggered Tuya sync for their own room.
   * Rate-limited: 1 request per 2 minutes per tenant.
   */
  async tenantRefreshMeter(actor: CurrentUserPayload) {
    if (!actor.tenantId) {
      throw new ForbiddenException('Akun tenant belum terhubung ke data tenant');
    }

    const stay = await this.prisma.stay.findFirst({
      where: { tenantId: actor.tenantId, status: 'ACTIVE' as any },
      orderBy: { id: 'desc' },
      select: { roomId: true },
    });
    if (!stay) throw new NotFoundException('Stay aktif tidak ditemukan');

    // Find Tuya devices for this room
    const devices = await this.prisma.iotDevice.findMany({
      where: {
        roomId: stay.roomId,
        enabled: true,
        provider: IotProvider.TUYA,
        deviceType: { in: [IotDeviceType.ELECTRICITY_METER, IotDeviceType.WATER_FLOW_METER] },
      },
    });

    if (devices.length === 0) {
      return { synced: 0, total: 0, failed: 0, message: 'Tidak ada perangkat Tuya untuk kamar ini' };
    }

    const lastRefresh = this.tenantRefreshCooldown.get(actor.tenantId);
    const now = Date.now();
    if (lastRefresh && (now - lastRefresh) < 120_000) {
      const remaining = Math.ceil((120_000 - (now - lastRefresh)) / 1000);
      throw new ConflictException(
        `Sinkronisasi meter baru bisa dilakukan dalam ${remaining} detik lagi. ` +
        'Maksimal 1× per 2 menit untuk menghindari pembatasan Tuya API.',
      );
    }
    this.tenantRefreshCooldown.set(actor.tenantId, now);

    // Sync each device
    let succeeded = 0;
    for (const device of devices) {
      try {
        await this.syncTuyaDevice(device.id, actor);
        succeeded++;
      } catch {
        // Skip failed devices
      }
    }

    const failed = devices.length - succeeded;
    if (succeeded === 0) {
      throw new ServiceUnavailableException('Meter belum berhasil disinkronkan. Coba lagi setelah proses sinkronisasi lain selesai.');
    }
    return { synced: succeeded, total: devices.length, failed };
  }

  /**
   * Read-only telemetry for the tenant's current room. IoT telemetry deliberately
   * remains separate from MeterReading, which is the verified billing snapshot.
   */
  async tenantCurrentRoomUtilities(actor: CurrentUserPayload) {
    if (!actor.tenantId) {
      throw new ForbiddenException('Akun tenant belum terhubung ke data tenant');
    }

    const stay = await this.prisma.stay.findFirst({
      where: { tenantId: actor.tenantId, status: 'ACTIVE' as any },
      orderBy: { id: 'desc' },
      select: {
        id: true,
        roomId: true,
        checkInDate: true,
        electricityTariffPerKwhRupiah: true,
        room: { select: { code: true, name: true, electricityTariffPerKwhRupiah: true } },
      },
    });
    if (!stay) throw new NotFoundException('Stay aktif tidak ditemukan');

    const devices = await this.prisma.iotDevice.findMany({
      where: {
        roomId: stay.roomId,
        enabled: true,
        deviceType: { in: [IotDeviceType.ELECTRICITY_METER, IotDeviceType.WATER_FLOW_METER] },
      },
      include: {
        ingestMessages: {
          take: 1,
          orderBy: { observedAt: 'desc' },
          include: { telemetry: { orderBy: { metric: 'asc' } } },
        },
      },
    });
    const byType = (type: IotDeviceType) => devices
      .filter((device) => device.deviceType === type)
      .sort((left, right) => (right.lastSeenAt?.getTime() ?? 0) - (left.lastSeenAt?.getTime() ?? 0))[0];
    const staleAfterMinutes = resolveIotStaleAfterMinutes();

    const cycle = await this.getTenantElectricityCycle(stay);
    return {
      room: stay.room,
      refreshedAt: new Date(),
      staleAfterMinutes,
      billingNotice: 'Data sensor hanya untuk monitoring dan bukan dasar tagihan.',
      cycle,
      electricity: this.toTenantUtilityDevice(byType(IotDeviceType.ELECTRICITY_METER), 'ELECTRICITY', staleAfterMinutes),
      water: this.toTenantUtilityDevice(byType(IotDeviceType.WATER_FLOW_METER), 'WATER', staleAfterMinutes),
    };
  }

  /**
   * History shown to a tenant is limited to their own active room and is
   * deliberately a monitoring timeline, never a billing source.
   */
  async tenantElectricityTimeline(actor: CurrentUserPayload) {
    if (!actor.tenantId) {
      throw new ForbiddenException('Akun tenant belum terhubung ke data tenant');
    }

    const stay = await this.prisma.stay.findFirst({
      where: { tenantId: actor.tenantId, status: 'ACTIVE' as any },
      orderBy: { id: 'desc' },
      select: { id: true, roomId: true, checkInDate: true },
    });
    if (!stay) throw new NotFoundException('Stay aktif tidak ditemukan');

    const asOf = new Date();
    const period = await this.resolvePaidLeaseUtilityCycle(stay, asOf);
    const telemetryPeriod = toUtilityCycleInstantRange(period);
    const device = await this.prisma.iotDevice.findFirst({
      where: { roomId: stay.roomId, enabled: true, deviceType: IotDeviceType.ELECTRICITY_METER },
      orderBy: [{ lastSeenAt: 'desc' }, { id: 'desc' }],
      select: { id: true },
    });
    if (!device) {
      return {
        start: period.start,
        end: period.end,
        source: 'NONE' as const,
        baselineAvailable: false,
        resetDetected: false,
        points: [],
      };
    }

    const metric = 'electricity.energy_total_kwh';
    const [baseline, rows] = await Promise.all([
      this.prisma.iotTelemetry.findFirst({
        where: {
          metric,
          valueDecimal: { not: null },
          quality: { not: IotReadingQuality.REJECTED },
          ingestMessage: { deviceId: device.id },
          observedAt: { lte: telemetryPeriod.start },
        },
        orderBy: { observedAt: 'desc' },
        select: { valueDecimal: true, observedAt: true, quality: true },
      }),
      // This view needs the final value per Jakarta day, never every raw
      // telemetry event. Aggregate in PostgreSQL so a busy meter cannot send
      // thousands of Prisma records into one Passenger worker.
      this.prisma.$queryRaw<TenantElectricityTimelineRow[]>(Prisma.sql`
        SELECT DISTINCT ON ((telemetry."observedAt" + INTERVAL '7 hours')::date)
          to_char(telemetry."observedAt" + INTERVAL '7 hours', 'YYYY-MM-DD') AS "dateKey",
          telemetry."observedAt",
          telemetry."valueDecimal",
          telemetry."quality"
        FROM "IotTelemetry" AS telemetry
        INNER JOIN "IotIngestMessage" AS message
          ON message."id" = telemetry."ingestMessageId"
        WHERE message."deviceId" = ${device.id}
          AND telemetry."metric" = ${metric}
          AND telemetry."valueDecimal" IS NOT NULL
          AND telemetry."quality" <> 'REJECTED'::"IotReadingQuality"
          AND telemetry."observedAt" > ${telemetryPeriod.start}
          AND telemetry."observedAt" <= ${asOf}
        ORDER BY
          (telemetry."observedAt" + INTERVAL '7 hours')::date ASC,
          telemetry."observedAt" DESC
      `),
    ]);

    if (!baseline?.valueDecimal) {
      return {
        start: period.start,
        end: period.end,
        source: 'IOT_TELEMETRY' as const,
        baselineAvailable: false,
        resetDetected: false,
        points: [],
      };
    }

    const baselineKwh = Number(baseline.valueDecimal);
    let resetDetected = false;
    const points = rows.map((row) => {
      const totalUsageKwh = Number(row.valueDecimal) - baselineKwh;
      if (totalUsageKwh < 0) resetDetected = true;
      return {
        date: row.dateKey,
        observedAt: row.observedAt,
        totalUsageKwh: totalUsageKwh < 0 ? null : totalUsageKwh,
        quality: row.quality,
      };
    }).filter((point) => point.totalUsageKwh !== null);

    return {
      start: period.start,
      end: period.end,
      source: 'IOT_TELEMETRY' as const,
      baselineAvailable: true,
      resetDetected,
      points,
    };
  }

  /**
   * One canonical electricity calculation for the active tenant. The raw Tuya
   * counter is cumulative, therefore it is never presented as period usage
   * without a baseline from the start of the tenant's billing cycle.
   */
  private async getTenantElectricityCycle(stay: {
    id: number;
    roomId: number;
    checkInDate: Date;
    electricityTariffPerKwhRupiah: number;
    room: { electricityTariffPerKwhRupiah: number } | null;
  }) {
    const asOf = new Date();
    const period = await this.resolvePaidLeaseUtilityCycle(stay, asOf);
    const telemetryPeriod = toUtilityCycleInstantRange(period);
    const electricityMetric = 'electricity.energy_total_kwh';
    const [settings, meterBaseline, meterLatest, device] = await Promise.all([
      this.settings.getOperational(),
      this.prisma.meterReading.findFirst({
        where: { roomId: stay.roomId, utilityType: 'ELECTRICITY' as any, readingAt: { lte: period.start } },
        orderBy: { readingAt: 'desc' },
        select: { readingValue: true, readingAt: true },
      }),
      this.prisma.meterReading.findFirst({
        where: {
          roomId: stay.roomId,
          utilityType: 'ELECTRICITY' as any,
          readingAt: { gte: period.start, lte: asOf },
        },
        orderBy: { readingAt: 'desc' },
        select: { readingValue: true, readingAt: true },
      }),
      this.prisma.iotDevice.findFirst({
        where: { roomId: stay.roomId, enabled: true, deviceType: IotDeviceType.ELECTRICITY_METER },
        orderBy: [{ lastSeenAt: 'desc' }, { id: 'desc' }],
        select: { id: true },
      }),
    ]);

    const [telemetryBaseline, telemetryLatest] = device
      ? await Promise.all([
          this.prisma.iotTelemetry.findFirst({
            where: {
              metric: electricityMetric,
              valueDecimal: { not: null },
              quality: IotReadingQuality.GOOD,
              ingestMessage: { deviceId: device.id },
              observedAt: { lte: telemetryPeriod.start },
            },
            orderBy: { observedAt: 'desc' },
            select: { valueDecimal: true, observedAt: true, quality: true },
          }),
          this.prisma.iotTelemetry.findFirst({
            where: {
              metric: electricityMetric,
              valueDecimal: { not: null },
              quality: IotReadingQuality.GOOD,
              ingestMessage: { deviceId: device.id },
              observedAt: { gte: telemetryPeriod.start, lte: asOf },
            },
            orderBy: { observedAt: 'desc' },
            select: { valueDecimal: true, observedAt: true, quality: true },
          }),
        ])
      : [null, null];

    const meterUsage = meterBaseline && meterLatest && meterLatest.readingAt.getTime() > meterBaseline.readingAt.getTime()
      ? Number(meterLatest.readingValue.minus(meterBaseline.readingValue))
      : null;
    const telemetryUsage = telemetryBaseline && telemetryLatest && telemetryLatest.observedAt.getTime() > telemetryBaseline.observedAt.getTime()
      ? Number(telemetryLatest.valueDecimal!.minus(telemetryBaseline.valueDecimal!))
      : null;
    // Verified manual readings remain authoritative for the tenant's period
    // and charge estimate. IoT is a monitoring fallback only; it never
    // displaces a valid billing-grade meter pair.
    const resolvedUsage = resolveTenantElectricityUsage(meterUsage, telemetryUsage);
    const { source, usageKwh, usableMeter, usableTelemetry } = resolvedUsage;
    const allowanceMonths = getUtilityAllowanceMonths(period);
    const freeKwh = Number(settings.freeElectricityKwhPerMonth ?? 0) * allowanceMonths;
    const chargeableKwh = usageKwh === null ? null : Math.max(0, usageKwh - freeKwh);
    const tariffRupiah = Number(
      stay.room?.electricityTariffPerKwhRupiah
      || stay.electricityTariffPerKwhRupiah
      || settings.electricityTariffPerKwhRupiah
      || 0,
    );

    return {
      start: period.start,
      end: period.end,
      allowanceMonths,
      source,
      electricity: {
        usageKwh,
        freeKwh,
        chargeableKwh,
        tariffRupiah,
        estimatedChargeRupiah: chargeableKwh === null ? null : Math.round(chargeableKwh * tariffRupiah),
        billingReady: resolvedUsage.billingReady,
        resetDetected: resolvedUsage.resetDetected,
      },
      meter: {
        baselineKwh: meterBaseline ? Number(meterBaseline.readingValue) : null,
        baselineAt: meterBaseline?.readingAt ?? null,
        latestKwh: meterLatest ? Number(meterLatest.readingValue) : null,
        latestAt: meterLatest?.readingAt ?? null,
        usageKwh: usableMeter,
      },
      telemetry: {
        baselineKwh: telemetryBaseline?.valueDecimal == null ? null : Number(telemetryBaseline.valueDecimal),
        baselineAt: telemetryBaseline?.observedAt ?? null,
        latestKwh: telemetryLatest?.valueDecimal == null ? null : Number(telemetryLatest.valueDecimal),
        latestAt: telemetryLatest?.observedAt ?? null,
        usageKwh: usableTelemetry,
        quality: telemetryLatest?.quality ?? null,
      },
    };
  }

  private async resolvePaidLeaseUtilityCycle(
    stay: { id: number; checkInDate: Date },
    asOf: Date,
  ) {
    // Only a PAID rent invoice is eligible. A paid DP (RDP) does not yet start
    // a new stay period, so it must not reset a tenant's electricity allowance.
    const paidLeaseInvoice = await this.prisma.invoice.findFirst({
      where: {
        stayId: stay.id,
        status: 'PAID' as any,
        periodStart: { lte: asOf },
        periodEnd: { gt: asOf },
        NOT: { invoiceNumber: { contains: '-RDP-' } },
        lines: { some: { lineType: 'RENT' as any } },
      },
      orderBy: [{ periodStart: 'desc' }, { id: 'desc' }],
      select: { periodStart: true, periodEnd: true },
    });
    return getUtilityBillingCycle(
      stay.checkInDate,
      asOf,
      paidLeaseInvoice
        ? { start: paidLeaseInvoice.periodStart, end: paidLeaseInvoice.periodEnd }
        : null,
    );
  }

  async listDevices(query: IotDeviceQueryDto = {}) {
    const items = await this.prisma.iotDevice.findMany({
      where: {
        provider: query.provider,
        deviceType: query.deviceType,
        roomId: query.roomId,
      },
      include: deviceInclude,
      orderBy: [{ enabled: 'desc' }, { deviceCode: 'asc' }],
    });
    return items.map((item) => this.toDeviceView(item));
  }

  private toTenantUtilityDevice(
    device: any | undefined,
    utilityType: 'ELECTRICITY' | 'WATER',
    staleAfterMinutes: number,
  ) {
    if (!device) {
      return {
        utilityType,
        status: 'NO_DEVICE',
        statusMessage: 'Meter belum terpasang atau belum dipetakan ke kamar ini.',
        lastSeenAt: null,
        observedAt: null,
        total: null,
        unit: utilityType === 'ELECTRICITY' ? 'kWh' : 'm3',
        flowRateLpm: null,
        quality: null,
        powerW: null,
        voltageV: null,
        currentA: null,
      };
    }

    const latestMessage = device.ingestMessages[0];
    const metric = (name: string) => latestMessage?.telemetry?.find((item: any) => item.metric === name);
    const totalMetric = metric(utilityType === 'ELECTRICITY' ? 'electricity.energy_total_kwh' : 'water.volume_total_m3');
    const flowMetric = utilityType === 'WATER' ? metric('water.flow_rate_lpm') : undefined;
    const powerMetric = utilityType === 'ELECTRICITY' ? metric('electricity.power_w') : undefined;
    const voltageMetric = utilityType === 'ELECTRICITY' ? metric('electricity.voltage_v') : undefined;
    const currentMetric = utilityType === 'ELECTRICITY' ? metric('electricity.current_a') : undefined;
    const total = totalMetric?.valueDecimal == null ? null : Number(totalMetric.valueDecimal);
    const flowRateLpm = flowMetric?.valueDecimal == null ? null : Number(flowMetric.valueDecimal);
    const powerW = powerMetric?.valueDecimal == null ? null : Number(powerMetric.valueDecimal);
    const voltageV = voltageMetric?.valueDecimal == null ? null : Number(voltageMetric.valueDecimal);
    const currentA = currentMetric?.valueDecimal == null ? null : Number(currentMetric.valueDecimal);
    const lastSeenAt = device.lastSeenAt ?? null;
    const observedAt = totalMetric?.observedAt ?? latestMessage?.observedAt ?? lastSeenAt;
    const stale = !lastSeenAt || Date.now() - lastSeenAt.getTime() > staleAfterMinutes * 60_000;
    let status = 'ONLINE';
    let statusMessage = 'Data meter terakhir berhasil diterima.';

    if (!lastSeenAt) {
      status = 'NOT_CONNECTED';
      statusMessage = 'Meter terdaftar, tetapi belum pernah mengirim data.';
    } else if (device.online === false) {
      status = 'OFFLINE';
      statusMessage = 'Meter sedang offline. Periksa daya dan koneksi perangkat.';
    } else if (stale) {
      status = 'STALE';
      statusMessage = `Data belum diterima lebih dari ${staleAfterMinutes} menit. Periksa daya, Wi-Fi, atau sensor.`;
    } else if (utilityType === 'WATER' && flowRateLpm !== null && flowRateLpm <= 0) {
      status = 'NO_FLOW';
      statusMessage = 'Meter aktif, tetapi belum mendeteksi aliran air.';
    }

    return {
      utilityType,
      status,
      statusMessage,
      lastSeenAt,
      observedAt,
      total,
      unit: totalMetric?.unit ?? (utilityType === 'ELECTRICITY' ? 'kWh' : 'm3'),
      flowRateLpm,
      quality: totalMetric?.quality ?? null,
      powerW,
      voltageV,
      currentA,
    };
  }

  async createDevice(dto: CreateIotDeviceDto, actor: CurrentUserPayload) {
    this.assertProviderShape(dto.provider, dto.deviceType, dto.externalDeviceId);
    try {
      const item = await this.prisma.iotDevice.create({
        data: {
          deviceCode: dto.deviceCode.trim(),
          displayName: dto.displayName?.trim() || null,
          provider: dto.provider,
          deviceType: dto.deviceType,
          roomId: dto.roomId,
          externalDeviceId: dto.externalDeviceId?.trim() || null,
          productId: dto.productId?.trim() || null,
          enabled: dto.enabled ?? true,
        },
        include: deviceInclude,
      });
      await this.audit.log({
        actorUserId: actor.id,
        action: 'IOT_DEVICE_CREATED',
        entityType: 'IotDevice',
        entityId: String(item.id),
        newData: { deviceCode: item.deviceCode, provider: item.provider, deviceType: item.deviceType, roomId: item.roomId },
      });
      return this.toDeviceView(item);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Device code atau Tuya device ID sudah terdaftar');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new NotFoundException('Kamar tidak ditemukan');
      }
      throw error;
    }
  }

  async updateDevice(id: number, dto: UpdateIotDeviceDto, actor: CurrentUserPayload) {
    const current = await this.requireDevice(id);
    this.assertProviderShape(current.provider, current.deviceType, dto.externalDeviceId ?? current.externalDeviceId ?? undefined);
    try {
      const item = await this.prisma.iotDevice.update({
        where: { id },
        data: {
          displayName: dto.displayName === undefined ? undefined : dto.displayName.trim() || null,
          roomId: dto.roomId,
          externalDeviceId: dto.externalDeviceId === undefined ? undefined : dto.externalDeviceId.trim() || null,
          productId: dto.productId === undefined ? undefined : dto.productId.trim() || null,
          enabled: dto.enabled,
          ...(dto.enabled === false ? { online: false } : {}),
        },
        include: deviceInclude,
      });
      await this.audit.log({
        actorUserId: actor.id,
        action: 'IOT_DEVICE_UPDATED',
        entityType: 'IotDevice',
        entityId: String(id),
        oldData: { displayName: current.displayName, roomId: current.roomId, externalDeviceId: current.externalDeviceId, enabled: current.enabled },
        newData: { displayName: item.displayName, roomId: item.roomId, externalDeviceId: item.externalDeviceId, enabled: item.enabled },
      });
      return this.toDeviceView(item);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Tuya device ID sudah terdaftar');
      }
      throw error;
    }
  }

  async rotateDeviceSecret(id: number, actor: CurrentUserPayload) {
    const device = await this.requireDevice(id);
    if (device.provider !== IotProvider.KOST48_ESP32) {
      throw new ConflictException('Secret perangkat hanya digunakan oleh KOST48 ESP32');
    }
    const deviceSecret = this.credentials.generateSecret();
    const updated = await this.prisma.iotDevice.update({
      where: { id },
      data: {
        credentialCiphertext: this.credentials.encrypt(deviceSecret),
        credentialVersion: { increment: 1 },
      },
      select: { credentialVersion: true },
    });
    await this.audit.log({
      actorUserId: actor.id,
      action: 'IOT_DEVICE_SECRET_ROTATED',
      entityType: 'IotDevice',
      entityId: String(id),
      meta: { credentialVersion: updated.credentialVersion },
    });
    return {
      deviceCode: device.deviceCode,
      deviceSecret,
      credentialVersion: updated.credentialVersion,
      warning: 'Simpan secret ini sekarang. Nilai tidak dapat dilihat kembali setelah halaman ditutup.',
    };
  }

  async telemetry(id: number, query: IotTelemetryQueryDto) {
    await this.requireDevice(id);
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    const baseWhere: Prisma.IotTelemetryWhereInput = {
      ingestMessage: { deviceId: id },
      metric: query.metric,
    };
    const observedAt = from || to
      ? { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) }
      : undefined;
    const items = await this.prisma.iotTelemetry.findMany({
      where: {
        ...baseWhere,
        ...(observedAt ? { observedAt } : {}),
      },
      orderBy: { observedAt: 'desc' },
      take: Math.min(query.limit || 100, 500),
      include: { ingestMessage: { select: { id: true, messageId: true, receivedAt: true } } },
    });

    // Nilai energi/volume bersifat kumulatif. Mengirim satu titik sebelum awal
    // periode membuat UI bisa menghitung selisih tepat dari tanggal cycle,
    // bukan dari pembacaan pertama yang kebetulan ada di dalam periode.
    const baseline = from
      ? await this.prisma.iotTelemetry.findFirst({
          where: { ...baseWhere, observedAt: { lt: from } },
          orderBy: { observedAt: 'desc' },
          include: { ingestMessage: { select: { id: true, messageId: true, receivedAt: true } } },
        })
      : null;
    const rows = baseline ? [baseline, ...items] : items;

    return rows.map((item) => ({
      id: item.id.toString(),
      metric: item.metric,
      value: item.valueDecimal == null ? item.valueText : Number(item.valueDecimal),
      unit: item.unit,
      observedAt: item.observedAt,
      quality: item.quality,
      reason: item.reason,
      ingestMessageId: item.ingestMessage.id.toString(),
      messageId: item.ingestMessage.messageId,
      receivedAt: item.ingestMessage.receivedAt,
    }));
  }

  async probeTuya(externalDeviceId?: string) {
    const id = externalDeviceId?.trim() || (await this.prisma.iotDevice.findFirst({
      where: { provider: IotProvider.TUYA, enabled: true, externalDeviceId: { not: null } },
      select: { externalDeviceId: true },
      orderBy: { id: 'asc' },
    }))?.externalDeviceId;
    if (!id) throw new ServiceUnavailableException('Belum ada Tuya device ID untuk diuji');
    const snapshot = await this.tuya.getDeviceSnapshot(id);
    const detail = this.safeTuyaDetail(snapshot.detail);
    const metrics = normalizeTuyaStatus(snapshot.status, snapshot.specification);
    return {
      connected: true,
      device: detail,
      metricCount: metrics.length,
      metrics,
      observedAt: tuyaObservedAt(snapshot.status),
    };
  }

  async syncTuyaDevice(id: number, actor: CurrentUserPayload) {
    const device = await this.requireDevice(id);
    if (device.provider !== IotProvider.TUYA || !device.externalDeviceId) {
      throw new ConflictException('Perangkat bukan Tuya atau Tuya device ID belum diisi');
    }
    if (!device.enabled) throw new ConflictException('Perangkat sedang dinonaktifkan');
    const result = await this.pollAndStoreTuyaCoordinated(device);
    await this.audit.log({
      actorUserId: actor.id,
      action: 'IOT_TUYA_SYNCED',
      entityType: 'IotDevice',
      entityId: String(id),
      meta: { duplicate: result.duplicate, telemetryCount: result.telemetryCount },
    });
    return result;
  }

  async syncAllTuya(actor?: CurrentUserPayload) {
    const devices = await this.prisma.iotDevice.findMany({
      where: { provider: IotProvider.TUYA, enabled: true, externalDeviceId: { not: null } },
      orderBy: { id: 'asc' },
    });
    const results: Array<Record<string, unknown>> = [];
    // Dua lock memegang dua dari tiga koneksi pool; satu koneksi tetap bebas
    // untuk write telemetry agar batch tidak saling menunggu.
    for (let offset = 0; offset < devices.length; offset += 2) {
      const batch = devices.slice(offset, offset + 2);
      results.push(...await Promise.all(batch.map(async (device) => {
        try {
          return { deviceId: device.id, deviceCode: device.deviceCode, ok: true, ...(await this.pollAndStoreTuyaCoordinated(device)) };
        } catch (error) {
          return { deviceId: device.id, deviceCode: device.deviceCode, ok: false, message: error instanceof Error ? error.message : 'Sync gagal' };
        }
      })));
    }
    const succeeded = results.filter((item) => item.ok).length;
    await this.audit.log({
      actorUserId: actor?.id ?? null,
      action: 'IOT_TUYA_SYNC_ALL',
      entityType: 'IotDevice',
      meta: { total: devices.length, succeeded, failed: devices.length - succeeded },
    });
    return { total: devices.length, succeeded, failed: devices.length - succeeded, results };
  }

  /** Pull pagination-aware cumulative-energy report logs from Tuya. */
  async backfillTuyaReportHistory(deviceId: number, daysBack = 7, actor?: CurrentUserPayload) {
    const locked = await this.prisma.withPostgresAdvisoryLock(
      IOT_TUYA_DEVICE_LOCK_BASE + deviceId,
      () => this.runTuyaReportBackfill(deviceId, daysBack, actor),
    );
    if (!locked.acquired) {
      throw new ConflictException('Perangkat sedang disinkronkan. Coba backfill lagi setelah proses selesai.');
    }
    return locked.value;
  }

  private async runTuyaReportBackfill(deviceId: number, daysBack = 7, actor?: CurrentUserPayload) {
    const device = await this.requireDevice(deviceId);
    if (device.provider !== IotProvider.TUYA || !device.externalDeviceId) {
      throw new ConflictException('Backfill hanya untuk perangkat Tuya dengan externalDeviceId');
    }

    // Default Tuya log retention is short. Keep the default-plan backfill safe
    // and predictable; long-term history comes from local scheduled polling.
    const boundedDays = Math.max(1, Math.min(daysBack, 7));
    const endTime = Date.now();
    const startTime = endTime - boundedDays * 24 * 3600_000;
    const snapshot = await this.tuya.getDeviceSnapshot(device.externalDeviceId);
    const supportedCodes = getTuyaStatusDefinitions(snapshot.specification)
      .map((item) => typeof item.code === 'string' ? item.code : '')
      .filter((code) => ['add_ele', 'total_forward_energy'].includes(code));
    const dpCode = supportedCodes[0];
    if (!dpCode) {
      throw new ConflictException('Datapoint energi kumulatif Tuya tidak ditemukan. Jalankan probe dan periksa specification perangkat.');
    }

    let lastRowKey: string | undefined;
    let hasMore = true;
    let pageCount = 0;
    let totalLogs = 0;
    let stored = 0;
    const maxPages = 20;
    while (hasMore && pageCount < maxPages) {
      const page = await this.tuya.getDeviceReportLogs(
        device.externalDeviceId,
        [dpCode],
        startTime,
        endTime,
        100,
        lastRowKey,
      );
      pageCount++;
      totalLogs += page.logs?.length ?? 0;

      const normalizedLogs: Array<{
        messageId: string;
        observedAt: Date;
        eventTime: number;
        code: string;
        rawValue: unknown;
        metric: string;
        valueDecimal: number;
        unit: string;
        quality: IotReadingQuality;
        reason: string;
      }> = [];
      for (const log of page.logs ?? []) {
        const eventTime = Number(log.event_time);
        const observedAt = new Date(eventTime);
        if (!Number.isFinite(eventTime) || Number.isNaN(observedAt.getTime())) continue;
        const normalized = normalizeTuyaStatus(
          [{ code: log.code, value: log.value }],
          snapshot.specification,
        ).find((metric) => metric.metric === 'electricity.energy_total_kwh' && metric.valueDecimal !== undefined);
        if (!normalized || normalized.valueDecimal === undefined) continue;

        const messageId = `tuya:backfill:${device.externalDeviceId}:${observedAt.getTime()}:${log.code}:${String(log.value)}`;
        if (messageId.length > 160) continue;
        normalizedLogs.push({
          messageId,
          observedAt,
          eventTime,
          code: log.code,
          rawValue: log.value,
          metric: normalized.metric,
          valueDecimal: normalized.valueDecimal,
          unit: normalized.unit ?? 'kWh',
          quality: normalized.quality,
          reason: `Tuya report-log backfill (${boundedDays} hari): ${normalized.reason ?? 'nilai historis'}`,
        });
      }

      if (normalizedLogs.length > 0) {
        await this.prisma.iotIngestMessage.createMany({
          data: normalizedLogs.map((log) => ({
            deviceId: device.id,
            messageId: log.messageId,
            observedAt: log.observedAt,
            providerTimestamp: BigInt(Math.trunc(log.eventTime)),
            rawPayload: { tuyaReportLog: { code: log.code, value: log.rawValue, eventTime: log.eventTime } } as Prisma.InputJsonValue,
          })),
          skipDuplicates: true,
        });
        const messages = await this.prisma.iotIngestMessage.findMany({
          where: { deviceId: device.id, messageId: { in: normalizedLogs.map((log) => log.messageId) } },
          select: { id: true, messageId: true },
        });
        const messageIds = new Map(messages.map((message) => [message.messageId, message.id]));
        const telemetryRows = normalizedLogs.flatMap((log) => {
          const ingestMessageId = messageIds.get(log.messageId);
          return ingestMessageId == null ? [] : [{
            ingestMessageId,
            metric: log.metric,
            valueDecimal: log.valueDecimal,
            unit: log.unit,
            observedAt: log.observedAt,
            quality: log.quality,
            reason: log.reason,
          }];
        });
        if (telemetryRows.length > 0) {
          const inserted = await this.prisma.iotTelemetry.createMany({ data: telemetryRows, skipDuplicates: true });
          stored += inserted.count;
        }
      }

      if (page.has_more && !page.last_row_key) {
        hasMore = false;
      } else {
        hasMore = Boolean(page.has_more && page.last_row_key);
        if (page.last_row_key === lastRowKey) {
          hasMore = false;
        }
      }
      lastRowKey = page.last_row_key;
    }

    await this.audit.log({
      actorUserId: actor?.id ?? null,
      action: 'IOT_TUYA_BACKFILL',
      entityType: 'IotDevice',
      entityId: String(device.id),
      meta: { deviceId, daysBack: boundedDays, dpCode, totalLogs, stored, pageCount, truncated: hasMore },
    });
    return { deviceId, dpCode, daysBack: boundedDays, totalLogs, stored, pageCount, truncated: hasMore };
  }

  private async pollAndStoreTuyaCoordinated(device: Awaited<ReturnType<IotService['requireDevice']>>) {
    const locked = await this.prisma.withPostgresAdvisoryLock(
      IOT_TUYA_DEVICE_LOCK_BASE + device.id,
      () => this.pollAndStoreTuya(device),
    );
    if (!locked.acquired) {
      throw new ConflictException('Perangkat sedang disinkronkan oleh proses lain');
    }
    return locked.value;
  }

  private async pollAndStoreTuya(device: Awaited<ReturnType<IotService['requireDevice']>>) {
    const snapshot = await this.tuya.getDeviceSnapshot(device.externalDeviceId!);
    const relevantStatus = snapshot.status.filter((item) => isSupportedTuyaStatusCode(item.code));
    const observedAt = tuyaObservedAt(relevantStatus);
    const metrics = normalizeTuyaStatus(relevantStatus, snapshot.specification);
    if (!metrics.length) throw new ServiceUnavailableException('Tuya tidak mengembalikan status datapoint');
    const statusHash = createHash('sha256').update(JSON.stringify(relevantStatus)).digest('hex').slice(0, 20);
    const messageId = `tuya:${device.externalDeviceId}:${observedAt.getTime()}:${statusHash}`;
    const detail = this.safeTuyaDetail(snapshot.detail);
    const metadata: Prisma.InputJsonValue = {
      tuya: {
        ...detail,
        statusDefinitions: getTuyaStatusDefinitions(snapshot.specification)
          .filter((item) => isSupportedTuyaStatusCode(item.code))
          .map((item) => ({
          code: item.code,
          type: item.type,
          values: item.values,
        })),
      },
    } as Prisma.InputJsonValue;

    let duplicate = false;
    let ingestMessageId: string | undefined;
    try {
      const message = await this.prisma.iotIngestMessage.create({
        data: {
          deviceId: device.id,
          messageId,
          observedAt,
          providerTimestamp: BigInt(observedAt.getTime()),
          rawPayload: { status: relevantStatus } as Prisma.InputJsonValue,
          telemetry: {
            create: metrics.map((metric) => ({
              metric: metric.metric,
              valueDecimal: metric.valueDecimal,
              valueText: metric.valueText,
              unit: metric.unit,
              observedAt,
              quality: metric.quality,
              reason: metric.reason,
            })),
          },
        },
        select: { id: true },
      });
      ingestMessageId = message.id.toString();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        duplicate = true;
        const existing = await this.prisma.iotIngestMessage.findUnique({
          where: { deviceId_messageId: { deviceId: device.id, messageId } },
          select: { id: true },
        });
        ingestMessageId = existing?.id.toString();
      } else {
        throw error;
      }
    }

    await this.prisma.iotDevice.update({
      where: { id: device.id },
      data: {
        online: typeof snapshot.detail.online === 'boolean' ? snapshot.detail.online : true,
        lastSuccessfulSyncAt: new Date(),
        displayName: device.displayName || (typeof snapshot.detail.name === 'string' ? snapshot.detail.name : undefined),
        productId: device.productId || (typeof snapshot.detail.product_id === 'string' ? snapshot.detail.product_id : undefined),
        metadata,
      },
    });
    await this.prisma.iotDevice.updateMany({
      where: {
        id: device.id,
        OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: observedAt } }],
      },
      data: { lastSeenAt: observedAt },
    });
    return { duplicate, ingestMessageId, telemetryCount: metrics.length, observedAt };
  }

  private safeTuyaDetail(detail: Record<string, unknown>) {
    return {
      id: typeof detail.id === 'string' ? detail.id : undefined,
      name: typeof detail.name === 'string' ? detail.name : undefined,
      category: typeof detail.category === 'string' ? detail.category : undefined,
      productId: typeof detail.product_id === 'string' ? detail.product_id : undefined,
      model: typeof detail.model === 'string' ? detail.model : undefined,
      online: typeof detail.online === 'boolean' ? detail.online : undefined,
      activeTime: typeof detail.active_time === 'number' ? detail.active_time : undefined,
      updateTime: typeof detail.update_time === 'number' ? detail.update_time : undefined,
      timeZone: typeof detail.time_zone === 'string' ? detail.time_zone : undefined,
    };
  }

  private assertProviderShape(provider: IotProvider, type: IotDeviceType, externalDeviceId?: string) {
    if (provider === IotProvider.TUYA && !externalDeviceId?.trim()) {
      throw new ConflictException('Perangkat Tuya wajib memiliki externalDeviceId');
    }
    if (provider === IotProvider.TUYA && type !== IotDeviceType.ELECTRICITY_METER) {
      throw new ConflictException('Fase ini membatasi Tuya untuk meter listrik');
    }
    if (provider === IotProvider.KOST48_ESP32 && type !== IotDeviceType.WATER_FLOW_METER) {
      throw new ConflictException('KOST48 ESP32 fase ini digunakan untuk water flow meter');
    }
  }

  private async requireDevice(id: number) {
    const device = await this.prisma.iotDevice.findUnique({ where: { id } });
    if (!device) throw new NotFoundException('Perangkat IoT tidak ditemukan');
    return device;
  }

  private toDeviceView(item: any) {
    const latest = item.ingestMessages?.[0];
    return {
      id: item.id,
      deviceCode: item.deviceCode,
      displayName: item.displayName,
      provider: item.provider,
      deviceType: item.deviceType,
      roomId: item.roomId,
      room: item.room,
      externalDeviceId: item.externalDeviceId,
      productId: item.productId,
      enabled: item.enabled,
      online: item.online,
      lastSeenAt: item.lastSeenAt,
      lastSuccessfulSyncAt: item.lastSuccessfulSyncAt,
      firmwareVersion: item.firmwareVersion,
      credentialProvisioned: Boolean(item.credentialCiphertext),
      credentialVersion: item.credentialVersion,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      latestTelemetry: latest?.telemetry?.map((metric: any) => ({
        id: metric.id.toString(),
        metric: metric.metric,
        value: metric.valueDecimal == null ? metric.valueText : Number(metric.valueDecimal),
        unit: metric.unit,
        observedAt: metric.observedAt,
        quality: metric.quality,
        reason: metric.reason,
      })) ?? [],
    };
  }
}
