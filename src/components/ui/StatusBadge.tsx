// src/components/ui/StatusBadge.tsx
"use client";

import {
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  LucideIcon,
} from "lucide-react";

export type BookingStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type GarageStatus = "pending" | "approved" | "rejected" | "suspended";
export type DriverStatus = "pending" | "approved" | "rejected" | "active" | "inactive";

// Status configurations for different entity types
const bookingStatusConfig: Record<
  BookingStatus,
  { icon: LucideIcon; color: string; bgColor: string; borderColor: string; label: string }
> = {
  pending: {
    icon: Clock,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    label: "Pending",
  },
  in_progress: {
    icon: Loader2,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    label: "In Progress",
  },
  completed: {
    icon: CheckCircle2,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    label: "Completed",
  },
  cancelled: {
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    label: "Cancelled",
  },
};

const garageStatusConfig: Record<
  GarageStatus,
  { icon: LucideIcon; color: string; bgColor: string; borderColor: string; label: string }
> = {
  pending: {
    icon: Clock,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    label: "Pending Review",
  },
  approved: {
    icon: CheckCircle2,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    label: "Approved",
  },
  rejected: {
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    label: "Rejected",
  },
  suspended: {
    icon: AlertTriangle,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    label: "Suspended",
  },
};

const driverStatusConfig: Record<
  DriverStatus,
  { icon: LucideIcon; color: string; bgColor: string; borderColor: string; label: string }
> = {
  pending: {
    icon: Clock,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    label: "Pending Review",
  },
  approved: {
    icon: CheckCircle2,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    label: "Approved",
  },
  active: {
    icon: CheckCircle2,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    label: "Active",
  },
  rejected: {
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    label: "Rejected",
  },
  inactive: {
    icon: AlertTriangle,
    color: "text-slate-600",
    bgColor: "bg-slate-50",
    borderColor: "border-slate-200",
    label: "Inactive",
  },
};

interface StatusBadgeProps {
  status: BookingStatus | GarageStatus | DriverStatus;
  type?: "booking" | "garage" | "driver";
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  animate?: boolean;
}

export function StatusBadge({
  status,
  type = "booking",
  size = "md",
  showIcon = true,
  animate = true,
}: StatusBadgeProps) {
  // Get the appropriate config based on type
  let config;
  if (type === "garage") {
    config = garageStatusConfig[status as GarageStatus];
  } else if (type === "driver") {
    config = driverStatusConfig[status as DriverStatus];
  } else {
    config = bookingStatusConfig[status as BookingStatus];
  }

  // Fallback if status not found
  if (!config) {
    config = {
      icon: AlertTriangle,
      color: "text-slate-600",
      bgColor: "bg-slate-50",
      borderColor: "border-slate-200",
      label: status,
    };
  }

  const StatusIcon = config.icon;

  // Size classes
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-2.5 py-1 text-xs gap-1.5",
    lg: "px-3 py-1.5 text-sm gap-2",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  const shouldAnimate = animate && status === "in_progress";

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium border ${sizeClasses[size]} ${config.bgColor} ${config.color} ${config.borderColor}`}
    >
      {showIcon && (
        <StatusIcon
          className={`${iconSizes[size]} ${shouldAnimate ? "animate-spin" : ""}`}
        />
      )}
      {config.label}
    </span>
  );
}

// Export individual status configs for use elsewhere
export { bookingStatusConfig, garageStatusConfig, driverStatusConfig };
