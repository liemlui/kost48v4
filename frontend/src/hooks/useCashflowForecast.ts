import { useMemo } from 'react';
import type { Invoice } from '../types';

export type CashflowForecast = {
  expectedInflowRupiah: number;
  overdueRupiah: number;
  dueSoonRupiah: number;
  openInvoiceCount: number;
  assumption: string;
};

function isOpenInvoice(invoice: Invoice) {
  return !['PAID', 'CANCELLED'].includes(invoice.status);
}

function daysFromToday(targetDate: string | Date | null | undefined): number | null {
  if (!targetDate) return null;
  const date = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const copy = new Date(date); copy.setHours(0, 0, 0, 0);
  return Math.floor((copy.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function remaining(invoice: Invoice) {
  return Math.max(0, Number(invoice.totalAmountRupiah ?? 0) - Number(invoice.paidAmountRupiah ?? 0));
}

export function useCashflowForecast(invoices: Invoice[] = []): CashflowForecast {
  return useMemo(() => {
    const openInvoices = invoices.filter(isOpenInvoice);
    const overdue = openInvoices.filter((invoice) => {
      const days = daysFromToday(invoice.dueDate);
      return days !== null && days < 0;
    });
    const dueSoon = openInvoices.filter((invoice) => {
      const days = daysFromToday(invoice.dueDate);
      return days !== null && days >= 0 && days <= 7;
    });
    const expectedInflowRupiah = openInvoices.reduce((sum, invoice) => sum + remaining(invoice), 0);
    const overdueRupiah = overdue.reduce((sum, invoice) => sum + remaining(invoice), 0);
    const dueSoonRupiah = dueSoon.reduce((sum, invoice) => sum + remaining(invoice), 0);
    return {
      expectedInflowRupiah,
      overdueRupiah,
      dueSoonRupiah,
      openInvoiceCount: openInvoices.length,
      assumption: 'Forecast ringan dari tagihan open existing; belum memakai histori probabilitas bayar atau kas bank aktual.',
    };
  }, [invoices]);
}
