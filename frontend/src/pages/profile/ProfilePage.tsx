import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Form, Row } from 'react-bootstrap';
import PasswordInput from '../../components/common/PasswordInput';
import { changePassword } from '../../api/auth';
import PageHeader from '../../components/common/PageHeader';
import { useAuth } from '../../context/AuthContext';

export default function ProfilePage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const mutation = useMutation({
    mutationFn: () => changePassword({ currentPassword: currentPassword || undefined, newPassword }),
    onSuccess: () => {
      setSuccess('Password berhasil diperbarui. Gunakan password baru saat login berikutnya.');
      setError('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err: unknown) => {
      const message = err && typeof err === 'object' && 'response' in err
        ? ((err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message ?? 'Gagal mengubah password.')
        : 'Gagal mengubah password.';
      setError(Array.isArray(message) ? message.join(', ') : message);
      setSuccess('');
    },
  });

  const handleSubmit = () => {
    setError('');
    setSuccess('');

    if (!newPassword || newPassword.length < 8) {
      setError('Password baru minimal 8 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password baru tidak cocok.');
      return;
    }

    mutation.mutate();
  };

  return (
    <div>
      <PageHeader
        eyebrow="Akun"
        title="Profil Saya"
        description="Lihat data akun aktif dan lakukan perubahan password dengan aman."
      />

      <Row className="g-4">
        <Col lg={5}>
          <Card className="content-card border-0 h-100">
            <Card.Body>
              <h5 className="mb-3">Informasi Akun</h5>
              <div className="mb-3">
                <div className="text-muted small">Nama lengkap</div>
                <div className="fw-semibold">{user?.fullName ?? '-'}</div>
              </div>
              <div className="mb-3">
                <div className="text-muted small">Email</div>
                <div className="fw-semibold">{user?.email ?? '-'}</div>
              </div>
              <div className="mb-3">
                <div className="text-muted small">Role</div>
                <div className="fw-semibold">{user?.role ?? '-'}</div>
              </div>
              <div>
                <div className="text-muted small">Tenant terkait</div>
                <div className="fw-semibold">{user?.tenantId ?? '-'}</div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={7}>
          <Card className="content-card border-0">
            <Card.Body>
              <h5 className="mb-3">Ganti Password</h5>
              {error ? <Alert variant="danger">{error}</Alert> : null}
              {success ? <Alert variant="success">{success}</Alert> : null}

              <Form.Group className="mb-3">
                <Form.Label>Password Saat Ini</Form.Label>
                <PasswordInput
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  placeholder="Isi jika endpoint membutuhkan verifikasi password lama"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Password Baru</Form.Label>
                <PasswordInput
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Minimal 8 karakter"
                />
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label>Konfirmasi Password Baru</Form.Label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Ulangi password baru"
                />
              </Form.Group>

              <div className="d-flex justify-content-end">
                <Button onClick={handleSubmit} disabled={mutation.isPending}>
                  {mutation.isPending ? 'Menyimpan...' : 'Simpan Password Baru'}
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
