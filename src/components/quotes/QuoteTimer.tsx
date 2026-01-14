// src/components/quotes/QuoteTimer.tsx
'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { Clock, Eye, AlertCircle, Timer, XCircle } from 'lucide-react';

type QuoteStatus = 'pending' | 'viewed' | 'expired' | 'cancelled';

interface QuoteTimerProps {
  expiresAt?: string | Date | null;
  firstViewedAt?: string | Date | null;
  status: QuoteStatus;
  compact?: boolean;
  showIcon?: boolean;
  onExpire?: () => void;
}

interface TimeRemaining {
  expired: boolean;
  hours: number;
  minutes: number;
  seconds: number;
  totalHours: number;
  totalMinutes: number;
}

const calculateTimeRemaining = (expiresAt: Date): TimeRemaining => {
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();

  if (diff <= 0) {
    return {
      expired: true,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalHours: 0,
      totalMinutes: 0,
    };
  }

  const totalMinutes = Math.floor(diff / (1000 * 60));
  const totalHours = diff / (1000 * 60 * 60);
  const hours = Math.floor(totalHours);
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return {
    expired: false,
    hours,
    minutes,
    seconds,
    totalHours,
    totalMinutes,
  };
};

const formatCompact = (time: TimeRemaining): string => {
  if (time.expired) return 'Expired';

  if (time.hours >= 24) {
    const days = Math.floor(time.hours / 24);
    const remainingHours = time.hours % 24;
    return `${days}d ${remainingHours}h left`;
  }

  if (time.hours > 0) {
    return `${time.hours}h ${time.minutes}m left`;
  }

  if (time.minutes > 0) {
    return `${time.minutes}m ${time.seconds}s left`;
  }

  return `${time.seconds}s left`;
};

const formatFull = (time: TimeRemaining): string => {
  if (time.expired) return 'Expired';

  if (time.hours >= 24) {
    const days = Math.floor(time.hours / 24);
    const remainingHours = time.hours % 24;
    return `${days} day${days !== 1 ? 's' : ''}, ${remainingHours} hour${remainingHours !== 1 ? 's' : ''} remaining`;
  }

  if (time.hours > 0) {
    return `${time.hours} hour${time.hours !== 1 ? 's' : ''}, ${time.minutes} minute${time.minutes !== 1 ? 's' : ''} remaining`;
  }

  if (time.minutes > 0) {
    return `${time.minutes} minute${time.minutes !== 1 ? 's' : ''}, ${time.seconds} second${time.seconds !== 1 ? 's' : ''} remaining`;
  }

  return `${time.seconds} second${time.seconds !== 1 ? 's' : ''} remaining`;
};

type UrgencyLevel = 'normal' | 'warning' | 'urgent' | 'expired';

const getUrgencyLevel = (time: TimeRemaining): UrgencyLevel => {
  if (time.expired) return 'expired';
  if (time.totalHours < 1) return 'urgent';
  if (time.totalHours < 6) return 'warning';
  return 'normal';
};

const getUrgencyStyles = (urgency: UrgencyLevel): { text: string; bg: string; animate: boolean } => {
  switch (urgency) {
    case 'expired':
      return { text: 'text-red-600', bg: 'bg-red-100', animate: false };
    case 'urgent':
      return { text: 'text-red-600 font-bold', bg: 'bg-red-100', animate: true };
    case 'warning':
      return { text: 'text-amber-600 font-medium', bg: 'bg-amber-100', animate: true };
    default:
      return { text: 'text-emerald-600', bg: 'bg-emerald-100', animate: false };
  }
};

