import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { heroSlides } from '../data/site'
import { supabase } from '../lib/supabase'

const INTERVAL_MS = 4500

export function HeroSlider() {
  const [dbBanners, setDbBanners] = useState<any[]>([])
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const fetchBanners = () => {
    supabase
      .from('banners')
      .select('*')
      .eq('active', true)
      .order('display_order', { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setDbBanners(data)
        }
      })
  }

  useEffect(() => {
    fetchBanners()
    window.addEventListener('focus', fetchBanners)
    return () => window.removeEventListener('focus', fetchBanners)
  }, [])

  const slides = dbBanners.length > 0
    ? dbBanners.map((b) => ({
        id: b.id,
        align: b.alignment || 'right',
        image: b.desktop_image || '/hero-living-hd.jpg',
        mobileImage: b.mobile_image || b.desktop_image || '/hero-living-scene.jpg',
        alt: b.title || 'CouchKraft Handcrafted Furniture',
        title: b.title,
        subtitle: b.subtitle || 'Explore a curated collection of modern furniture designed to bring warmth, balance and simplicity into your home.',
        href: b.cta_url || '/shop',
        cta: b.cta_label || 'Shop the Collection',
      }))
    : heroSlides

  useEffect(() => {
    if (paused || slides.length < 2) return
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length)
    }, INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [paused, slides.length])

  return (
    <section
      className="hero page-wrap"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured collections"
    >
      <div className="hero-frame">
        {slides.map((slide, slideIndex) => {
          const active = slideIndex === index
          return (
            <article
              key={slide.id}
              className={`hero-slide is-${slide.align} is-${slide.id}${active ? ' is-active' : ''}`}
              aria-hidden={!active}
            >
              <picture>
                {(slide as any).mobileImage && (
                  <source media="(max-width: 768px)" srcSet={(slide as any).mobileImage} />
                )}
                <img
                  src={slide.image}
                  alt={slide.alt}
                  width={1600}
                  height={820}
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).src = '/hero-living-hd.jpg'
                  }}
                />
              </picture>
              <Link className="hero-copy" to={slide.href}>
                <h1>{slide.title}</h1>
                <p className="hero-lead">{(slide as any).subtitle || 'Explore a curated collection of modern furniture designed to bring warmth, balance and simplicity into your home.'}</p>
                <span className="hero-cta">{slide.cta}</span>
              </Link>
            </article>
          )
        })}
      </div>
    </section>
  )
}
