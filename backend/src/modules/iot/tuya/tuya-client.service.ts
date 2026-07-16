import { createHash, createHmac, randomUUID } from 'crypto';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type TuyaEnvelope<T> = {
  success: boolean;
  result?: T;
  code?: number;
  msg?: string;
  t?: number;
};

type CachedToken = { value: string; expiresAt: number };

const TUYA_HOSTS = new Set([
  'openapi.tuyacn.com',
  'openapi.tuyaus.com',
  'openapi.tuyaeu.com',
  'openapi.tuyain.com',
]);

export function sha256Hex(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Tuya OpenAPI HMAC-SHA256 signature (uppercase hexadecimal). */
export function createTuyaSignature(input: {
  clientId: string;
  secret: string;
  accessToken?: string;
  timestamp: string;
  nonce: string;
  method: string;
  pathWithQuery: string;
  body?: string;
}): string {
  const stringToSign = [
    input.method.toUpperCase(),
    sha256Hex(input.body ?? ''),
    '',
    input.pathWithQuery,
  ].join('\n');
  const message = `${input.clientId}${input.accessToken ?? ''}${input.timestamp}${input.nonce}${stringToSign}`;
  return createHmac('sha256', input.secret).update(message).digest('hex').toUpperCase();
}

@Injectable()
export class TuyaClientService {
  private token?: CachedToken;
  private tokenPromise?: Promise<string>;

  constructor(private readonly config: ConfigService) {}

  getConfigurationStatus() {
    const clientId = this.clientId();
    const secret = this.secret();
    let baseUrlValid = false;
    let region: string | null = null;
    try {
      const url = this.baseUrl();
      baseUrlValid = true;
      region = url.hostname;
    } catch {
      // Status endpoint must stay safe and readable even when env is invalid.
    }
    return {
      configured: Boolean(clientId && secret && baseUrlValid),
      clientIdPresent: Boolean(clientId),
      secretPresent: Boolean(secret),
      baseUrlValid,
      region,
    };
  }

  async getDeviceSnapshot(externalDeviceId: string) {
    if (!externalDeviceId?.trim()) {
      throw new ServiceUnavailableException('Tuya device ID belum diisi');
    }
    const id = encodeURIComponent(externalDeviceId.trim());
    const [detail, status, specification] = await Promise.all([
      this.businessRequest<Record<string, unknown>>(`/v1.0/iot-03/devices/${id}`),
      this.businessRequest<Array<Record<string, unknown>>>(`/v1.0/iot-03/devices/${id}/status`),
      this.businessRequest<Record<string, unknown>>(`/v1.0/iot-03/devices/${id}/specification`),
    ]);
    return { detail, status, specification };
  }

  private clientId(): string {
    return String(this.config.get('TUYA_CLIENT_ID') ?? this.config.get('TUYA_ACCESS_KEY') ?? '').trim();
  }

  private secret(): string {
    return String(this.config.get('TUYA_CLIENT_SECRET') ?? this.config.get('TUYA_SECRET_KEY') ?? '').trim();
  }

  private baseUrl(): URL {
    const raw = String(this.config.get('TUYA_API_BASE') ?? 'https://openapi.tuyaus.com').trim().replace(/\/$/, '');
    const parsed = new URL(raw);
    if (parsed.protocol !== 'https:' || !TUYA_HOSTS.has(parsed.hostname) || parsed.pathname !== '/') {
      throw new ServiceUnavailableException('TUYA_API_BASE harus memakai endpoint HTTPS regional resmi Tuya');
    }
    return parsed;
  }

  private credentials() {
    const clientId = this.clientId();
    const secret = this.secret();
    if (!clientId || !secret) {
      throw new ServiceUnavailableException('Kredensial Tuya belum lengkap di environment backend');
    }
    return { clientId, secret };
  }

  private async getAccessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.value;
    if (this.tokenPromise) return this.tokenPromise;
    this.tokenPromise = (async () => {
      const path = '/v1.0/token?grant_type=1';
      const result = await this.signedRequest<{ access_token: string; expire_time?: number }>(path);
      if (!result.access_token) throw new ServiceUnavailableException('Tuya tidak mengembalikan access token');
      const ttlMs = Math.max(120, Number(result.expire_time ?? 7200)) * 1000;
      this.token = { value: result.access_token, expiresAt: Date.now() + ttlMs };
      return result.access_token;
    })();
    try {
      return await this.tokenPromise;
    } finally {
      this.tokenPromise = undefined;
    }
  }

  private async businessRequest<T>(path: string): Promise<T> {
    const accessToken = await this.getAccessToken();
    return this.signedRequest<T>(path, accessToken);
  }

  private async signedRequest<T>(pathWithQuery: string, accessToken?: string): Promise<T> {
    const { clientId, secret } = this.credentials();
    const timestamp = Date.now().toString();
    const nonce = randomUUID().replace(/-/g, '');
    const sign = createTuyaSignature({
      clientId,
      secret,
      accessToken,
      timestamp,
      nonce,
      method: 'GET',
      pathWithQuery,
    });

    let response: Response;
    try {
      response = await fetch(new URL(pathWithQuery, this.baseUrl()), {
        method: 'GET',
        headers: {
          client_id: clientId,
          sign,
          t: timestamp,
          nonce,
          sign_method: 'HMAC-SHA256',
          ...(accessToken ? { access_token: accessToken } : {}),
        },
        signal: AbortSignal.timeout(12_000),
      });
    } catch {
      throw new ServiceUnavailableException('Tuya OpenAPI tidak dapat dijangkau');
    }

    let payload: TuyaEnvelope<T>;
    try {
      payload = (await response.json()) as TuyaEnvelope<T>;
    } catch {
      throw new ServiceUnavailableException('Respons Tuya OpenAPI tidak valid');
    }
    if (!response.ok || !payload.success || payload.result === undefined) {
      const safeCode = payload.code ? ` (kode ${payload.code})` : '';
      throw new ServiceUnavailableException(`Tuya menolak permintaan${safeCode}: ${payload.msg || 'unknown error'}`);
    }
    return payload.result;
  }
}