function QuoteTimerComponent({
  expiresAt,
  firstViewedAt,
  status,
  compact = false,
  showIcon = true,
  onExpire,
}: QuoteTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);
  const [hasExpired, setHasExpired] = useState(false);

  const updateTimer = useCallback(() => {
    if (!expiresAt) return;
    const expiry = new Date(expiresAt);
    const remaining = calculateTimeRemaining(expiry);
    setTimeRemaining(remaining);

    if (remaining.expired && !hasExpired) {
      setHasExpired(true);
      onExpire?.();
    }
  }, [expiresAt, hasExpired, onExpire]);

  useEffect(() => {
    // If not viewed yet or already expired/cancelled, don't run timer
    if (!firstViewedAt || status === 'expired' || status === 'cancelled') {
      return;
    }

    // Initial calculation
    updateTimer();

    // Determine update interval based on time remaining
    const getInterval = () => {
      if (!timeRemaining) return 60000;
      if (timeRemaining.expired) return 0; // Stop updates
      if (timeRemaining.totalHours < 1) return 1000; // Every second
      return 60000; // Every minute
    };

    const interval = getInterval();
    if (interval === 0) return;

    const timer = setInterval(updateTimer, interval);
    return () => clearInterval(timer);
  }, [firstViewedAt, status, updateTimer, timeRemaining?.totalHours]);

  // Not viewed yet - show "Valid until viewed"
  if (!firstViewedAt && status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1.5 text-slate-600">
        {showIcon && <Eye className="h-4 w-4" />}
        <span className="text-sm">Valid until viewed</span>
      </span>
    );
  }

  // Already expired or cancelled
  if (status === 'expired' || status === 'cancelled') {
    return (
      <span className="inline-flex items-center gap-1.5 text-red-600">
        {showIcon && <XCircle className="h-4 w-4" />}
        <span className="text-sm font-medium">Expired</span>
      </span>
    );
  }

  // Loading state
  if (!timeRemaining) {
    return (
      <span className="inline-flex items-center gap-1.5 text-slate-400">
        {showIcon && <Clock className="h-4 w-4" />}
        <span className="text-sm">Calculating...</span>
      </span>
    );
  }

  const urgency = getUrgencyLevel(timeRemaining);
  const styles = getUrgencyStyles(urgency);
  const displayText = compact ? formatCompact(timeRemaining) : formatFull(timeRemaining);

  // Expired (after countdown)
  if (timeRemaining.expired) {
    return (
      <span className="inline-flex items-center gap-1.5 text-red-600">
        {showIcon && <AlertCircle className="h-4 w-4" />}
        <span className="text-sm font-medium">Expired</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${styles.text} ${styles.animate ? 'animate-pulse' : ''}`}
    >
      {showIcon && (
        <Timer
          className={`h-4 w-4 ${styles.animate ? 'animate-pulse' : ''}`}
        />
      )}
      <span className="text-sm">{displayText}</span>
    </span>
  );
}

// Export memoized component to prevent unnecessary re-renders
export const QuoteTimer = memo(QuoteTimerComponent);

// Export badge component for quote cards
interface QuoteTimerBadgeProps extends QuoteTimerProps {
  className?: string;
}

function QuoteTimerBadgeComponent({
  expiresAt,
  firstViewedAt,
  status,
  compact = true,
  className = '',
  onExpire,
}: QuoteTimerBadgeProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);
  const [hasExpired, setHasExpired] = useState(false);

  const updateTimer = useCallback(() => {
    if (!expiresAt) return;
    const expiry = new Date(expiresAt);
    const remaining = calculateTimeRemaining(expiry);
    setTimeRemaining(remaining);

    if (remaining.expired && !hasExpired) {
      setHasExpired(true);
      onExpire?.();
    }
  }, [expiresAt, hasExpired, onExpire]);

  useEffect(() => {
    if (!firstViewedAt || status === 'expired' || status === 'cancelled') {
      return;
    }

    updateTimer();

    const getInterval = () => {
      if (!timeRemaining) return 60000;
      if (timeRemaining.expired) return 0;
      if (timeRemaining.totalHours < 1) return 1000;
      return 60000;
    };

    const interval = getInterval();
    if (interval === 0) return;

    const timer = setInterval(updateTimer, interval);
    return () => clearInterval(timer);
  }, [firstViewedAt, status, updateTimer, timeRemaining?.totalHours]);

  // Not viewed yet
  if (!firstViewedAt && status === 'pending') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 ${className}`}
      >
        <Eye className="h-3 w-3" />
        Valid until viewed
      </span>
    );
  }

  // Already expired or cancelled
  if (status === 'expired' || status === 'cancelled') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 ${className}`}
      >
        <XCircle className="h-3 w-3" />
        Expired
      </span>
    );
  }

  if (!timeRemaining) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 ${className}`}
      >
        <Clock className="h-3 w-3" />
        Loading...
      </span>
    );
  }

  const urgency = getUrgencyLevel(timeRemaining);
  const styles = getUrgencyStyles(urgency);
  const displayText = compact ? formatCompact(timeRemaining) : formatFull(timeRemaining);

  if (timeRemaining.expired) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 ${className}`}
      >
        <AlertCircle className="h-3 w-3" />
        Expired
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${styles.bg} ${styles.text} ${styles.animate ? 'animate-pulse' : ''} ${className}`}
    >
      <Timer className={`h-3 w-3 ${styles.animate ? '' : ''}`} />
      {displayText}
    </span>
  );
}

export const QuoteTimerBadge = memo(QuoteTimerBadgeComponent);

// Expiring soon indicator badge
interface ExpiringSoonBadgeProps {
  expiresAt?: string | Date | null;
  firstViewedAt?: string | Date | null;
  status: QuoteStatus;
  className?: string;
}

export function ExpiringSoonBadge({
  expiresAt,
  firstViewedAt,
  status,
  className = '',
}: ExpiringSoonBadgeProps) {
  const [showBadge, setShowBadge] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    if (!expiresAt || !firstViewedAt || status === 'expired' || status === 'cancelled') {
      setShowBadge(false);
      return;
    }

    const checkExpiry = () => {
      const expiry = new Date(expiresAt);
      const remaining = calculateTimeRemaining(expiry);

      if (remaining.expired) {
        setShowBadge(false);
        return;
      }

      setShowBadge(remaining.totalHours < 6);
      setIsUrgent(remaining.totalHours < 1);
    };

    checkExpiry();
    const interval = setInterval(checkExpiry, 60000);
    return () => clearInterval(interval);
  }, [expiresAt, firstViewedAt, status]);

  if (!showBadge) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
        isUrgent
          ? 'bg-red-500 text-white animate-pulse'
          : 'bg-amber-400 text-amber-900'
      } ${className}`}
    >
      {isUrgent ? 'Expiring!' : 'Expiring Soon'}
    </span>
  );
}

export default QuoteTimer;
