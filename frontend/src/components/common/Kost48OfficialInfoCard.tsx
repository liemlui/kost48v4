import { Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { officialKost48Faq, officialKost48Highlights, officialKost48Location, officialKost48TenantGuide } from '../../data/officialKost48Content';

type Props = {
  variant?: 'public' | 'detail' | 'tenant';
  compact?: boolean;
};

export default function Kost48OfficialInfoCard({ variant = 'public', compact = false }: Props) {
  const highlights = variant === 'tenant' ? officialKost48TenantGuide : officialKost48Highlights;
  const shownFaq = officialKost48Faq.slice(0, variant === 'tenant' ? 3 : 5);

  return (
    <section className={`kost48-official-info ${variant}${compact ? ' compact' : ''}`} aria-label="Info resmi KOST48">
      <div className="kost48-official-info-head">
        <div>
          <div className="command-eyebrow">Info resmi KOST48</div>
          <h2>{variant === 'tenant' ? 'Panduan singkat penghuni' : 'Kost Surabaya Barat yang dekat Pakuwon Mall / PTC'}</h2>
          <p>{officialKost48Location.address} · {officialKost48Location.nearby}</p>
        </div>
        {variant !== 'tenant' ? (
          <a className="btn btn-outline-primary btn-sm" href={officialKost48Location.mapsUrl} target="_blank" rel="noreferrer">
            Buka Maps
          </a>
        ) : null}
      </div>

      <div className="kost48-official-highlight-grid">
        {highlights.map((item) => (
          <div key={item.title} className="kost48-official-highlight">
            <span aria-hidden="true">{item.icon}</span>
            <div>
              <strong>{item.title}</strong>
              <small>{item.description}</small>
            </div>
          </div>
        ))}
      </div>

      {variant !== 'detail' ? (
        <div className="kost48-official-faq-list">
          {shownFaq.map((item) => (
            <details key={item.question}>
              <summary><span>{item.category}</span>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      ) : null}

      {variant === 'public' ? (
        <div className="kost48-official-actions">
          <Link className="btn btn-primary btn-sm" to="/rooms">Lihat Kamar</Link>
          <a className="btn btn-outline-secondary btn-sm" href={officialKost48Location.whatsappUrl} target="_blank" rel="noreferrer">Tanya Admin</a>
        </div>
      ) : variant === 'tenant' ? (
        <div className="kost48-official-actions">
          <Link className="btn btn-outline-primary btn-sm" to="/portal/tickets">Buat Laporan</Link>
          <Button variant="outline-secondary" size="sm" as="a" href={officialKost48Location.whatsappUrl} target="_blank" rel="noreferrer">Hubungi Admin</Button>
        </div>
      ) : null}
    </section>
  );
}
