// src/components/homepage/ServicesSection.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { getRandomServices, type ServiceItem } from '@/constants/allServices';

interface ServicesSectionProps {
  onBookingClick: () => void;
}

export default function ServicesSection({ onBookingClick }: ServicesSectionProps) {
  const [displayedServices, setDisplayedServices] = useState<ServiceItem[]>([]);

  // Generate random services on mount (client-side only to prevent hydration mismatch)
  useEffect(() => {
    setDisplayedServices(getRandomServices(4));
  }, []);

  // Show skeleton/placeholder while loading to prevent layout shift
  if (displayedServices.length === 0) {
    return (
      <section id="services" className="border-b border-slate-200 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              A wide range of services
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="h-1.5 bg-slate-200" />
                <div className="p-6 text-center">
                  <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-slate-100" />
                  <div className="mx-auto mb-2 h-5 w-32 rounded bg-slate-100" />
                  <div className="mx-auto mb-4 h-4 w-24 rounded bg-slate-100" />
                  <div className="mx-auto h-4 w-20 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="services" className="border-b border-slate-200 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            A wide range of services
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {displayedServices.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
            >
              <div className={`h-1.5 ${service.color}`} />
              <div className="p-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                  <service.icon className="h-7 w-7 text-slate-600" />
                </div>
                <h3 className="mb-1 text-lg font-semibold text-slate-900">
                  {service.title}
                </h3>
                <p className="mb-4 text-sm text-slate-500">{service.price}</p>
                <button
                  type="button"
                  onClick={onBookingClick}
                  className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 transition hover:text-emerald-700"
                >
                  Get a quote
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
