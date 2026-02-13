// src/app/policies/page.tsx
'use client';

import Header from '@/components/Header';
import Footer from '@/components/homepage/Footer';
import { Shield, FileText, Eye, AlertTriangle, Clock, Mail } from 'lucide-react';

export default function PoliciesPage() {
  const handleBookingClick = () => {
    // Navigate to home page with booking modal - in a real scenario this would trigger the modal
    window.location.href = '/#book';
  };

  return (
    <>
      <Header onBookingClick={handleBookingClick} />
      <main className="min-h-screen bg-slate-50">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700 py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
            <Shield className="mx-auto h-12 w-12 text-emerald-200 mb-4" />
            <h1 className="text-3xl font-bold text-white sm:text-4xl">
              Our Policies
            </h1>
            <p className="mt-3 text-emerald-200 text-lg">
              Transparency and trust are at the heart of everything we do.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12">
          <div className="space-y-12">

            {/* Terms and Conditions */}
            <section id="terms" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-full bg-emerald-100 p-2">
                  <FileText className="h-5 w-5 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Terms and Conditions</h2>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
                <div className="prose prose-slate max-w-none">
                  <p className="text-slate-600">
                    Our full Terms and Conditions are currently being finalised and will be published here shortly.
                    These terms will cover the use of the Drivlet platform, service bookings, payment processing,
                    liability limitations, and your rights and responsibilities as a customer.
                  </p>
                  <p className="text-slate-500 text-sm mt-4 italic">
                    Last updated: Coming soon
                  </p>
                </div>
              </div>
            </section>

            {/* Privacy Policy */}
            <section id="privacy" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-full bg-emerald-100 p-2">
                  <Eye className="h-5 w-5 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Privacy Policy</h2>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
                <div className="prose prose-slate max-w-none">
                  <p className="text-slate-600">
                    Our Privacy Policy is currently being prepared and will detail how Drivlet collects, uses,
                    stores, and protects your personal information. This includes information about data collection
                    during bookings, payment processing, vehicle tracking during transit, and your rights under
                    the Australian Privacy Act 1988.
                  </p>
                  <p className="text-slate-500 text-sm mt-4 italic">
                    Last updated: Coming soon
                  </p>
                </div>
              </div>
            </section>

            {/* Cancellation Policy */}
            <section id="cancellation" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-full bg-emerald-100 p-2">
                  <Clock className="h-5 w-5 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Cancellation &amp; Refund Policy</h2>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
                <div className="prose prose-slate max-w-none">
                  <p className="text-slate-600">
                    Our Cancellation and Refund Policy is being finalised. It will outline the conditions under which
                    bookings can be cancelled, applicable refund timeframes, and any fees that may apply depending
                    on when a cancellation is made relative to the scheduled pickup time.
                  </p>
                  <p className="text-slate-500 text-sm mt-4 italic">
                    Last updated: Coming soon
                  </p>
                </div>
              </div>
            </section>

            {/* Vehicle & Insurance Policy */}
            <section id="vehicle-insurance" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-full bg-emerald-100 p-2">
                  <AlertTriangle className="h-5 w-5 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Vehicle &amp; Insurance Policy</h2>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
                <div className="prose prose-slate max-w-none">
                  <p className="text-slate-600">
                    Details about our vehicle care, insurance coverage, and liability policies during transit will
                    be published here. This will include information about our condition reporting process,
                    damage claims procedures, and the vehicle value limits that apply to our service.
                  </p>
                  <p className="text-slate-500 text-sm mt-4 italic">
                    Last updated: Coming soon
                  </p>
                </div>
              </div>
            </section>

            {/* Contact */}
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-emerald-200 p-2">
                  <Mail className="h-5 w-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-emerald-900">Questions about our policies?</h3>
                  <p className="mt-1 text-emerald-700">
                    If you have any questions or concerns about our policies, please don&apos;t hesitate to get in
                    touch with our team. We&apos;re here to help.
                  </p>
                  <a
                    href="mailto:hello@drivlet.com.au"
                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
                  >
                    <Mail className="h-4 w-4" />
                    Contact Us
                  </a>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
