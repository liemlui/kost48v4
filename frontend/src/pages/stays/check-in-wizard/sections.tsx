import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import SearchableSelect from '../../../components/common/SearchableSelect';
import CurrencyInput from '../../../components/common/CurrencyInput';
import type { Room } from '../../../types';
import { formatRupiah } from '../../../utils/formatCurrency';
import { bookingSourceOptions, CHECKIN_WIZARD_STEPS, stayPurposeOptions } from './constants';
import type { InlineTenantState, TenantOption, WizardFormValues } from './types';

export function WizardSteps({ current }: { current: number }) {
  return (
    <div className="wizard-steps">
      {CHECKIN_WIZARD_STEPS.map((label, index) => {
        const stepNum = index + 1;
        const isDone = stepNum < current;
        const isActive = stepNum === current;
        return (
          <div className="wizard-step-item" key={label}>
            <div className={`wizard-step-dot ${isDone || isActive ? 'active' : ''}`}>{isDone ? '✓' : stepNum}</div>
            <span className={`wizard-step-label ${isActive ? 'active' : ''}`}>{label}</span>
            {index < CHECKIN_WIZARD_STEPS.length - 1 ? <div className="wizard-step-line" /> : null}
          </div>
        );
      })}
    </div>
  );
}

type TenantStepSectionProps = {
  form: UseFormReturn<WizardFormValues>;
  activeStaysLoading: boolean;
  selectedTenant: TenantOption | null;
  setSelectedTenant: (option: TenantOption | null) => void;
  loadTenantOptions: (inputValue: string) => Promise<TenantOption[]>;
  defaultTenantOptions: TenantOption[];
  showInlineTenant: boolean;
  onToggleInlineTenant: () => void;
  inlineTenant: InlineTenantState;
  setInlineTenant: (next: InlineTenantState) => void;
  onSaveInlineTenant: () => void;
  inlineTenantBusy: boolean;
};

export function TenantStepSection({
  form,
  activeStaysLoading,
  selectedTenant,
  setSelectedTenant,
  loadTenantOptions,
  defaultTenantOptions,
  showInlineTenant,
  onToggleInlineTenant,
  inlineTenant,
  setInlineTenant,
  onSaveInlineTenant,
  inlineTenantBusy,
}: TenantStepSectionProps) {
  return (
    <Card className="content-card border-0 shadow-sm mb-4">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">Pilih Tenant</h5>
          <Button size="sm" variant="outline-primary" onClick={onToggleInlineTenant}>Tambah Tenant Baru</Button>
        </div>
        <Form.Group className="mb-3">
          <Form.Label>Tenant</Form.Label>
          {activeStaysLoading ? (
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
                    isDisabled={activeStaysLoading}
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
                    onChange={(e) => setInlineTenant({ ...inlineTenant, fullName: e.target.value })}
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
                    onChange={(e) => setInlineTenant({ ...inlineTenant, phone: e.target.value })}
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
                    onChange={(e) => setInlineTenant({ ...inlineTenant, email: e.target.value })}
                    placeholder="email@contoh.com"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Gender</Form.Label>
                  <Form.Select value={inlineTenant.gender} onChange={(e) => setInlineTenant({ ...inlineTenant, gender: e.target.value })}>
                    <option value="MALE">MALE</option>
                    <option value="FEMALE">FEMALE</option>
                    <option value="OTHER">OTHER</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <div className="mt-3 d-flex gap-2">
              <Button size="sm" onClick={onSaveInlineTenant} disabled={inlineTenantBusy}>
                Simpan Tenant
              </Button>
              <Button size="sm" variant="outline-secondary" onClick={onToggleInlineTenant}>Tutup</Button>
            </div>
          </Card>
        ) : null}
      </Card.Body>
    </Card>
  );
}

type RoomStepSectionProps = {
  form: UseFormReturn<WizardFormValues>;
  roomsLoading: boolean;
  roomsError: boolean;
  activeStaysLoading: boolean;
  activeStaysError: boolean;
  eligibleRooms: Room[];
  selectedRoom?: Room;
};

export function RoomStepSection({
  form,
  roomsLoading,
  roomsError,
  activeStaysLoading,
  activeStaysError,
  eligibleRooms,
  selectedRoom,
}: RoomStepSectionProps) {
  const navigate = useNavigate();

  return (
    <Card className="content-card border-0 shadow-sm mb-4">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">Pilih Kamar</h5>
          <Button size="sm" variant="outline-primary" onClick={() => navigate('/rooms')}>
            Tambah Kamar Baru
          </Button>
        </div>
        {roomsLoading ? <div className="py-4 text-center"><Spinner /></div> : null}
        {roomsError ? <Alert variant="danger">Gagal mengambil daftar kamar.</Alert> : null}
        {activeStaysError ? (
          <Alert variant="danger">Gagal memuat data stays aktif. Tidak dapat menentukan kamar yang tersedia.</Alert>
        ) : null}
        {!roomsLoading && !activeStaysLoading && !activeStaysError ? (
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
        {activeStaysLoading && !roomsLoading && !roomsError ? (
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
  );
}

type ConfirmationStepSectionProps = {
  form: UseFormReturn<WizardFormValues>;
  setDepositWasManuallyCleared: (value: boolean) => void;
};

export function ConfirmationStepSection({ form, setDepositWasManuallyCleared }: ConfirmationStepSectionProps) {
  return (
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
                    if (Number.isNaN(num)) return 'Harus berupa angka';
                    if (num < 0) return 'Tidak boleh negatif';
                    return true;
                  },
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
                    if (Number.isNaN(num)) return 'Harus berupa angka';
                    if (num < 0) return 'Tidak boleh negatif';
                    return true;
                  },
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
        <Alert variant="info" className="mt-3 mb-0">
          <div className="small">
            <strong>Catatan Meter Awal:</strong> Meter awal listrik dan air wajib diisi untuk mencatat baseline penggunaan. Nilai harus berupa angka dan tidak boleh negatif.
          </div>
        </Alert>
      </Card.Body>
    </Card>
  );
}
