import { floatingReviews } from '../data/reviews'

export function ReviewsMarquee() {
  const track = [...floatingReviews, ...floatingReviews]

  return (
    <section className="reviews-marquee-section page-wrap" aria-label="Customer reviews">
      <div className="section-heading">
        <h2>Loved in homes across India</h2>
        <p className="form-note">Kind words from recent CouchKraft customers</p>
      </div>
      <div className="reviews-marquee-shell">
        <div className="reviews-marquee-track">
          {track.map((review, index) => (
            <article key={`${review.id}-${index}`} className="review-marquee-card">
              <ReviewStars rating={review.rating} />
              <p className="review-marquee-text">“{review.text}”</p>
              <p className="review-marquee-author">
                <strong>{review.name}</strong> · {review.city}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function ReviewStars({ rating }: { rating: number }) {
  const stars = '★★★★★'.slice(0, rating) + '☆☆☆☆☆'.slice(0, 5 - rating)
  return <p className="review-marquee-stars" aria-label={`${rating} out of 5 stars`}>{stars}</p>
}