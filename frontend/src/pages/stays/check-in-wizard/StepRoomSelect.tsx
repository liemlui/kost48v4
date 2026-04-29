import { Card, Col, Form, Row, Spinner, Button, Badge } from 'react-bootstrap';
import { Controller } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import type { WizardFormValues } from './types';

interface StepRoomSelectProps {
  form: UseFormReturn<WizardFormValues>;
  rooms: Array<{ id: number; name: string; price?: number; deposit?: number; status: string }>;
  isLoadingRooms: boolean;
  selectedRoomName: string;
  onClearError: () => void;
}

export default function StepRoomSelect({
  form,
  rooms,
  isLoadingRooms,
  selectedRoomName,
  onClearError,
}: StepRoomSelectProps) {
  const selectedRoomId = form.watch('roomId');

  return (
    <Card className="content-card border-0 shadow-sm mb-4">
      <Card.Body>
        <h5 className="mb-3">Pilih Kamar</h5>
        <Form.Group className="mb-3">
          <Form.Label>Kamar<span className="text-danger ms-1">*</span></Form.Label>
          {isLoadingRooms ? (
            <div className="d-flex align-items-center gap-2">
              <Spinner size="sm" />
              <span className="text-muted">Memuat data kamar...</span>
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-muted">Tidak ada kamar tersedia.</div>
          ) : (
            <Row xs={1} md={2} lg={3} className="g-3">
              {rooms.map((room) => {
                const isSelected = selectedRoomId === room.id;
                const isOccupied = room.status === 'OCCUPIED' || room.status === 'BOOKED';
                return (
                  <Col key={room.id}>
                    <Card
                      className={`room-card h-100 cursor-pointer ${isSelected ? 'border-primary' : 'border'} ${isOccupied ? 'border-danger opacity-50' : ''}`}
                      style={{ cursor: isOccupied ? 'not-allowed' : 'pointer' }}
                      onClick={() => {
                        if (!isOccupied) {
                          form.setValue('roomId', room.id);
                          onClearError();
                        }
                      }}
                    >
                      <Card.Body>
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <h6 className="mb-0">{room.name}</h6>
                          <Badge bg={isOccupied ? 'danger' : 'success'}>{isOccupied ? 'Terisi' : 'Tersedia'}</Badge>
                        </div>
                        {room.price ? (
                          <div className="text-muted small">
                            Harga Sewa: Rp {Number(room.price).toLocaleString('id-ID')} / bulan
                          </div>
                        ) : null}
                        {room.deposit ? (
                          <div className="text-muted small">
                            Deposit: Rp {Number(room.deposit).toLocaleString('id-ID')}
                          </div>
                        ) : null}
                        {isSelected ? (
                          <Button size="sm" variant="outline-primary" className="mt-2 w-100" disabled>
                            Dipilih
                          </Button>
                        ) : isOccupied ? (
                          <Button size="sm" variant="outline-secondary" className="mt-2 w-100" disabled>
                            Tidak Tersedia
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline-primary" className="mt-2 w-100">
                            Pilih
                          </Button>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}
          {form.formState.errors.roomId ? <div className="text-danger small mt-2">{String(form.formState.errors.roomId.message)}</div> : null}
        </Form.Group>
      </Card.Body>
    </Card>
  );
}