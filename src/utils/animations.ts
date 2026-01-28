// src/utils/animations.ts
// Mobile detection and performance-aware animation utilities

import { AnimatePresence } from 'framer-motion';
import React from 'react';

// Mobile detection utility
export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768 || 'ontouchstart' in window;
};

// Check for global mobile flag (set by PerformanceWrapper)
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (window as unknown as { __DRIVLET_MOBILE__?: boolean }).__DRIVLET_MOBILE__ === true || isMobile();
};

// Performance-aware motion configurations
export const getMotionConfig = (type: 'page' | 'modal' | 'card' | 'list-item' = 'page') => {
  const isMobileDeviceFlag = isMobile();

  if (isMobileDeviceFlag) {
    // Minimal animations for mobile
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.15 }
    };
  }

  // Full animations for desktop
  const configs = {
    page: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 },
      transition: { duration: 0.3 }
    },
    modal: {
      initial: { opacity: 0, scale: 0.95 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.95 },
      transition: { duration: 0.2 }
    },
    card: {
      initial: { opacity: 0, y: 10 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.2 }
    },
    'list-item': {
      initial: { opacity: 0, x: -10 },
      animate: { opacity: 1, x: 0 },
      transition: { duration: 0.15 }
    }
  };

  return configs[type];
};

// Disable complex animations entirely on mobile
export const shouldUseAnimation = (): boolean => {
  if (typeof window === 'undefined') return true;
  if (isMobile()) return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  return true;
};

// Conditional AnimatePresence wrapper
interface ConditionalAnimatePresenceProps {
  children: React.ReactNode;
  mode?: 'sync' | 'wait' | 'popLayout';
  initial?: boolean;
  onExitComplete?: () => void;
}

export const ConditionalAnimatePresence = ({
  children,
  ...props
}: ConditionalAnimatePresenceProps) => {
  if (!shouldUseAnimation()) {
    return React.createElement(React.Fragment, null, children);
  }
  return React.createElement(AnimatePresence, props, children);
};

// Get simplified hover/tap animations for mobile
export const getInteractionConfig = () => {
  if (isMobile()) {
    return {
      whileHover: {},
      whileTap: { scale: 0.98 }
    };
  }
  return {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 }
  };
};

// Stagger children animations (disabled on mobile)
export const getStaggerConfig = (staggerDelay: number = 0.1) => {
  if (isMobile()) {
    return {
      variants: {
        hidden: { opacity: 0 },
        visible: { opacity: 1 }
      },
      initial: "hidden",
      animate: "visible",
      transition: { duration: 0.15 }
    };
  }

  return {
    variants: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: staggerDelay
        }
      }
    },
    initial: "hidden",
    animate: "visible"
  };
};

// Child item config for staggered lists
export const getStaggerChildConfig = () => {
  if (isMobile()) {
    return {
      variants: {
        hidden: { opacity: 0 },
        visible: { opacity: 1 }
      }
    };
  }

  return {
    variants: {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 }
    }
  };
};
