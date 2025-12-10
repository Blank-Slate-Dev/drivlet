// src/components/homepage/ServicesSection.tsx
'use client';

import { motion } from 'framer-motion';
import { Settings, Wrench, Calendar, Zap, ArrowRight } from 'lucide-react';

const services = [
  {
    title: 'Standard Service',
    price: 'From $89 pick-up fee',
    color: 'bg-blue-500',
    icon: Settings,
  },
  {
    title: 'Major Service',
    price: 'From $139 pick-up fee',
    color: 'bg-emerald-500',
    icon: Wrench,
  },
  {
    title: 'Logbook Service',
    price: 'Get a quote',
    color: 'bg-amber-500',
    icon: Calendar,
  },
  {
    title: 'Diagnostics',
    price: 'Get a quote',
    color: 'bg-purple-500',
    icon: Zap,
  },
];

interface ServicesSectionProps {
  onBookingClick: () => void;
}

export default function ServicesSection({ onBookingClick }: ServicesSectionProps) {
  return (
    <section
      id="services"
      className="border-b border-slate-200 bg-white py-16 sm:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            Our most popular services
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service, index) => (
            <motion.div
              key={service.title}
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
