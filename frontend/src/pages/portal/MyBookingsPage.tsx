// FILE: MyBookingsPage.tsx — portal penghuni: daftar booking saya
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Modal, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { cancelTenantBooking, listMyTenantBookings } from "../../api/bookings";
import { getResource } from "../../api/resources";
import {
  listMyPaymentSubmissions,
  submitPaymentWithProof,
} from "../../api/paymentSubmissions";
import PageHeader from '../../components/common/PageHeader';
import EmptyState from "../../components/common/EmptyState";
import SubmitPaymentModal from "../../components/portal/SubmitPaymentModal";
import BookingCard from "../../components/portal/BookingCard";
import { getErrorMessage } from "../../components/portal/BookingStatusHelper";
import { useAuth } from "../../context/AuthContext";
import { useTenantPortalStage } from "../../hooks/useTenantPortalStage";
import {
  TENANT_PAYMENT_REVIEW_MESSAGE,
  isPendingReviewStatus,
} from "../../utils/tenantCopy";
import { getActionableTenantBookings, getLatestTenantBookingUpdate, isTenantBookingOccupied, stayToTenantBooking } from "../../utils/tenantBookingRules";
import type {
  CreatePaymentSubmissionPayload,
  PaymentSubmission,
  PaymentTargetType,
  Stay,
  TenantBooking,
} from "../../types";

// AJ-01 (C05-01): 404 dari /stays/me/current = "tidak punya stay" (hasil valid), bukan error.
function isNotFoundError(error: unknown): boolean {
  const maybe = error as {
    response?: {
      status?: number;
      data?: {
        statusCode?: number;
      };
    };
    status?: number;
  };

  return (
    maybe?.response?.status === 404 ||
    maybe?.response?.data?.statusCode === 404 ||
    maybe?.status === 404
  );
}

const SESSION_KEY = "kost48:portal-bookings:success-message";

