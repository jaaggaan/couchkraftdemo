type Props = {
  onOpenRequest: () => void
}

const showcase = [
  {
    src: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
    alt: 'Custom upholstered sofa in warm linen',
  },
  {
    src: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=800&q=80',
    alt: 'Bespoke dining table with oak grain',
  },
  {
    src: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80',
    alt: 'Tailored living room seating layout',
  },
]

export function CustomizeCtaSection({ onOpenRequest }: Props) {
  return (
    <section className="section page-wrap customize-cta">
      <div className="customize-cta-copy">
        <p className="form-note">Make it yours</p>
        <h2>Customize dimensions, fabrics &amp; finishes</h2>
        <p>
          Every CouchKraft piece can be tailored — seating depth, wood species, upholstery, and room-specific sizing. Share reference
          photos and we&apos;ll quote from our atelier.
        </p>
        <ul className="customize-cta-list">
          <li>Built-to-order with verified lead times</li>
          <li>Upload inspiration images with your brief</li>
          <li>Followed up personally by our atelier team</li>
        </ul>
        <button type="button" className="btn" onClick={onOpenRequest}>
          Open custom request form
        </button>
      </div>
      <div className="customize-cta-gallery">
        {showcase.map((img) => (
          <figure key={img.src}>
            <img src={img.src} alt={img.alt} width={800} height={600} loading="lazy" />
          </figure>
        ))}
      </div>
    </section>
  )
}