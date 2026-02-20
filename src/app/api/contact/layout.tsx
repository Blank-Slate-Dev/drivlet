// src/app/contact/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Drivlet – Car Service Pickup & Delivery | Newcastle & Canberra',
  description:
    'Get in touch with Drivlet. Questions about our car service pickup and delivery? Call 1300 470 886 or email support@drivlet.com.au. Serving Newcastle and Canberra.',
  keywords: [
    'contact drivlet',
    'car service pickup contact',
    'drivlet phone number',
    'drivlet email',
    'car service Newcastle contact',
    'car service Canberra contact',
  ],
  alternates: {
    canonical: 'https://drivlet.com.au/contact',
  },
  openGraph: {
    title: 'Contact Drivlet – Car Service Pickup & Delivery',
    description:
      'Questions about our car service pickup and delivery? Call 1300 470 886 or email support@drivlet.com.au.',
    url: 'https://drivlet.com.au/contact',
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}