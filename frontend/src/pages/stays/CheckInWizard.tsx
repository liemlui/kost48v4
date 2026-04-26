import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Badge, Button, Card, Col, Form, Offcanvas, Row, Spinner } from 'react-bootstrap';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import SearchableSelect, { SelectOption } from '../../components/common/SearchableSelect';
import CurrencyInput from '../../components/common/CurrencyInput';
import { createResource, listResource } from '../../api/resources';
import { createStay, CreateStayResponse } from '../../api/stays';
import { Room, Stay, StayCreatePayload, Tenant } from '../../types';
import { formatRupiah } from '../../utils/formatCurrency';

function today() {
  return new Date().toISOString().slice(0, 10);
}

type WizardFormValues = {
  tenantId: number | null;
  roomId: number | null;
  pricingTerm: string;
  checkInDate: string;
  agreedRentAmountRupiah: number | string;
  depositAmountRupiah: number | string;
  stayPurpose: string;
  bookingSource: string;
  notes: string;
  initialElectricityKwh: string;
  initialWaterM3: string;
};


const STEPS = ['Tenant', 'Kamar & Sewa', 'Konfirmasi'];


const stayPurposeOptions = [
  { value: '', label: 'Pilih tujuan tinggal...' },
  { value: 'WORK', label: 'Bekerja' },
  { value: 'STUDY', label: 'Belajar' },
  { value: 'TRANSIT', label: 'Transit' },
  { value: 'FAMILY', label: 'Keluarga' },
  { value: 'MEDICAL', label: 'Medis' },
  { value: 'PROJECT', label: 'Proyek' },
  { value: 'OTHER', label: 'Lainnya' },
];

const bookingSourceOptions = [
  { value: '', label: 'Pilih sumber booking...' },
  { value: 'GOOGLE_MAPS', label: 'Google Maps' },
  { value: 'WALK_IN', label: 'Datang Langsung' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'TIKTOK', label: 'TikTok' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'WEBSITE', label: 'Website' },
  { value: 'OTA', label: 'OTA' },
  { value: 'OTHER', label: 'Lainnya' },
];

function WizardSteps({ current }: { current: number }) {
  return (
    <div className="wizard-steps">
      {STEPS.map((label, index) => {
        const stepNum = index + 1;
        const isDone = stepNum < current;
        const isActive = stepNum === current;
        return (
          <div className="wizard-step-item" key={label}>
            <div className={`wizard-step-dot ${isDone || isActive ? 'active' : ''}`}>{isDone ? '✓' : stepNum}</div>
            <span className={`wizard-step-label ${isActive ? 'active' : ''}`}>{label}</span>
            {index < STEPS.length - 1 ? <div className="wizard-step-line" /> : null}
          </div>
        );
      })}
    </div>
  );
}

const defaultValues: WizardFormValues = {
  tenantId: null,
  roomId: null,
  pricingTerm: 'MONTHLY',
  checkInDate: today(),
  agreedRentAmountRupiah: '',
  depositAmountRupiah: '',
  stayPurpose: '',
  bookingSource: '',
  notes: '',
  initialElectricityKwh: '',
  initialWaterM3: '',
};

