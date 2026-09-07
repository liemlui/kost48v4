import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  // PrismaModule bersifat @Global; import eksplisit agar ReportsService memakai
  // instance PrismaService yang sama (singleton global) — bukan provider lokal
  // yang membuat pool kedua (temuan P0 audit deploy 2026-09-06).
  imports: [PrismaModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}