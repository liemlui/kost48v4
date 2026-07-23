import { ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { IotDeviceType, IotProvider, IotReadingQuality, Prisma } from '../../generated/prisma';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateIotDeviceDto, IotDeviceQueryDto, IotTelemetryQueryDto, UpdateIotDeviceDto } from './dto/iot-device.dto';
import { DeviceCredentialService } from './device-credential.service';
import { TuyaClientService } from './tuya/tuya-client.service';
import { getTuyaStatusDefinitions, normalizeTuyaStatus, tuyaObservedAt } from './tuya/tuya-normalizer';
import { IotSseService } from './iot-sse.service';
import { createHash } from 'crypto';
import { SettingsService } from '../settings/settings.service';
import { getUtilityAllowanceMonths, getUtilityBillingCycle } from '../../common/business/utility-billing-cycle.helper';
import { startOfJakartaBusinessDay } from '../../common/utils/date.util';

const deviceInclude = {
  room: { select: { id: true, code: true, name: true } },
  ingestMessages: {
    take: 1,
    orderBy: { observedAt: 'desc' as const },
    include: { telemetry: { orderBy: { metric: 'asc' as const } } },
  },
};

function jakartaDateKey(value: Date) {
  return startOfJakartaBusinessDay(value).toISOString().slice(0, 10);
}

