import React, { useState } from 'react';
import { Alert, Badge, Button, Card, Col, Container, Form, Row, Spinner, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchFinancialRatios, type FinancialRatiosStatement } from '../../api/accounting';

function currentYearMonth() { const d=new Date(); return {year:d.getFullYear(),month:d.getMonth()+1}; }
function formatRupiah(v:number) { return new Intl.NumberFormat('id-ID').format(v||0); }
function formatCompact(v:number) {
  const s=Math.abs(v||0),sign=v<0?'-':''; if(s>=1e9)return `${sign}Rp${(s/1e9).toFixed(1)}M`;
  if(s>=1e6)return `${sign}Rp${(s/1e6).toFixed(1)}jt`; if(s>=1e3)return `${sign}Rp${(s/1e3).toFixed(0)}rb`;
  return `${sign}Rp${formatRupiah(s)}`;
}

function labelBadge(label:string,scheme:{BAIK:string,CUKUP:string,EFISIEN?:string,RENDAH?:string,BOROS?:string,TINGGI?:string}) {
  const colorMap:Record<string,string>={BAIK:'success',CUKUP:'warning',EFISIEN:'success',RENDAH:'secondary',BOROS:'danger',TINGGI:'danger'};
  return <Badge bg={colorMap[label]||'secondary'}>{label}</Badge>;
}

