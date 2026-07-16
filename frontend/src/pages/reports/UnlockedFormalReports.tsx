import PageHeader from '../../components/common/PageHeader';
import React, { useState } from 'react';
import { Card, Nav } from 'react-bootstrap';
import BalanceSheetPage from './BalanceSheetPage';
import ProfitLossPage from './ProfitLossPage';
import CashflowPage from './CashflowPage';
import FinancialRatiosPage from './FinancialRatiosPage';

type SubTab = 'balance-sheet' | 'profit-loss' | 'cashflow' | 'ratios';
const subTabs: { key: SubTab; label: string }[] = [
  { key: 'balance-sheet', label: 'Neraca' },
  { key: 'profit-loss', label: 'Laba Rugi' },
  { key: 'cashflow', label: 'Arus Kas' },
  { key: 'ratios', label: 'Rasio' },
];

export default function UnlockedFormalReports() {
  const [active, setActive] = useState<SubTab>('balance-sheet');
  return (
    <div>
      <PageHeader
        eyebrow="Laporan Keuangan"
        title="Laporan Formal"
        description="Neraca, laba rugi, arus kas, dan rasio keuangan berdasarkan jurnal/neraca saldo."
      />
      <Card>
      <Card.Header className="p-0">
        <Nav variant="tabs" activeKey={active} onSelect={(k) => k && setActive(k as SubTab)} className="px-2 pt-2">
          {subTabs.map((t) => (
            <Nav.Item key={t.key}>
              <Nav.Link eventKey={t.key} className="small">{t.label}</Nav.Link>
            </Nav.Item>
          ))}
        </Nav>
      </Card.Header>
      <Card.Body className="p-0">
        {active === 'balance-sheet' && <BalanceSheetPage />}
        {active === 'profit-loss' && <ProfitLossPage />}
        {active === 'cashflow' && <CashflowPage />}
        {active === 'ratios' && <FinancialRatiosPage />}
      </Card.Body>
    </Card>
    </div>
  );
}