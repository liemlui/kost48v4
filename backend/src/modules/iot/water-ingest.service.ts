import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { IotProvider, IotReadingQuality, Prisma } from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { DeviceCredentialService } from './device-credential.service';
import { WaterIngestDto } from './dto/water-ingest.dto';

export type WaterIngestHeaders = {
  deviceCode: string;
  timestamp: string;
  nonce: string;
  signature: string;
};

export function createWaterIngestSignature(secret: string, input: {
  deviceCode: string;
  timestamp: string;
  nonce: string;
  rawBody: Buffer;
}): string {
  const bodyHash = createHash('sha256').update(input.rawBody).digest('hex');
  const canonical = `${input.deviceCode}\n${input.timestamp}\n${input.nonce}\n${bodyHash}`;
  return createHmac('sha256', secret).update(canonical).digest('hex');
}

@Injectable()
export class WaterIngestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credentials: DeviceCredentialService,
  ) {}

  async ingest(headers: WaterIngestHeaders, rawBody: Buffer, payload: WaterIngestDto) {
    this.validateHeaders(headers);
    const device = await this.prisma.iotDevice.findUnique({ where: { deviceCode: headers.deviceCode } });
    if (!device || device.provider !== IotProvider.KOST48_ESP32 || !device.enabled || !device.credentialCiphertext) {
      throw new UnauthorizedException('Perangkat tidak dikenal atau tidak aktif');
    }

    const secret = this.credentials.decrypt(device.credentialCiphertext);
    const expected = createWaterIngestSignature(secret, { ...headers, rawBody });
    const provided = headers.signature.toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(provided) || !timingSafeEqual(Buffer.from(expected), Buffer.from(provided))) {
      throw new UnauthorizedException('Signature perangkat tidak valid');
    }

    const duplicate = await this.prisma.iotIngestMessage.findUnique({
      where: { deviceId_messageId: { deviceId: device.id, messageId: headers.nonce } },
      select: { id: true },
    });
    if (duplicate) return { accepted: true, duplicate: true, ingestMessageId: duplicate.id.toString() };

    const observedAt = new Date(payload.observedAt);
    const volumeM3 = payload.volumeTotalLiters / 1000;
    const previous = await this.prisma.iotTelemetry.findFirst({
      where: {
        metric: 'water.volume_total_m3',
        ingestMessage: { deviceId: device.id },
      },
      orderBy: { observedAt: 'desc' },
      select: { valueDecimal: true },
    });
    const counterWentBack = previous?.valueDecimal != null && volumeM3 < Number(previous.valueDecimal);
    const quality = counterWentBack && !payload.counterReset ? IotReadingQuality.SUSPECT : IotReadingQuality.GOOD;
    const reason = quality === IotReadingQuality.SUSPECT ? 'Counter volume lebih kecil dari telemetry sebelumnya tanpa counterReset' : undefined;

    const metrics: Prisma.IotTelemetryCreateWithoutIngestMessageInput[] = [
      { metric: 'water.volume_total_m3', valueDecimal: volumeM3, unit: 'm3', observedAt, quality, reason },
      { metric: 'water.pulse_total', valueDecimal: payload.pulseTotal, unit: 'pulse', observedAt, quality, reason },
      ...(payload.flowRateLpm == null ? [] : [{ metric: 'water.flow_rate_lpm', valueDecimal: payload.flowRateLpm, unit: 'L/min', observedAt, quality, reason }]),
      ...(payload.rssiDbm == null ? [] : [{ metric: 'wifi.rssi_dbm', valueDecimal: payload.rssiDbm, unit: 'dBm', observedAt, quality: IotReadingQuality.GOOD }]),
    ];

    try {
      const message = await this.prisma.iotIngestMessage.create({
        data: {
          deviceId: device.id,
          messageId: headers.nonce,
          observedAt,
          sequence: payload.sequence == null ? undefined : BigInt(payload.sequence),
          rawPayload: payload as unknown as Prisma.InputJsonValue,
          diagnostics: payload.diagnostics as Prisma.InputJsonValue,
          telemetry: { create: metrics },
        },
        select: { id: true },
      });
      await this.prisma.iotDevice.update({
        where: { id: device.id },
        data: {
          online: true,
          lastSeenAt: observedAt,
          lastSuccessfulSyncAt: new Date(),
          firmwareVersion: payload.firmwareVersion,
        },
      });
      return { accepted: true, duplicate: false, quality, ingestMessageId: message.id.toString() };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.prisma.iotIngestMessage.findUnique({
          where: { deviceId_messageId: { deviceId: device.id, messageId: headers.nonce } },
          select: { id: true },
        });
        return { accepted: true, duplicate: true, ingestMessageId: existing?.id.toString() };
      }
      throw error;
    }
  }

  private validateHeaders(headers: WaterIngestHeaders) {
    if (!headers.deviceCode || headers.deviceCode.length > 80) throw new UnauthorizedException('X-Device-Id tidak valid');
    if (!headers.nonce || headers.nonce.length < 12 || headers.nonce.length > 160) throw new UnauthorizedException('X-Nonce tidak valid');
    const timestamp = Number(headers.timestamp);
    if (!Number.isFinite(timestamp)) throw new UnauthorizedException('X-Timestamp tidak valid');
    const millis = timestamp < 10_000_000_000 ? timestamp * 1000 : timestamp;
    if (Math.abs(Date.now() - millis) > 5 * 60_000) {
      throw new UnauthorizedException('Timestamp perangkat di luar toleransi 5 menit');
    }
    if (!headers.signature) throw new BadRequestException('X-Signature wajib diisi');
  }
}
