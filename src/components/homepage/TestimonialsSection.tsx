// src/components/homepage/TestimonialsSection.tsx
'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const testimonials = [
  {
    title: 'Takes a lot of stress away',
    text: "Knowing someone was keeping an eye on everything to make sure I wasn't being overcharged takes a lot of stress out of having the work done.",
    name: 'Sarah M.',
    location: 'Newcastle',
  },
  {
    title: 'Excellent service',
    text: 'On time to pick up my car & drop it back. The main dealer quoted me $800 more. Lots different!',
    name: 'James T.',
    location: 'Maitland',
  },
  {
    title: 'Total game-changer!',
    text: 'It took about 5 minutes to book, hand over the key, and get it back. I was able to carry on working. Total game-changer!',
    name: 'Michelle K.',
    location: 'Lake Macquarie',
  },
  {
    title: 'No need to visit a garage',
    text: "Can't beat someone collecting the car and returning it a few hours later. No having to drive to a garage or hanging around waiting.",
    name: 'David R.',
    location: 'Charlestown',
  },
];

export default function TestimonialsSection() {
  return (
    <section className="border-b border-slate-200 bg-slate-50 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            What our customers say
          </h2>
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="h-5 w-5 fill-green-500 text-green-500"
                />
              ))}
            </div>
            <span className="text-sm font-medium text-slate-600">
              Excellent service
            </span>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-3 flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-green-500 text-green-500"
                  />
                ))}
              </div>
              <h4 className="mb-2 font-semibold text-slate-900">
                {testimonial.title}
              </h4>
              <p className="mb-4 text-sm leading-relaxed text-slate-600">
                {testimonial.text}
              </p>
              <p className="text-sm font-medium text-slate-900">
                {testimonial.name},{' '}
                <span className="font-normal text-slate-500">
                  {testimonial.location}
                </span>
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
