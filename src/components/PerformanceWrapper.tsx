// src/components/PerformanceWrapper.tsx
'use client';

import { useEffect, useState } from 'react';

declare global {
  interface Window {
    __DRIVLET_MOBILE__?: boolean;
  }
}

export default function PerformanceWrapper({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Detect mobile and low-end devices
    const isMobileDevice = window.innerWidth < 768 || 'ontouchstart' in window;

    if (isMobileDevice) {
      document.documentElement.classList.add('mobile-device');
      window.__DRIVLET_MOBILE__ = true;
    }

    // Respect user's motion preferences
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.classList.add('reduce-motion');
    }

    // Passive touch event optimization - prevent accidental zoom on double tap
    let lastTouchEnd = 0;
    const handleTouchEnd = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    };

    // Prevent multi-touch gestures that could cause issues
    const preventMultiTouch = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    document.addEventListener('touchmove', preventMultiTouch, { passive: false });

    // Optimize for low-end devices by reducing animation complexity
    const checkPerformance = () => {
      if ('connection' in navigator) {
        const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
        if (connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g') {
          document.documentElement.classList.add('reduce-motion');
        }
      }
    };
    checkPerformance();

    setIsMounted(true);

    return () => {
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchmove', preventMultiTouch);
    };
  }, []);

  // Show minimal loading state to prevent flash
  if (!isMounted) {
    return <div className="min-h-screen bg-white" />;
  }

  return <>{children}</>;
}
