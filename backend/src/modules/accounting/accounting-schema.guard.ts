import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export const ACCOUNTING_FOUNDATION_TABLES = [
  'ChartOfAccount',
  'CashAccount',
  'AccountingPeriod',
  'OpeningBalanceBatch',
  'OpeningBalanceLine',
  'JournalEntry',
  'JournalLine',
] as const;

export type AccountingSchemaStatus = {
  ready: boolean;
  missingTables: string[];
  checkedTables: string[];
  message: string;
  nextActions: string[];
};

@Injectable()
export class AccountingSchemaGuard {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(): Promise<AccountingSchemaStatus> {
    const checks = await Promise.all(
      ACCOUNTING_FOUNDATION_TABLES.map(async (tableName) => ({
        tableName,
        exists: await this.tableExists(tableName),
      })),
    );
    const missingTables = checks.filter((check) => !check.exists).map((check) => check.tableName);
    const ready = missingTables.length === 0;
    return {
      ready,
      missingTables,
      checkedTables: [...ACCOUNTING_FOUNDATION_TABLES],
      message: ready
        ? 'Accounting foundation schema sudah tersedia di database.'
        : `Accounting foundation schema belum diterapkan ke database. Tabel belum ada: ${missingTables.join(', ')}.`,
      nextActions: ready
        ? []
        : [
            'Jalankan migration additive sebelum smoke endpoint accounting.',
            'PowerShell: Set-Location "<project-root>\\backend"; npx prisma migrate deploy; npx prisma generate; npm run build:local',
            'Jika local dev belum memakai Prisma migrations dengan rapi, alternatif additive-only: npx prisma db push lalu restart backend.',
            'Setelah migration berhasil, jalankan POST /api/accounting/default-coa/seed.',
          ],
    };
  }

  async assertReady(): Promise<void> {
    const status = await this.getStatus();
    if (!status.ready) {
      throw new ServiceUnavailableException({
        code: 'ACCOUNTING_SCHEMA_NOT_APPLIED',
        message: status.message,
        missingTables: status.missingTables,
        nextActions: status.nextActions,
      });
    }
  }

  private async tableExists(tableName: string): Promise<boolean> {
    const escaped = tableName.replace(/"/g, '""');
    const rows = (await (this.prisma as any).$queryRawUnsafe(
      `SELECT to_regclass('public."${escaped}"')::text AS "regclass"`,
    )) as Array<{ regclass: string | null }>;
    return Boolean(rows?.[0]?.regclass);
  }
}
