// src/app/opengraph-image.tsx
// Dynamic OG image for social sharing (1200x630)
// Next.js automatically serves this at /opengraph-image

import { ImageResponse } from 'next/og';

export const alt = 'Drivlet – Car Service Pickup & Delivery in Newcastle & Canberra';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #065f46 0%, #047857 40%, #0d9488 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 80px',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {/* Pattern overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.08,
            backgroundImage:
              'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Logo text */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              background: '#fbbf24',
              borderRadius: '12px',
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              fontWeight: 800,
              color: '#1e293b',
            }}
          >
            d
          </div>
          <span
            style={{
              fontSize: '36px',
              fontWeight: 700,
              color: 'white',
              letterSpacing: '-0.5px',
            }}
          >
            drivlet
          </span>
        </div>

        {/* Main heading */}
        <h1
          style={{
            fontSize: '64px',
            fontWeight: 800,
            color: 'white',
            lineHeight: 1.1,
            margin: 0,
            maxWidth: '800px',
          }}
        >
          Car service pickup
          <br />
          <span style={{ color: '#6ee7b7' }}>&amp; delivery</span>
        </h1>

        {/* Subheading */}
        <p
          style={{
            fontSize: '24px',
            color: '#a7f3d0',
            marginTop: '20px',
            maxWidth: '700px',
            lineHeight: 1.4,
          }}
        >
          We pick up your car, take it to the mechanic, and return it.
          No time off work needed.
        </p>

        {/* Bottom bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '32px',
            marginTop: '40px',
          }}
        >
          <div
            style={{
              background: '#fbbf24',
              borderRadius: '999px',
              padding: '12px 32px',
              fontSize: '20px',
              fontWeight: 700,
              color: '#1e293b',
            }}
          >
            From $119
          </div>
          <span style={{ fontSize: '20px', color: '#a7f3d0' }}>
            Newcastle &amp; Canberra
          </span>
          <span style={{ fontSize: '20px', color: '#6ee7b7' }}>
            4.8/5 rating
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}