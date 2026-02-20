// src/app/booking/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Book a Car Service Pickup | Drivlet – Newcastle & Canberra',
  description:
    'Book a car service pickup and delivery online. We pick up your car, deliver it to your mechanic, and return it. From $119. Serving Newcastle and Canberra.',
  keywords: [
    'book car service pickup',
    'car service pickup online',
    'book drivlet',
    'car service delivery booking',
    'Newcastle car service booking',
    'Canberra car service booking',
  ],
  alternates: {
    canonical: 'https://drivlet.com.au/booking',
  },
  openGraph: {
    title: 'Book a Car Service Pickup – Drivlet',
    description:
      'Book online in minutes. We pick up your car, take it to the mechanic, and return it. From $119.',
    url: 'https://drivlet.com.au/booking',
  },
};

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}