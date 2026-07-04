import React, { useState } from 'react';
import { Alert, Badge, Card, Col, Container, Form, Row, Spinner, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { fetchProfitLossDetail, type ProfitLossDetail } from '../../api/accounting';

import { formatCompactRupiah } from '../../utils/formatCurrency';

function currentYearMonth() { const d=new Date(); return {year:d.getFullYear(),month:d.getMonth()+1}; }
function pct(v:number) { return `${v>=0?'+':''}${v}%`; }

export default function ProfitLossPage() {
  const [ym,setYm]=useState(currentYearMonth());
  const q=useQuery({queryKey:['accounting','pnl',ym],queryFn:()=>fetchProfitLossDetail({year:ym.year,month:ym.month}),staleTime:60_000,retry:1});
  const d=q.data;
  return (<Container fluid className="px-2 py-3">
    <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
      <div><h1 className="mb-0 rpt-title">Laba Rugi</h1><small className="text-muted">P&L detail dengan perbandingan bulan lalu</small></div>
      <div className="d-flex gap-2">
        <Form.Control type="number" value={ym.year} min={2020} max={2100} onChange={e=>setYm(p=>({...p,year:+e.target.value}))} className="rpt-input-sm"/>
        <Form.Select value={ym.month} onChange={e=>setYm(p=>({...p,month:+e.target.value}))} className="rpt-select-sm">
          {Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={m}>{new Date(0,m-1).toLocaleString('id-ID',{month:'long'})}</option>)}
        </Form.Select>
      </div>
    </div>
    {q.isLoading&&<Card><Card.Body className="text-center py-4"><Spinner animation="border" size="sm"/><span className="ms-2">Memuat...</span></Card.Body></Card>}
    {q.isError&&<Alert variant="warning">Gagal memuat data.</Alert>}
    {d&&<>
      <Row className="g-3 mb-3">
        <Col xs={6} xl={3}><Card><Card.Body><div className="kpi-label">Revenue</div><div className="kpi-value">{formatCompactRupiah(d.current.totals.revenueRupiah)}</div><div className={`kpi-change ${d.change.revenueChangePercent>=0?'k48-kpi-positive':'k48-kpi-negative'}`}>{pct(d.change.revenueChangePercent)}</div></Card.Body></Card></Col>
        <Col xs={6} xl={3}><Card><Card.Body><div className="kpi-label">Beban</div><div className="kpi-value">{formatCompactRupiah(d.current.totals.expenseRupiah)}</div><div className={`kpi-change ${d.change.expenseChangePercent>=0?'k48-kpi-negative':'k48-kpi-positive'}`}>{pct(d.change.expenseChangePercent)}</div></Card.Body></Card></Col>
        <Col xs={6} xl={3}><Card><Card.Body><div className="kpi-label">Laba Bersih</div><div className={`kpi-value ${d.current.totals.netProfitRupiah>=0?'k48-kpi-positive':'k48-kpi-negative'}`}>{formatCompactRupiah(d.current.totals.netProfitRupiah)}</div><div className={`kpi-change ${d.change.netProfitChangePercent>=0?'k48-kpi-positive':'k48-kpi-negative'}`}>{pct(d.change.netProfitChangePercent)}</div></Card.Body></Card></Col>
        <Col xs={6} xl={3}><Card><Card.Body><div className="kpi-label">Margin</div><div className="kpi-value">{d.current.totals.netProfitMarginPercent}%</div></Card.Body></Card></Col>
      </Row>
      <Row className="g-3">
        <Col lg={6}><Card><Card.Header className="rpt-card-header">📈 Pendapatan</Card.Header><Card.Body className="p-0">
          <Table size="sm" className="mb-0"><thead><tr><th>Akun</th><th className="text-end">Bulan Ini</th><th className="text-end">Bulan Lalu</th><th className="text-end">Δ</th></tr></thead><tbody>
            {d.current.revenueLines.map((l,i)=><tr key={i}><td>{l.name}</td><td className="text-end">{formatCompactRupiah(l.amountRupiah)}</td><td className="text-end">{formatCompactRupiah(l.prevAmountRupiah)}</td><td className={`text-end ${l.changePercent>=0?'k48-kpi-positive':'k48-kpi-negative'}`}>{pct(l.changePercent)}</td></tr>)}
            <tr className="border-top fw-bold"><td>Total Pendapatan</td><td className="text-end">{formatCompactRupiah(d.current.totals.revenueRupiah)}</td><td className="text-end">{formatCompactRupiah(d.previous.totals.revenueRupiah)}</td><td className={`text-end ${d.change.revenueChangePercent>=0?'k48-kpi-positive':'k48-kpi-negative'}`}>{pct(d.change.revenueChangePercent)}</td></tr>
          </tbody></Table></Card.Body></Card></Col>
        <Col lg={6}><Card><Card.Header className="rpt-card-header">📉 Beban</Card.Header><Card.Body className="p-0">
          <Table size="sm" className="mb-0"><thead><tr><th>Akun</th><th className="text-end">Bulan Ini</th><th className="text-end">Bulan Lalu</th><th className="text-end">Δ</th></tr></thead><tbody>
            {d.current.expenseLines.map((l,i)=><tr key={i}><td>{l.name}</td><td className="text-end">{formatCompactRupiah(l.amountRupiah)}</td><td className="text-end">{formatCompactRupiah(l.prevAmountRupiah)}</td><td className={`text-end ${l.changePercent>=0?'k48-kpi-negative':'k48-kpi-positive'}`}>{pct(l.changePercent)}</td></tr>)}
            <tr className="border-top fw-bold"><td>Total Beban</td><td className="text-end">{formatCompactRupiah(d.current.totals.expenseRupiah)}</td><td className="text-end">{formatCompactRupiah(d.previous.totals.expenseRupiah)}</td><td className={`text-end ${d.change.expenseChangePercent>=0?'k48-kpi-negative':'k48-kpi-positive'}`}>{pct(d.change.expenseChangePercent)}</td></tr>
          </tbody></Table></Card.Body></Card></Col>
      </Row>
      <small className="text-muted mt-2 d-block">{d.note}</small>
    </>}
    <style>{`
      .kpi-label{font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px}
      .kpi-value{font-size:20px;font-weight:700;color:#0f172a;line-height:1.2}
      .kpi-change{font-size:12px;font-weight:600;margin-top:2px}
    `}</style>
  </Container>);
}