export default function CheckInWizard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [wizardError, setWizardError] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<SelectOption<number> | null>(null);
  const [showInlineTenant, setShowInlineTenant] = useState(false);
  const [inlineTenant, setInlineTenant] = useState({ fullName: '', phone: '', email: '', gender: 'OTHER' });
  const [defaultTenantOptions, setDefaultTenantOptions] = useState<SelectOption<number>[]>([]);

  const form = useForm<WizardFormValues>({ defaultValues });
  const watchedRoomId = form.watch('roomId');

  const roomsQuery = useQuery({
    queryKey: ['rooms', 'available', 'wizard'],
    queryFn: () => listResource<Room>('/rooms', { status: 'AVAILABLE', limit: 100 }),
  });

  // Query untuk mendapatkan stays aktif untuk filter tenant DAN room
  // Hanya query ACTIVE saja agar flow backoffice tetap mengikuti status aktif yang dibekukan
  // Gunakan limit besar (500) untuk memastikan semua stays aktif terambil untuk filtering
  const activeStaysQuery = useQuery({
    queryKey: ['stays', 'active', 'wizard'],
    queryFn: () => listResource<Stay>('/stays', { status: 'ACTIVE', limit: 500 }),
    enabled: step === 1 || step === 2, // Fetch untuk step 1 (tenant) dan step 2 (room)
  });

  const selectedRoom = useMemo(() => roomsQuery.data?.items?.find((room) => room.id === Number(watchedRoomId)), [roomsQuery.data, watchedRoomId]);

  // Hanya stay operasional (room.status === 'OCCUPIED') yang benar-benar memblokir check-in.
  // Stay RESERVED (booking website) tidak boleh dianggap sebagai penghuni kamar.
  const trulyOccupiedActiveStays = useMemo(() => {
    if (!activeStaysQuery.data?.items) return null;
    return activeStaysQuery.data.items.filter(
      (stay) => stay.room?.status === 'OCCUPIED',
    );
  }, [activeStaysQuery.data]);

  // Tenant dengan stay operasional aktif (tidak eligible untuk check-in baru)
  const tenantsWithActiveStay = useMemo(() => {
    if (!trulyOccupiedActiveStays) return null;
    return new Set(trulyOccupiedActiveStays.map((stay) => stay.tenantId));
  }, [trulyOccupiedActiveStays]);

  // Room dengan stay operasional aktif (tidak eligible untuk check-in baru)
  const roomsWithActiveStay = useMemo(() => {
    if (!trulyOccupiedActiveStays) return null;
    return new Set(trulyOccupiedActiveStays.map((stay) => stay.roomId));
  }, [trulyOccupiedActiveStays]);

  // Filter rooms: hanya yang AVAILABLE dan tidak memiliki stay aktif
  const eligibleRooms = useMemo(() => {
    if (!roomsQuery.data?.items || !roomsWithActiveStay) return [];
    return roomsQuery.data.items.filter(room => 
      room.status === 'AVAILABLE' && !roomsWithActiveStay.has(room.id)
    );
  }, [roomsQuery.data, roomsWithActiveStay]);

  const [depositWasManuallyCleared, setDepositWasManuallyCleared] = useState(false);

  useEffect(() => {
    if (selectedRoom) {
      // Set agreed rent amount jika kosong
      if (!form.getValues('agreedRentAmountRupiah')) {
        form.setValue('agreedRentAmountRupiah', selectedRoom.monthlyRateRupiah ?? '');
      }
      
      // Deposit default: selalu ikuti kamar yang dipilih, kecuali user sudah mengosongkan secara manual
      if (!depositWasManuallyCleared) {
        // Selalu update deposit default sesuai kamar yang dipilih
        form.setValue('depositAmountRupiah', selectedRoom.defaultDepositRupiah ?? '');
      }
    }
  }, [selectedRoom, form, depositWasManuallyCleared]);

  // Reset depositWasManuallyCleared ketika kamar berubah
  useEffect(() => {
    setDepositWasManuallyCleared(false);
  }, [watchedRoomId]);

  // Load default tenant options saat component mount atau activeStaysQuery berubah
  useEffect(() => {
    const loadDefaultTenantOptions = async () => {
      if (activeStaysQuery.isLoading || activeStaysQuery.isError) {
        // Tunggu sampai query selesai atau error
        return;
      }
      
      try {
        const options = await loadTenantOptions('');
        setDefaultTenantOptions(options);
      } catch (error) {
        console.error('Gagal memuat default tenant options:', error);
        setDefaultTenantOptions([]);
      }
    };

    loadDefaultTenantOptions();
  }, [activeStaysQuery.isLoading, activeStaysQuery.isError, activeStaysQuery.data]);

  const createInlineTenantMutation = useMutation({
    mutationFn: () => createResource<Tenant>('/tenants', {
      fullName: inlineTenant.fullName,
      phone: inlineTenant.phone || undefined,
      email: inlineTenant.email || undefined,
      gender: inlineTenant.gender || undefined,
      isActive: 'true',
    }),
    onSuccess: (tenant) => {
      form.setValue('tenantId', tenant.id);
      setSelectedTenant({ value: tenant.id, label: `${tenant.fullName}${tenant.phone ? ` (${tenant.phone})` : ''}` });
      setShowInlineTenant(false);
      setInlineTenant({ fullName: '', phone: '', email: '', gender: 'OTHER' });
    },
    onError: (err: any) => setWizardError(err?.response?.data?.message || 'Gagal membuat tenant baru'),
  });

  const createStayMutation = useMutation({
    mutationFn: (payload: StayCreatePayload) => createStay(payload),
    onSuccess: (response: CreateStayResponse) => {
      // Backend mengembalikan { stay, invoice } dalam property data
      // response adalah data langsung dari createResource (tanpa envelope)
      const stayId = response?.stay?.id;
      if (stayId) {
        // Invalidate query cache untuk data yang terdampak check-in
        queryClient.invalidateQueries({ queryKey: ['stays'] });
        queryClient.invalidateQueries({ queryKey: ['rooms'] });
        queryClient.invalidateQueries({ queryKey: ['tenants'] });
        queryClient.invalidateQueries({ queryKey: ['rooms', 'available', 'wizard'] });
        // Invalidate semua dashboard query dengan pola predicate yang robust
        // Menggunakan predicate untuk menginvalidate semua query yang key-nya dimulai dengan 'dashboard-'
        queryClient.invalidateQueries({
          predicate: (query) => {
            const queryKey = query.queryKey;
            // Cek jika queryKey adalah array dan elemen pertama mengandung 'dashboard'
            return Array.isArray(queryKey) && 
                   queryKey.length > 0 && 
                   typeof queryKey[0] === 'string' && 
                   queryKey[0].startsWith('dashboard-');
          }
        });
        
        navigate(`/stays/${stayId}?tab=meter`, { replace: true });
      } else {
        setWizardError('Gagal mendapatkan ID stay dari response');
      }
    },
    onError: (err: any) => setWizardError(err?.response?.data?.message || 'Gagal check-in stay'),
  });

  const loadTenantOptions = async (inputValue: string) => {
    // Hanya tenant yang benar-benar menempati kamar (room.status === 'OCCUPIED') yang diblokir.
    // Tenant dengan booking RESERVED tetap boleh dipilih untuk check-in manual.
    const activeTenantIds = trulyOccupiedActiveStays 
      ? new Set(trulyOccupiedActiveStays.map(stay => stay.tenantId))
      : new Set<number>(); // Jika data belum ada, anggap kosong (semua tenant eligible)
    
    const result = await listResource<Tenant>('/tenants', { limit: 20, search: inputValue || undefined });
    const allTenants = result.items ?? [];
    
    // Filter out tenants with active stays
    const eligibleTenants = allTenants.filter(tenant => !activeTenantIds.has(tenant.id));
    
    return eligibleTenants.map((tenant) => ({ 
      value: tenant.id, 
      label: `${tenant.fullName}${tenant.phone ? ` (${tenant.phone})` : ''}` 
    }));
  };

  const nextStep = async () => {
    setWizardError('');
    if (step === 1 && !form.getValues('tenantId')) {
      form.setError('tenantId', { type: 'required', message: 'Tenant wajib dipilih' });
      return;
    }
    if (step === 2 && !form.getValues('roomId')) {
      form.setError('roomId', { type: 'required', message: 'Kamar wajib dipilih' });
      return;
    }
    setStep((prev) => Math.min(3, prev + 1));
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    setWizardError('');
    await createStayMutation.mutateAsync({
      tenantId: Number(values.tenantId),
      roomId: Number(values.roomId),
      pricingTerm: values.pricingTerm,
      checkInDate: values.checkInDate,
      agreedRentAmountRupiah: Number(values.agreedRentAmountRupiah),
      depositAmountRupiah: values.depositAmountRupiah ? Number(values.depositAmountRupiah) : undefined,
      stayPurpose: values.stayPurpose || undefined,
      bookingSource: values.bookingSource || undefined,
      notes: values.notes || undefined,
      initialElectricityKwh: values.initialElectricityKwh,
      initialWaterM3: values.initialWaterM3,
    });
  });

  return (
    <Offcanvas show onHide={() => navigate('/dashboard')} placement="end" backdrop scroll style={{ width: 640 }}>
      <Offcanvas.Header closeButton>
        <div>
          <Offcanvas.Title>Check-in Baru</Offcanvas.Title>
          <WizardSteps current={step} />
        </div>
      </Offcanvas.Header>
      <Offcanvas.Body>
        {wizardError ? <Alert variant="danger">{wizardError}</Alert> : null}

        <Form onSubmit={handleSubmit}>
          {step === 1 ? (
            <Card className="content-card border-0 shadow-sm mb-4">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">Pilih Tenant</h5>
                  <Button size="sm" variant="outline-primary" onClick={() => setShowInlineTenant((prev) => !prev)}>Tambah Tenant Baru</Button>
                </div>
                <Form.Group className="mb-3">
                  <Form.Label>Tenant</Form.Label>
                  {activeStaysQuery.isLoading ? (
                    <div className="d-flex align-items-center gap-2">
                      <Spinner size="sm" />
                      <span className="text-muted">Memuat data tenant...</span>
                    </div>
                  ) : (
                    <Controller
                      control={form.control}
                      name="tenantId"
                      rules={{ required: 'Tenant wajib dipilih' }}
                      render={({ field }) => (
                        <>
                          <SearchableSelect<number>
                            value={selectedTenant}
                            onChange={(option) => {
                              setSelectedTenant(option);
                              field.onChange(option?.value ?? null);
                            }}
                            loadOptions={loadTenantOptions}
                            placeholder="Cari tenant..."
                            isDisabled={activeStaysQuery.isLoading}
                            defaultOptions={defaultTenantOptions}
                          />
                          {form.formState.errors.tenantId ? <div className="text-danger small mt-2">{String(form.formState.errors.tenantId.message)}</div> : null}
                        </>
                      )}
                    />
                  )}
                </Form.Group>

                {showInlineTenant ? (
                  <Card body className="bg-light border">
                    <Row className="g-3">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>
                            Nama<span className="text-danger ms-1">*</span>
                          </Form.Label>
                          <Form.Control 
                            value={inlineTenant.fullName} 
                            onChange={(e) => setInlineTenant((prev) => ({ ...prev, fullName: e.target.value }))} 
                            placeholder="Nama lengkap tenant"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>
                            No. HP<span className="text-danger ms-1">*</span>
                          </Form.Label>
                          <Form.Control 
                            value={inlineTenant.phone} 
                            onChange={(e) => setInlineTenant((prev) => ({ ...prev, phone: e.target.value }))} 
                            placeholder="08xxxxxxxxxx atau +628xxxxxxxxxx"
                          />
                          <div className="text-muted small mt-1">Minimal 10 digit</div>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Email</Form.Label>
                          <Form.Control 
                            value={inlineTenant.email} 
                            onChange={(e) => setInlineTenant((prev) => ({ ...prev, email: e.target.value }))} 
                            placeholder="email@contoh.com"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Gender</Form.Label>
                          <Form.Select value={inlineTenant.gender} onChange={(e) => setInlineTenant((prev) => ({ ...prev, gender: e.target.value }))}>
                            <option value="MALE">MALE</option>
                            <option value="FEMALE">FEMALE</option>
                            <option value="OTHER">OTHER</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>
                    <div className="mt-3 d-flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => {
                          // Validasi inline tenant
                          if (!inlineTenant.fullName.trim()) {
                            setWizardError('Nama tenant wajib diisi');
                            return;
                          }
                          if (!inlineTenant.phone.trim()) {
                            setWizardError('No. HP tenant wajib diisi');
                            return;
                          }
                          // Validasi phone format
                          const phoneRegex = /^(08\d{8,}|\+628\d{8,})$/;
                          if (!phoneRegex.test(inlineTenant.phone.trim())) {
                            setWizardError('Format nomor HP tidak valid. Minimal 10 digit, gunakan format: 08xxxxxxxxxx atau +628xxxxxxxxxx');
                            return;
                          }
                          createInlineTenantMutation.mutate();
                        }} 
                        disabled={createInlineTenantMutation.isPending}
                      >
                        Simpan Tenant
                      </Button>
                      <Button size="sm" variant="outline-secondary" onClick={() => setShowInlineTenant(false)}>Tutup</Button>
                    </div>
                  </Card>
                ) : null}
              </Card.Body>
            </Card>
          ) : null}

          {step === 2 ? (
            <Card className="content-card border-0 shadow-sm mb-4">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">Pilih Kamar</h5>
                  <Button 
                    size="sm" 
                    variant="outline-primary" 
                    onClick={() => navigate('/rooms')}
                  >
                    Tambah Kamar Baru
                  </Button>
                </div>
                {roomsQuery.isLoading ? <div className="py-4 text-center"><Spinner /></div> : null}
                {roomsQuery.isError ? <Alert variant="danger">Gagal mengambil daftar kamar.</Alert> : null}
                {activeStaysQuery.isError ? (
                  <Alert variant="danger">Gagal memuat data stays aktif. Tidak dapat menentukan kamar yang tersedia.</Alert>
                ) : null}
                {!roomsQuery.isLoading && !activeStaysQuery.isLoading && !activeStaysQuery.isError ? (
                  <Form.Group className="mb-3">
                    <Form.Label>Kamar Tersedia</Form.Label>
                    <Form.Select value={form.watch('roomId') ?? ''} onChange={(e) => form.setValue('roomId', e.target.value ? Number(e.target.value) : null)}>
                      <option value="">Pilih kamar...</option>
                      {eligibleRooms.map((room) => <option key={room.id} value={room.id}>{room.code} - {room.name}</option>)}
                    </Form.Select>
                    {form.formState.errors.roomId ? <div className="text-danger small mt-2">{String(form.formState.errors.roomId.message)}</div> : null}
                    {eligibleRooms.length === 0 && (
                      <div className="text-muted small mt-2">
                        Tidak ada kamar yang tersedia untuk check-in. Semua kamar sudah ditempati atau memiliki stay aktif.
                      </div>
                    )}
                  </Form.Group>
                ) : null}
                {activeStaysQuery.isLoading && !roomsQuery.isLoading && !roomsQuery.isError ? (
                  <div className="py-4 text-center">
                    <Spinner size="sm" className="me-2" />
                    <span className="text-muted">Memverifikasi kamar yang tersedia...</span>
                  </div>
                ) : null}

                {selectedRoom ? (
                  <Alert variant="light" className="border mb-0">
                    <div><strong>{selectedRoom.code}</strong> — {selectedRoom.name}</div>
                    <div>Tarif bulanan: {formatRupiah(selectedRoom.monthlyRateRupiah)}</div>
                    <div>Deposit default: {formatRupiah(selectedRoom.defaultDepositRupiah)}</div>
                    <div>Tarif listrik: {formatRupiah(selectedRoom.electricityTariffPerKwhRupiah)} per kWh</div>
                    <div>Tarif air: {formatRupiah(selectedRoom.waterTariffPerM3Rupiah)} per m³</div>
                  </Alert>
                ) : null}
              </Card.Body>
            </Card>
          ) : null}

          {step === 3 ? (
            <Card className="content-card border-0 shadow-sm mb-4">
              <Card.Body>
                <h5 className="mb-3">Detail Stay</h5>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>
                        Tanggal Check-in<span className="text-danger ms-1">*</span>
                      </Form.Label>
                      <Form.Control type="date" {...form.register('checkInDate', { required: true })} />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Pricing Term</Form.Label>
                      <Form.Select {...form.register('pricingTerm')}>
                        <option value="MONTHLY">MONTHLY</option>
                        <option value="WEEKLY">WEEKLY</option>
                        <option value="DAILY">DAILY</option>
                        <option value="BIWEEKLY">BIWEEKLY</option>
                        <option value="SMESTERLY">SMESTERLY</option>
                        <option value="YEARLY">YEARLY</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>
                        Agreed Rent Amount<span className="text-danger ms-1">*</span>
                      </Form.Label>
                      <Controller
                        control={form.control}
                        name="agreedRentAmountRupiah"
                        rules={{ required: 'Agreed rent amount wajib diisi', min: { value: 0, message: 'Nilai tidak boleh negatif' } }}
                        render={({ field }) => (
                          <CurrencyInput
                            value={field.value ? Number(field.value) : undefined}
                            onChange={(val) => field.onChange(val)}
                          />
                        )}
                      />
                      {form.formState.errors.agreedRentAmountRupiah && (
                        <div className="text-danger small mt-2">{String(form.formState.errors.agreedRentAmountRupiah.message)}</div>
                      )}
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Deposit</Form.Label>
                      <Controller
                        control={form.control}
                        name="depositAmountRupiah"
                        rules={{ min: { value: 0, message: 'Nilai tidak boleh negatif' } }}
                        render={({ field }) => (
                          <CurrencyInput
                            value={field.value ? Number(field.value) : undefined}
                            onChange={(val) => {
                              field.onChange(val);
                              // Jika user mengosongkan deposit secara manual, tandai sebagai cleared manual
                              if (val === undefined || val === null || val === 0) {
                                setDepositWasManuallyCleared(true);
                              }
                            }}
                          />
                        )}
                      />
                      {form.formState.errors.depositAmountRupiah && (
                        <div className="text-danger small mt-2">{String(form.formState.errors.depositAmountRupiah.message)}</div>
                      )}
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Stay Purpose</Form.Label>
                      <Form.Select {...form.register('stayPurpose')}>
                        {stayPurposeOptions.map((option) => (
                          <option key={option.value || 'empty'} value={option.value}>{option.label}</option>
                        ))}
                      </Form.Select>
                      <div className="text-muted small mt-1">Nilai harus sesuai enum backend.</div>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Booking Source</Form.Label>
                      <Form.Select {...form.register('bookingSource')}>
                        {bookingSourceOptions.map((option) => (
                          <option key={option.value || 'empty'} value={option.value}>{option.label}</option>
                        ))}
                      </Form.Select>
                      <div className="text-muted small mt-1">Input bebas dihilangkan agar tidak lagi mengirim enum liar.</div>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>
                        Meter Awal Listrik (kWh)<span className="text-danger ms-1">*</span>
                      </Form.Label>
                      <Form.Control 
                        type="number" 
                        step="0.001"
                        {...form.register('initialElectricityKwh', { 
                          required: 'Meter awal listrik wajib diisi',
                          validate: (value) => {
                            const num = parseFloat(value);
                            if (isNaN(num)) return 'Harus angka desimal valid';
                            if (num < 0) return 'Tidak boleh negatif';
                            return true;
                          }
                        })} 
                        placeholder="0.000"
                      />
                      {form.formState.errors.initialElectricityKwh && (
                        <div className="text-danger small mt-2">{String(form.formState.errors.initialElectricityKwh.message)}</div>
                      )}
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>
                        Meter Awal Air (m³)<span className="text-danger ms-1">*</span>
                      </Form.Label>
                      <Form.Control 
                        type="number" 
                        step="0.001"
                        {...form.register('initialWaterM3', { 
                          required: 'Meter awal air wajib diisi',
                          validate: (value) => {
                            const num = parseFloat(value);
                            if (isNaN(num)) return 'Harus angka desimal valid';
                            if (num < 0) return 'Tidak boleh negatif';
                            return true;
                          }
                        })} 
                        placeholder="0.000"
                      />
                      {form.formState.errors.initialWaterM3 && (
                        <div className="text-danger small mt-2">{String(form.formState.errors.initialWaterM3.message)}</div>
                      )}
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label>Catatan</Form.Label>
                      <Form.Control as="textarea" rows={3} {...form.register('notes')} />
                    </Form.Group>
                  </Col>
                </Row>
                <Alert variant="info" className="mt-3">
                  <div className="small">
                    <strong>Catatan Meter Awal:</strong> Meter awal listrik dan air wajib diisi untuk mencatat baseline penggunaan. Nilai harus angka desimal valid dan tidak boleh negatif.
                  </div>
                </Alert>
              </Card.Body>
            </Card>
          ) : null}

          <div className="d-flex justify-content-between gap-2">
            <Button variant="outline-secondary" onClick={() => step === 1 ? navigate('/dashboard') : setStep((prev) => Math.max(1, prev - 1))}>Kembali</Button>
            <div className="d-flex gap-2">
              {step < 3 ? <Button type="button" onClick={nextStep}>Lanjut</Button> : null}
              {step === 3 ? <Button type="submit" disabled={createStayMutation.isPending}>{createStayMutation.isPending ? <><Spinner size="sm" className="me-2" />Memproses...</> : 'Submit Check-in'}</Button> : null}
            </div>
          </div>
        </Form>
      </Offcanvas.Body>
    </Offcanvas>
  );
}
