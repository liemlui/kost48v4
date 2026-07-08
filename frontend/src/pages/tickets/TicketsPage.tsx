// FILE: TicketsPage.tsx — halaman daftar tiket + filter + aksi admin/staff
import FeatureErrorBoundary from '../../components/common/FeatureErrorBoundary';
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Modal,
  Row,
  Table,
} from "react-bootstrap";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import PaginationControls from "../../components/common/PaginationControls";
import EmptyState from "../../components/common/EmptyState";
import ClickableRow from "../../components/common/ClickableRow";
import { TableSkeleton } from "../../components/common/SkeletonLoader";
import StatusBadge from "../../components/common/StatusBadge";
import CameraOrGalleryInput from "../../components/common/CameraOrGalleryInput";
import SafeImage from "../../components/common/SafeImage";
import AdminStaffFieldReportQueue from "../../components/staff/AdminStaffFieldReportQueue";
import AiResultPanel from "../../components/ai/AiResultPanel";
import { inventoryItemFinalStatusOptions, roomItemFinalStatusOptions } from "../../constants/staffRepairOptions";
import { listResource, postAction } from "../../api/resources";
import { uploadTicketImage } from "../../api/mediaUploads";
import { draftTicketAction, getOwnerAiStatus, type TicketActionDraftResult } from "../../api/ai";
import { useAuth } from "../../context/AuthContext";
import {
  type TicketItem,
  type UserOption,
  type StatusTab,
  formatDate,
  formatRelations,
  compressImageFile,
  getStaffStatusText,
  ticketHasRoomItemDecision,
  ticketHasInventoryDecision,
  getStatusClass,
} from "./ticketsShared";
import StaffTicketsMode from "./TicketsStaffMode";

// ═══════════════════════════════════════════════════════════
//  COMPONENT: TicketAnalyticsPanel
// ═══════════════════════════════════════════════════════════

