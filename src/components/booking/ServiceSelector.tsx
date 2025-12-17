// src/components/booking/ServiceSelector.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  Check,
  ClipboardCheck,
  Cog,
  Disc3,
  Circle,
  Thermometer,
  Zap,
  Wind,
  BatteryCharging,
  Sparkles,
  Truck,
  X,
} from 'lucide-react';
import {
  SERVICE_CATEGORIES,
  COMMON_SERVICES,
  SelectedServiceCategory,
  getTotalSelectedCount,
  getPrimaryCategory,
} from '@/constants/serviceCategories';

// Icon mapping
const ICON_MAP: Record<string, React.ElementType> = {
  ClipboardCheck,
  Cog,
  Disc3,
  Circle,
  Thermometer,
  Zap,
  Wind,
  BatteryCharging,
  Sparkles,
  Truck,
};

interface ServiceSelectorProps {
  selectedServices: SelectedServiceCategory[];
  onServicesChange: (services: SelectedServiceCategory[]) => void;
  primaryCategory: string | null;
  onPrimaryCategoryChange: (category: string | null) => void;
  serviceNotes: string;
  onServiceNotesChange: (notes: string) => void;
  disabled?: boolean;
}

export default function ServiceSelector({
  selectedServices,
  onServicesChange,
  primaryCategory,
  onPrimaryCategoryChange,
  serviceNotes,
  onServiceNotesChange,
  disabled = false,
}: ServiceSelectorProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Auto-update primary category when services change
  useEffect(() => {
    const suggested = getPrimaryCategory(selectedServices);
    if (suggested && !primaryCategory) {
      onPrimaryCategoryChange(suggested);
    }
  }, [selectedServices, primaryCategory, onPrimaryCategoryChange]);

  const totalSelected = useMemo(() => getTotalSelectedCount(selectedServices), [selectedServices]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const isServiceSelected = (categoryId: string, service: string): boolean => {
    const cat = selectedServices.find((s) => s.category === categoryId);
    return cat?.services.includes(service) || false;
  };

  const getSelectedCountForCategory = (categoryId: string): number => {
    const cat = selectedServices.find((s) => s.category === categoryId);
    return cat?.services.length || 0;
  };

  const toggleService = (categoryId: string, service: string) => {
    if (disabled) return;

    const existing = selectedServices.find((s) => s.category === categoryId);
    let newServices: SelectedServiceCategory[];

    if (existing) {
      if (existing.services.includes(service)) {
        // Remove service
        const updatedServices = existing.services.filter((s) => s !== service);
        if (updatedServices.length === 0) {
          // Remove category entirely
          newServices = selectedServices.filter((s) => s.category !== categoryId);
        } else {
          newServices = selectedServices.map((s) =>
            s.category === categoryId ? { ...s, services: updatedServices } : s
          );
        }
      } else {
        // Add service
        newServices = selectedServices.map((s) =>
          s.category === categoryId ? { ...s, services: [...s.services, service] } : s
        );
      }
    } else {
      // Create new category
      newServices = [...selectedServices, { category: categoryId, services: [service] }];
    }

    onServicesChange(newServices);
  };

  const selectAllInCategory = (categoryId: string) => {
    if (disabled) return;

    const category = SERVICE_CATEGORIES.find((c) => c.id === categoryId);
    if (!category) return;

    const existing = selectedServices.find((s) => s.category === categoryId);
    let newServices: SelectedServiceCategory[];

    if (existing && existing.services.length === category.services.length) {
      // All selected, clear them
      newServices = selectedServices.filter((s) => s.category !== categoryId);
    } else {
      // Select all
      if (existing) {
        newServices = selectedServices.map((s) =>
          s.category === categoryId ? { ...s, services: [...category.services] } : s
        );
      } else {
        newServices = [...selectedServices, { category: categoryId, services: [...category.services] }];
      }
    }

    onServicesChange(newServices);
  };

  const toggleQuickService = (service: string) => {
    if (disabled) return;

    // Find which category this service belongs to
    const category = SERVICE_CATEGORIES.find((c) => c.services.includes(service));
    if (!category) return;

    toggleService(category.id, service);
  };

  const isQuickServiceSelected = (service: string): boolean => {
    const category = SERVICE_CATEGORIES.find((c) => c.services.includes(service));
    if (!category) return false;
    return isServiceSelected(category.id, service);
  };

  const clearAllServices = () => {
    if (disabled) return;
    onServicesChange([]);
    onPrimaryCategoryChange(null);
  };

  return (
    <div className="space-y-4">
      {/* Header with count */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Services Required</h3>
          <p className="text-xs text-slate-500">Select all services your vehicle needs</p>
        </div>
        {totalSelected > 0 && (
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
              {totalSelected} selected
            </span>
            <button
              type="button"
              onClick={clearAllServices}
              disabled={disabled}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
              title="Clear all"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Quick Select - Common Services */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="mb-2 text-xs font-medium text-slate-600">Quick Select - Common Services</p>
        <div className="flex flex-wrap gap-2">
          {COMMON_SERVICES.map((service) => {
            const isSelected = isQuickServiceSelected(service);
            return (
              <button
                key={service}
                type="button"
                onClick={() => toggleQuickService(service)}
                disabled={disabled}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  isSelected
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSelected && <Check className="mr-1 -ml-0.5 inline h-3 w-3" />}
                {service}
              </button>
            );
          })}
        </div>
      </div>

      {/* Service Categories Accordion */}
      <div className="space-y-2">
        {SERVICE_CATEGORIES.map((category) => {
          const Icon = ICON_MAP[category.icon] || ClipboardCheck;
          const isExpanded = expandedCategories.has(category.id);
          const selectedCount = getSelectedCountForCategory(category.id);
          const allSelected = selectedCount === category.services.length;

          return (
            <div
              key={category.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white"
            >
              {/* Category Header */}
              <button
                type="button"
                onClick={() => toggleCategory(category.id)}
                disabled={disabled}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-slate-50 disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm font-medium text-slate-900">{category.name}</span>
                  {selectedCount > 0 && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      {selectedCount}
                    </span>
                  )}
                </div>
                <ChevronDown
                  className={`h-5 w-5 text-slate-400 transition-transform ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Services List */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-slate-100 px-4 py-3">
                      {/* Select All button */}
                      <button
                        type="button"
                        onClick={() => selectAllInCategory(category.id)}
                        disabled={disabled}
                        className="mb-3 text-xs font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                      >
                        {allSelected ? 'Clear all' : 'Select all'}
                      </button>

                      {/* Services grid */}
                      <div className="grid gap-2 sm:grid-cols-2">
                        {category.services.map((service) => {
                          const isSelected = isServiceSelected(category.id, service);
                          return (
                            <label
                              key={service}
                              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition ${
                                isSelected
                                  ? 'border-emerald-300 bg-emerald-50'
                                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                              } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleService(category.id, service)}
                                disabled={disabled}
                                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
                              />
                              <span
                                className={`text-sm ${
                                  isSelected ? 'text-emerald-800' : 'text-slate-700'
                                }`}
                              >
                                {service}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Primary Category Selection (only show if services selected) */}
      {totalSelected > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <label className="block text-sm font-medium text-slate-700">
            Primary Service Category
            <span className="ml-1 font-normal text-slate-400">(for routing)</span>
          </label>
          <select
            value={primaryCategory || ''}
            onChange={(e) => onPrimaryCategoryChange(e.target.value || null)}
            disabled={disabled}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
          >
            <option value="">Auto-detect (most selected)</option>
            {selectedServices.map((sel) => {
              const cat = SERVICE_CATEGORIES.find((c) => c.id === sel.category);
              if (!cat) return null;
              return (
                <option key={sel.category} value={sel.category}>
                  {cat.name} ({sel.services.length} selected)
                </option>
              );
            })}
          </select>
        </div>
      )}

      {/* Service Notes */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <label className="block text-sm font-medium text-slate-700">
          Additional Service Notes
          <span className="ml-1 font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          value={serviceNotes}
          onChange={(e) => onServiceNotesChange(e.target.value)}
          disabled={disabled}
          rows={2}
          placeholder="Describe any specific issues, symptoms, or requests..."
          className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
        />
      </div>

      {/* Summary (when services selected) */}
      {totalSelected > 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-800">Selected Services Summary</p>
          <div className="mt-2 space-y-1">
            {selectedServices.map((sel) => {
              const cat = SERVICE_CATEGORIES.find((c) => c.id === sel.category);
              if (!cat || sel.services.length === 0) return null;
              return (
                <div key={sel.category} className="text-sm text-emerald-700">
                  <span className="font-medium">{cat.name}:</span>{' '}
                  <span className="text-emerald-600">
                    {sel.services.length === cat.services.length
                      ? 'All services'
                      : sel.services.join(', ')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
