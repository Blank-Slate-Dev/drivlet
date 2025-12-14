// src/components/homepage/ContactCTASection.tsx
'use client';

import ContactForm from './ContactForm';

export default function ContactCTASection() {
  return (
    <section
      id="contact"
      className="bg-gradient-to-r from-emerald-700 to-teal-700 py-16"
    >
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Need a hand understanding your car needs?
          </h2>
          <p className="mt-3 text-emerald-100">
            Our in-house experts know cars, our garages and our drivers inside
            out. Send us a message and we&apos;ll get back to you shortly.
          </p>
        </div>
        <div className="mt-8">
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
