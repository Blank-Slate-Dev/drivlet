// src/components/homepage/HomepageClientWrapper.tsx
'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface HomepageClientWrapperProps {
  children: (
    openBookingModal: () => void,
    closeBookingModal: () => void,
    showBookingModal: boolean
  ) => ReactNode;
}

export function HomepageClientWrapper({ children }: HomepageClientWrapperProps) {
  const router = useRouter();

  // Navigate to the booking page instead of opening a modal
  const openBookingModal = () => router.push('/booking');
  const closeBookingModal = () => {}; // no-op, kept for interface compatibility
  const showBookingModal = false; // always false, no modal

  return <>{children(openBookingModal, closeBookingModal, showBookingModal)}</>;
}