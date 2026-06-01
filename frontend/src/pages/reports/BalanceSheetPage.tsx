import React, { useState } from 'react';
import { Alert, Badge, Card, Col, Container, Form, Row, Spinner, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { fetchBalanceSheetDetail, type BalanceSheetDetail } from '../../api/accounting';

function currentYearMonth() { const d=new Date(); return {year:d.getFullYear(),month:d.getMonth()+1}; }
function formatRupiah(v:number) { return new Intl.NumberFormat('id-ID').format(v||0); }
function formatCompact(v:number) {
  const s=Math.abs(v||0),sign=v<0?'-':''; if(s>=1e9)return `${sign}Rp${(s/1e9).toFixed(1)}M`;
  if(s>=1e6)return `${sign}Rp${(s/1e6).toFixed(1)}jt`; if(s>=1e3)return `${sign}Rp${(s/1e3).toFixed(0)}rb`;
  return `${sign}Rp${formatRupiah(s)}`;
}
function pct(v:number) { return `${v>=0?'+':''}${v.toFixed(1)}%`; }

export default function BalanceSheetPage() {
  const [ym,setYm]=useState(currentYearMonth());
  const q=useQuery({queryKey:['accounting','bs',ym],queryFn:()=>fetchBalanceSheetDetail({year:ym.year,month:ym.month}),staleTime:60_000,retry:1});
  const d=q.data;
  return (<Container fluid className="px-2 py-3">
    <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
      <div><h1 className="mb-0" style={{fontSize:'1.5rem',fontWeight:700}}>Neraca</h1><small className="text-muted">Balance sheet dengan perbandingan bulan lalu</small></div>
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
      <Row className="g-3 mb-3">
        <Col xs={6} xl={3}><Card><Card.Body><div className="kpi-label">Total Aset</div><div className="kpi-value">{formatCompact(d.current.statement.assetsRupiah)}</div><div className="kpi-change" style={{color:d.change.assetsChangePercent>=0?'#22c55e':'#ef4444'}}>{pct(d.change.assetsChangePercent)}</div></Card.Body></Card></Col>
        <Col xs={6} xl={3}><Card><Card.Body><div className="kpi-label">Kewajiban</div><div className="kpi-value">{formatCompact(d.current.statement.liabilitiesRupiah)}</div><div className="kpi-change" style={{color:d.change.liabilitiesChangePercent>=0?'#ef4444':'#22c55e'}}>{pct(d.change.liabilitiesChangePercent)}</div></Card.Body></Card></Col>
        <Col xs={6} xl={3}><Card><Card.Body><div className="kpi-label">Ekuitas</div><div className="kpi-value">{formatCompact(d.current.statement.equityRupiah)}</div><div className="kpi-change" style={{color:d.change.equityChangePercent>=0?'#22c55e':'#ef4444'}}>{pct(d.change.equityChangePercent)}</div></Card.Body></Card></Col>
        <Col xs={6} xl={3}><Card><Card.Body><div className="kpi-label">Status</div><div className="kpi-value"><Badge bg={d.current.statement.balanced?'success':'warning'}>{d.current.statement.balanced?'Balance':'Tidak Balance'}</Badge></div></Card.Body></Card></Col>
      </Row>
      <Row className="g-3">
        <Col lg={4}><Card><Card.Header style={{fontWeight:600,fontSize:14,background:'#f8fafc'}}>🏦 Aset</Card.Header><Card.Body className="p-0">
          <Table size="sm" className="mb-0"><thead><tr><th>Akun</th><th className="text-end">Nilai</th></tr></thead><tbody>
            {d.current.lines?.assets?.map((l:any,i:number)=>l.balanceRupiah!==0&&<tr key={i}><td style={{paddingLeft:l.isContraAsset?24:12}}>{l.presentationLabel??l.name}</td><td className="text-end">{formatCompact(l.balanceRupiah)}</td></tr>)}
            <tr className="border-top fw-bold"><td>Total Aset</td><td className="text-end">{formatCompact(d.current.statement.assetsRupiah)}</td></tr>
          </tbody></Table></Card.Body></Card></Col>
        <Col lg={4}><Card><Card.Header style={{fontWeight:600,fontSize:14,background:'#f8fafc'}}>💳 Kewajiban</Card.Header><Card.Body className="p-0">
          <Table size="sm" className="mb-0"><thead><tr><th>Akun</th><th className="text-end">Nilai</th></tr></thead><tbody>
            {d.current.lines?.liabilities?.map((l:any,i:number)=>l.balanceRupiah!==0&&<tr key={i}><td style={{paddingLeft:12}}>{l.presentationLabel??l.name}</td><td className="text-end">{formatCompact(l.balanceRupiah)}</td></tr>)}
            <tr className="border-top fw-bold"><td>Total Kewajiban</td><td className="text-end">{formatCompact(d.current.statement.liabilitiesRupiah)}</td></tr>
          </tbody></Table></Card.Body></Card></Col>
        <Col lg={4}><Card><Card.Header style={{fontWeight:600,fontSize:14,background:'#f8fafc'}}>📊 Ekuitas</Card.Header><Card.Body className="p-0">
          <Table size="sm" className="mb-0"><thead><tr><th>Akun</th><th className="text-end">Nilai</th></tr></thead><tbody>
            {d.current.lines?.equity?.map((l:any,i:number)=>l.balanceRupiah!==0&&<tr key={i}><td style={{paddingLeft:12}}>{l.presentationLabel??l.name}</td><td className="text-end">{formatCompact(l.balanceRupiah)}</td></tr>)}
            <tr className="border-top fw-bold"><td>Total Ekuitas</td><td className="text-end">{formatCompact(d.current.statement.equityRupiah)}</td></tr>
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