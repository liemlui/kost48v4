export type DefaultCoaAccount = {
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'COGS' | 'EXPENSE';
  normalBalance: 'DEBIT' | 'CREDIT';
  description?: string;
};

export const DEFAULT_COA: DefaultCoaAccount[] = [
  { code: '1000', name: 'Cash on Hand', type: 'ASSET', normalBalance: 'DEBIT', description: 'Kas tunai operasional kos.' },
  { code: '1010', name: 'Bank Main', type: 'ASSET', normalBalance: 'DEBIT', description: 'Rekening bank utama KOST48.' },
  { code: '1020', name: 'QRIS/E-Wallet Clearing', type: 'ASSET', normalBalance: 'DEBIT', description: 'Saldo settlement QRIS/e-wallet yang belum masuk bank.' },
  { code: '1100', name: 'Accounts Receivable', type: 'ASSET', normalBalance: 'DEBIT', description: 'Tagihan tenant yang sudah diterbitkan tetapi belum lunas.' },
  { code: '1200', name: 'Inventory', type: 'ASSET', normalBalance: 'DEBIT', description: 'Nilai stok material/barang jika nanti diaktifkan.' },
  { code: '1500', name: 'Fixed Assets', type: 'ASSET', normalBalance: 'DEBIT', description: 'Aset tetap seperti renovasi, furniture, AC, CCTV, pompa, router.' },
  { code: '1590', name: 'Accumulated Depreciation', type: 'ASSET', normalBalance: 'CREDIT', description: 'Kontra aset untuk akumulasi penyusutan.' },

  { code: '2000', name: 'Tenant Deposit Liability', type: 'LIABILITY', normalBalance: 'CREDIT', description: 'Deposit tenant yang masih menjadi kewajiban, bukan revenue.' },
  { code: '2100', name: 'Accounts Payable', type: 'LIABILITY', normalBalance: 'CREDIT', description: 'Utang usaha/vendor jika nanti diaktifkan.' },
  { code: '2200', name: 'Unearned Revenue', type: 'LIABILITY', normalBalance: 'CREDIT', description: 'Pendapatan diterima di muka jika ada.' },
  { code: '2300', name: 'Tax Payable', type: 'LIABILITY', normalBalance: 'CREDIT', description: 'Kewajiban pajak/retribusi.' },

  { code: '3000', name: 'Owner Capital', type: 'EQUITY', normalBalance: 'CREDIT', description: 'Modal pemilik.' },
  { code: '3100', name: 'Owner Drawings', type: 'EQUITY', normalBalance: 'DEBIT', description: 'Prive/pengambilan owner.' },
  { code: '3200', name: 'Retained Earnings', type: 'EQUITY', normalBalance: 'CREDIT', description: 'Laba ditahan setelah tutup periode.' },

  { code: '4000', name: 'Room Rent Revenue', type: 'REVENUE', normalBalance: 'CREDIT', description: 'Pendapatan sewa kamar.' },
  { code: '4010', name: 'Rent Discount', type: 'REVENUE', normalBalance: 'DEBIT', description: 'Kontra-revenue — diskon sewa yang mengurangi pendapatan.' },
  { code: '4100', name: 'Electricity Revenue', type: 'REVENUE', normalBalance: 'CREDIT', description: 'Pendapatan tagihan listrik tenant.' },
  { code: '4110', name: 'Water Revenue', type: 'REVENUE', normalBalance: 'CREDIT', description: 'Pendapatan tagihan air tenant.' },
  { code: '4200', name: 'Wifi Voucher Revenue', type: 'REVENUE', normalBalance: 'CREDIT', description: 'Pendapatan voucher WiFi.' },
  { code: '4300', name: 'Ancillary Revenue', type: 'REVENUE', normalBalance: 'CREDIT', description: 'Pendapatan tambahan: laundry, galon, cleaning, parkir, dll.' },
  { code: '4400', name: 'Penalty/Admin Fee Revenue', type: 'REVENUE', normalBalance: 'CREDIT', description: 'Denda atau biaya administrasi.' },

  { code: '5000', name: 'Wifi Cost', type: 'COGS', normalBalance: 'DEBIT', description: 'Biaya langsung layanan voucher WiFi.' },
  { code: '5100', name: 'Laundry Partner Cost', type: 'COGS', normalBalance: 'DEBIT', description: 'HPP layanan laundry jika ada.' },
  { code: '5200', name: 'Water Gallon Cost', type: 'COGS', normalBalance: 'DEBIT', description: 'HPP galon/air minum jika ada.' },
  { code: '5300', name: 'Paid Cleaning Service Cost', type: 'COGS', normalBalance: 'DEBIT', description: 'Biaya langsung layanan cleaning berbayar.' },

  { code: '6000', name: 'Salary', type: 'EXPENSE', normalBalance: 'DEBIT', description: 'Gaji staff/admin.' },
  { code: '6100', name: 'Electricity', type: 'EXPENSE', normalBalance: 'DEBIT', description: 'Biaya listrik kos.' },
  { code: '6110', name: 'Water', type: 'EXPENSE', normalBalance: 'DEBIT', description: 'Biaya air kos.' },
  { code: '6120', name: 'Internet', type: 'EXPENSE', normalBalance: 'DEBIT', description: 'Biaya internet.' },
  { code: '6200', name: 'Maintenance', type: 'EXPENSE', normalBalance: 'DEBIT', description: 'Perawatan dan perbaikan.' },
  { code: '6210', name: 'Cleaning', type: 'EXPENSE', normalBalance: 'DEBIT', description: 'Biaya kebersihan.' },
  { code: '6220', name: 'Supplies', type: 'EXPENSE', normalBalance: 'DEBIT', description: 'Perlengkapan operasional.' },
  { code: '6300', name: 'Marketing', type: 'EXPENSE', normalBalance: 'DEBIT', description: 'Promosi/iklan.' },
  { code: '6400', name: 'Tax/Retribution', type: 'EXPENSE', normalBalance: 'DEBIT', description: 'Pajak/retribusi.' },
  { code: '6500', name: 'Software/Hosting', type: 'EXPENSE', normalBalance: 'DEBIT', description: 'Software, domain, hosting, tools.' },
  { code: '6600', name: 'Bank Fee', type: 'EXPENSE', normalBalance: 'DEBIT', description: 'Biaya bank/payment channel.' },
  { code: '6700', name: 'Depreciation', type: 'EXPENSE', normalBalance: 'DEBIT', description: 'Beban penyusutan aset.' },
  { code: '6990', name: 'Other Expense', type: 'EXPENSE', normalBalance: 'DEBIT', description: 'Biaya lain-lain.' },
];
