// src/components/homepage/FAQSection.tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { FEATURES, TRANSPORT_PRICE_DISPLAY } from '@/lib/featureFlags';

// Marketplace FAQs (when full service features are enabled)
const marketplaceFaqs = [
  {
    question: 'Who is going to drive my car?',
    answer:
      'All drivlet drivers are fully insured, background-checked professionals. We treat every car as if it were our own.',
  },
  {
    question: 'What garage will my car go to?',
    answer:
      'We partner with vetted local garages that meet our quality standards. You can request a specific garage or let us match you with the best option for your service needs.',
  },
  {
    question: 'How and when do I pay?',
    answer:
      'You pay after the service is complete. We send you a clear breakdown of the service cost plus our pick-up fee before any work begins.',
  },
  {
    question: 'What if additional work is needed?',
    answer:
      'We will always contact you before any additional work is approved. No surprise charges, ever.',
  },
  {
    question: 'Can I cancel my booking?',
    answer:
      'Yes, you can cancel or reschedule free of charge up to 24 hours before your scheduled pick-up time.',
  },
  {
    question: 'What areas do you service?',
    answer:
      'We currently operate in the Newcastle, NSW region and surrounding suburbs. We are expanding to more areas soon.',
  },
];

// Transport-only FAQs (Phase 1)
const transportFaqs = [
  {
    question: 'Who is going to drive my car?',
    answer:
      'All drivlet drivers are fully insured, background-checked professionals. We treat every car as if it were our own.',
  },
  {
    question: `What does the ${TRANSPORT_PRICE_DISPLAY} cover?`,
    answer:
      `The ${TRANSPORT_PRICE_DISPLAY} flat rate covers picking up your car from your location, delivering it to your chosen garage, then collecting and returning it to you once the service is complete. No hidden fees.`,
  },
  {
    question: 'Do I need an existing garage booking?',
    answer:
      'Yes, for now you need to have an existing booking with your garage. We handle the transport — picking up, delivering, and returning your car.',
  },
  {
    question: 'How and when do I pay?',
    answer:
      `You pay ${TRANSPORT_PRICE_DISPLAY} upfront when you book. Your garage service is paid separately to your garage as usual.`,
  },
  {
    question: 'Can I cancel my booking?',
    answer:
      'Yes, you can cancel or reschedule free of charge up to 24 hours before your scheduled pick-up time.',
  },
  {
    question: 'What areas do you service?',
    answer:
      'We currently operate in the Newcastle, NSW region and surrounding suburbs. We are expanding to more areas soon.',
  },
];

export default function FAQSection() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const faqs = FEATURES.SERVICE_SELECTION ? marketplaceFaqs : transportFaqs;

  return (
    <section
      id="faq"
      className="border-b border-slate-200 bg-white py-16 sm:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.5fr]">
          {/* Left: Title */}
          <div>
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              {FEATURES.SERVICE_SELECTION
                ? 'Common questions about booking at drivlet'
                : 'Common questions about our transport service'
              }
            </h2>
          </div>

          {/* Right: Accordion */}
          <div className="divide-y divide-slate-200">
            {faqs.map((faq, index) => (
              <div key={index} className="py-4">
                <button
                  type="button"
                  onClick={() =>
                    setOpenFaq(openFaq === index ? null : index)
                  }
                  className="flex w-full items-center justify-between text-left"
                >
                  <span className="text-base font-medium text-slate-900 sm:text-lg">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 flex-shrink-0 text-slate-400 transition-transform ${
                      openFaq === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {openFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="mt-3 text-sm leading-relaxed text-slate-600">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
            <div className="pt-4">
              <a
                href="#"
                className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
              >
                Can&apos;t find your answer? Check our FAQ →
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
