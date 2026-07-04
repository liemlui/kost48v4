import { Card, Col, Form, Row, Alert, InputGroup } from 'react-bootstrap';
import { Controller } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import CurrencyInput from '../../../components/common/CurrencyInput';
import { formatRupiah } from '../../../utils/formatCurrency';
import type { WizardFormValues } from './types';
import { bookingSourceOptions, pricingTermOptions, stayPurposeOptions } from './checkInWizardUtils';

interface StepDetailsAndMetersProps {
  form: UseFormReturn<WizardFormValues>;
  estimatedElectricityThreshold: number;
  estimatedWaterThreshold: number;
  depositWasManuallyCleared: boolean;
  setDepositWasManuallyCleared: (value: boolean) => void;
}

export default function StepDetailsAndMeters({
  form,
  estimatedElectricityThreshold,
  estimatedWaterThreshold,
  depositWasManuallyCleared,
  setDepositWasManuallyCleared,
}: StepDetailsAndMetersProps) {
  return (
    <Card className="content-card border-0 shadow-sm mb-4">
      <Card.Body>
        <h5 className="mb-3">Detail Sewa & Meter Awal</h5>
        <Row className="g-3">
          <Col md={6}>
            <Form.Group>
              <Form.Label>
                Tanggal Masuk<span className="text-danger ms-1">*</span>
              </Form.Label>
              <Form.Control type="date" {...form.register('checkInDate', { required: 'Tanggal masuk wajib diisi' })} />
              {form.formState.errors.checkInDate ? <div className="text-danger small mt-2">{String(form.formState.errors.checkInDate.message)}</div> : null}
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Jenis Masa Sewa</Form.Label>
              <Form.Select {...form.register('pricingTerm')}>
                {pricingTermOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Form.Select>
              <div className="text-muted small mt-1">Pilih jenis masa sewa sesuai kesepakatan.</div>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>
                Harga Sewa Disepakati<span className="text-danger ms-1">*</span>
              </Form.Label>
              <Controller
                control={form.control}
                name="agreedRentAmountRupiah"
                rules={{ required: 'Harga sewa disepakati wajib diisi', min: { value: 0, message: 'Nilai tidak boleh negatif' } }}
                render={({ field }) => (
                  <>
                    <InputGroup>
                      <InputGroup.Text className="bg-white border-end-0 text-muted" style={{ fontSize: '0.85rem' }}>Rp</InputGroup.Text>
                      <CurrencyInput
                        value={field.value === '' || field.value == null ? undefined : Number(field.value)}
                        onChange={(v) => field.onChange(v == null ? '' : v)}
                        placeholder="0"
                      />
                    </InputGroup>
                    {field.value !== undefined && field.value !== null && field.value !== '' && !isNaN(Number(field.value)) ? (
                      <div className="text-muted small mt-1">Preview: {formatRupiah(field.value)}</div>
                    ) : null}
                  </>
                )}
              />
              {form.formState.errors.agreedRentAmountRupiah ? (
                <div className="text-danger small mt-2">{String(form.formState.errors.agreedRentAmountRupiah.message)}</div>
              ) : null}
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
                  <>
                    <InputGroup>
                      <InputGroup.Text className="bg-white border-end-0 text-muted" style={{ fontSize: '0.85rem' }}>Rp</InputGroup.Text>
                      <CurrencyInput
                        value={field.value === '' || field.value == null ? undefined : Number(field.value)}
                        onChange={(v) => {
                          const val = v == null ? '' : v;
                          field.onChange(val);
                          if (val === '' || val === 0) {
                            setDepositWasManuallyCleared(true);
                          }
                        }}
                        placeholder="0"
                      />
                    </InputGroup>
                    {field.value !== undefined && field.value !== null && field.value !== '' && !isNaN(Number(field.value)) ? (
                      <div className="text-muted small mt-1">Preview: {formatRupiah(field.value)}</div>
                    ) : null}
                  </>
                )}
              />
              {form.formState.errors.depositAmountRupiah ? (
                <div className="text-danger small mt-2">{String(form.formState.errors.depositAmountRupiah.message)}</div>
              ) : null}
              {/* Audit E-3: jaminan tunai yang diterima saat check-in harus tercatat resmi */}
              <Form.Check
                type="checkbox"
                id="check-in-deposit-collected"
                className="mt-2"
                label="Jaminan sudah diterima saat check-in (dicatat ke ledger & jurnal)"
                {...form.register('depositCollected')}
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Tujuan Tinggal</Form.Label>
              <Form.Select {...form.register('stayPurpose')}>
                {stayPurposeOptions.map((option) => (
                  <option key={option.value || 'empty'} value={option.value}>{option.label}</option>
                ))}
              </Form.Select>
              <div className="text-muted small mt-1">Pilih tujuan tinggal dari opsi yang tersedia agar data tetap rapi.</div>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Sumber Booking</Form.Label>
              <Form.Select {...form.register('bookingSource')}>
                {bookingSourceOptions.map((option) => (
                  <option key={option.value || 'empty'} value={option.value}>{option.label}</option>
                ))}
              </Form.Select>
              <div className="text-muted small mt-1">Pilih sumber booking dari daftar yang tersedia.</div>
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
                    if (isNaN(num)) return 'Harus berupa angka';
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
                    if (isNaN(num)) return 'Harus berupa angka';
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
            <strong>Catatan Meter Awal:</strong> Meter awal listrik dan air wajib diisi untuk mencatat baseline penggunaan. Nilai harus berupa angka dan tidak boleh negatif.
          </div>
        </Alert>
      </Card.Body>
    </Card>
  );
}