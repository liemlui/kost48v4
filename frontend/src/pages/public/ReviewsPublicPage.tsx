import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Container, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { fetchPublicSocialProof } from '../../api/marketing';
import EmptyState from '../../components/common/EmptyState';

export default function ReviewsPublicPage() {
  const query = useQuery({
    queryKey: ['public-reviews'],
    queryFn: fetchPublicSocialProof,
    staleTime: 5 * 60_000,
  });

  const [sortBy, setSortBy] = useState<'recent' | 'rating'>('recent');

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

  const data = query.data;

  return (
    <div className="public-page-shell">
      <div className="container py-4 py-lg-5" style={{ maxWidth: 820 }}>
        <div className="mb-4">
          <div className="page-eyebrow">✦ Ulasan Penghuni</div>
          <h1 className="mb-2">Apa Kata Penghuni KOST48</h1>
          <p className="text-muted" style={{ maxWidth: 600 }}>
            Ulasan dari penghuni yang pernah atau sedang tinggal — ditampilkan secara anonim.
          </p>
          <div className="d-flex gap-2 flex-wrap mt-3">
            <Link to="/rooms" className="btn btn-primary btn-sm">🔍 Lihat Kamar</Link>
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
              <div className="gx-social-proof-summary mb-4 p-3 border rounded-4 bg-light-subtle" style={{ maxWidth: 400 }}>
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
              <div className="d-flex gap-2 mb-4" role="tablist" aria-label="Urutkan ulasan">
                <span className="text-muted small align-self-center">Urutkan:</span>
                <button
                  type="button"
                  role="tab"
                  aria-selected={sortBy === 'recent'}
                  className={`btn btn-sm ${sortBy === 'recent' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setSortBy('recent')}
                  style={{ borderRadius: 999 }}
                >
                  Terbaru
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={sortBy === 'rating'}
                  className={`btn btn-sm ${sortBy === 'rating' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setSortBy('rating')}
                  style={{ borderRadius: 999 }}
                >
                  Rating Tertinggi
                </button>
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
            {sortedReviews.length > 0 && (
              <div className="gx-review-grid">
                {sortedReviews.map((review, index) => (
                  <article className="gx-review-card" key={`${review.initials}-${review.createdAt}-${index}`}>
                    <div className="gx-review-card-head">
                      <span className="gx-review-avatar">{review.initials}</span>
                      <div>
                        <strong>Penghuni {review.initials}</strong>
                        <span className="text-muted small">
                          {new Date(review.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                      <span className="ms-auto fw-bold">{review.rating.toFixed(1)} / 5</span>
                    </div>
                    <p>{review.comment || 'Memberikan penilaian positif untuk layanan KOST48.'}</p>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
