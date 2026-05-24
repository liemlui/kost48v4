import { Injectable } from '@nestjs/common';

@Injectable()
export class AccountingPostingService {
  explainPostingBoundary() {
    return {
      autoPostingEnabled: false,
      reason: 'B1/B2 hanya memasang accounting foundation. Auto-posting transaksi operasional ditunda sampai cutover/readiness jelas untuk mencegah double posting dan regression lifecycle.',
      nextBatch: 'B3 Auto Journal Lite setelah COA, cash account, accounting period, dan opening balance siap.',
    };
  }
}
