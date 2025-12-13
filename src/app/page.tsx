// src/app/page.tsx
'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import {
  BookingModal,
  HeroSection,
  ValuePropsSection,
  HowItWorksSection,
  ServicesSection,
  TestimonialsSection,
  ContactCTASection,
  FAQSection,
  Footer,
} from '@/components/homepage';

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();
  const [showBookingModal, setShowBookingModal] = useState(false);

  const openBookingModal = () => {
    if (!session?.user) {
      router.push('/login?message=booking&callbackUrl=/');
      return;
    }
    setShowBookingModal(true);
  };
  const closeBookingModal = () => setShowBookingModal(false);

  return (
    <main className="min-h-screen bg-white">
      {/* Booking Modal */}
      <BookingModal isOpen={showBookingModal} onClose={closeBookingModal} />

      {/* Header */}
      <Header onBookingClick={openBookingModal} />

      {/* Hero Section */}
      <HeroSection onBookingClick={openBookingModal} />

      {/* Value Props + How It Works with floating car */}
        <ValuePropsSection />
        <HowItWorksSection />

      {/* Services Section */}
      <ServicesSection onBookingClick={openBookingModal} />

      {/* Testimonials Section */}
      <TestimonialsSection />

      {/* Contact CTA Section */}
      <ContactCTASection />

      {/* FAQ Section */}
      <FAQSection />

      {/* Footer */}
      <Footer />
    </main>
  );
}
