// src/components/dashboard/BookingFilters.tsx
"use client";

import { Filter, SortAsc, Calendar } from "lucide-react";

interface BookingFiltersProps {
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  stats: {
    pending: number;
    in_progress: number;
    completed: number;
    cancelled: number;
    total: number;
  };
}

export default function BookingFilters({
  statusFilter,
  setStatusFilter,
  sortBy,
  setSortBy,
  stats,
}: BookingFiltersProps) {
  const statusOptions = [
    { value: "all", label: "All Bookings", count: stats.total },
    { value: "pending", label: "Pending", count: stats.pending },
    { value: "in_progress", label: "In Progress", count: stats.in_progress },
    { value: "completed", label: "Completed", count: stats.completed },
    { value: "cancelled", label: "Cancelled", count: stats.cancelled },
  ];

  const sortOptions = [
    { value: "newest", label: "Newest First" },
    { value: "oldest", label: "Oldest First" },
    { value: "pickup", label: "By Pickup Date" },
  ];

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {statusOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setStatusFilter(option.value)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
              statusFilter === option.value
                ? "bg-emerald-600 text-white shadow-md"
                : "bg-white text-slate-600 border border-slate-200 hover:border-emerald-300 hover:text-emerald-600"
            }`}
          >
            {option.label}
            <span
              className={`inline-flex items-center justify-center rounded-full px-1.5 text-xs ${
                statusFilter === option.value
                  ? "bg-white/20 text-white"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {option.count}
            </span>
          </button>
        ))}
      </div>

      {/* Sort Dropdown */}
      <div className="flex items-center gap-2">
        <SortAsc className="h-4 w-4 text-slate-400" />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
