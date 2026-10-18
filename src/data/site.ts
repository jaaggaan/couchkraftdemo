/** Verified contact details from https://couchkraft.in — all other copy is editorial mock content. */

export const site = {
  name: 'CouchKraft',
  tagline: 'Lets Craft Comfort',
  email: 'contact@Couchkraft.in',
  phoneDisplay: '+91 63607 04340',
  phoneHref: 'tel:916360704340',
  whatsappHref: 'https://wa.me/916360704340?text=Hello%20CouchKraft%2C%20I%20am%20enquiring%20about%20your%20handcrafted%20artisanal%20furniture%20collection.',
  address:
    'Couchkraft Furniture Store, No. 45, 2nd Floor, Old Madras Road, Near KR Puram Railway Station, KR Puram, Bengaluru, Karnataka - 560036',
  hours: 'Mon–Fri, 9:30 AM – 9:30 PM',
  website: 'https://couchkraft.in',
}

export const spaces = [
  {
    id: 'living',
    label: 'Living Room',
    href: '/shop?space=living',
    image:
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'dining',
    label: 'Dining',
    href: '/shop?space=dining',
    image:
      'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'bedroom',
    label: 'Bedroom',
    href: '/shop?space=bedroom',
    image:
      'https://images.unsplash.com/photo-1615876234886-fd9a39fda97f?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'lounge',
    label: 'Lounge & Accent',
    href: '/shop?space=lounge',
    image:
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80',
  },
] as const

export const heroSlides = [
  {
    id: 'living',
    space: 'living' as const,
    image: '/hero-living-hd.jpg',
    title: 'In soft sculpture',
    cta: 'Shop the Collection',
    href: '/shop?space=living',
    tone: 'dark' as const,
    align: 'right' as const,
    alt: 'A cream living room with a sculptural sofa, oak table and linen ottomans',
  },
  {
    id: 'dining',
    space: 'dining' as const,
    image: '/hero-dining-hd.jpg',
    title: 'Gather beautifully',
    cta: 'Explore Dining',
    href: '/shop?space=dining',
    tone: 'dark' as const,
    align: 'left' as const,
    alt: 'An oak dining table with cream chairs and linen pendants',
  },
  {
    id: 'lounge',
    space: 'lounge' as const,
    image: '/hero-lounge-hd.jpg',
    title: 'A quieter kind of comfort',
    cta: 'Discover Lounge',
    href: '/shop?space=lounge',
    tone: 'dark' as const,
    align: 'right' as const,
    alt: 'A walnut lounge chair beside a floor lamp and side table',
  },
  {
    id: 'bedroom',
    space: 'bedroom' as const,
    image: '/hero-bedroom-hd.jpg',
    title: 'Rest in natural form',
    cta: 'Explore the Bedroom',
    href: '/shop?space=bedroom',
    tone: 'dark' as const,
    align: 'right' as const,
    alt: 'A low oak bed dressed in linen in a sunlit bedroom',
  },
]

export const lifestyle = {
  kitchen:
    'https://images.unsplash.com/photo-1556912173-46c336c7fd55?auto=format&fit=crop&w=1600&q=80',
  living:
    'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=2000&q=85',
  hero: '/hero-sculpture.png?v=6',
  pendant:
    'https://images.unsplash.com/photo-1543198126-a8ad8e47fb22?auto=format&fit=crop&w=1000&q=80',
  daybed:
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
  mirror:
    'https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=900&q=80',
}

export const DEMO_COUPON = {
  code: 'WARM10',
  percent: 10,
}
