import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { IotService } from './iot.service';

@Injectable()
export class IotPollingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IotPollingService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(private readonly iot: IotService) {}

  onModuleInit() {
    if (!this.intervalPollingEnabled()) return;
    const intervalMinutes = this.pollIntervalMinutes();
    const intervalMs = intervalMinutes * 60_000;
    this.runIntervalPoll();
    this.timer = setInterval(() => this.runIntervalPoll(), intervalMs);
    this.logger.log(`Polling Tuya aktif setiap ${intervalMinutes} menit`);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async runExternalCron() {
    return this.poll('cron');
  }

  private intervalPollingEnabled() {
    return ['true', '1', 'yes', 'on'].includes(String(process.env.IOT_TUYA_POLL_ENABLED ?? 'false').trim().toLowerCase());
  }

  private pollIntervalMinutes() {
    const configured = Number(process.env.IOT_TUYA_POLL_MINUTES ?? 10);
    return Number.isFinite(configured) ? Math.max(1, Math.min(60, configured)) : 10;
  }

  private runIntervalPoll() {
    void this.poll('interval').catch((error) => {
      this.logger.warn(`Polling Tuya interval gagal: ${error instanceof Error ? error.message : error}`);
    });
  }

  private async poll(source: 'interval' | 'cron') {
    if (this.running) return { skipped: true, reason: 'Polling Tuya masih berjalan' };
    this.running = true;
    try {
      const result = await this.iot.syncAllTuya();
      this.logger.log(`Polling Tuya ${source}: ${result.succeeded}/${result.total} perangkat berhasil`);
      return { skipped: false, ...result };
    } finally {
      this.running = false;
    }
  }
}
