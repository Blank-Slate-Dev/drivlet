// src/components/homepage/ValuePropsSection.tsx
'use client';

import { motion } from 'framer-motion';
import { Users, Gauge, ShieldCheck, Car, Clock, MapPin } from 'lucide-react';
import { FEATURES, TRANSPORT_PRICE_DISPLAY } from '@/lib/featureFlags';

// Marketplace value props (when full service features are enabled)
const marketplaceValueProps = [
  {
    icon: Users,
    title: 'Advisors on your side',
    description:
      'Our in-house experts make sure any quotes you receive are relevant and fairly priced, so no nasty surprises!',
  },
  {
    icon: Gauge,
    title: 'Fair pricing',
    description:
      'We negotiate competitive rates with garages to offer the best prices, on average 30% cheaper than main dealerships.',
  },
  {
    icon: ShieldCheck,
    title: 'Vetted garages',
    description:
      'We personally select and vet only the best local garages, fully covered by a 12-month warranty on parts and labour.',
  },
  {
    icon: Car,
    title: 'Collection from your door',
    description:
      'Our fully insured drivers offer a contact-free collection and delivery service, with flexible time slots that suit you.',
  },
];

// Transport-only value props (Phase 1)
const transportValueProps = [
  {
    icon: Car,
    title: 'Door-to-door service',
    description:
      'We collect your car from home or work, deliver it to your garage, and return it when done. No effort required.',
  },
  {
    icon: Gauge,
    title: `Flat ${TRANSPORT_PRICE_DISPLAY} rate`,
    description:
      'One simple price covers pickup, delivery to your garage, and return. No hidden fees, no surprises.',
  },
  {
    icon: ShieldCheck,
    title: 'Fully insured drivers',
    description:
      'All our drivers are background-checked professionals with full insurance. Your car is in safe hands.',
  },
  {
    icon: Clock,
    title: 'Real-time tracking',
    description:
      'Track your vehicle at every step. Know exactly where your car is and when it will be returned.',
  },
];

export default function ValuePropsSection() {
  const valueProps = FEATURES.SERVICE_SELECTION ? marketplaceValueProps : transportValueProps;

  return (
    <section className="relative border-b border-slate-200 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            {FEATURES.SERVICE_SELECTION
              ? "Simply book online and we'll handle the rest"
              : "Vehicle transport, simplified"
            }
          </h2>
        </div>

        {/* Centered grid - no offset */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {valueProps.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition hover:shadow-md"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                <item.icon className="h-7 w-7 text-emerald-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-slate-600">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
