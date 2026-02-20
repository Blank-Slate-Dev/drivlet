// src/components/homepage/HomepageClientWrapper.tsx
'use client';

import { useState, ReactNode } from 'react';
import BookingModal from '@/components/homepage/BookingModal';

interface HomepageClientWrapperProps {
  children: (
    openBookingModal: () => void,
    closeBookingModal: () => void,
    showBookingModal: boolean
  ) => ReactNode;
}

export function HomepageClientWrapper({ children }: HomepageClientWrapperProps) {
  const [showBookingModal, setShowBookingModal] = useState(false);
  const openBookingModal = () => setShowBookingModal(true);
  const closeBookingModal = () => setShowBookingModal(false);

  return (
    <>
      <BookingModal isOpen={showBookingModal} onClose={closeBookingModal} />
      {children(openBookingModal, closeBookingModal, showBookingModal)}
    </>
  );
}