// src/app/contact/page.tsx
"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/homepage/Footer";
import ContactForm from "@/components/homepage/ContactForm";
import BookingModal from "@/components/homepage/BookingModal";
import { Phone, Mail, MapPin } from "lucide-react";

export default function ContactPage() {
  const [showBookingModal, setShowBookingModal] = useState(false);

  return (
    <main className="min-h-screen bg-white">
      <BookingModal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
      />
      <Header onBookingClick={() => setShowBookingModal(true)} />

      <section className="bg-gradient-to-r from-emerald-700 to-teal-700 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-2">
            {/* Left: Info */}
            <div>
              <h1 className="text-3xl font-bold text-white sm:text-4xl">
                Get in Touch
              </h1>
              <p className="mt-4 text-lg text-emerald-100">
                Have a question about our service? Send us a message and
                we&apos;ll get back to you shortly.
              </p>

              <div className="mt-10 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-white/10 p-3">
                    <Mail className="h-6 w-6 text-emerald-200" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Email</h3>
                    <a
                      href="mailto:support@drivlet.com.au"
                      className="text-emerald-100 transition hover:text-white"
                    >
                      support@drivlet.com.au
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-white/10 p-3">
                    <Phone className="h-6 w-6 text-emerald-200" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Phone</h3>
                    <a
                      href="tel:1300470886"
                      className="text-emerald-100 transition hover:text-white"
                    >
                      1300 470 886
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-white/10 p-3">
                    <MapPin className="h-6 w-6 text-emerald-200" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Location</h3>
                    <p className="text-emerald-100">Newcastle, NSW</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Form */}
            <div>
              <ContactForm />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
