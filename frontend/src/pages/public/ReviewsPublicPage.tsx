import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Container, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { fetchPublicSocialProof } from '../../api/marketing';
import EmptyState from '../../components/common/EmptyState';
import { officialKost48Location } from '../../data/officialKost48Content';
import { GuestTopbar, GuestFooter } from './publicGuestShared';
import { formatDateOnly } from '../../utils/dateTime';

const PER_PAGE = 6;

function ReviewPagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="d-flex justify-content-center align-items-center gap-2 mt-4" role="navigation" aria-label="Halaman ulasan">
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        aria-label="Halaman sebelumnya"
      >
        ‹
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          type="button"
          className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-outline-secondary'} k48-rating-badge`}
          onClick={() => onChange(p)}
          aria-current={p === page ? 'page' : undefined}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        aria-label="Halaman berikutnya"
      >
        ›
      </button>
    </div>
  );
}

export default function ReviewsPublicPage() {
  const query = useQuery({
    queryKey: ['public-reviews'],
    queryFn: fetchPublicSocialProof,
    staleTime: 5 * 60_000,
  });

  const [sortBy, setSortBy] = useState<'recent' | 'rating'>('recent');
  const [page, setPage] = useState(1);

  const sortedReviews = useMemo(() => {
    const data = query.data;
    if (!data?.reviews?.length) return [];
    const list = [...data.reviews];
    list.sort((a, b) =>
      sortBy === 'rating'
        ? b.rating - a.rating
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return list;
  }, [query.data, sortBy]);

  const totalPages = Math.ceil(sortedReviews.length / PER_PAGE);
  const pagedReviews = sortedReviews.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleSortChange = (next: 'recent' | 'rating') => {
    setSortBy(next);
    setPage(1);
  };

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 60);
    h();
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  const data = query.data;

  return (
    <div className="public-page-shell">
      <GuestTopbar scrolled={scrolled} />
      <div className="container py-4 py-lg-5" style={{ maxWidth: 820 }}>
        <div className="mb-4">
          <div className="page-eyebrow">✦ Ulasan Penghuni</div>
          <h1 className="mb-2">Apa Kata Penghuni KOST48</h1>
          <p className="text-muted k48-summary-max">
            Ulasan dari penghuni dan tamu yang pernah tinggal di KOST48.
          </p>
          <div className="d-flex gap-2 flex-wrap mt-3">
            <Link to="/rooms" className="btn btn-primary btn-sm">🔍 Lihat Kamar</Link>
            <a
              href={officialKost48Location.googleReviewUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline-warning btn-sm k48-text-muted-strong k48-border-accent"
            >
              ⭐ Tulis Ulasan di Google
            </a>
            <Link to="/" className="btn btn-outline-secondary btn-sm">🏠 Beranda</Link>
          </div>
        </div>

        {query.isLoading && (
          <div className="py-5 text-center">
            <Spinner animation="border" /> <span className="ms-2">Memuat ulasan...</span>
          </div>
        )}

        {query.isError && (
          <div className="py-5 text-center text-muted">
            Gagal memuat ulasan. Silakan coba lagi.
          </div>
        )}

        {!query.isLoading && !query.isError && data && (
          <>
            {/* Summary box */}
            {data.reviewCount > 0 && (
              <div className="gx-social-proof-summary mb-4 p-3 border rounded-4 bg-light-subtle k48-summary-box">
                {data.averageRating > 0 && (
                  <div className="mb-2">
                    <strong className="fs-3">{data.averageRating.toFixed(1)}</strong>
                    <span className="text-muted ms-2">/ 5 — {data.reviewCount} ulasan</span>
                  </div>
                )}
                <div className="text-muted small">
                  {data.occupantCount > 0 && <span>{data.occupantCount} penghuni aktif</span>}
                </div>
              </div>
            )}

            {/* Sort filter */}
            {sortedReviews.length > 1 && (
              <div className="d-flex gap-2 mb-4 align-items-center flex-wrap" role="tablist" aria-label="Urutkan ulasan">
                <span className="text-muted small">Urutkan:</span>
                <button
                  type="button"
                  role="tab"
                  aria-selected={sortBy === 'recent'}
                  className={`btn btn-sm ${sortBy === 'recent' ? 'btn-primary' : 'btn-outline-secondary'} k48-pill-round`}
                  onClick={() => handleSortChange('recent')}
                >
                  Terbaru
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={sortBy === 'rating'}
                  className={`btn btn-sm ${sortBy === 'rating' ? 'btn-primary' : 'btn-outline-secondary'} k48-pill-round`}
                  onClick={() => handleSortChange('rating')}
                >
                  Rating Tertinggi
                </button>
                <span className="text-muted small ms-auto">
                  {sortedReviews.length} ulasan · halaman {page} dari {totalPages}
                </span>
              </div>
            )}

            {/* No reviews */}
            {sortedReviews.length === 0 && (
              <EmptyState
                icon="⭐"
                title="Belum ada ulasan"
                description="Belum ada penghuni yang memberikan ulasan. Saat kamu sudah tinggal, berikan penilaian lewat portal penghuni untuk membantu calon penghuni lain."
              />
            )}

            {/* Review cards */}
            {pagedReviews.length > 0 && (
              <>
                <div className="gx-review-grid">
                  {pagedReviews.map((review, index) => {
                    const isGoogle = review.source === 'google';
                    const displayName = review.displayName || ('Penghuni ' + review.initials);
                    return (
                      <article className="gx-review-card" key={`${review.initials}-${review.createdAt}-${index}`}>
                        <div className="gx-review-card-head">
                          <span className="gx-review-avatar">{review.initials}</span>
                          <div>
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                              <strong>{displayName}</strong>
                              {isGoogle && (
                                <span className="k48-pill-muted">
                                  ⭐ Google Review
                                </span>
                              )}
                            </div>
                            <span className="text-muted small">
                            {formatDateOnly(review.createdAt)}
                            </span>
                          </div>
                          <span className="ms-auto fw-bold">{review.rating.toFixed(1)} / 5</span>
                        </div>
                        <p>{review.comment || '⭐ Memberikan penilaian positif untuk KOST48.'}</p>
                      </article>
                    );
                  })}
                </div>
                <ReviewPagination page={page} totalPages={totalPages} onChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
              </>
            )}
          </>
        )}
      </div>
      <GuestFooter />
    </div>
  );
}