export default function FinancialRatiosPage() {
  const navigate=useNavigate();
  const [ym,setYm]=useState(currentYearMonth());
  const q=useQuery({queryKey:['accounting','ratios',ym],queryFn:()=>fetchFinancialRatios({year:ym.year,month:ym.month}),staleTime:60_000,retry:1});
  const d=q.data;
  return (<Container fluid className="px-2 py-3">
    <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
      <div><h1 className="mb-0" style={{fontSize:'1.5rem',fontWeight:700}}>Rasio Keuangan</h1><small className="text-muted">Analisis rasio dari Balance Sheet & P&L</small></div>
      <div className="d-flex gap-2">
        <Form.Control type="number" value={ym.year} min={2020} max={2100} onChange={e=>setYm(p=>({...p,year:+e.target.value}))} style={{width:80,height:32,fontSize:13}}/>
        <Form.Select value={ym.month} onChange={e=>setYm(p=>({...p,month:+e.target.value}))} style={{width:120,height:32,fontSize:13}}>
          {Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={m}>{new Date(0,m-1).toLocaleString('id-ID',{month:'long'})}</option>)}
        </Form.Select>
      </div>
    </div>
    {q.isLoading&&<Card><Card.Body className="text-center py-4"><Spinner animation="border" size="sm"/><span className="ms-2">Memuat...</span></Card.Body></Card>}
    {q.isError&&<Alert variant="warning">Gagal memuat data.</Alert>}
    {d&&<>
      {!d.formalStatementReady&&<Alert variant="warning" className="mb-3"><small>{d.note}</small></Alert>}
      <Row className="g-3 mb-3">
        <Col lg={6}><Card className="h-100"><Card.Header style={{fontWeight:600,fontSize:14,background:'#f8fafc'}}>💰 Likuiditas</Card.Header><Card.Body>
          <Table size="sm" className="mb-0"><tbody>
            <tr><td>Rasio Lancar</td><td className="text-end"><strong>{d.liquidity.currentRatio.toFixed(2)}</strong></td><td>{labelBadge(d.liquidity.label,{BAIK:'BAIK',CUKUP:'CUKUP',RENDAH:'RENDAH'})}</td></tr>
            <tr><td>Rasio Cepat</td><td className="text-end"><strong>{d.liquidity.quickRatio.toFixed(2)}</strong></td><td></td></tr>
            <tr><td>Rasio Kas</td><td className="text-end"><strong>{d.liquidity.cashRatio.toFixed(2)}</strong></td><td></td></tr>
            <tr><td>Modal Kerja</td><td className="text-end"><strong>{formatCompact(d.liquidity.workingCapitalRupiah)}</strong></td><td></td></tr>
          </tbody></Table></Card.Body></Card></Col>
        <Col lg={6}><Card className="h-100"><Card.Header style={{fontWeight:600,fontSize:14,background:'#f8fafc'}}>📈 Profitabilitas</Card.Header><Card.Body>
          <Table size="sm" className="mb-0"><tbody>
            <tr><td>Margin Laba Bersih</td><td className="text-end"><strong>{d.profitability.netProfitMarginPercent}%</strong></td><td>{labelBadge(d.profitability.label,{BAIK:'BAIK',CUKUP:'CUKUP',RENDAH:'RENDAH'})}</td></tr>
            <tr><td>Margin Laba Kotor</td><td className="text-end"><strong>{d.profitability.grossProfitMarginPercent}%</strong></td><td></td></tr>
            <tr><td>ROA</td><td className="text-end"><strong>{d.profitability.returnOnAssetsPercent}%</strong></td><td></td></tr>
            <tr><td>ROCE</td><td className="text-end"><strong>{d.profitability.returnOnCapitalEmployedPercent}%</strong></td><td></td></tr>
          </tbody></Table></Card.Body></Card></Col>
      </Row>
      <Row className="g-3 mb-3">
        <Col lg={6}><Card><Card.Header style={{fontWeight:600,fontSize:14,background:'#f8fafc'}}>🏦 Solvabilitas</Card.Header><Card.Body>
          <Table size="sm" className="mb-0"><tbody>
            <tr><td>Debt-to-Equity</td><td className="text-end"><strong>{d.solvency.debtToEquity.toFixed(2)}</strong></td><td>{labelBadge(d.solvency.label,{BAIK:'RENDAH',CUKUP:'CUKUP',RENDAH:'TINGGI'})}</td></tr>
            <tr><td>Debt Ratio</td><td className="text-end"><strong>{d.solvency.debtRatio.toFixed(2)}</strong></td><td></td></tr>
          </tbody></Table></Card.Body></Card></Col>
        <Col lg={6}><Card><Card.Header style={{fontWeight:600,fontSize:14,background:'#f8fafc'}}>⚙️ Efisiensi</Card.Header><Card.Body>
          <Table size="sm" className="mb-0"><tbody>
            <tr><td>Rasio Beban</td><td className="text-end"><strong>{d.efficiency.expenseRatioPercent}%</strong></td><td>{labelBadge(d.efficiency.label,{BAIK:'EFISIEN',CUKUP:'CUKUP',EFISIEN:'BOROS'})}</td></tr>
            <tr><td>Okupansi</td><td className="text-end"><strong>{d.efficiency.occupancyRatePercent}%</strong></td><td></td></tr>
          </tbody></Table></Card.Body></Card></Col>
      </Row>
      <Card className="mb-3"><Card.Header style={{fontWeight:600,fontSize:14,background:'#f8fafc'}}>📋 Kesiapan Data</Card.Header><Card.Body>
        <div className="d-flex flex-wrap gap-3">
          <span>Trial Balance: <Badge bg={d.readiness.trialBalanceBalanced?'success':'warning'}>{d.readiness.trialBalanceBalanced?'Balanced':'Belum'}</Badge></span>
          <span>Balance Sheet: <Badge bg={d.readiness.balanceSheetReady?'success':'warning'}>{d.readiness.balanceSheetReady?'Siap':'Parsial'}</Badge></span>
          <span>Kas & Bank: <Badge bg={d.readiness.cashAndBankAvailable?'success':'secondary'}>{d.readiness.cashAndBankAvailable?'Ada':'Kosong'}</Badge></span>
          <span>Kewajiban Lancar: <Badge bg={d.readiness.currentLiabilitiesAvailable?'success':'secondary'}>{d.readiness.currentLiabilitiesAvailable?'Ada':'Kosong'}</Badge></span>
          <span>Ekuitas: <Badge bg={d.readiness.equityAvailable?'success':'secondary'}>{d.readiness.equityAvailable?'Ada':'Kosong'}</Badge></span>
        </div>
        {!d.formalStatementReady ? (
          <Button variant="outline-primary" size="sm" className="mt-3" onClick={()=>navigate('/finance/accounting-setup')}>
            Lengkapi setup akuntansi
          </Button>
        ) : null}
      </Card.Body></Card>
      <small className="text-muted">{d.note}</small>
    </>}
    <style>{`
      .kpi-label{font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px}
      .kpi-value{font-size:20px;font-weight:700;color:#0f172a;line-height:1.2}
    `}</style>
  </Container>);
}