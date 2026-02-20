// src/app/robots.ts
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://drivlet.com.au';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/dashboard/',
          '/driver/dashboard/',
          '/driver/jobs/',
          '/driver/payments/',
          '/driver/settings/',
          '/driver/history/',
          '/driver/onboarding/',
          '/driver/pending/',
          '/driver/login/',
          '/driver/register/',
          '/garage/dashboard/',
          '/garage/bookings/',
          '/garage/analytics/',
          '/garage/settings/',
          '/garage/notifications/',
          '/garage/quotes/',
          '/garage/reviews/',
          '/garage/services/',
          '/garage/subscription/',
          '/garage/location/',
          '/garage/pending/',
          '/garage/login/',
          '/garage/register/',
          '/account/',
          '/login/',
          '/register/',
          '/auth/',
          '/payment/',
          '/booking/success/',
          '/booking/cancelled/',
          '/review/',
          '/maintenance/',
          '/quotes/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}