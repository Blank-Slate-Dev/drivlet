// src/app/page.tsx
'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import HeroSection from '@/components/homepage/HeroSection';
import ValuePropsSection from '@/components/homepage/ValuePropsSection';
import Footer from '@/components/homepage/Footer';

// Lazy load heavy components to improve initial page load
const BookingModal = dynamic(
  () => import('@/components/homepage/BookingModal'),
  {
    ssr: false,
    loading: () => null,
  }
);

const HowItWorksSection = dynamic(
  () => import('@/components/homepage/HowItWorksSection'),
  { ssr: false }
);

const InteractiveServicesSection = dynamic(
  () => import('@/components/homepage/InteractiveServicesSection'),
  { ssr: false }
);

const ContactCTASection = dynamic(
  () => import('@/components/homepage/ContactCTASection'),
  { ssr: false }
);

const FAQSection = dynamic(
  () => import('@/components/homepage/FAQSection'),
  { ssr: false }
);

export default function Home() {
  const [showBookingModal, setShowBookingModal] = useState(false);
  const openBookingModal = () => setShowBookingModal(true);
  const closeBookingModal = () => setShowBookingModal(false);

  return (
    <main className="min-h-screen bg-white">
      {/* Only render modal when needed */}
      {showBookingModal && (
        <BookingModal isOpen={showBookingModal} onClose={closeBookingModal} />
      )}

      {/* Header */}
      <Header onBookingClick={openBookingModal} />

      {/* Hero Section - above the fold, load immediately */}
      <HeroSection onBookingClick={openBookingModal} />

      {/* Value Props - critical content */}
      <ValuePropsSection />

      {/* How It Works - lazy loaded to prevent blocking */}
      <HowItWorksSection />

      {/* Services Section - lazy loaded */}
      <InteractiveServicesSection onBookingClick={openBookingModal} />

      {/* Contact CTA Section - lazy loaded */}
      <ContactCTASection />

      {/* FAQ Section - lazy loaded */}
      <FAQSection />

      {/* Footer */}
      <Footer />
    </main>
  );
}
