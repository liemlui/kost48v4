import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { join } from 'node:path';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuthModule } from './auth/auth.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { StaysModule } from './modules/stays/stays.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { MeterReadingsModule } from './modules/meter-readings/meter-readings.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { InvoicePaymentsModule } from './modules/invoice-payments/invoice-payments.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { InventoryItemsModule } from './modules/inventory-items/inventory-items.module';
import { RoomItemsModule } from './modules/room-items/room-items.module';
import { InventoryMovementsModule } from './modules/inventory-movements/inventory-movements.module';
import { WifiSalesModule } from './modules/wifi-sales/wifi-sales.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { TenantBookingsModule } from './modules/tenant-bookings/tenant-bookings.module';
import { PaymentSubmissionsModule } from './modules/payment-submissions/payment-submissions.module';
import { RenewRequestsModule } from './modules/renew-requests/renew-requests.module';
import { CheckoutRequestsModule } from './modules/checkout-requests/checkout-requests.module';
import { ReportsModule } from './modules/reports/reports.module';
import { MarketingModule } from './modules/marketing/marketing.module';
import { FinanceModule } from './modules/finance/finance.module';
import { AiModule } from './modules/ai/ai.module';
import { StaffRoutinesModule } from './modules/staff-routines/staff-routines.module';
import { StaffPerformanceModule } from './modules/staff-performance/staff-performance.module';
import { TenantStaffReviewsModule } from './modules/tenant-staff-reviews/tenant-staff-reviews.module';
import { StaffFieldReportsModule } from './modules/staff-field-reports/staff-field-reports.module';
import { AutoOpsModule } from './modules/auto-ops/auto-ops.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { AssetsModule } from './modules/assets/assets.module';
import { DepositLedgerModule } from './modules/deposit-ledger/deposit-ledger.module';
import { FaqsModule } from './modules/faqs/faqs.module';
import { PushModule } from './modules/push/push.module';
import { LoyaltyModule } from './modules/loyalty/loyalty.module';
import { SettingsModule } from './modules/settings/settings.module';
import { MarketAnalysisModule } from './modules/market-analysis/market-analysis.module';
import { OwnerAiModule } from './modules/owner-ai/owner-ai.module';
import { SurveysModule } from './modules/surveys/surveys.module';
import { AdditionalServicesModule } from './modules/additional-services/additional-services.module';
import { AncillaryRevenueModule } from './modules/ancillary-revenue/ancillary-revenue.module';
import { GuestPreferencesModule } from './modules/guest-preferences/guest-preferences.module';
import { AdminDashboardModule } from './modules/admin/admin-dashboard.module';
import { OwnerDashboardModule } from './modules/owner/owner-dashboard.module';
import { StaffDashboardModule } from './modules/staff-dashboard/staff-dashboard.module';
import { IotModule } from './modules/iot/iot.module';
import { AppConfigModule } from './common/config/app-config.module';
import { MemoryTelemetryInterceptor } from './common/telemetry/memory-telemetry.interceptor';
import { MemoryTelemetryService } from './common/telemetry/memory-telemetry.service';

// Passenger/cPanel dapat menjalankan startup file dengan cwd yang berbeda dari
// application root. __dirname selalu berada di src/ saat development dan dist/
// saat production; parent-nya adalah root aplikasi tempat .env berada.
// process.env dari Passenger tetap menang karena dotenv tidak override env yang
// sudah diberikan proses Node.
const ENV_FILE_PATHS = [
  join(__dirname, '..', '.env'),
  join(process.cwd(), '.env'),
];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ENV_FILE_PATHS,
    }),
    AppConfigModule,
    PrismaModule,
    AuditLogModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    RoomsModule,
    StaysModule,
    AnnouncementsModule,
    MeterReadingsModule,
    InvoicesModule,
    InvoicePaymentsModule,
    TicketsModule,
    InventoryItemsModule,
    RoomItemsModule,
    InventoryMovementsModule,
    WifiSalesModule,
    AncillaryRevenueModule,
    GuestPreferencesModule,
    ExpensesModule,
    AnalyticsModule,
    NotificationsModule,
    TenantBookingsModule,
    PaymentSubmissionsModule,
    RenewRequestsModule,
    CheckoutRequestsModule,
    ReportsModule,
    MarketingModule,
    FinanceModule,
    AiModule,
    StaffRoutinesModule,
    StaffPerformanceModule,
    TenantStaffReviewsModule,
    StaffFieldReportsModule,
    AutoOpsModule,
    AccountingModule,
    AssetsModule,
    DepositLedgerModule,
    FaqsModule,
    PushModule,
    LoyaltyModule,
    SettingsModule,
    MarketAnalysisModule,
    OwnerAiModule,
    SurveysModule,
    AdditionalServicesModule,
    AdminDashboardModule,
    OwnerDashboardModule,
    StaffDashboardModule,
    IotModule,
  ],
  providers: [
    // Audit E-1: default-deny — semua endpoint butuh JWT kecuali ditandai @Public().
    // RolesGuard global aman: tanpa metadata @Roles ia meloloskan request.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    MemoryTelemetryService,
    { provide: APP_INTERCEPTOR, useClass: MemoryTelemetryInterceptor },
  ],
})
export class AppModule {}
