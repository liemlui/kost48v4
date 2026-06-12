import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Form, InputGroup, Offcanvas, Spinner } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import SearchableSelect, { SelectOption } from '../../components/common/SearchableSelect';
import { createResource, listResource } from '../../api/resources';
import { createStay, CreateStayResponse } from '../../api/stays';
import { Room, StayCreatePayload, Tenant } from '../../types';
import { WizardSteps, defaultValues } from './check-in-wizard/checkInWizardUtils';
import type { WizardFormValues } from './check-in-wizard/types';
import StepTenantSelect from './check-in-wizard/StepTenantSelect';
import StepRoomSelect from './check-in-wizard/StepRoomSelect';
import StepDetailsAndMeters from './check-in-wizard/StepDetailsAndMeters';
import StepReviewConfirm from './check-in-wizard/StepReviewConfirm';

interface CheckInWizardProps {
  show?: boolean;
  onHide?: () => void;
}

export default function CheckInWizard({ show: _show = true, onHide }: CheckInWizardProps) {
  const isModal = !!onHide;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [show, setShow] = useState(true);
  const [step, setStep] = useState(1);
  const [wizardError, setWizardError] = useState('');
  const [selectedTenantOption, setSelectedTenantOption] = useState<SelectOption<number> | null>(null);
  const [showInlineTenant, setShowInlineTenant] = useState(false);
  const [inlineTenant, setInlineTenant] = useState({ fullName: '', phone: '', email: '', gender: 'OTHER', identityNumber: '' });
  const [depositWasManuallyCleared, setDepositWasManuallyCleared] = useState(false);
  const [tenantSelectRefreshKey, setTenantSelectRefreshKey] = useState(0);
  const [createResult, setCreateResult] = useState<CreateStayResponse | null>(null);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [passwordCopyError, setPasswordCopyError] = useState('');
  const [successExitTarget, setSuccessExitTarget] = useState('/stays');
  const successExitTargetRef = useRef('/stays');

  const form = useForm<WizardFormValues>({ defaultValues });

  // ---- Queries ----
  const { data: tenantsResp, isLoading: isLoadingTenants } = useQuery({
    queryKey: ['tenants', 'select'],
    queryFn: () => listResource<Tenant>('tenants', { limit: 200 }),
    enabled: show,
  });

  // Estimate latest meter readings
  const electricityQuery = useQuery({
    queryKey: ['meter-readings', 'electricity', 'latest'],
    queryFn: () => listResource('meter-readings', { utilityType: 'ELECTRICITY', limit: 500 }),
    enabled: show,
  });
  const waterQuery = useQuery({
    queryKey: ['meter-readings', 'water', 'latest'],
    queryFn: () => listResource('meter-readings', { utilityType: 'WATER', limit: 500 }),
    enabled: show,
  });

  const estimatedElectricityThreshold = useMemo(() => {
    const items = (electricityQuery.data as any)?.items;
    if (!items?.length) return 0;
    const maxReading = Math.max(...items.map((r: any) => parseFloat(r.readingValue ?? '0')));
    return maxReading;
  }, [electricityQuery.data]);

  const estimatedWaterThreshold = useMemo(() => {
    const items = (waterQuery.data as any)?.items;
    if (!items?.length) return 0;
    const maxReading = Math.max(...items.map((r: any) => parseFloat(r.readingValue ?? '0')));
    return maxReading;
  }, [waterQuery.data]);

  const { data: roomsResp, isLoading: isLoadingRooms } = useQuery({
    queryKey: ['rooms', 'wizard'],
    queryFn: () => listResource<Room>('rooms'),
    enabled: show && step >= 2,
  });

  const _rooms = useMemo(() => (roomsResp?.items ?? []) as Room[], [roomsResp]);

  // Wrap each room with normalized price/deposit for display
  const displayRooms = useMemo(() => {
    return _rooms.map((room: any) => ({
      id: room.id,
      name: room.name,
      price: room.monthlyRateRupiah ?? undefined,
      deposit: room.defaultDepositRupiah ?? undefined,
      status: room.status,
    }));
  }, [_rooms]);

  const watchRoomId = form.watch('roomId');
  const selectedRoom = useMemo(() => {
    return displayRooms.find((r) => r.id === watchRoomId);
  }, [displayRooms, watchRoomId]);

  // ---- Mutations ----
  const createStayMutation = useMutation({
    mutationFn: (payload: StayCreatePayload) => createStay(payload),
    onSuccess: (data: CreateStayResponse) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      queryClient.invalidateQueries({ queryKey: ['stays'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['meter-readings'] });
      queryClient.invalidateQueries({ queryKey: ['portal-stage'] });
      queryClient.invalidateQueries({
        predicate: (query) => {
          const firstKey = Array.isArray(query.queryKey) ? query.queryKey[0] : undefined;
          return typeof firstKey === 'string' && firstKey.startsWith('dashboard');
        },
      });
      queryClient.invalidateQueries({ queryKey: ['resources', 'tenants'] });
      queryClient.invalidateQueries({ queryKey: ['resources', 'rooms'] });
      setCreateResult(data);
      setPasswordCopied(false);
      setPasswordCopyError('');
      setSuccessExitTarget('/stays');
    },
    onError: (err: any) => {
      const raw = err?.response?.data?.message ?? err?.message ?? 'Gagal membuat stay';
      const message = Array.isArray(raw) ? raw.join(' • ') : raw;
      setWizardError(message);
    },
  });

  const createInlineTenantMutation = useMutation({
    mutationFn: (payload: any) => createResource<Tenant>('tenants', payload),
    onSuccess: (data: any) => {
      const tenant = data;
      queryClient.invalidateQueries({ queryKey: ['tenants', 'select'] });
      setTenantSelectRefreshKey((prev) => prev + 1);
      const newOption: SelectOption<number> = {
        label: tenant.fullName,
        value: tenant.id,
      };
      setSelectedTenantOption(newOption);
      form.setValue('tenantId', tenant.id);
      setShowInlineTenant(false);
      setInlineTenant({ fullName: '', phone: '', email: '', gender: 'OTHER', identityNumber: '' });
      setWizardError('');
    },
    onError: (err: any) => {
      const raw = err?.response?.data?.message ?? err?.message ?? 'Gagal membuat tenant';
      const message = Array.isArray(raw) ? raw.join(' • ') : raw;
      setWizardError(message);
    },
  });

  // ---- Derived ----
  const tenants = useMemo(() => (tenantsResp?.items ?? []) as Tenant[], [tenantsResp]);

  const watchTenantId = form.watch('tenantId');
  const selectedTenant = useMemo(() => {
    return tenants.find((t) => t.id === watchTenantId);
  }, [tenants, watchTenantId]);

  const handleClose = () => {
    setShow(false);
  };

  // ---- Load tenant options for SearchableSelect ----
  const defaultTenantOptions = useMemo(() => {
    return tenants.map((t) => ({ label: t.fullName, value: t.id }));
  }, [tenants]);

  const loadTenantOptions = async (inputValue: string): Promise<SelectOption<number>[]> => {
    try {
      const res = await listResource<Tenant>('tenants', { search: inputValue, limit: 20 });
      return (res.items ?? []).map((t) => ({ label: t.fullName, value: t.id }));
    } catch {
      return [];
    }
  };

  // ---- Handlers ----
  function handleCreateInlineTenant(tenant: { fullName: string; phone: string; email: string; gender: string; identityNumber: string }) {
    const phoneRegex = /^(08\d{8,}|\+628\d{8,})$/;
    if (!tenant.fullName.trim()) {
      setWizardError('Nama tenant wajib diisi');
      return;
    }
    if (!tenant.phone.trim()) {
      setWizardError('No. HP wajib diisi');
      return;
    }
    if (!phoneRegex.test(tenant.phone.trim())) {
      setWizardError('Format No. HP tidak valid (08xxxxxxxxxx atau +628xxxxxxxxxx)');
      return;
    }
    const nikRegex = /^\d{16}$/;
    if (!tenant.identityNumber.trim()) {
      setWizardError('No KTP wajib diisi');
      return;
    }
    if (!nikRegex.test(tenant.identityNumber.trim())) {
      setWizardError('No KTP wajib 16 digit angka');
      return;
    }
    createInlineTenantMutation.mutate({
      fullName: tenant.fullName.trim(),
      phone: tenant.phone.trim(),
      email: tenant.email.trim() || undefined,
      gender: tenant.gender,
      identityNumber: tenant.identityNumber.trim(),
    });
  }

  function nextStep() {
    if (step === 1) {
      if (!form.getValues('tenantId')) {
        form.trigger('tenantId');
        setWizardError('Silakan pilih tenant terlebih dahulu');
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!form.getValues('roomId')) {
        form.trigger('roomId');
        setWizardError('Silakan pilih kamar terlebih dahulu');
        return;
      }
      setStep(3);
      form.trigger();
      return;
    }
    if (step === 3) {
      handleSubmitInternal();
    }
  }

  function handleSubmitInternal() {
    form.handleSubmit((values) => {
      if (!values.tenantId || !values.roomId) {
        setWizardError('Tenant dan kamar wajib dipilih');
        return;
      }
      if (!values.checkInDate) {
        form.setError('checkInDate', { message: 'Tanggal masuk wajib diisi' });
        return;
      }
      if (!values.agreedRentAmountRupiah && values.agreedRentAmountRupiah !== 0) {
        form.setError('agreedRentAmountRupiah', { message: 'Harga sewa wajib diisi' });
        return;
      }
      if (!values.initialElectricityKwh || values.initialElectricityKwh === '') {
        form.setError('initialElectricityKwh', { message: 'Meter awal listrik wajib diisi' });
        return;
      }
      if (!values.initialWaterM3 || values.initialWaterM3 === '') {
        form.setError('initialWaterM3', { message: 'Meter awal air wajib diisi' });
        return;
      }
      const elecNum = parseFloat(values.initialElectricityKwh);
      const waterNum = parseFloat(values.initialWaterM3);
      if (isNaN(elecNum) || isNaN(waterNum)) {
        setWizardError('Meter awal harus berupa angka');
        return;
      }
      if (elecNum < 0 || waterNum < 0) {
        setWizardError('Meter awal tidak boleh negatif');
        return;
      }
      const payload: StayCreatePayload = {
        tenantId: values.tenantId,
        roomId: values.roomId,
        checkInDate: values.checkInDate,
        pricingTerm: values.pricingTerm,
        agreedRentAmountRupiah: Number(values.agreedRentAmountRupiah),
        depositAmountRupiah: values.depositAmountRupiah !== '' && values.depositAmountRupiah !== undefined && values.depositAmountRupiah !== null
          ? Number(values.depositAmountRupiah)
          : depositWasManuallyCleared ? 0 : undefined,
        stayPurpose: values.stayPurpose || undefined,
        bookingSource: values.bookingSource || undefined,
        notes: values.notes || undefined,
        // Audit E-3: jaminan tunai yang diterima saat check-in dicatat resmi di backend.
        depositCollected: Boolean((values as any).depositCollected),
      } as any;
      // Meter readings passed as strings (DTO expects @IsNumberString)
      (payload as any).initialElectricityKwh = values.initialElectricityKwh;
      (payload as any).initialWaterM3 = values.initialWaterM3;
      createStayMutation.mutate(payload);
    })();
  }

  // ---- Reset on close ----
  useEffect(() => {
    if (!show) {
      setTimeout(() => {
        form.reset(defaultValues);
        setStep(1);
        setWizardError('');
        setSelectedTenantOption(null);
        setShowInlineTenant(false);
        setDepositWasManuallyCleared(false);
      }, 300);
    }
  }, [show]);

  // ---- Set default check-in date ----
  useEffect(() => {
    if (show) {
      form.setValue('checkInDate', new Date().toISOString().slice(0, 10));
    }
  }, [show, form]);

  // ---- Auto-fill deposit from room ----
  useEffect(() => {
    if (selectedRoom && !depositWasManuallyCleared) {
      const roomDeposit = (selectedRoom as any).deposit;
      if (roomDeposit !== undefined && roomDeposit !== null) {
        form.setValue('depositAmountRupiah', Number(roomDeposit));
      }
    }
  }, [selectedRoom?.id, depositWasManuallyCleared]);

  // ---- Auto-fill rent from room ----
  useEffect(() => {
    if (selectedRoom) {
      const roomPrice = (selectedRoom as any).price;
      if (roomPrice !== undefined && roomPrice !== null && (!form.getValues('agreedRentAmountRupiah') || form.getValues('agreedRentAmountRupiah') === 0)) {
        form.setValue('agreedRentAmountRupiah', Number(roomPrice));
      }
    }
  }, [selectedRoom?.id]);

  async function handleCopyPassword() {
    const password = createResult?.portal?.temporaryPassword;
    if (!password) return;

    try {
      await navigator.clipboard.writeText(password);
      setPasswordCopyError('');
      setPasswordCopied(true);
      setTimeout(() => setPasswordCopied(false), 3000);
    } catch {
      setPasswordCopied(false);
      setPasswordCopyError('Browser tidak mengizinkan salin otomatis. Silakan salin password secara manual dari kolom di atas.');
    }
  }

  function handleCloseSuccess(target = '/stays') {
    successExitTargetRef.current = target;
    setSuccessExitTarget(target);
    setShow(false);
  }

  // --- Success result view ---
  if (createResult) {
    const { stay, invoice, portal } = createResult;
    return (
      <Offcanvas
        show={show}
        onHide={() => handleCloseSuccess('/stays')}
        onExited={() => {
          const target = successExitTargetRef.current || successExitTarget || '/stays';
          setCreateResult(null);
          successExitTargetRef.current = '/stays';
          setSuccessExitTarget('/stays');
          navigate(target);
        }}
        placement="end"
        backdrop="static"
        style={{ width: '700px' }}
      >
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>✅ Check-in Berhasil</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <Card className="mb-3 border-success">
            <Card.Body>
              <h6 className="text-success">Masa sewa #{stay.id} — {stay.room?.code ?? 'Kamar'}</h6>
              <p className="mb-1"><strong>Penghuni:</strong> {stay.tenant?.fullName ?? selectedTenant?.fullName ?? '-'}</p>
              <p className="mb-1"><strong>Tagihan:</strong> {invoice.invoiceNumber} — <span className="badge bg-success">Terbit / Perlu Dibayar</span></p>
              <p className="mb-1"><strong>Status Kamar:</strong> <span className="badge bg-primary">Terisi</span></p>
            </Card.Body>
          </Card>

          {/* Portal result card */}
          <Card className={`mb-3 border-${portal?.status === 'CREATED' ? 'primary' : portal?.status === 'ALREADY_ACTIVE' ? 'info' : 'secondary'}`}>
            <Card.Body>
              <h6>🔑 Akses Portal Penghuni</h6>
              {portal?.status === 'CREATED' ? (
                <>
                  <Alert variant="primary" className="mb-2">
                    <strong>Akun portal baru dibuat!</strong><br />
                    Email: <code>{portal.email}</code>
                  </Alert>
                  <InputGroup className="mb-2">
                    <Form.Control
                      type="text"
                      value={portal.temporaryPassword ?? ''}
                      readOnly
                      style={{ fontFamily: 'monospace' }}
                    />
                    <Button
                      variant={passwordCopied ? 'success' : 'outline-primary'}
                      onClick={handleCopyPassword}
                    >
                      {passwordCopied ? '✅ Disalin' : '📋 Salin'}
                    </Button>
                  </InputGroup>
                  <small className="text-muted">
                    ⚠️ Password sementara hanya muncul sekali. Mohon segera dibagikan ke tenant.
                    Tenant wajib mengganti password setelah login pertama.
                  </small>
                  {passwordCopyError ? (
                    <Alert variant="warning" className="mt-2 mb-0 py-2">
                      {passwordCopyError}
                    </Alert>
                  ) : null}
                </>
              ) : portal?.status === 'ALREADY_ACTIVE' ? (
                <Alert variant="info" className="mb-0">
                  Akun portal sudah aktif untuk email <code>{portal.email}</code>. Tidak ada perubahan.
                </Alert>
              ) : (
                <Alert variant="secondary" className="mb-0">
                  Tenant tidak memiliki email. Akun portal tidak tersedia.
                </Alert>
              )}
            </Card.Body>
          </Card>

          <div className="d-flex gap-2">
            <Button variant="outline-secondary" onClick={() => handleCloseSuccess('/stays')}>
              Kembali ke Daftar Masa Sewa
            </Button>
            <Button variant="primary" onClick={() => handleCloseSuccess(`/stays/${stay.id}`)}>
              Lihat Detail Masa Sewa #{stay.id}
            </Button>
          </div>
        </Offcanvas.Body>
      </Offcanvas>
    );
  }

  return (
    <Offcanvas show={show} onHide={handleClose} onExited={() => navigate('/stays')} placement="end" backdrop="static" style={{ width: '700px' }}>
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>Check-in Baru</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <WizardSteps current={step} />

        {wizardError ? (
          <Alert variant="danger" dismissible onClose={() => setWizardError('')}>
            {wizardError}
          </Alert>
        ) : null}

        <Form onSubmit={(e) => { e.preventDefault(); nextStep(); }}>
          {step === 1 ? (
            <StepTenantSelect
              form={form}
              selectedTenant={selectedTenantOption}
              onTenantChange={(option) => {
                setSelectedTenantOption(option);
                form.setValue('tenantId', option?.value ?? null);
              }}
              loadTenantOptions={loadTenantOptions}
              defaultTenantOptions={defaultTenantOptions}
              isLoading={isLoadingTenants}
              onCreateInlineTenant={handleCreateInlineTenant}
              isCreatingTenant={createInlineTenantMutation.isPending}
              wizardError={wizardError}
              onClearError={() => setWizardError('')}
              refreshKey={tenantSelectRefreshKey}
            />
          ) : null}

          {step === 2 ? (
            <StepRoomSelect
              form={form}
              rooms={displayRooms}
              isLoadingRooms={isLoadingRooms}
              selectedRoomName={selectedRoom?.name ?? ''}
              onClearError={() => setWizardError('')}
            />
          ) : null}

          {step === 3 ? (
            <>
              <StepReviewConfirm
                form={form}
                selectedTenantName={selectedTenant?.fullName ?? ''}
                selectedRoomName={selectedRoom?.name ?? ''}
                estimatedElectricityThreshold={estimatedElectricityThreshold}
                estimatedWaterThreshold={estimatedWaterThreshold}
              />
              <StepDetailsAndMeters
                form={form}
                estimatedElectricityThreshold={estimatedElectricityThreshold}
                estimatedWaterThreshold={estimatedWaterThreshold}
                depositWasManuallyCleared={depositWasManuallyCleared}
                setDepositWasManuallyCleared={setDepositWasManuallyCleared}
              />
            </>
          ) : null}

          <div className="d-flex justify-content-between gap-2">
            <Button variant="outline-secondary" onClick={() => step === 1 ? handleClose() : setStep((prev) => Math.max(1, prev - 1))}>Kembali</Button>
            <div className="d-flex gap-2">
              {step < 3 ? <Button type="submit">Lanjut</Button> : null}
              {step === 3 ? (
                <Button type="submit" disabled={createStayMutation.isPending}>
                  {createStayMutation.isPending ? <><Spinner size="sm" className="me-2" />Memproses...</> : 'Simpan Check-in'}
                </Button>
              ) : null}
            </div>
          </div>
        </Form>
      </Offcanvas.Body>
    </Offcanvas>
  );
}