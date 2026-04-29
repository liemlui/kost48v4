import { useState } from 'react';
import { Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { Controller } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import SearchableSelect, { SelectOption } from '../../../components/common/SearchableSelect';
import type { WizardFormValues } from './types';

interface StepTenantSelectProps {
  form: UseFormReturn<WizardFormValues>;
  selectedTenant: SelectOption<number> | null;
  onTenantChange: (option: SelectOption<number> | null) => void;
  loadTenantOptions: (inputValue: string) => Promise<SelectOption<number>[]>;
  defaultTenantOptions: SelectOption<number>[];
  isLoading: boolean;
  onCreateInlineTenant: (tenant: { fullName: string; phone: string; email: string; gender: string }) => void;
  isCreatingTenant: boolean;
  wizardError: string;
  onClearError: () => void;
}

export default function StepTenantSelect({
  form,
  selectedTenant,
  onTenantChange,
  loadTenantOptions,
  defaultTenantOptions,
  isLoading,
  onCreateInlineTenant,
  isCreatingTenant,
  wizardError,
  onClearError,
}: StepTenantSelectProps) {
  const [showInlineTenant, setShowInlineTenant] = useState(false);
  const [inlineTenant, setInlineTenant] = useState({ fullName: '', phone: '', email: '', gender: 'OTHER' });

  const handleSaveTenant = () => {
    if (!inlineTenant.fullName.trim()) {
      // Error handled via wizardError setter from parent
      return;
    }
    if (!inlineTenant.phone.trim()) {
      return;
    }
    const phoneRegex = /^(08\d{8,}|\+628\d{8,})$/;
    if (!phoneRegex.test(inlineTenant.phone.trim())) {
      return;
    }
    onCreateInlineTenant(inlineTenant);
    setInlineTenant({ fullName: '', phone: '', email: '', gender: 'OTHER' });
  };

  const handleSaveWithValidation = () => {
    if (!inlineTenant.fullName.trim()) {
      // Parent handles error via onClearError
      return;
    }
    if (!inlineTenant.phone.trim()) {
      return;
    }
    const phoneRegex = /^(08\d{8,}|\+628\d{8,})$/;
    if (!phoneRegex.test(inlineTenant.phone.trim())) {
      return;
    }
    onCreateInlineTenant(inlineTenant);
    setInlineTenant({ fullName: '', phone: '', email: '', gender: 'OTHER' });
  };

  return (
    <Card className="content-card border-0 shadow-sm mb-4">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">Pilih Tenant</h5>
          <Button size="sm" variant="outline-primary" onClick={() => setShowInlineTenant((prev) => !prev)}>Tambah Tenant Baru</Button>
        </div>
        <Form.Group className="mb-3">
          <Form.Label>Tenant</Form.Label>
          {isLoading ? (
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
                      onTenantChange(option);
                      field.onChange(option?.value ?? null);
                    }}
                    loadOptions={loadTenantOptions}
                    placeholder="Cari tenant..."
                    isDisabled={isLoading}
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
                  if (!inlineTenant.fullName.trim()) {
                    onClearError();
                    return;
                  }
                  if (!inlineTenant.phone.trim()) {
                    onClearError();
                    return;
                  }
                  const phoneRegex = /^(08\d{8,}|\+628\d{8,})$/;
                  if (!phoneRegex.test(inlineTenant.phone.trim())) {
                    onClearError();
                    return;
                  }
                  onCreateInlineTenant(inlineTenant);
                  setInlineTenant({ fullName: '', phone: '', email: '', gender: 'OTHER' });
                }} 
                disabled={isCreatingTenant}
              >
                Simpan Tenant
              </Button>
              <Button size="sm" variant="outline-secondary" onClick={() => setShowInlineTenant(false)}>Tutup</Button>
            </div>
          </Card>
        ) : null}
      </Card.Body>
    </Card>
  );
}