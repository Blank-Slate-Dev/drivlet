// src/components/homepage/ContactCTASection.tsx
'use client';

import { Phone, Mail } from 'lucide-react';

export default function ContactCTASection() {
  return (
    <section
      id="contact"
      className="bg-gradient-to-r from-emerald-700 to-teal-700 py-16"
    >
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">
          Need a hand understanding your car needs?
        </h2>
        <p className="mt-3 text-emerald-100">
          Our in-house experts know cars, our garages and our drivers inside
          out.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="tel:+61400000000"
            className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-6 py-3 font-semibold text-slate-900 shadow-lg transition hover:bg-amber-300"
          >
            <Phone className="h-5 w-5" />
            Call us
          </a>
          <a
            href="mailto:hello@drivlet.com.au"
            className="inline-flex items-center gap-2 rounded-full border-2 border-white/30 px-6 py-3 font-medium text-white transition hover:bg-white/10"
          >
            <Mail className="h-5 w-5" />
            Email us
          </a>
        </div>
      </div>
    </section>
  );
}
