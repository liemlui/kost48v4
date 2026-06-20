import { Button, Card } from 'react-bootstrap';

export type AccountingSetupChecklistStep = {
  id: string;
  label: string;
  done: boolean;
  helper: string;
  targetSectionId?: string;
};

type Props = {
  steps: AccountingSetupChecklistStep[];
  onFocusSection: (sectionId: string) => void;
};

export default function AccountingSetupChecklist({ steps, onFocusSection }: Props) {
  const doneCount = steps.filter((step) => step.done).length;
  const firstTodo = steps.find((step) => !step.done);

  return (
    <Card className="content-card border-0 mb-3 accounting-setup-checklist">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
          <div>
            <div className="section-kicker mb-1">Panduan Setup</div>
            <h3 className="h5 mb-0">Checklist pembukuan dasar</h3>
          </div>
          <div className="text-end">
            <div className="fw-semibold">{doneCount}/{steps.length} selesai</div>
            <small className="text-muted">
              {firstTodo ? `Lanjut: ${firstTodo.label}` : 'Siap catat transaksi'}
            </small>
          </div>
        </div>

        <ol className="accounting-setup-checklist-list list-unstyled d-grid gap-2 mb-0">
          {steps.map((step, index) => (
            <li
              key={step.id}
              className={`accounting-setup-checklist-item d-flex align-items-start gap-3 ${step.done ? 'is-done' : 'is-todo'}`}
            >
              <span className="accounting-setup-checklist-mark" aria-hidden="true">
                {step.done ? 'OK' : index + 1}
              </span>
              <span className="flex-fill">
                <span className="fw-semibold d-block">{step.label}</span>
                <small className="text-muted">{step.helper}</small>
              </span>
              {step.targetSectionId ? (
                <Button
                  type="button"
                  size="sm"
                  variant={step.done ? 'outline-secondary' : 'outline-primary'}
                  className="flex-shrink-0"
                  onClick={() => step.targetSectionId && onFocusSection(step.targetSectionId)}
                >
                  Buka
                </Button>
              ) : null}
            </li>
          ))}
        </ol>
      </Card.Body>
    </Card>
  );
}
