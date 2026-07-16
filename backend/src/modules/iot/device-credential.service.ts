import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DeviceCredentialService {
  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    try {
      this.key();
      return true;
    } catch {
      return false;
    }
  }

  generateSecret(): string {
    return randomBytes(32).toString('base64url');
  }

  encrypt(secret: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return ['v1', iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join('.');
  }

  decrypt(payload: string): string {
    const [version, ivRaw, tagRaw, ciphertextRaw] = String(payload ?? '').split('.');
    if (version !== 'v1' || !ivRaw || !tagRaw || !ciphertextRaw) {
      throw new ServiceUnavailableException('Format kredensial perangkat tidak valid');
    }
    try {
      const decipher = createDecipheriv('aes-256-gcm', this.key(), Buffer.from(ivRaw, 'base64url'));
      decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
      return Buffer.concat([
        decipher.update(Buffer.from(ciphertextRaw, 'base64url')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      throw new ServiceUnavailableException('Kredensial perangkat tidak dapat dibuka');
    }
  }

  private key(): Buffer {
    const raw = String(this.config.get('IOT_MASTER_KEY') ?? '').trim();
    if (!raw) throw new ServiceUnavailableException('IOT_MASTER_KEY belum dikonfigurasi');
    if (/^[a-fA-F0-9]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
    try {
      const decoded = Buffer.from(raw, 'base64');
      if (decoded.length === 32) return decoded;
    } catch {
      // handled below
    }
    // A long passphrase is accepted but deterministically reduced to 32 bytes.
    // Production runbook recommends a random base64/hex key instead.
    if (raw.length >= 32) return createHash('sha256').update(raw).digest();
    throw new ServiceUnavailableException('IOT_MASTER_KEY minimal 32 karakter atau 32 byte base64');
  }
}
