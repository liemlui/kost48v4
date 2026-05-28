import { Module } from '@nestjs/common';
import { DepositLedgerController } from './deposit-ledger.controller';
import { DepositLedgerService } from './deposit-ledger.service';

@Module({
  controllers: [DepositLedgerController],
  providers: [DepositLedgerService],
  exports: [DepositLedgerService],
})
export class DepositLedgerModule {}
