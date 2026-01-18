// src/components/homepage/HowItWorksSection.tsx
'use client';

import { motion } from 'framer-motion';
import { FEATURES } from '@/lib/featureFlags';

// Full service steps (when marketplace features are enabled)
const marketplaceSteps = [
  {
    step: '1',
    title: 'Book online in 2 clicks',
    description:
      'Share your rego, pick-up location, and service type. We handle the rest.',
  },
  {
    step: '2',
    title: 'We collect your car',
    description:
      'Our fully insured drivers collect your car right from your doorstep or workplace.',
  },
  {
    step: '3',
    title: 'Your car gets serviced',
    description:
      'We coordinate with our vetted garage network and keep you updated throughout.',
  },
  {
    step: '4',
    title: 'We return your car',
    description:
      'Your serviced car is returned before the end of your workday, ready to drive home.',
  },
];

// Transport-only steps (Phase 1)
const transportSteps = [
  {
    step: '1',
    title: 'Book your transport',
    description:
      'Enter your rego, pickup address, and your service centre booking details. Quick and simple.',
  },
  {
    step: '2',
    title: 'We collect your car',
    description:
      'Our fully insured drivers pick up your car from home, work, or wherever suits you.',
  },
  {
    step: '3',
    title: 'Delivered to your service centre',
    description:
      'We deliver your car to your booked service centre and keep you updated every step of the way.',
  },
  {
    step: '4',
    title: 'Returned to you',
    description:
      'Once your service centre is done, we collect and return your car — hassle-free.',
  },
];

export default function HowItWorksSection() {
  const steps = FEATURES.SERVICE_SELECTION ? marketplaceSteps : transportSteps;

  return (
    <section
      id="how-it-works"
      className="relative border-b border-slate-200 bg-slate-50 py-16 sm:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            How it works
          </h2>
          <p className="mt-3 text-lg text-slate-600">
            {FEATURES.SERVICE_SELECTION ? 'Car servicing, made easy in' : 'Vehicle transport, made easy in'}{' '}
            <span className="relative inline-block font-semibold">
              4 steps
              <svg
                className="absolute -bottom-1 left-0 w-full"
                height="6"
                viewBox="0 0 100 6"
                preserveAspectRatio="none"
              >
                <path
                  d="M0 5 Q 50 0 100 5"
                  stroke="#fbbf24"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
            </span>
          </p>
        </div>

        {/* Centered grid - no offset */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((item, index) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="relative"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border-2 border-slate-300 bg-white text-xl font-bold text-slate-400">
                {item.step}
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
