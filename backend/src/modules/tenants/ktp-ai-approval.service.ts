import { Injectable } from '@nestjs/common';

/**
 * G5+ fix #3: bukti in-memory bahwa validasi AI KTP untuk tenant tertentu
 * benar-benar sukses (mode DEEPSEEK, recommendation VERIFY) dalam TTL.
 * Ditulis oleh OwnerAiService.validateKtpOcr, dikonsumsi (sekali pakai) oleh
 * TenantsService.verifyKtp agar method 'AI' tidak bisa dipalsukan dari payload frontend.
 */
@Injectable()
export class KtpAiApprovalService {
  private static readonly TTL_MS = 30 * 60_000;
  private readonly approvals = new Map<number, number>(); // tenantId → expiresAt

  /** Catat bukti sukses AI untuk tenant. Dipanggil hanya dari alur validateKtpOcr. */
  record(tenantId: number): void {
    this.sweep();
    this.approvals.set(tenantId, Date.now() + KtpAiApprovalService.TTL_MS);
  }

  /** True bila ada bukti sukses AI yang belum kedaluwarsa; bukti langsung dikonsumsi. */
  consume(tenantId: number): boolean {
    this.sweep();
    const expiresAt = this.approvals.get(tenantId);
    if (!expiresAt || expiresAt <= Date.now()) return false;
    this.approvals.delete(tenantId);
    return true;
  }

  private sweep(): void {
    const now = Date.now();
    for (const [id, expiresAt] of this.approvals) {
      if (expiresAt <= now) this.approvals.delete(id);
    }
  }
}