function TicketAnalyticsPanel({ items, counts }: { items: TicketItem[]; counts: { all: number; open: number; inProgress: number; done: number; closed: number } }) {
  const statusData = [
    { name: 'Baru', value: counts.open, color: '#ef4444' },
    { name: 'Dikerjakan', value: counts.inProgress, color: '#f59e0b' },
    { name: 'Selesai', value: counts.done, color: '#2563eb' },
    { name: 'Ditutup', value: counts.closed, color: '#16a34a' },
  ].filter((d) => d.value > 0);

  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((item) => {
      const cat = (item as any).category ?? 'Lainnya';
      const label = cat === 'ROOM_REPAIR' ? 'Perbaikan Kamar' : cat === 'CHECKOUT_INSPECTION' ? 'Cek Keluar' : cat === 'CLEANING' ? 'Kebersihan' : cat === 'GENERAL' ? 'Umum' : String(cat);
      counts[label] = (counts[label] ?? 0) + 1;
    });
    const colors = ['#2563eb', '#f59e0b', '#16a34a', '#ef4444', '#7c3aed', '#0ea5e9'];
    return Object.entries(counts).map(([label, value], i) => ({ label, value, color: colors[i % colors.length] })).sort((a, b) => b.value - a.value);
  }, [items]);

  const agingData = useMemo(() => {
    const now = Date.now();
    const buckets = { 'Hari ini': 0, '1–3 hari': 0, '3–7 hari': 0, '7+ hari': 0 };
    items.filter((t) => ['OPEN', 'IN_PROGRESS'].includes(t.status)).forEach((t) => {
      const created = new Date((t as any).createdAt ?? 0).getTime();
      const days = Math.floor((now - created) / 86400000);
      if (days === 0) buckets['Hari ini']++;
      else if (days <= 3) buckets['1–3 hari']++;
      else if (days <= 7) buckets['3–7 hari']++;
      else buckets['7+ hari']++;
    });
    const colors: Record<string, string> = { 'Hari ini': '#16a34a', '1–3 hari': '#f59e0b', '3–7 hari': '#f97316', '7+ hari': '#ef4444' };
    return Object.entries(buckets).map(([label, value]) => ({ label, value, color: colors[label] }));
  }, [items]);

  if (counts.all === 0) return null;

  const donutTotal = statusData.reduce((s, d) => s + d.value, 0);

  return (
    <Row className="g-3 mb-3 ticket-analytics-row">
      <Col md={4}>
        <Card className="content-card border-0 h-100">
          <Card.Body>
            <div className="panel-title mb-1">Status Tiket</div>
            <div className="panel-subtitle mb-2">Komposisi tiket aktif saat ini</div>
            <div className="stay-analytics-donut-wrap">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={70} paddingAngle={2} stroke="none">
                    {statusData.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: unknown, name: unknown) => [`${Number(v ?? 0)} tiket`, String(name ?? '')]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="stay-analytics-donut-center"><strong>{donutTotal}</strong><span>Total</span></div>
            </div>
            <div className="stay-analytics-legend">
              {statusData.map((d) => <span key={d.name}><i style={{ background: d.color }} />{d.name}: {d.value}</span>)}
            </div>
          </Card.Body>
        </Card>
      </Col>
      <Col md={4}>
        <Card className="content-card border-0 h-100">
          <Card.Body>
            <div className="panel-title mb-1">Kategori Tiket</div>
            <div className="panel-subtitle mb-2">Jenis pekerjaan yang masuk</div>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart layout="vertical" data={categoryData} margin={{ top: 4, right: 48, bottom: 4, left: 4 }}>
                  <CartesianGrid horizontal={false} stroke="rgba(148,163,184,0.18)" strokeDasharray="3 3" />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="label" width={110} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: unknown) => [`${Number(v ?? 0)} tiket`, '']} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} background={{ fill: 'rgba(148,163,184,0.10)' }}>
                    {categoryData.map((d) => <Cell key={d.label} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="text-muted small mt-4 text-center">Belum ada data kategori</div>}
          </Card.Body>
        </Card>
      </Col>
      <Col md={4}>
        <Card className="content-card border-0 h-100">
          <Card.Body>
            <div className="panel-title mb-1">Umur Tiket Aktif</div>
            <div className="panel-subtitle mb-2">Tiket Open/In Progress berdasarkan usia</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart layout="vertical" data={agingData} margin={{ top: 4, right: 48, bottom: 4, left: 4 }}>
                <CartesianGrid horizontal={false} stroke="rgba(148,163,184,0.18)" strokeDasharray="3 3" />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="label" width={72} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: unknown) => [`${Number(v ?? 0)} tiket`, '']} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} background={{ fill: 'rgba(148,163,184,0.10)' }}>
                  {agingData.map((d) => <Cell key={d.label} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}

// ═══════════════════════════════════════════════════════════
//  COMPONENT: TicketsPage — State & Data Fetching
// ═══════════════════════════════════════════════════════════

export default function TicketsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [assignMap, setAssignMap] = useState<Record<number, string>>({});
  const [activeTab, setActiveTab] = useState<StatusTab>("OPEN");
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const [createForm, setCreateForm] = useState({
    category: 'KEBERSIHAN',
    title: '',
    description: '',
    assignedToId: '',
    fromLocation: '',
    toLocation: '',
    itemName: '',
    itemQty: '',
  });
  const [page, setPage] = useState(1);
  const [doneTicket, setDoneTicket] = useState<TicketItem | null>(null);
  const [detailTicket, setDetailTicket] = useState<TicketItem | null>(null);
  const [ticketAiResult, setTicketAiResult] = useState<TicketActionDraftResult | null>(null);
  const [ticketAiError, setTicketAiError] = useState("");
  const [resolutionNote, setResolutionNote] = useState("Sudah dikerjakan");
  const [resolutionImageMeta, setResolutionImageMeta] = useState<any>(null);
  const [resolutionPreview, setResolutionPreview] = useState<string | null>(
    null,
  );
  const [closeTicket, setCloseTicket] = useState<TicketItem | null>(null);
  const [finalRoomItemStatus, setFinalRoomItemStatus] = useState("GOOD");
  const [finalInventoryItemStatus, setFinalInventoryItemStatus] =
    useState("GOOD");
  const [finalAdminNote, setFinalAdminNote] = useState("");
  const [adminCheckedEvidence, setAdminCheckedEvidence] = useState(false);
  const [adminCheckedFinalImpact, setAdminCheckedFinalImpact] = useState(false);
  const [closeSubmitAttempted, setCloseSubmitAttempted] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const PAGE_SIZE = 5;
  const ticketsQuery = useQuery({
    queryKey: ["tickets"],
    queryFn: () => listResource<TicketItem>("/tickets", { limit: 200 }),
  });
  const usersQuery = useQuery({
    queryKey: ["ticket-assignees"],
    queryFn: () => listResource<UserOption>("/users", { limit: 100 }),
  });

  const simpleAction = useMutation({
    mutationFn: ({ path, payload }: { path: string; payload?: any }) =>
      postAction(path, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tickets"] }),
        queryClient.invalidateQueries({
          queryKey: ["staff-performance-me-dashboard"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["staff-performance-me-evidence"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["admin-staff-performance"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["staff-field-report-review-queue"],
        }),
      ]);
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: (payload: any) => postAction('/tickets', payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setShowCreateTicket(false);
      setCreateForm({ category: 'KEBERSIHAN', title: '', description: '', assignedToId: '', fromLocation: '', toLocation: '', itemName: '', itemQty: '' });
    },
  });

  const ticketAiMutation = useMutation({
    mutationFn: (ticketId: number) => draftTicketAction(ticketId),
    onSuccess: (result) => {
      setTicketAiResult(result);
      setTicketAiError("");
    },
    onError: (err: any) => {
      setTicketAiResult(null);
      setTicketAiError(err?.response?.data?.message || err?.message || "Gagal meminta saran AI.");
    },
  });

  const items = useMemo(
    () => ticketsQuery.data?.items ?? [],
    [ticketsQuery.data],
  );
  const assignableUsers = useMemo(
    () =>
      (usersQuery.data?.items ?? []).filter((item) => item.role === "STAFF"),
    [usersQuery.data],
  );

  const counts = {
    all: items.length,
    open: items.filter((i) => i.status === "OPEN").length,
    inProgress: items.filter((i) => i.status === "IN_PROGRESS").length,
    done: items.filter((i) => i.status === "DONE").length,
    closed: items.filter((i) => i.status === "CLOSED").length,
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) =>
      activeTab === "ALL" ? true : item.status === activeTab,
    );
  }, [items, activeTab]);
  const visibleItems = filteredItems.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));

  const canAssign = user?.role === "OWNER" || user?.role === "ADMIN";
  const ownerAiStatusQuery = useQuery({
    queryKey: ["owner-ai", "status", "tickets"],
    queryFn: getOwnerAiStatus,
    enabled: canAssign,
    staleTime: 300_000,
    retry: 1,
  });
  const canUseTicketAi = canAssign && ownerAiStatusQuery.data?.configured === true;
  const canProgress =
    user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "STAFF";

  // ═══════════════════════════════════════════════════════════
  //  SECTION: Handlers — MarkDone, Close, TabChange
  // ═══════════════════════════════════════════════════════════

  const handleResolutionImage = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const compressed = await compressImageFile(file);
    const uploaded = await uploadTicketImage(compressed);
    setResolutionImageMeta(uploaded);
    setResolutionPreview(uploaded.fileUrl);
    event.target.value = "";
  };

  const submitMarkDone = () => {
    if (!doneTicket) return;
    simpleAction.mutate({
      path: `/tickets/${doneTicket.id}/mark-done`,
      payload: {
        resolutionNote,
        resolutionImageUrl: resolutionImageMeta?.fileUrl,
        resolutionImageFileKey: resolutionImageMeta?.fileKey,
        resolutionImageOriginalFilename: resolutionImageMeta?.originalFilename,
        resolutionImageMimeType: resolutionImageMeta?.mimeType,
        resolutionImageFileSizeBytes: resolutionImageMeta?.fileSizeBytes,
      },
    });
    setDoneTicket(null);
    setResolutionPreview(null);
    setResolutionImageMeta(null);
    setResolutionNote("Sudah dikerjakan");
  };

  const submitCloseTicket = () => {
    if (!closeTicket) return;
    if (
      finalAdminNote.trim().length < 8 ||
      !adminCheckedEvidence ||
      !adminCheckedFinalImpact
    ) {
      setCloseSubmitAttempted(true);
      return;
    }
    simpleAction.mutate({
      path: `/tickets/${closeTicket.id}/close`,
      payload: {
        action: "CLOSE",
        finalRoomItemStatus: ticketHasRoomItemDecision(closeTicket)
          ? finalRoomItemStatus
          : undefined,
        finalInventoryItemStatus: ticketHasInventoryDecision(closeTicket)
          ? finalInventoryItemStatus
          : undefined,
        finalAdminNote: finalAdminNote.trim(),
      },
    });
    setCloseTicket(null);
    setFinalRoomItemStatus("GOOD");
    setFinalInventoryItemStatus("GOOD");
    setFinalAdminNote("");
    setAdminCheckedEvidence(false);
    setAdminCheckedFinalImpact(false);
    setCloseSubmitAttempted(false);
  };

  useEffect(() => {
    if (closeTicket) {
      setFinalRoomItemStatus("GOOD");
      setFinalInventoryItemStatus("GOOD");
      setFinalAdminNote("");
      setAdminCheckedEvidence(false);
      setAdminCheckedFinalImpact(false);
      setCloseSubmitAttempted(false);
    }
  }, [closeTicket?.id]);

  useEffect(() => {
    setTicketAiResult(null);
    setTicketAiError("");
    ticketAiMutation.reset();
  }, [detailTicket?.id]);

  const isClosingCheckoutInspection =
    String(closeTicket?.category ?? "").toUpperCase() === "CHECKOUT_INSPECTION";
  const closeNoteInvalid = closeSubmitAttempted && finalAdminNote.trim().length < 8;
  const canConfirmCloseTicket =
    Boolean(closeTicket) &&
    finalAdminNote.trim().length >= 8 &&
    adminCheckedEvidence &&
    adminCheckedFinalImpact;

  const tabs: { key: StatusTab; label: string; count: number; cls?: string }[] =
    [
      { key: "ALL", label: "Semua", count: counts.all },
      { key: "OPEN", label: "🔴 Baru", count: counts.open, cls: "tab-danger" },
      {
        key: "IN_PROGRESS",
        label: "🟡 Dikerjakan",
        count: counts.inProgress,
        cls: "tab-warn",
      },
      {
        key: "DONE",
        label: "✅ Selesai",
        count: counts.done,
        cls: "tab-success",
      },
      { key: "CLOSED", label: "Ditutup", count: counts.closed },
    ];

  const handleTabChange = (tab: StatusTab) => {
    setActiveTab(tab);
    setPage(1);
  };

  // ═══════════════════════════════════════════════════════════
  //  SECTION: Render
  // ═══════════════════════════════════════════════════════════

  if (user?.role === "STAFF") {
    return (
      <>
        <StaffTicketsMode
          items={items}
          isLoading={ticketsQuery.isLoading}
          isError={ticketsQuery.isError}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          simpleAction={simpleAction}
          setDoneTicket={setDoneTicket}
        />

        <Modal
          show={Boolean(detailTicket)}
          onHide={() => setDetailTicket(null)}
          centered
          size="lg"
        >
          <Modal.Header closeButton>
            <Modal.Title>
              {detailTicket?.ticketNumber ?? `Tiket #${detailTicket?.id ?? ""}`}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {detailTicket ? (
              <>
                <div className="entity-detail-grid mb-3">
                  <div className="entity-detail-item">
                    <span>Status</span>
                    <strong>
                      <StatusBadge status={detailTicket.status} />
                    </strong>
                  </div>
                  <div className="entity-detail-item">
                    <span>Lokasi / orang</span>
                    <strong>{formatRelations(detailTicket)}</strong>
                  </div>
                  <div className="entity-detail-item">
                    <span>Petugas</span>
                    <strong>
                      {detailTicket.assignedToId
                        ? `Petugas #${detailTicket.assignedToId}`
                        : "Belum ditugaskan"}
                    </strong>
                  </div>
                  <div className="entity-detail-item">
                    <span>Diperbarui</span>
                    <strong>
                      {formatDate(
                        detailTicket.updatedAt || detailTicket.createdAt,
                      )}
                    </strong>
                  </div>
                </div>
                <h6 className="fw-semibold">
                  {detailTicket.title || `Tiket #${detailTicket.id}`}
                </h6>
                <p className="text-muted mb-0">
                  {detailTicket.description || "Tidak ada deskripsi tambahan."}
                </p>
              </>
            ) : null}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" onClick={() => setDetailTicket(null)}>
              Tutup
            </Button>
            {detailTicket?.status === "DONE" ? (
              <Button
                variant="success"
                onClick={() => {
                  if (detailTicket) {
                    setCloseTicket(detailTicket);
                    setDetailTicket(null);
                  }
                }}
              >
                Konfirmasi Admin
              </Button>
            ) : null}
          </Modal.Footer>
        </Modal>

        <Modal
          show={Boolean(doneTicket)}
          onHide={() => setDoneTicket(null)}
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>Kirim Bukti Selesai</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Alert variant="info" className="py-2 small">
              Staff mengirim bukti kerja. Admin tetap cek dan menutup tiket
              final.
            </Alert>
            <Form.Group className="mb-3">
              <Form.Label>Catatan hasil kerja</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.currentTarget.value)}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Foto bukti selesai</Form.Label>
              <CameraOrGalleryInput onChange={handleResolutionImage} />
              {resolutionPreview ? (
                <div className="mt-2">
                  <SafeImage
                    src={resolutionPreview}
                    alt="Foto yang dipilih"
                    style={{
                      width: 120,
                      height: 80,
                      objectFit: "cover",
                      borderRadius: 8,
                    }}
                  />
                </div>
              ) : null}
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setDoneTicket(null)}>
              Batal
            </Button>
            <Button
              variant="success"
              onClick={submitMarkDone}
              disabled={!resolutionImageMeta || simpleAction.isPending}
            >
              Kirim Bukti untuk Dicek
            </Button>
          </Modal.Footer>
        </Modal>
      </>
    );
  }

  return (
    <FeatureErrorBoundary>
    <div>
      <PageHeader
        eyebrow="Operasional"
        title="Tiket & Pekerjaan Operasional"
        description="Tiket, checklist, laporan lapangan, dan kinerja staff diringkas sebagai pekerjaan operasional harian."
        actionLabel={canAssign ? 'Buat Tiket Pekerjaan' : undefined}
        onAction={canAssign ? () => setShowCreateTicket(true) : undefined}
      />

      <div
        className="admin-area-internal-menu finance-inline-menu"
        aria-label="Sub-menu Staff dan Tiket"
      >
        <div className="admin-area-internal-menu-head">
          <span>Menu Operasional</span>
          <small>Pilih area kerja yang perlu dicek tanpa membuka menu berulang.</small>
        </div>
        <div className="admin-area-internal-menu-scroll">
          {[
            {
              id: "tickets",
              icon: "🎫",
              label: "Semua Tiket",
              helper: "Daftar tiket aktif dan selesai.",
              to: "/tickets",
              count: counts.all,
              active: true,
            },
            {
              id: "assign",
              icon: "👷",
              label: "Perlu Assign",
              helper: "Tiket baru yang belum ada petugas.",
              to: "/tickets",
              count: items.filter(
                (ticket) => ticket.status === "OPEN" && !ticket.assignedToId,
              ).length,
              active: false,
            },
            {
              id: "checklist",
              icon: "📋",
              label: "Checklist",
              helper: "Checklist harian/mingguan/bulanan staff.",
              to: "/staff-routines",
              count: undefined,
              active: false,
            },
            {
              id: "field",
              icon: "📝",
              label: "Laporan Lapangan",
              helper: "Laporan kondisi dari staff.",
              to: "/tickets",
              count: items.filter((ticket) =>
                Boolean(
                  ticket.linkedRoomItemId || ticket.linkedInventoryItemId,
                ),
              ).length,
              active: false,
            },
            {
              id: "score",
              icon: "📈",
              label: "Kinerja Staff",
              helper: "Skor staff dan ulasan.",
              to: "/staff-performance",
              count: undefined,
              active: false,
            },
          ].map((item) => (
            <button
              type="button"
              key={item.id}
              className={`admin-area-internal-chip info ${item.active ? "is-active" : ""}`.trim()}
              onClick={() => navigate(item.to)}
              title={item.helper}
            >
              <span className="admin-area-internal-chip-main">
                <span className="admin-area-internal-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="admin-area-internal-label">{item.label}</span>
                {typeof item.count === "number" ? (
                  <strong className="admin-area-internal-count">
                    {item.count}
                  </strong>
                ) : null}
              </span>
              <small>{item.helper}</small>
            </button>
          ))}
        </div>
      </div>

      {user?.role === "OWNER" || user?.role === "ADMIN" ? (
        <AdminStaffFieldReportQueue />
      ) : null}

      {items.length > 0 && <TicketAnalyticsPanel items={items} counts={counts} />}

      <div className="ticket-status-strip mb-3">
        <button
          type="button"
          className={`ticket-status-badge${activeTab === "ALL" ? " active" : ""}`}
          onClick={() => handleTabChange("ALL")}
        >
          <span>Semua</span>
          <strong>{counts.all}</strong>
        </button>
        <button
          type="button"
          className={`ticket-status-badge danger${activeTab === "OPEN" ? " active" : ""}`}
          onClick={() => handleTabChange("OPEN")}
        >
          <span>Baru</span>
          <strong>{counts.open}</strong>
        </button>
        <button
          type="button"
          className={`ticket-status-badge warning${activeTab === "IN_PROGRESS" ? " active" : ""}`}
          onClick={() => handleTabChange("IN_PROGRESS")}
        >
          <span>Dikerjakan</span>
          <strong>{counts.inProgress}</strong>
        </button>
        <button
          type="button"
          className={`ticket-status-badge info${activeTab === "DONE" ? " active" : ""}`}
          onClick={() => handleTabChange("DONE")}
        >
          <span>Perlu cek</span>
          <strong>{counts.done}</strong>
        </button>
        <button
          type="button"
          className={`ticket-status-badge success${activeTab === "CLOSED" ? " active" : ""}`}
          onClick={() => handleTabChange("CLOSED")}
        >
          <span>Selesai</span>
          <strong>{counts.closed}</strong>
        </button>
      </div>

      {simpleAction.isError ? (
        <Alert variant="danger" className="mb-3">
          Gagal menjalankan aksi tiket. Coba lagi.
        </Alert>
      ) : null}

      <Card className="content-card border-0">
        <Card.Body>
          <div className="table-meta align-items-start">
            <div>
              <div className="panel-title">Daftar tiket</div>
              <div className="panel-subtitle">
                Pilih status, lalu kerjakan satu per satu.
              </div>
            </div>
            <span className="unified-table-hint">Klik row untuk detail</span>
          </div>
          {ticketsQuery.isLoading ? <TableSkeleton rows={5} cols={6} /> : null}
          {ticketsQuery.isError ? (
            <Alert variant="danger">
              Gagal memuat tiket. Muat ulang halaman.
            </Alert>
          ) : null}
          {!ticketsQuery.isLoading &&
          !ticketsQuery.isError &&
          !visibleItems.length ? (
            <EmptyState
              icon="🎫"
              title="Belum ada tiket"
              description="Belum ada tiket yang perlu dikerjakan sekarang."
            />
          ) : null}

          {!ticketsQuery.isLoading &&
          !ticketsQuery.isError &&
          visibleItems.length > 0 ? (
            <Table hover responsive>
              <thead>
                <tr>
                  <th>No. Tiket</th>
                  <th>Pekerjaan</th>
                  <th>Status</th>
                  <th>Lokasi/Orang</th>
                  <th>Petugas</th>
                  <th>Diperbarui</th>
                  <th style={{ width: 190 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => (
                  <ClickableRow
                    key={item.id}
                    onClick={() => setDetailTicket(item)}
                    label={`Buka detail tiket ${item.ticketNumber ?? `TIK-${item.id}`}: ${item.title || 'Tanpa judul'}`}
                  >
                    <td>
                      <div className="fw-semibold">
                        {item.ticketNumber ?? `TIK-${item.id}`}
                      </div>
                      <div className="small text-muted">
                        {item.category || "Umum"}
                      </div>
                    </td>
                    <td>
                      <div className="fw-semibold">
                        {item.title || `Tiket #${item.id}`}
                      </div>
                      <div
                        className="small text-muted text-truncate"
                        style={{ maxWidth: 280 }}
                      >
                        {item.description || "Tidak ada deskripsi tambahan."}
                      </div>
                      {item.issueImageUrl || item.resolutionImageUrl ? (
                        <div className="d-flex gap-1 mt-1 flex-wrap">
                          {item.issueImageUrl ? (
                            <button
                              type="button"
                              className="btn p-0 border-0"
                              title="Klik untuk perbesar foto masalah"
                              onClick={(e) => { e.stopPropagation(); setLightboxUrl(item.issueImageUrl!); }}
                            >
                              <SafeImage
                                src={item.issueImageUrl}
                                alt="Foto masalah"
                                style={{ width: 72, height: 48, objectFit: "cover", borderRadius: 6, display: 'block' }}
                              />
                              <div className="text-muted" style={{ fontSize: '0.65rem', textAlign: 'center' }}>Masalah</div>
                            </button>
                          ) : null}
                          {item.resolutionImageUrl ? (
                            <button
                              type="button"
                              className="btn p-0 border-0"
                              title="Klik untuk perbesar foto bukti selesai"
                              onClick={(e) => { e.stopPropagation(); setLightboxUrl(item.resolutionImageUrl!); }}
                            >
                              <SafeImage
                                src={item.resolutionImageUrl}
                                alt="Foto selesai"
                                style={{ width: 72, height: 48, objectFit: "cover", borderRadius: 6, display: 'block' }}
                              />
                              <div className="text-muted" style={{ fontSize: '0.65rem', textAlign: 'center' }}>Bukti</div>
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td>
                      <div className="small">{formatRelations(item)}</div>
                    </td>
                    <td onClick={(event) => event.stopPropagation()}>
                      {canAssign ? (
                        <>
                          <Form.Select
                            size="sm"
                            value={
                              assignMap[item.id] ??
                              String(item.assignedToId ?? "")
                            }
                            onChange={(e) =>
                              setAssignMap((prev) => ({
                                ...prev,
                                [item.id]: e.target.value,
                              }))
                            }
                            disabled={usersQuery.isLoading}
                          >
                            <option value="">Pilih petugas</option>
                            {assignableUsers.map((assignee) => (
                              <option key={assignee.id} value={assignee.id}>
                                {assignee.fullName}
                              </option>
                            ))}
                          </Form.Select>
                          {item.assignedToId ? (
                            <div className="small text-muted mt-1">
                              Petugas #{item.assignedToId}
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <div className="small text-muted">
                          {item.assignedToId
                            ? `Petugas #${item.assignedToId}`
                            : "Belum ada petugas"}
                        </div>
                      )}
                      {(item as any).handledByVendor ? (
                        <div className="small text-warning fw-semibold mt-1">🔧 Vendor luar</div>
                      ) : null}
                    </td>
                    <td>{formatDate(item.updatedAt || item.createdAt)}</td>
                    <td onClick={(event) => event.stopPropagation()}>
                      <div className="d-flex flex-wrap gap-2 align-items-center">
                        {canAssign ? (
                          <Button
                            size="sm"
                            variant="outline-primary"
                            disabled={
                              !assignMap[item.id] || simpleAction.isPending
                            }
                            onClick={() =>
                              simpleAction.mutate({
                                path: `/tickets/${item.id}/assign`,
                                payload: {
                                  assignedToId: Number(assignMap[item.id]),
                                },
                              })
                            }
                          >
                            Tugaskan
                          </Button>
                        ) : null}
                        {canAssign &&
                        String(item.category ?? "").toUpperCase() === "AC_CLEANING" &&
                        !["CLOSED", "CANCELLED"].includes(String(item.status)) ? (
                          <Button
                            size="sm"
                            variant={(item as any).handledByVendor ? "outline-secondary" : "outline-warning"}
                            disabled={simpleAction.isPending}
                            title="Tiket cuci AC bisa dikerjakan vendor luar (keluar dari beban/KPI staf)"
                            onClick={() =>
                              simpleAction.mutate({
                                path: `/tickets/${item.id}/vendor`,
                                payload: { handledByVendor: !(item as any).handledByVendor },
                              })
                            }
                          >
                            {(item as any).handledByVendor ? "Batal vendor" : "Vendor luar"}
                          </Button>
                        ) : null}
                        {canProgress && item.status === "OPEN" ? (
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            disabled={simpleAction.isPending}
                            onClick={() =>
                              simpleAction.mutate({
                                path: `/tickets/${item.id}/start`,
                              })
                            }
                          >
                            Mulai Kerjakan
                          </Button>
                        ) : null}
                        {canProgress && item.status === "IN_PROGRESS" ? (
                          <Button
                            size="sm"
                            variant="outline-success"
                            disabled={simpleAction.isPending}
                            onClick={() => setDoneTicket(item)}
                          >
                            Tandai Selesai
                          </Button>
                        ) : null}
                        {canProgress && item.status === "DONE" ? (
                          <Button
                            size="sm"
                            variant="success"
                            disabled={simpleAction.isPending}
                            onClick={() => setCloseTicket(item)}
                          >
                            Konfirmasi
                          </Button>
                        ) : null}
                        <span className="row-arrow-cell">›</span>
                      </div>
                    </td>
                  </ClickableRow>
                ))}
              </tbody>
            </Table>
          ) : null}
          {!ticketsQuery.isLoading &&
          !ticketsQuery.isError &&
          filteredItems.length > PAGE_SIZE ? (
            <div className="mt-3">
              <PaginationControls
                currentPage={page}
                totalPages={totalPages}
                totalItems={filteredItems.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
                isLoading={ticketsQuery.isLoading}
              />
            </div>
          ) : null}
        </Card.Body>
      </Card>

      <Modal
        show={Boolean(detailTicket)}
        onHide={() => setDetailTicket(null)}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {detailTicket?.ticketNumber ?? `Tiket #${detailTicket?.id ?? ""}`}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {detailTicket ? (
            <>
              <div className="entity-detail-grid mb-3">
                <div className="entity-detail-item">
                  <span>Status</span>
                  <strong>
                    <StatusBadge status={detailTicket.status} />
                  </strong>
                </div>
                <div className="entity-detail-item">
                  <span>Lokasi / orang</span>
                  <strong>{formatRelations(detailTicket)}</strong>
                </div>
                <div className="entity-detail-item">
                  <span>Petugas</span>
                  <strong>
                    {detailTicket.assignedToId
                      ? `Petugas #${detailTicket.assignedToId}`
                      : "Belum ditugaskan"}
                  </strong>
                </div>
                <div className="entity-detail-item">
                  <span>Diperbarui</span>
                  <strong>
                    {formatDate(
                      detailTicket.updatedAt || detailTicket.createdAt,
                    )}
                  </strong>
                </div>
              </div>
              <h6 className="fw-semibold">
                {detailTicket.title || `Tiket #${detailTicket.id}`}
              </h6>
              <p className="text-muted mb-0">
                {detailTicket.description || "Tidak ada deskripsi tambahan."}
              </p>
              {canUseTicketAi ? (
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant="outline-primary"
                    disabled={ticketAiMutation.isPending}
                    onClick={() => ticketAiMutation.mutate(detailTicket.id)}
                  >
                    {ticketAiMutation.isPending ? "Meminta saran..." : "Saran AI"}
                  </Button>
                  {ticketAiError ? (
                    <Alert variant="danger" className="py-2 px-3 mt-2 mb-0 small">
                      {ticketAiError}
                    </Alert>
                  ) : null}
                  {ticketAiResult ? (
                    <AiResultPanel
                      title="Saran AI Operasional"
                      mode={ticketAiResult.mode}
                      fallback={ticketAiResult.fallback}
                      warnings={ticketAiResult.warnings}
                      missingData={ticketAiResult.missingData}
                      usage={ticketAiResult.usage}
                      model={ticketAiResult.model}
                    >
                      <div className="mb-2">
                        <strong>Ringkasan:</strong> {ticketAiResult.result.summary}
                      </div>
                      <div className="mb-2">
                        <strong>Aksi:</strong> {ticketAiResult.result.recommendedAction}
                        <span className="ms-2 badge bg-light text-dark border">
                          {ticketAiResult.result.priority}
                        </span>
                      </div>
                      <div className="mb-2">
                        <strong>Catatan:</strong> {ticketAiResult.result.suggestedNote}
                      </div>
                      {ticketAiResult.result.riskFlags.length ? (
                        <ul className="mb-0 ps-3">
                          {ticketAiResult.result.riskFlags.map((flag) => (
                            <li key={flag}>{flag}</li>
                          ))}
                        </ul>
                      ) : null}
                    </AiResultPanel>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => setDetailTicket(null)}>
            Tutup
          </Button>
          {detailTicket?.status === "DONE" ? (
            <Button
              variant="success"
              onClick={() => {
                if (detailTicket) {
                  setCloseTicket(detailTicket);
                  setDetailTicket(null);
                }
              }}
            >
              Konfirmasi Admin
            </Button>
          ) : null}
        </Modal.Footer>
      </Modal>

      <Modal
        show={Boolean(doneTicket)}
        onHide={() => setDoneTicket(null)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Catat Pekerjaan Selesai</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Catatan hasil kerja</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.currentTarget.value)}
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Foto bukti selesai</Form.Label>
            <CameraOrGalleryInput onChange={handleResolutionImage} />
            {resolutionPreview ? (
              <div className="mt-2">
                <SafeImage
                  src={resolutionPreview}
                  alt="Foto yang dipilih"
                  style={{
                    width: 120,
                    height: 80,
                    objectFit: "cover",
                    borderRadius: 8,
                  }}
                />
              </div>
            ) : null}
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setDoneTicket(null)}>
            Batal
          </Button>
          <Button
            variant="success"
            onClick={submitMarkDone}
            disabled={!resolutionImageMeta || simpleAction.isPending}
          >
            Kirim Bukti untuk Dicek
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={Boolean(closeTicket)}
        onHide={() => setCloseTicket(null)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Konfirmasi Final Admin</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant={isClosingCheckoutInspection ? "warning" : "info"} className="py-2 small">
            {isClosingCheckoutInspection ? (
              <>
                Menutup tiket cek kamar dapat membuat kamar siap ditawarkan kembali jika semua kondisi aman.
                Jika kebersihan, kunci, inventaris, atau kondisi akhir belum aman, jangan tutup sebagai aman.
              </>
            ) : (
              <>
                Tutup tiket hanya setelah bukti dicek. Staff melapor; admin menentukan status final.
              </>
            )}
          </Alert>
          <div className="mb-3 rounded-4 border bg-light p-3">
            <Form.Check
              className="mb-2"
              type="checkbox"
              id="admin-ticket-evidence-check"
              label="Saya sudah cek catatan/foto bukti staff."
              checked={adminCheckedEvidence}
              onChange={(event) =>
                setAdminCheckedEvidence(event.currentTarget.checked)
              }
            />
            <Form.Check
              type="checkbox"
              id="admin-ticket-final-impact-check"
              label={isClosingCheckoutInspection ? "Saya paham kamar bisa ditawarkan kembali hanya jika hasil cek aman." : "Saya paham ini menutup tiket dan menetapkan status final barang bila dipilih."}
              checked={adminCheckedFinalImpact}
              onChange={(event) =>
                setAdminCheckedFinalImpact(event.currentTarget.checked)
              }
            />
          </div>
          {ticketHasRoomItemDecision(closeTicket) ? (
            <Form.Group className="mb-3">
              <Form.Label>Status akhir barang kamar</Form.Label>
              <Form.Select
                value={finalRoomItemStatus}
                onChange={(event) =>
                  setFinalRoomItemStatus(event.currentTarget.value)
                }
              >
                {roomItemFinalStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          ) : null}
          {ticketHasInventoryDecision(closeTicket) ? (
            <Form.Group className="mb-3">
              <Form.Label>Status akhir barang gudang</Form.Label>
              <Form.Select
                value={finalInventoryItemStatus}
                onChange={(event) =>
                  setFinalInventoryItemStatus(event.currentTarget.value)
                }
              >
                {inventoryItemFinalStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          ) : null}
          <Form.Group>
            <Form.Label>Catatan final admin</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={finalAdminNote}
              onChange={(event) => setFinalAdminNote(event.currentTarget.value)}
              placeholder="Contoh: lampu baru sudah terpasang, status barang kembali baik"
              isInvalid={closeNoteInvalid}
            />
            <Form.Text className={closeNoteInvalid ? "text-danger" : undefined}>
              Minimal 8 karakter untuk catatan keputusan.
            </Form.Text>
            <Form.Control.Feedback type="invalid">
              Catatan admin minimal 8 karakter.
            </Form.Control.Feedback>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => setCloseTicket(null)}>
            Batal
          </Button>
          <Button
            variant="success"
            disabled={!canConfirmCloseTicket || simpleAction.isPending}
            onClick={submitCloseTicket}
          >
            Tutup Tiket
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Modal Buat Tiket Pekerjaan ── */}
      <Modal show={showCreateTicket} onHide={() => setShowCreateTicket(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Buat Tiket Pekerjaan</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {createTicketMutation.isError && <Alert variant="danger">Gagal membuat tiket. Coba lagi.</Alert>}
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">Jenis Pekerjaan</Form.Label>
            <div className="create-ticket-category-grid">
              {[
                { value: 'KEBERSIHAN', label: 'Kebersihan', icon: '🧹', desc: 'Bersih-bersih kamar, koridor, toilet, atau area umum' },
                { value: 'PERBAIKAN', label: 'Perbaikan', icon: '🔧', desc: 'Perbaikan kerusakan kamar, fasilitas, atau infrastruktur' },
                { value: 'AUDIT_INVENTARIS', label: 'Audit Inventaris', icon: '📦', desc: 'Cek fisik stok gudang atau barang kamar vs catatan sistem' },
                { value: 'BARANG_PINDAH', label: 'Pindah Barang', icon: '🚚', desc: 'Pindahkan barang dari gudang ke kamar, atau antar lokasi' },
                { value: 'PEMERIKSAAN', label: 'Pemeriksaan', icon: '🔍', desc: 'Cek kondisi kamar atau area khusus atas perintah admin' },
                { value: 'UMUM', label: 'Umum', icon: '📋', desc: 'Pekerjaan lain yang belum masuk kategori di atas' },
              ].map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  className={`create-ticket-cat-btn ${createForm.category === cat.value ? 'selected' : ''}`}
                  onClick={() => setCreateForm((prev) => ({ ...prev, category: cat.value, title: prev.title || cat.label }))}
                  title={cat.desc}
                >
                  <span className="cat-btn-icon">{cat.icon}</span>
                  <span className="cat-btn-label">{cat.label}</span>
                  <small className="cat-btn-desc">{cat.desc}</small>
                </button>
              ))}
            </div>
          </Form.Group>

          {createForm.category === 'BARANG_PINDAH' && (
            <Alert variant="info" className="py-2 small mb-3">
              Tiket <strong>Pindah Barang</strong> akan menjadi job untuk staff — dari lokasi asal ke tujuan. Staff konfirmasi dengan foto selesai.
            </Alert>
          )}

          <Row className="g-3 mb-3">
            <Col md={12}>
              <Form.Group>
                <Form.Label className="fw-semibold">Judul Pekerjaan</Form.Label>
                <Form.Control
                  value={createForm.title}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder={
                    createForm.category === 'KEBERSIHAN' ? 'Contoh: Bersihkan kamar mandi lantai 2'
                    : createForm.category === 'PERBAIKAN' ? 'Contoh: Perbaiki kunci pintu kamar A3'
                    : createForm.category === 'BARANG_PINDAH' ? 'Contoh: Pindah lemari dari gudang ke kamar B2'
                    : createForm.category === 'AUDIT_INVENTARIS' ? 'Contoh: Audit stok sprei dan bantal gudang'
                    : 'Tulis judul pekerjaan yang jelas'
                  }
                />
              </Form.Group>
            </Col>
            {createForm.category === 'BARANG_PINDAH' && (
              <>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">Nama Barang</Form.Label>
                    <Form.Control value={createForm.itemName} onChange={(e) => setCreateForm((prev) => ({ ...prev, itemName: e.target.value }))} placeholder="Contoh: Sprei, Lemari, Galon" />
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">Jumlah</Form.Label>
                    <Form.Control type="number" value={createForm.itemQty} onChange={(e) => setCreateForm((prev) => ({ ...prev, itemQty: e.target.value }))} placeholder="1" min="1" />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">Dari (Lokasi)</Form.Label>
                    <Form.Control value={createForm.fromLocation} onChange={(e) => setCreateForm((prev) => ({ ...prev, fromLocation: e.target.value }))} placeholder="Gudang / Kamar A1" />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label className="fw-semibold">Ke (Tujuan)</Form.Label>
                    <Form.Control value={createForm.toLocation} onChange={(e) => setCreateForm((prev) => ({ ...prev, toLocation: e.target.value }))} placeholder="Kamar B2 / Gudang" />
                  </Form.Group>
                </Col>
              </>
            )}
            <Col md={12}>
              <Form.Group>
                <Form.Label className="fw-semibold">Detail & Instruksi</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={createForm.description}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Instruksi detail untuk staff: area yang perlu dikerjakan, prioritas, kondisi saat ini..."
                />
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group>
                <Form.Label className="fw-semibold">Assign ke Staff (opsional)</Form.Label>
                <Form.Select value={createForm.assignedToId} onChange={(e) => setCreateForm((prev) => ({ ...prev, assignedToId: e.target.value }))}>
                  <option value="">— Pilih staff (bisa diassign nanti) —</option>
                  {assignableUsers.map((staff) => (
                    <option key={staff.id} value={String(staff.id)}>{staff.fullName}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => setShowCreateTicket(false)}>Batal</Button>
          <Button
            onClick={() => {
              if (!createForm.title.trim()) return;
              const moveDetails = createForm.category === 'BARANG_PINDAH' && (createForm.fromLocation || createForm.toLocation || createForm.itemName)
                ? `\n\n📦 Pindah Barang:\n• Barang: ${createForm.itemName || '-'} (${createForm.itemQty || '1'} unit)\n• Dari: ${createForm.fromLocation || '-'}\n• Ke: ${createForm.toLocation || '-'}`
                : '';
              createTicketMutation.mutate({
                category: createForm.category,
                title: createForm.title.trim(),
                description: (createForm.description.trim() + moveDetails) || undefined,
                assignedToId: createForm.assignedToId ? Number(createForm.assignedToId) : undefined,
              });
            }}
            disabled={!createForm.title.trim() || createTicketMutation.isPending}
          >
            {createTicketMutation.isPending ? 'Membuat...' : `Buat Tiket ${createForm.category === 'BARANG_PINDAH' ? 'Pindah Barang' : 'Pekerjaan'}`}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ── Lightbox foto tiket ── */}
      <Modal show={Boolean(lightboxUrl)} onHide={() => setLightboxUrl(null)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="fs-6">Foto Bukti Tiket</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-2 text-center" style={{ background: '#0f172a' }}>
          {lightboxUrl ? (
            <SafeImage
              src={lightboxUrl}
              alt="Foto bukti tiket"
              style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 8 }}
            />
          ) : null}
        </Modal.Body>
      </Modal>
    </div>
    </FeatureErrorBoundary>
  );
}
