import { ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { IotDeviceType, IotProvider, Prisma } from '../../generated/prisma';
import { AuditLogService } from '../../audit-log/audit-log.service';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateIotDeviceDto, IotDeviceQueryDto, IotTelemetryQueryDto, UpdateIotDeviceDto } from './dto/iot-device.dto';
import { DeviceCredentialService } from './device-credential.service';
import { TuyaClientService } from './tuya/tuya-client.service';
import { getTuyaStatusDefinitions, normalizeTuyaStatus, tuyaObservedAt } from './tuya/tuya-normalizer';
import { createHash } from 'crypto';

const deviceInclude = {
  room: { select: { id: true, code: true, name: true } },
  ingestMessages: {
    take: 1,
    orderBy: { observedAt: 'desc' as const },
    include: { telemetry: { orderBy: { metric: 'asc' as const } } },
  },
};

@Injectable()
export class IotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly tuya: TuyaClientService,
    private readonly credentials: DeviceCredentialService,
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
    const items = await this.prisma.iotTelemetry.findMany({
      where: {
        ingestMessage: { deviceId: id },
        metric: query.metric,
      },
      orderBy: { observedAt: 'desc' },
      take: Math.min(query.limit || 100, 500),
      include: { ingestMessage: { select: { id: true, messageId: true, receivedAt: true } } },
    });
    return items.map((item) => ({
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
