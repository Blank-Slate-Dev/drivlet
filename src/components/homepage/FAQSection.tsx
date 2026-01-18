// src/components/homepage/FAQSection.tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

// New FAQs based on Sharjeel's feedback
const faqs = [
  {
    question: 'How does Drivlet work?',
    answer:
      'Book a pick-up + return window and enter your workshop details. We pick up your car, drop it to your chosen service centre, then return it when it\'s ready.',
  },
  {
    question: 'Who drives my car?',
    answer:
      'A Drivlet employee driver. We use condition photos and sign-off at pick-up and return for transparency.',
  },
  {
    question: 'Is my car insured?',
    answer:
      'Yes — your car is covered while it\'s in Drivlet\'s care during pick-up, delivery to your workshop, and return (subject to our Terms).',
  },
  {
    question: 'How do I pay — Drivlet vs the service centre?',
    answer:
      'You pay Drivlet for transport when you book. You pay the service centre directly for the service/repairs. The service centre will contact you to take payment (often by phone) and confirm the car is ready.',
  },
  {
    question: 'Do I need a service centre booking first?',
    answer:
      'Yes. You book your service with your chosen workshop first, then book Drivlet for the transport.',
  },
  {
    question: 'Can I cancel or reschedule?',
    answer:
      'Yes. More than 3 hours before pick-up start = full refund or reschedule (subject to availability). Within 3 hours = no refund. Full rules are in our Cancellation & Refunds Policy.',
  },
];

/* HIDDEN FOR PHASE 1 - Original marketplace FAQs preserved for future use
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
*/

export default function FAQSection() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
              FAQs
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
          </div>
        </div>
      </div>
    </section>
  );
}
