import { useMemo, useState } from 'react';
import { Badge, Button, Card, ProgressBar } from 'react-bootstrap';
import {
  buildTenantRulesWizardResult,
  TENANT_RULES_WIZARD_QUESTIONS,
  type TenantRuleContext,
  type TenantRulesWizardAnswers,
} from '../../data/tenantRules';

type Props = {
  context: TenantRuleContext;
  /** Tombol "lewati" → tampilkan semua aturan (tab Aturan). */
  onSkip: () => void;
};

/**
 * Wizard 4 pertanyaan (W-TNT-001 langkah 4).
 * Jawaban hanya hidup di state komponen — tidak dikirim ke API, tidak
 * disimpan di localStorage, dan tidak memuat data pribadi (nama/NIK/alamat).
 */
export default function TenantRulesWizard({ context, onSkip }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<TenantRulesWizardAnswers>({});
  const [done, setDone] = useState(false);

  const question = TENANT_RULES_WIZARD_QUESTIONS[step];
  const result = useMemo(
    () => (done ? buildTenantRulesWizardResult(answers, context) : null),
    [done, answers, context],
  );

  const answer = (value: string) => {
    const next = { ...answers, [question.key]: value } as TenantRulesWizardAnswers;
    setAnswers(next);
    if (step + 1 >= TENANT_RULES_WIZARD_QUESTIONS.length) {
      setDone(true);
    } else {
      setStep(step + 1);
    }
  };

  const restart = () => {
    setAnswers({});
    setStep(0);
    setDone(false);
  };

  if (done && result) {
    return (
      <Card className="border-0 tenant-rules-wizard">
        <Card.Body>
          <div className="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-3">
            <div>
              <div className="text-muted small">Aturan yang berlaku untukmu</div>
              <h5 className="mb-1">Ringkasan aturan</h5>
              <div className="text-muted small">{result.summary}</div>
            </div>
            <Badge bg="primary">Tidak ada data yang disimpan</Badge>
          </div>

          <ul className="tenant-rules-wizard-highlights">
            {result.highlights.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>

          <div className="d-flex flex-wrap gap-2 mt-3">
            <Button variant="primary" size="sm" onClick={onSkip}>Baca semua aturan</Button>
            <Button variant="outline-secondary" size="sm" onClick={restart}>Ulangi wizard</Button>
          </div>

          <div className="mt-3">
            {result.categories.map((category) => {
              const notes = result.notes[category.id];
              if (!notes?.length) return null;
              return (
                <div key={category.id} className="tenant-rules-wizard-note">
                  <strong>{category.icon} {category.title}</strong>
                  <ul>
                    {notes.map((note) => <li key={note}>{note}</li>)}
                  </ul>
                </div>
              );
            })}
          </div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="border-0 tenant-rules-wizard">
      <Card.Body>
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
          <div className="text-muted small">Pertanyaan {step + 1} dari {TENANT_RULES_WIZARD_QUESTIONS.length}</div>
          <Button variant="link" size="sm" className="p-0" onClick={onSkip}>
            Lewati, tampilkan semua aturan
          </Button>
        </div>
        <ProgressBar
          now={((step + 1) / TENANT_RULES_WIZARD_QUESTIONS.length) * 100}
          className="mb-3"
          style={{ height: 6 }}
        />

        <h5 className="mb-1">{question.question}</h5>
        <div className="text-muted small mb-3">{question.help}</div>

        <div className="d-flex flex-column gap-2">
          {question.options.map((option) => (
            <button
              key={option.value}
              type="button"
              className="tenant-rules-wizard-option"
              onClick={() => answer(option.value)}
            >
              <strong>{option.label}</strong>
              <small>{option.hint}</small>
            </button>
          ))}
        </div>

        <div className="d-flex justify-content-between align-items-center mt-3">
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
          >
            Kembali
          </Button>
          <span className="text-muted" style={{ fontSize: '0.75rem' }}>
            Jawaban tidak disimpan.
          </span>
        </div>
      </Card.Body>
    </Card>
  );
}
