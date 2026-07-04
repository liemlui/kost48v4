import React, { useState } from 'react';
import { Alert, Badge, Card, Col, Container, Form, Row, Spinner, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { fetchCashflowStatement, type CashflowStatement } from '../../api/accounting';
import EmptyState from '../../components/common/EmptyState';

function currentYearMonth() { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() + 1 }; }
function formatRupiah(v: number) { return new Intl.NumberFormat('id-ID').format(v || 0); }
function formatCompact(v: number) {
  const s = Math.abs(v || 0), sign = v < 0 ? '-' : '';
  if (s >= 1e9) return `${sign}Rp${(s/1e9).toFixed(1)}M`;
  if (s >= 1e6) return `${sign}Rp${(s/1e6).toFixed(1)}jt`;
  if (s >= 1e3) return `${sign}Rp${(s/1e3).toFixed(0)}rb`;
  return `${sign}Rp${formatRupiah(s)}`;
}

export default function CashflowPage() {
  const [ym, setYm] = useState(currentYearMonth());
  const q = useQuery({
    queryKey: ['accounting', 'cashflow', ym],
    queryFn: () => fetchCashflowStatement({ year: ym.year, month: ym.month }),
    staleTime: 60_000, retry: 1,
  });
  const data = q.data;
  return (
    <Container fluid className="px-2 py-3">
      <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
        <div><h1 className="mb-0 rpt-title">Arus Kas</h1><small className="text-muted">Laporan arus kas metode langsung</small></div>
        <div className="d-flex gap-2">
          <Form.Control type="number" value={ym.year} min={2020} max={2100} onChange={e => setYm(p=>({...p,year:+e.target.value}))} className="rpt-input-sm" />
          <Form.Select value={ym.month} onChange={e => setYm(p=>({...p,month:+e.target.value}))} className="rpt-select-sm">
            {Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={m}>{new Date(0,m-1).toLocaleString('id-ID',{month:'long'})}</option>)}
          </Form.Select>
        </div>
      </div>
      {q.isLoading && <Card><Card.Body className="text-center py-4"><Spinner animation="border" size="sm"/><span className="ms-2">Memuat...</span></Card.Body></Card>}
      {q.isError && <Alert variant="warning">Gagal memuat data.</Alert>}
      {data && <>
        <Row className="g-3 mb-3">
          <Col xs={6} xl={3}><Card><Card.Body><div className="kpi-label">Saldo Awal</div><div className="kpi-value">{formatCompact(data.totals.cashBeginningRupiah)}</div></Card.Body></Card></Col>
          <Col xs={6} xl={3}><Card><Card.Body><div className="kpi-label">Arus Kas Bersih</div><div className="kpi-value" style={{color: data.totals.netCashflowRupiah>=0?'#22c55e':'#ef4444'}}>{formatCompact(data.totals.netCashflowRupiah)}</div></Card.Body></Card></Col>
          <Col xs={6} xl={3}><Card><Card.Body><div className="kpi-label">Saldo Akhir</div><div className="kpi-value">{formatCompact(data.totals.cashEndingRupiah)}</div></Card.Body></Card></Col>
          <Col xs={6} xl={3}><Card><Card.Body><div className="kpi-label">Status</div><div className="kpi-value"><Badge bg={data.formalStatementReady?'success':'warning'}>{data.formalStatementReady?'Formal':'Estimasi'}</Badge></div></Card.Body></Card></Col>
        </Row>
        <Row className="g-3">
          <Col lg={4}><Card><Card.Header className="rpt-card-header">💰 Arus Kas Operasi</Card.Header><Card.Body>
            {data.operating.cashIn.length === 0 && data.operating.cashOut.length === 0 ? (
              <EmptyState icon="💰" title="Belum ada arus kas operasi" description="Belum ada transaksi kas masuk/keluar operasional pada periode ini." />
            ) : (
            <Table size="sm" className="mb-0"><tbody>
              {data.operating.cashIn.map((item,i)=><tr key={i}><td className="text-success">+ {item.sourceType}</td><td className="text-end">{formatCompact(item.amountRupiah)}</td></tr>)}
              {data.operating.cashOut.map((item,i)=><tr key={i}><td className="text-danger">− {item.sourceType}</td><td className="text-end">{formatCompact(item.amountRupiah)}</td></tr>)}
              <tr className="border-top"><td><strong>Kas Bersih Operasi</strong></td><td className="text-end"><strong style={{color:data.operating.netRupiah>=0?'#22c55e':'#ef4444'}}>{formatCompact(data.operating.netRupiah)}</strong></td></tr>
            </tbody></Table>
            )}
          </Card.Body></Card></Col>
          <Col lg={4}><Card><Card.Header className="rpt-card-header">🏗️ Arus Kas Investasi</Card.Header><Card.Body>
            <Table size="sm" className="mb-0"><tbody>
              <tr><td className="text-danger">− Investasi Aset</td><td className="text-end">{formatCompact(data.investing.totalOutRupiah)}</td></tr>
              <tr className="border-top"><td><strong>Kas Bersih Investasi</strong></td><td className="text-end"><strong style={{color:data.investing.netRupiah>=0?'#22c55e':'#ef4444'}}>{formatCompact(data.investing.netRupiah)}</strong></td></tr>
            </tbody></Table></Card.Body></Card></Col>
          <Col lg={4}><Card><Card.Header className="rpt-card-header">🏦 Arus Kas Pendanaan</Card.Header><Card.Body>
            <Table size="sm" className="mb-0"><tbody>
              <tr><td className="text-success">+ Setoran Modal</td><td className="text-end">{formatCompact(data.financing.totalInRupiah)}</td></tr>
              <tr className="border-top"><td><strong>Kas Bersih Pendanaan</strong></td><td className="text-end"><strong style={{color:data.financing.netRupiah>=0?'#22c55e':'#ef4444'}}>{formatCompact(data.financing.netRupiah)}</strong></td></tr>
            </tbody></Table></Card.Body></Card></Col>
        </Row>
        {data.cashAccounts.length>0 && <Card className="mt-3"><Card.Header className="rpt-card-header">🏦 Rekening Kas</Card.Header><Card.Body>
          <Table size="sm" bordered><thead><tr><th>Nama</th><th>Tipe</th><th className="text-end">Saldo Awal</th><th className="text-end">Saldo Akhir</th></tr></thead><tbody>
            {data.cashAccounts.map(ca=><tr key={ca.id}><td>{ca.name}</td><td>{ca.accountType}</td><td className="text-end">{formatCompact(ca.openingBalanceRupiah)}</td><td className="text-end">{formatCompact(ca.currentBalanceRupiah)}</td></tr>)}
          </tbody></Table></Card.Body></Card>}
        <small className="text-muted mt-2 d-block">{data.note}</small>
      </>}
      <style>{`
        .kpi-label{font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px}
        .kpi-value{font-size:20px;font-weight:700;color:#0f172a;line-height:1.2}
      `}</style>
    </Container>
  );
}