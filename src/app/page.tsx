// src/app/page.tsx
'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import HeroSection from '@/components/homepage/HeroSection';
import ValuePropsSection from '@/components/homepage/ValuePropsSection';
import Footer from '@/components/homepage/Footer';
import BookingModal from '@/components/homepage/BookingModal';

// Lazy load below-the-fold components
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
      {/* Modal - always ready, only visible when open */}
      <BookingModal isOpen={showBookingModal} onClose={closeBookingModal} />

      {/* Header */}
      <Header onBookingClick={openBookingModal} />

      {/* Hero Section - above the fold, load immediately */}
      <HeroSection onBookingClick={openBookingModal} />

      {/* Value Props - critical content */}
      <ValuePropsSection />

      {/* How It Works - lazy loaded */}
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
