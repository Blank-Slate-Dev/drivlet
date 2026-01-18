// src/components/homepage/InteractiveServicesSection.tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
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
  Plus,
  Minus,
  Check,
  ArrowRight,
  Sparkle,
  LucideIcon,
} from 'lucide-react';
import { SERVICE_CATEGORIES, COMMON_SERVICES } from '@/constants/serviceCategories';
import { FEATURES } from '@/lib/featureFlags';

// Icon mapping
const ICON_MAP: Record<string, LucideIcon> = {
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

// Category gradient themes
const CATEGORY_GRADIENTS: Record<string, { gradient: string; ring: string; bg: string }> = {
  general_servicing: {
    gradient: 'from-emerald-500 to-teal-500',
    ring: 'ring-emerald-500/30',
    bg: 'bg-emerald-500',
  },
  engine_drivetrain: {
    gradient: 'from-teal-500 to-cyan-500',
    ring: 'ring-teal-500/30',
    bg: 'bg-teal-500',
  },
  brakes_steering_suspension: {
    gradient: 'from-cyan-500 to-blue-500',
    ring: 'ring-cyan-500/30',
    bg: 'bg-cyan-500',
  },
  tyres_wheels: {
    gradient: 'from-slate-500 to-slate-600',
    ring: 'ring-slate-500/30',
    bg: 'bg-slate-500',
  },
  cooling_ac: {
    gradient: 'from-blue-500 to-indigo-500',
    ring: 'ring-blue-500/30',
    bg: 'bg-blue-500',
  },
  auto_electrical: {
    gradient: 'from-amber-500 to-orange-500',
    ring: 'ring-amber-500/30',
    bg: 'bg-amber-500',
  },
  exhaust_emissions: {
    gradient: 'from-violet-500 to-purple-500',
    ring: 'ring-violet-500/30',
    bg: 'bg-violet-500',
  },
  hybrid_ev: {
    gradient: 'from-green-500 to-emerald-500',
    ring: 'ring-green-500/30',
    bg: 'bg-green-500',
  },
  body_glass: {
    gradient: 'from-pink-500 to-rose-500',
    ring: 'ring-pink-500/30',
    bg: 'bg-pink-500',
  },
  '4x4_accessories': {
    gradient: 'from-orange-500 to-amber-500',
    ring: 'ring-orange-500/30',
    bg: 'bg-orange-500',
  },
};

// Short descriptions for each category
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  general_servicing: 'Regular maintenance to keep your vehicle running smoothly',
  engine_drivetrain: 'Engine diagnostics, repairs, and transmission services',
  brakes_steering_suspension: 'Safety-critical systems maintenance and repairs',
  tyres_wheels: 'Tyre fitting, repairs, and wheel services',
  cooling_ac: 'Cooling system and climate control services',
  auto_electrical: 'Battery, electrical systems, and diagnostics',
  exhaust_emissions: 'Exhaust system repairs and emissions compliance',
  hybrid_ev: 'Specialist services for electric and hybrid vehicles',
  body_glass: 'Bodywork, paint, and glass restoration',
  '4x4_accessories': 'Off-road upgrades and accessory installation',
};

interface InteractiveServicesSectionProps {
  onBookingClick?: (selectedServices?: string[]) => void;
}