export default function MyBookingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const {
    stage,
    isLoading: isStageLoading,
    refetch: refetchStage,
  } = useTenantPortalStage();

  const userId = user?.id;
  const tenantId = user?.tenantId;

  const [selectedBooking, setSelectedBooking] = useState<TenantBooking | null>(
    null,
  );
  const [paymentTargetType, setPaymentTargetType] =
    useState<PaymentTargetType>("INVOICE");
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(() =>
    sessionStorage.getItem(SESSION_KEY),
  );
  const [cancelTarget, setCancelTarget] = useState<TenantBooking | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const bookingsQuery = useQuery({
    queryKey: ["tenant-bookings", { userId, tenantId }],
    queryFn: () => listMyTenantBookings({ limit: 100 }),
    enabled: Boolean(userId),
    retry: false,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 30_000,
  });


  const currentStayQuery = useQuery({
    queryKey: ["portal-stage", "stay", { userId, tenantId }],
    queryFn: async () => {
      // AJ-01: 404 = hasil valid null agar staleTime berlaku & refetchOnMount tidak loop (C05-01).
      try {
        return await getResource<Stay>("/stays/me/current");
      } catch (err: unknown) {
        if (isNotFoundError(err)) return null;
        throw err;
      }
    },
    enabled: Boolean(userId),
    retry: false,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

  const submissionsQuery = useQuery({
    queryKey: ["payment-submissions", "mine", { userId, tenantId }],
    queryFn: () => listMyPaymentSubmissions({ limit: 200 }),
    enabled: Boolean(userId),
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 30_000,
  });

  const createSubmissionMutation = useMutation({
    mutationFn: async ({ payload, file }: { payload: CreatePaymentSubmissionPayload; file: File }) =>
      submitPaymentWithProof(payload, file),
    onSuccess: async (created) => {
      const createdTarget =
        (created as PaymentSubmission | undefined)?.targetType === "DEPOSIT"
          ? "deposit"
          : "sewa";
      const message = `Bukti pembayaran ${createdTarget} berhasil dikirim. ${TENANT_PAYMENT_REVIEW_MESSAGE}`;
      setSubmissionError(null);
      setSelectedBooking(null);
      setSuccessMessage(message);
      sessionStorage.setItem(SESSION_KEY, message);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["payment-submissions"] }),
        queryClient.invalidateQueries({ queryKey: ["tenant-bookings"] }),
        queryClient.invalidateQueries({ queryKey: ["portal-invoices"] }),
        queryClient.invalidateQueries({ queryKey: ["invoice-payments"] }),
        queryClient.invalidateQueries({ queryKey: ["stays"] }),
        queryClient.invalidateQueries({ queryKey: ["rooms"] }),
        queryClient.invalidateQueries({ queryKey: ["portal-stay"] }),
        refetchStage(),
      ]);
    },
    onError: (error) => {
      setSubmissionError(
        getErrorMessage(
          error,
          "Gagal mengirim bukti pembayaran. Silakan coba lagi.",
        ),
      );
    },
  });

  const items = useMemo(
    () => bookingsQuery.data?.items ?? [],
    [bookingsQuery.data],
  );
  const visibleBookings = useMemo(() => {
    const active = getActionableTenantBookings(items);
    if (active.length > 0) return active;

    const latestUpdate = getLatestTenantBookingUpdate(items);
    if (latestUpdate) return [latestUpdate];

    const fallback = stayToTenantBooking(currentStayQuery.data);
    if (fallback && !isTenantBookingOccupied(fallback)) return [fallback];
    return [];
  }, [items, currentStayQuery.data]);
  const submissions = useMemo(
    () => submissionsQuery.data?.items ?? [],
    [submissionsQuery.data],
  );
  const submissionByBooking = useMemo(() => {
    const map = new Map<number, PaymentSubmission[]>();
    submissions.forEach((submission) => {
      const current = map.get(submission.stayId) ?? [];
      current.push(submission);
      map.set(submission.stayId, current);
    });
    return map;
  }, [submissions]);

  useEffect(() => {
    if (stage === "occupied" && !isStageLoading) {
      navigate("/portal/stay", { replace: true });
    }
  }, [stage, isStageLoading, navigate]);

  const bookingErrorMessage = useMemo(
    () =>
      getErrorMessage(
        bookingsQuery.error,
        "Gagal memuat daftar booking Anda. Silakan coba lagi.",
      ),
    [bookingsQuery.error],
  );
  const submissionListError = useMemo(
    () =>
      submissionsQuery.isError
        ? getErrorMessage(
            submissionsQuery.error,
            "Gagal memuat riwayat bukti pembayaran.",
          )
        : null,
    [submissionsQuery.error, submissionsQuery.isError],
  );

  const cancelMutation = useMutation({
    mutationFn: async (booking: TenantBooking) =>
      cancelTenantBooking(booking.id),
    onSuccess: async () => {
      const message =
        "Pemesanan berhasil dibatalkan. Kamu bisa memilih kamar lain sekarang.";
      setCancelError(null);
      setCancelTarget(null);
      setSuccessMessage(message);
      sessionStorage.setItem(SESSION_KEY, message);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tenant-bookings"] }),
        queryClient.invalidateQueries({ queryKey: ["rooms"] }),
        queryClient.invalidateQueries({ queryKey: ["public-rooms"] }),
        refetchStage(),
      ]);
    },
    onError: (error) => {
      setCancelError(
        getErrorMessage(error, "Gagal membatalkan pemesanan. Silakan coba lagi."),
      );
    },
  });

  const handleUploadClick = (
    booking: TenantBooking,
    targetType: PaymentTargetType,
  ) => {
    setSelectedBooking(booking);
    setPaymentTargetType(targetType);
    setSubmissionError(null);
  };

  const handleCancelClick = (booking: TenantBooking) => {
    setCancelTarget(booking);
    setCancelError(null);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Portal Penghuni"
        title="Booking Saya"
        description="Daftar pemesanan kamar yang sedang diproses dan perlu dibayar."
      />
      <div className="tenant-booking-workspace-dedup">
      {successMessage ? (
        <Alert
          variant="success"
          dismissible
          onClose={() => {
            setSuccessMessage(null);
            sessionStorage.removeItem(SESSION_KEY);
          }}
        >
          {successMessage}
        </Alert>
      ) : null}

      {submissionListError ? (
        <Alert variant="warning">{submissionListError}</Alert>
      ) : null}
      {bookingsQuery.isLoading || currentStayQuery.isLoading ? (
        <div className="py-5 text-center">
          <Spinner animation="border" />
        </div>
      ) : null}
      {bookingsQuery.isError ? (
        <Alert variant="danger">{bookingErrorMessage}</Alert>
      ) : null}

      {!bookingsQuery.isLoading &&
      !currentStayQuery.isLoading &&
      !bookingsQuery.isError &&
      !visibleBookings.length ? (
        <EmptyState
          icon="📅"
          title={stage === "booking" ? "Status pemesanan belum terbaca" : "Belum ada pemesanan"}
          description={stage === "booking"
            ? "Refresh halaman atau hubungi admin jika status tidak berubah."
            : "Pilih kamar dari katalog. Kamar aman setelah pembayaran disetujui."}
          action={stage === "booking" ? undefined : {
            label: "Pilih Kamar",
            onClick: () => navigate("/rooms"),
          }}
        />
      ) : null}

      <div className="d-grid gap-3">
        {visibleBookings.map((booking: TenantBooking) => {
          const relatedSubmissions = [
            ...(submissionByBooking.get(booking.id) ?? []),
          ].sort(
            (a, b) =>
              new Date(b.createdAt ?? 0).getTime() -
              new Date(a.createdAt ?? 0).getTime(),
          );
          const pendingInvoiceSubmission =
            relatedSubmissions.find(
              (item) =>
                isPendingReviewStatus(item.status) &&
                (item.targetType ?? "INVOICE") === "INVOICE",
            ) ?? null;
          const pendingDepositSubmission =
            relatedSubmissions.find(
              (item) =>
                isPendingReviewStatus(item.status) &&
                item.targetType === "DEPOSIT",
            ) ?? null;

          return (
            <BookingCard
              key={booking.id}
              booking={booking}
              submissions={relatedSubmissions}
              pendingInvoiceSubmission={pendingInvoiceSubmission}
              pendingDepositSubmission={pendingDepositSubmission}
              onUploadClick={handleUploadClick}
              onViewCatalog={() => navigate("/rooms")}
              onCancelClick={handleCancelClick}
            />
          );
        })}
      </div>

      <SubmitPaymentModal
        show={Boolean(selectedBooking)}
        booking={selectedBooking}
        targetType={paymentTargetType}
        existingPending={
          selectedBooking
            ? ((submissionByBooking.get(selectedBooking.id) ?? []).find(
                (item) =>
                  isPendingReviewStatus(item.status) &&
                  (item.targetType ?? "INVOICE") === paymentTargetType,
              ) ?? null)
            : null
        }
        submitting={createSubmissionMutation.isPending}
        errorMessage={submissionError}
        onHide={() => setSelectedBooking(null)}
        onSubmit={(payload, file) => createSubmissionMutation.mutateAsync({ payload, file })}
      />

      <Modal
        show={Boolean(cancelTarget)}
        onHide={() => {
          if (!cancelMutation.isPending) {
            setCancelTarget(null);
            setCancelError(null);
          }
        }}
        centered
        backdrop="static"
      >
        <Modal.Header closeButton={!cancelMutation.isPending}>
          <Modal.Title>Batalkan pemesanan?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {cancelTarget ? (
            <>
              <p>
                Kamu akan membatalkan pemesanan kamar{" "}
                <strong>
                  {cancelTarget.room?.code ?? `#${cancelTarget.roomId}`}
                </strong>
                .
              </p>
              <p className="mb-0 text-muted small">
                Kamar akan dilepas kembali ke katalog. Setelah itu kamu bisa
                memilih kamar lain.
              </p>
              {cancelError ? (
                <Alert variant="danger" className="mt-3 mb-0">
                  {cancelError}
                </Alert>
              ) : null}
            </>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setCancelTarget(null);
              setCancelError(null);
            }}
            disabled={cancelMutation.isPending}
          >
            Tutup
          </Button>
          <Button
            variant="danger"
            disabled={cancelMutation.isPending}
            onClick={() => {
              if (cancelTarget) {
                cancelMutation.mutate(cancelTarget);
              }
            }}
          >
            {cancelMutation.isPending ? "Membatalkan..." : "Ya, batalkan"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
    </div>
  );
}
