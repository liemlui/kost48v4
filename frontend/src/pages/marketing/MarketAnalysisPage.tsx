import { useRef, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../../components/common/PageHeader';
import SegmentedTabs from '../../components/common/SegmentedTabs';
import EmptyState from '../../components/common/EmptyState';
import CacClvDashboard from './CacClvDashboard';
import { getApiErrorMessage } from '../../utils/getApiErrorMessage';
import { getSurveySummary } from '../../api/surveys';
import {
  deleteMarketAnalysis,
  getCacClvSnapshot,
  getMarketAnalysisStatus,
  getMarketSnapshot,
  listMarketAnalyses,
  marketAnalysisChat,
  saveMarketAnalysis,
  type AnalysisKind,
  type ChatTurn,
  type MarketAnalysis,
} from '../../api/marketAnalysis';

const KIND_LABELS: Record<string, string> = {
  strengths: 'Kekuatan (Strengths)', weaknesses: 'Kelemahan (Weaknesses)',
  opportunities: 'Peluang (Opportunities)', threats: 'Ancaman (Threats)',
  recommendations: 'Rekomendasi', political: 'Politik', economic: 'Ekonomi', social: 'Sosial',
  technological: 'Teknologi', legal: 'Hukum', environmental: 'Lingkungan',
  competitors: 'Kompetitor', positioning: 'Positioning',
};
const labelFor = (k: string) => KIND_LABELS[k] ?? k.charAt(0).toUpperCase() + k.slice(1);

function ResultView({ result }: { result: Record<string, unknown> }) {
  const entries = Object.entries(result).filter(([k]) => k !== 'summary');
  return (
    <div>
      {result.summary ? <p className="mb-3"><strong>Ringkasan:</strong> {String(result.summary)}</p> : null}
      <Row className="g-2">
        {entries.map(([k, v]) => (
          <Col md={6} key={k}>
            <Card className="h-100 border-0 shadow-sm"><Card.Body className="py-2">
              <div className="fw-semibold mb-1">{labelFor(k)}</div>
              {Array.isArray(v) ? (
                <ul className="mb-0 ps-3 small">
                  {v.map((item, i) => (
                    <li key={i}>{typeof item === 'string' ? item : (item as any)?.name ? `${(item as any).name} — ${(item as any).priceNote ?? ''}` : JSON.stringify(item)}</li>
                  ))}
                </ul>
              ) : (
                <div className="small">{String(v)}</div>
              )}
            </Card.Body></Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}

export default function MarketAnalysisPage() {
  const queryClient = useQueryClient();
  // view: 'chat' = SWOT/PESTLE/Kompetitor + saved; 'cacclv' = CAC/CLV dashboard
  const [view, setView] = useState<'chat' | 'cacclv'>('chat');
  const [kind, setKind] = useState<AnalysisKind>('SWOT');
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [finalResult, setFinalResult] = useState<Record<string, unknown> | null>(null);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const statusQuery = useQuery({ queryKey: ['market-analysis-status'], queryFn: getMarketAnalysisStatus });
  const savedQuery = useQuery({ queryKey: ['market-analysis-list'], queryFn: listMarketAnalyses });
  const surveyQuery = useQuery({ queryKey: ['survey-summary'], queryFn: getSurveySummary });
  const snapshotQuery = useQuery({ queryKey: ['market-snapshot'], queryFn: getMarketSnapshot });
  const cacClvQuery = useQuery({ queryKey: ['cac-clv'], queryFn: () => getCacClvSnapshot(), enabled: view === 'cacclv' });
  const configured = statusQuery.data?.configured ?? true;

  const chatMutation = useMutation({
    mutationFn: (msgs: ChatTurn[]) => marketAnalysisChat(kind, msgs),
    onSuccess: (res) => {
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }]);
      if (res.done && res.result) setFinalResult(res.result);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 50);
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Gagal memanggil analis AI.')),
  });

  const saveMutation = useMutation({
    mutationFn: () => saveMarketAnalysis({
      kind, title: title.trim() || `Analisa ${kind} ${new Date().toLocaleDateString('id-ID')}`,
      summary: typeof finalResult?.summary === 'string' ? (finalResult!.summary as string) : undefined,
      resultJson: finalResult ?? undefined, transcript: messages,
    }),
    onSuccess: () => { setError(''); queryClient.invalidateQueries({ queryKey: ['market-analysis-list'] }); },
    onError: (e) => setError(getApiErrorMessage(e, 'Gagal menyimpan analisa.')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteMarketAnalysis(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['market-analysis-list'] }),
  });

  const busy = chatMutation.isPending;
  const send = (text: string) => {
    const t = text.trim(); if (!t || busy) return;
    const next = [...messages, { role: 'user' as const, content: t }];
    setMessages(next); setInput(''); chatMutation.mutate(next);
  };
  const start = () => {
    setMessages([]); setFinalResult(null); setError('');
    chatMutation.reset();
    const kickoff: ChatTurn = { role: 'user', content: `Tolong pandu saya menyusun analisa ${kind} untuk kos KOST48. Mulai dengan 1-2 pertanyaan pertama.` };
    setMessages([kickoff]); chatMutation.mutate([kickoff]);
  };

  const saved = savedQuery.data ?? [];

  return (
    <div className="container py-4">
      <PageHeader eyebrow="Marketing & Strategi" title="Analisa Pasar & CAC/CLV" description="Ditemani analis AI DeepSeek: wawancara SWOT/PESTLE/Kompetitor, atau dashboard CAC/CLV berbasis data nyata." />

      {!configured ? (
        <Alert variant="warning">
          <strong>DeepSeek belum aktif.</strong> Setel <code>DEEPSEEK_API_KEY</code> di <code>backend/.env</code> lalu restart backend.
          Tanpa key, chat berjalan mode panduan saja.
        </Alert>
      ) : null}
      {error ? <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert> : null}

      {/* Toggle view: Chat vs CAC/CLV */}
      <SegmentedTabs
        ariaLabel="Mode analisa"
        size="md"
        value={view}
        onChange={(v) => { setView(v as 'chat' | 'cacclv'); setError(''); }}
        items={[
          { key: 'chat', label: 'Analisa SWOT/PESTLE', icon: '🧠' },
          { key: 'cacclv', label: 'CAC/CLV Dashboard', icon: '📊' },
        ]}
      />

      {view === 'cacclv' ? (
        <CacClvDashboard snapshotQuery={cacClvQuery} />
      ) : (
        <Row className="g-4 mt-0">
          <Col lg={7}>
            <Card className="content-card border-0 mb-3">
              <Card.Body>
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                  <strong>🤖 Sesi analisa</strong>
                  <Button size="sm" variant="primary" onClick={start} disabled={busy}>
                    {busy && !messages.length ? <Spinner size="sm" /> : `Mulai analisa ${kind}`}
                  </Button>
                </div>
                <SegmentedTabs
                  ariaLabel="Jenis analisa"
                  size="sm"
                  value={kind}
                  onChange={(k) => { setKind(k as AnalysisKind); }}
                  items={[
                    { key: 'SWOT', label: 'SWOT', icon: '🧭' },
                    { key: 'PESTLE', label: 'PESTLE', icon: '🌐' },
                    { key: 'COMPETITOR', label: 'Kompetitor', icon: '🏷️' },
                  ]}
                />

                <div ref={scrollRef} className="mt-3" style={{ maxHeight: 420, overflowY: 'auto' }}>
                  {!messages.length ? (
                    <EmptyState icon="💬" title="Belum ada percakapan" description={`Klik "Mulai analisa ${kind}" — AI akan bertanya soal okupansi, tarif, kompetitor, dll.`} />
                  ) : messages.map((m, i) => (
                    <div key={i} className={`d-flex mb-2 ${m.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                      <div className={`p-2 px-3 rounded-3 ${m.role === 'user' ? 'bg-primary text-white' : 'bg-light border'}`} style={{ maxWidth: '85%', whiteSpace: 'pre-wrap' }}>
                        <div className="small" style={{ fontSize: '0.6rem', opacity: 0.7 }}>{m.role === 'user' ? 'Kamu' : 'Analis AI'}</div>
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {busy && messages.length ? <div className="text-muted small"><Spinner size="sm" /> Analis AI mengetik…</div> : null}
                </div>

                <Form
                  className="d-flex gap-2 mt-2"
                  onSubmit={(e) => { e.preventDefault(); send(input); }}
                >
                  <Form.Control
                    placeholder={messages.length ? 'Tulis jawaban / pertanyaan…' : 'Mulai sesi dulu di atas'}
                    value={input}
                    disabled={busy || !messages.length}
                    onChange={(e) => setInput(e.target.value)}
                  />
                  <Button type="submit" disabled={busy || !input.trim()}>Kirim</Button>
                </Form>
              </Card.Body>
            </Card>

            {finalResult ? (
              <Card className="content-card border-0 mb-3">
                <Card.Body>
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                    <strong>📊 Hasil {kind}</strong>
                    <Badge bg="success">Siap disimpan</Badge>
                  </div>
                  <ResultView result={finalResult} />
                  <Form className="d-flex gap-2 mt-3" onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}>
                    <Form.Control placeholder={`Judul (mis. Analisa ${kind} Q3)`} value={title} onChange={(e) => setTitle(e.target.value)} />
                    <Button type="submit" variant="success" disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? <Spinner size="sm" /> : 'Simpan'}
                    </Button>
                  </Form>
                  {saveMutation.isSuccess ? <div className="text-success small mt-1">✓ Tersimpan.</div> : null}
                </Card.Body>
              </Card>
            ) : null}
          </Col>

          <Col lg={5}>
            <Card className="content-card border-0">
              <Card.Header className="bg-white"><strong>Analisa tersimpan</strong></Card.Header>
              <Card.Body className="p-0">
                {savedQuery.isLoading ? <div className="p-3 text-center"><Spinner size="sm" /></div> : null}
                {!savedQuery.isLoading && !saved.length ? <div className="p-3 text-muted small">Belum ada analisa tersimpan.</div> : null}
                <ul className="list-group list-group-flush">
                  {saved.map((a: MarketAnalysis) => (
                    <li key={a.id} className="list-group-item">
                      <div className="d-flex justify-content-between align-items-start gap-2">
                        <div>
                          <Badge bg="secondary" className="me-2">{a.kind}</Badge>
                          <span className="fw-semibold">{a.title}</span>
                          {a.summary ? <div className="text-muted small mt-1">{a.summary}</div> : null}
                          <div className="text-muted" style={{ fontSize: '0.7rem' }}>{new Date(a.createdAt).toLocaleString('id-ID')} · {a.createdBy?.fullName ?? '—'}</div>
                        </div>
                        <Button size="sm" variant="outline-danger" onClick={() => deleteMutation.mutate(a.id)} disabled={deleteMutation.isPending}>Hapus</Button>
                      </div>
                      {a.resultJson ? <details className="mt-2"><summary className="small text-muted">Lihat hasil</summary><div className="mt-2"><ResultView result={a.resultJson as Record<string, unknown>} /></div></details> : null}
                    </li>
                  ))}
                </ul>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
}
