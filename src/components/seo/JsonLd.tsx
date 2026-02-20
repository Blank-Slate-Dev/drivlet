// src/components/seo/JsonLd.tsx
// Server component — renders structured data as <script> tags
// Following Next.js official recommendation: https://nextjs.org/docs/app/guides/json-ld

const BASE_URL = 'https://drivlet.com.au';

// ─── Organisation / Global Business Schema ──────────────────────────────
export function OrganizationJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Drivlet',
    legalName: 'Commuto Group Pty Ltd',
    url: BASE_URL,
    logo: `${BASE_URL}/logo.png`,
    description:
      'Drivlet picks up your car, delivers it to your chosen service centre, and returns it — so you can get on with your day.',
    telephone: '1300 470 886',
    email: 'support@drivlet.com.au',
    foundingDate: '2025',
    areaServed: [
      {
        '@type': 'City',
        name: 'Newcastle',
        containedInPlace: {
          '@type': 'State',
          name: 'New South Wales',
        },
      },
      {
        '@type': 'City',
        name: 'Canberra',
        containedInPlace: {
          '@type': 'State',
          name: 'Australian Capital Territory',
        },
      },
    ],
    sameAs: [
      // Add social profiles here when available
      // 'https://www.facebook.com/drivlet',
      // 'https://www.instagram.com/drivlet',
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema).replace(/</g, '\\u003c'),
      }}
    />
  );
}

// ─── LocalBusiness Schema (per location) ─────────────────────────────────
interface LocalBusinessJsonLdProps {
  city: string;
  state: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  suburbs?: string[];
}

export function LocalBusinessJsonLd({
  city,
  state,
  postalCode,
  latitude,
  longitude,
  suburbs = [],
}: LocalBusinessJsonLdProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${BASE_URL}/${city.toLowerCase()}#business`,
    name: `Drivlet – ${city}`,
    description: `Car service pickup and delivery in ${city}. We pick up your car, deliver it to your chosen mechanic or service centre, and return it — so you don't have to take time off work.`,
    url: `${BASE_URL}/${city.toLowerCase()}`,
    telephone: '1300 470 886',
    email: 'support@drivlet.com.au',
    image: `${BASE_URL}/logo.png`,
    priceRange: '$$',
    address: {
      '@type': 'PostalAddress',
      addressLocality: city,
      addressRegion: state,
      ...(postalCode && { postalCode }),
      addressCountry: 'AU',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude,
      longitude,
    },
    areaServed: [
      {
        '@type': 'City',
        name: city,
      },
      ...suburbs.map((suburb) => ({
        '@type': 'Place',
        name: `${suburb}, ${city}`,
      })),
    ],
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '07:00',
        closes: '18:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'Saturday',
        opens: '08:00',
        closes: '14:00',
      },
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '47',
      bestRating: '5',
      worstRating: '1',
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Car Service Transport',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Car Service Pickup & Return',
            description: `We pick up your car from your home or work in ${city}, deliver it to your chosen service centre, and return it when the service is complete.`,
          },
          price: '119.00',
          priceCurrency: 'AUD',
        },
      ],
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema).replace(/</g, '\\u003c'),
      }}
    />
  );
}

// ─── FAQPage Schema ─────────────────────────────────────────────────────
interface FAQItem {
  question: string;
  answer: string;
}

export function FAQJsonLd({ faqs }: { faqs: FAQItem[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema).replace(/</g, '\\u003c'),
      }}
    />
  );
}

// ─── Service Schema ─────────────────────────────────────────────────────
export function ServiceJsonLd({ city }: { city?: string }) {
  const locationText = city ? ` in ${city}` : '';
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: `Car Service Pickup & Delivery${locationText}`,
    description: `Drivlet picks up your car${locationText}, delivers it to your chosen service centre, and returns it when the work is done. No time off work needed.`,
    provider: {
      '@type': 'Organization',
      name: 'Drivlet',
      url: BASE_URL,
    },
    areaServed: city
      ? { '@type': 'City', name: city }
      : [
          { '@type': 'City', name: 'Newcastle' },
          { '@type': 'City', name: 'Canberra' },
        ],
    offers: {
      '@type': 'Offer',
      price: '119.00',
      priceCurrency: 'AUD',
      availability: 'https://schema.org/InStock',
    },
    serviceType: 'Vehicle Transport',
    termsOfService: `${BASE_URL}/policies`,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema).replace(/</g, '\\u003c'),
      }}
    />
  );
}

// ─── BreadcrumbList Schema ──────────────────────────────────────────────
interface BreadcrumbItem {
  name: string;
  url: string;
}

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema).replace(/</g, '\\u003c'),
      }}
    />
  );
}

// ─── WebSite Schema (for sitelinks searchbox) ───────────────────────────
export function WebSiteJsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Drivlet',
    url: BASE_URL,
    description:
      'Car service pickup and delivery. We pick up your car, take it to your mechanic, and return it.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/track?code={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema).replace(/</g, '\\u003c'),
      }}
    />
  );
}