export default function InteractiveServicesSection({
  onBookingClick,
}: InteractiveServicesSectionProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  // Hide interactive services section in Phase 1 (transport-only mode)
  if (!FEATURES.SERVICE_SELECTION) {
    return null;
  }

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  const toggleService = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service]
    );
  };

  const getSelectedCountForCategory = (categoryId: string) => {
    const category = SERVICE_CATEGORIES.find((c) => c.id === categoryId);
    if (!category) return 0;
    return category.services.filter((s) => selectedServices.includes(s)).length;
  };

  const isPopular = (service: string) => COMMON_SERVICES.includes(service);

  const handleGetQuote = () => {
    if (onBookingClick) {
      onBookingClick(selectedServices);
    }
  };

  return (
    <section id="services" className="relative overflow-hidden bg-slate-50 py-16 sm:py-24">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section header */}
        <div className="mb-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5"
          >
            <Sparkle className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">
              Professional Services
            </span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-3xl font-bold text-slate-900 sm:text-5xl"
          >
            Everything your vehicle needs
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mx-auto mt-4 max-w-2xl text-lg text-slate-600"
          >
            Select services across categories and we&apos;ll handle the rest
          </motion.p>
        </div>

        {/* Service cards grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICE_CATEGORIES.map((category, index) => {
            const Icon = ICON_MAP[category.icon] || ClipboardCheck;
            const theme = CATEGORY_GRADIENTS[category.id] || CATEGORY_GRADIENTS.general_servicing;
            const isExpanded = expandedCategory === category.id;
            const selectedCount = getSelectedCountForCategory(category.id);

            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 ${
                  isExpanded
                    ? `ring-2 ${theme.ring} shadow-lg`
                    : 'border-slate-200 hover:shadow-md hover:-translate-y-0.5'
                }`}
              >
                {/* Gradient accent bar */}
                <div className={`h-0.5 bg-gradient-to-r ${theme.gradient}`} />

                {/* Card header */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="flex w-full items-start gap-4 p-4 text-left"
                >
                  {/* Icon */}
                  <div
                    className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${theme.gradient}`}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-slate-900 leading-tight">
                      {category.name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500 line-clamp-1">
                      {CATEGORY_DESCRIPTIONS[category.id]}
                    </p>

                    {/* Badges */}
                    {!isExpanded && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          {category.services.length} services
                        </span>
                        {selectedCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            <Check className="h-3 w-3" />
                            {selectedCount} selected
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Toggle button */}
                  <motion.div
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
                      isExpanded
                        ? `bg-gradient-to-br ${theme.gradient} text-white`
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isExpanded ? (
                      <Minus className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </motion.div>
                </button>

                {/* Expanded services */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                        <div className="flex flex-wrap gap-2">
                          {category.services.map((service) => {
                            const isSelected = selectedServices.includes(service);
                            const popular = isPopular(service);

                            return (
                              <motion.button
                                key={service}
                                onClick={() => toggleService(service)}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                                  isSelected
                                    ? `bg-gradient-to-r ${theme.gradient} text-white shadow-sm`
                                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                                }`}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                {service}
                                {isSelected ? (
                                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20">
                                    <Check className="h-3 w-3" />
                                  </span>
                                ) : popular ? (
                                  <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                                    Popular
                                  </span>
                                ) : null}
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* CTA Section */}
        <AnimatePresence>
          {selectedServices.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="relative mt-8 overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-cyan-600 p-6 sm:p-8"
            >
              {/* Decorative blurs */}
              <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-white/10 blur-3xl" />

              <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                    <Check className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white sm:text-2xl">
                      {selectedServices.length} service
                      {selectedServices.length !== 1 ? 's' : ''} selected
                    </h3>
                    <p className="mt-1 text-emerald-50">
                      Ready to get your personalized quote
                    </p>

                    {/* Selected services chips */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedServices.slice(0, 4).map((service) => (
                        <span
                          key={service}
                          className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm"
                        >
                          {service}
                        </span>
                      ))}
                      {selectedServices.length > 4 && (
                        <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                          +{selectedServices.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <motion.button
                  onClick={handleGetQuote}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-semibold text-emerald-600 shadow-lg transition hover:bg-emerald-50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Get your quote
                  <ArrowRight className="h-5 w-5" />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Default CTA when no services selected */}
        {selectedServices.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mt-8 text-center"
          >
            <p className="mb-4 text-slate-600">
              Click on any category to explore services, or
            </p>
            <motion.button
              onClick={() => onBookingClick?.()}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-lg transition hover:bg-emerald-700"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Get a quote now
              <ArrowRight className="h-5 w-5" />
            </motion.button>
          </motion.div>
        )}
      </div>
    </section>
  );
}