@Injectable()
export class IotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly tuya: TuyaClientService,
    private readonly credentials: DeviceCredentialService,
    private readonly sse: IotSseService,
    private readonly settings: SettingsService,
  ) {}

  async overview(query: IotDeviceQueryDto = {}) {
    const devices = await this.listDevices(query);
    const now = Date.now();
    const staleAfterMs = Number(process.env.IOT_STALE_AFTER_MINUTES ?? 30) * 60_000;
    return {
      configuration: {
        tuya: this.tuya.getConfigurationStatus(),
        esp32CredentialVaultConfigured: this.credentials.isConfigured(),
        waterIngestPath: '/api/iot/v1/readings',
        billingIsolation: true,
      },
      summary: {
        total: devices.length,
        enabled: devices.filter((item) => item.enabled).length,
        online: devices.filter((item) => item.online === true).length,
        stale: devices.filter((item) => item.enabled && (!item.lastSeenAt || now - new Date(item.lastSeenAt).getTime() > staleAfterMs)).length,
        tuya: devices.filter((item) => item.provider === IotProvider.TUYA).length,
        water: devices.filter((item) => item.deviceType === IotDeviceType.WATER_FLOW_METER).length,
      },
      devices,
    };
  }

  /**
   * Lightweight query: get the tenant's active stay roomId.
   * Used by SSE controller to subscribe to room-specific events.
   */
  async getTenantActiveRoomId(tenantId: number): Promise<number | null> {
    const stay = await this.prisma.stay.findFirst({
      where: { tenantId, status: 'ACTIVE' as any },
      orderBy: { id: 'desc' },
      select: { roomId: true },
    });
    return stay?.roomId ?? null;
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

    // Rate limit check
    const lastRefresh = this.tenantRefreshCooldown.get(actor.tenantId);
    const now = Date.now();
    if (lastRefresh && (now - lastRefresh) < 120_000) {
      const remaining = Math.ceil((120_000 - (now - lastRefresh)) / 1000);
      throw new ConflictException(
        `Sinkronisasi meter baru bisa dilakukan dalam ${remaining} detik lagi. ` +
        `Maksimal 1× per 2 menit untuk menghindari pembatasan Tuya API.`
      );
    }
    this.tenantRefreshCooldown.set(actor.tenantId, now);

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
      return { synced: 0, message: 'Tidak ada perangkat Tuya untuk kamar ini' };
    }

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

    // Notify SSE subscribers
    if (succeeded > 0 && stay.roomId) {
      this.sse.emit(stay.roomId, {
        type: 'MANUAL_REFRESH',
        roomId: stay.roomId,
        timestamp: new Date().toISOString(),
        message: `${succeeded} perangkat berhasil disinkronkan (manual refresh)`,
      });
    }

    return { synced: succeeded, total: devices.length };
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
    const staleAfterMinutes = Number(process.env.IOT_STALE_AFTER_MINUTES ?? 30);

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
          observedAt: { lte: period.start },
        },
        orderBy: { observedAt: 'desc' },
        select: { valueDecimal: true, observedAt: true, quality: true },
      }),
      this.prisma.iotTelemetry.findMany({
        where: {
          metric,
          valueDecimal: { not: null },
          quality: { not: IotReadingQuality.REJECTED },
          ingestMessage: { deviceId: device.id },
          observedAt: { gt: period.start, lte: asOf },
        },
        orderBy: { observedAt: 'asc' },
        take: 10_000,
        select: { valueDecimal: true, observedAt: true, quality: true },
      }),
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

    // Keep the final sensor value of each Jakarta day. This gives a compact,
    // legible timeline without pretending that a cumulative raw meter value is
    // daily consumption.
    const finalReadingByDay = new Map<string, (typeof rows)[number]>();
    rows.forEach((row) => finalReadingByDay.set(jakartaDateKey(row.observedAt), row));
    const baselineKwh = Number(baseline.valueDecimal);
    let resetDetected = false;
    const points = [...finalReadingByDay.entries()].map(([date, row]) => {
      const totalUsageKwh = Number(row.valueDecimal) - baselineKwh;
      if (totalUsageKwh < 0) resetDetected = true;
      return {
        date,
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
              ingestMessage: { deviceId: device.id },
              observedAt: { lte: period.start },
            },
            orderBy: { observedAt: 'desc' },
            select: { valueDecimal: true, observedAt: true, quality: true },
          }),
          this.prisma.iotTelemetry.findFirst({
            where: {
              metric: electricityMetric,
              valueDecimal: { not: null },
              ingestMessage: { deviceId: device.id },
              observedAt: { gte: period.start, lte: asOf },
            },
            orderBy: { observedAt: 'desc' },
            select: { valueDecimal: true, observedAt: true, quality: true },
          }),
        ])
      : [null, null];

    const meterUsage = meterBaseline && meterLatest
      ? Number(meterLatest.readingValue.minus(meterBaseline.readingValue))
      : null;
    const telemetryUsage = telemetryBaseline && telemetryLatest
      ? Number(telemetryLatest.valueDecimal!.minus(telemetryBaseline.valueDecimal!))
      : null;
    const meterResetDetected = meterUsage !== null && meterUsage < 0;
    const telemetryResetDetected = telemetryUsage !== null && telemetryUsage < 0;
    const usableTelemetry = telemetryResetDetected ? null : telemetryUsage;
    const usableMeter = meterResetDetected ? null : meterUsage;
    const source = usableTelemetry !== null
      ? 'IOT_TELEMETRY'
      : usableMeter !== null
        ? 'METER_READING'
        : 'NONE';
    const usageKwh = usableTelemetry ?? usableMeter;
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
        billingReady: usableMeter !== null,
        resetDetected: meterResetDetected || telemetryResetDetected,
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
    const result = await this.pollAndStoreTuya(device);
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
    for (let offset = 0; offset < devices.length; offset += 3) {
      const batch = devices.slice(offset, offset + 3);
      results.push(...await Promise.all(batch.map(async (device) => {
        try {
          return { deviceId: device.id, deviceCode: device.deviceCode, ok: true, ...(await this.pollAndStoreTuya(device)) };
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

  /** Backfill data Tuya yang terlewat — tarik log historis dari Tuya API.
   *  Cocok dipanggil saat startup atau setelah polling lama mati. */
  async backfillTuyaHistory(deviceId: number, daysBack = 7) {
    const device = await this.requireDevice(deviceId);
    if (device.provider !== IotProvider.TUYA || !device.externalDeviceId) {
      throw new ConflictException('Backfill hanya untuk perangkat Tuya dengan externalDeviceId');
    }

    const endTime = Date.now();
    const startTime = endTime - daysBack * 24 * 3600_000;

    // Ambil DP code dari metadata device terakhir
    const dpCode = 'add_ele'; // default — DP code untuk total kWh
    const logs = await this.tuya.getDeviceLogs(device.externalDeviceId, dpCode, startTime, endTime, 100);

    let stored = 0;
    for (const log of logs.logs ?? []) {
      const observedAt = new Date(log.event_time);
      const messageId = `tuya:backfill:${device.externalDeviceId}:${observedAt.getTime()}:${log.code}:${log.value}`;

      try {
        await this.prisma.iotIngestMessage.create({
          data: {
            deviceId: device.id,
            messageId,
            observedAt,
            providerTimestamp: BigInt(log.event_time),
            rawPayload: { tuyaLog: { code: log.code, value: log.value, eventTime: log.event_time } } as Prisma.InputJsonValue,
            telemetry: {
              create: [{
                metric: 'electricity.energy_total_kwh',
                valueDecimal: Number(log.value ?? 0),
                unit: 'kWh',
                observedAt,
                quality: IotReadingQuality.SUSPECT,
                reason: `Tuya history backfill — ${daysBack} hari ke belakang`,
              }],
            },
          },
        });
        stored++;
      } catch {
        // Skip duplicate (P2002)
      }
    }

    await this.audit.log({
      actorUserId: null,
      action: 'IOT_TUYA_BACKFILL',
      entityType: 'IotDevice',
      entityId: String(device.id),
      meta: { deviceId, daysBack, dpCode, totalLogs: logs.logs?.length ?? 0, stored },
    });

    return { deviceId, dpCode, daysBack, totalLogs: logs.logs?.length ?? 0, stored };
  }

  /**
   * Correct Tuya DP-report backfill. The legacy method above remains only for
   * binary compatibility; all HTTP entry points use this pagination-aware path.
   */
  async backfillTuyaReportHistory(deviceId: number, daysBack = 7, actor?: CurrentUserPayload) {
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
    while (hasMore && pageCount < 100) {
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
        try {
          await this.prisma.iotIngestMessage.create({
            data: {
              deviceId: device.id,
              messageId,
              observedAt,
              providerTimestamp: BigInt(Math.trunc(eventTime)),
              rawPayload: { tuyaReportLog: { code: log.code, value: log.value, eventTime } } as Prisma.InputJsonValue,
              telemetry: {
                create: [{
                  metric: normalized.metric,
                  valueDecimal: normalized.valueDecimal,
                  unit: normalized.unit ?? 'kWh',
                  observedAt,
                  quality: normalized.quality,
                  reason: `Tuya report-log backfill (${boundedDays} hari): ${normalized.reason ?? 'nilai historis'}`,
                }],
              },
            },
          });
          stored++;
        } catch (error) {
          if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
            throw error;
          }
        }
      }

      hasMore = Boolean(page.has_more && page.last_row_key);
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

  private async pollAndStoreTuya(device: Awaited<ReturnType<IotService['requireDevice']>>) {
    const snapshot = await this.tuya.getDeviceSnapshot(device.externalDeviceId!);
    const observedAt = tuyaObservedAt(snapshot.status);
    const metrics = normalizeTuyaStatus(snapshot.status, snapshot.specification);
    if (!metrics.length) throw new ServiceUnavailableException('Tuya tidak mengembalikan status datapoint');
    const statusHash = createHash('sha256').update(JSON.stringify(snapshot.status)).digest('hex').slice(0, 20);
    const messageId = `tuya:${device.externalDeviceId}:${observedAt.getTime()}:${statusHash}`;
    const detail = this.safeTuyaDetail(snapshot.detail);
    const metadata: Prisma.InputJsonValue = {
      tuya: {
        ...detail,
        statusDefinitions: getTuyaStatusDefinitions(snapshot.specification).map((item) => ({
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
          rawPayload: { status: snapshot.status } as Prisma.InputJsonValue,
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
        lastSeenAt: observedAt,
        lastSuccessfulSyncAt: new Date(),
        displayName: device.displayName || (typeof snapshot.detail.name === 'string' ? snapshot.detail.name : undefined),
        productId: device.productId || (typeof snapshot.detail.product_id === 'string' ? snapshot.detail.product_id : undefined),
        metadata,
      },
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
