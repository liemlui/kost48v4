import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
    ExpensesModule,
    AnalyticsModule,
    NotificationsModule,
    TenantBookingsModule,
    PaymentSubmissionsModule,
    RenewRequestsModule,
  ],
})
export class AppModule {}
