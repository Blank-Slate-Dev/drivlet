// src/components/homepage/Footer.tsx
'use client';

import Image from 'next/image';
import { MapPin } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function Footer() {
  const { data: session, status } = useSession();

  // Don't show garage/driver links if user is logged in OR if we're still loading
  // This prevents the flash of content while session is being determined
  const showPartnerLinks = status === 'unauthenticated';

  return (
    <footer className="bg-emerald-900 text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand column */}
          <div>
            <div className="relative mb-4 h-10 w-32">
              <Image
                src="/logo.png"
                alt="drivlet"
                fill
                className="object-contain brightness-0 invert"
              />
            </div>
            <p className="text-sm text-emerald-200">
              Service done, without the run.
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs text-emerald-300">
              <MapPin className="h-3.5 w-3.5" />
              Based in Newcastle, NSW
            </div>
          </div>

          {/* Meet drivlet */}
          <div>
            <h4 className="mb-4 font-semibold">Meet drivlet</h4>
            <ul className="space-y-2 text-sm text-emerald-200">
              <li>
                <a href="#" className="transition hover:text-white">
                  About Us
                </a>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  className="transition hover:text-white"
                >
                  How it works
                </a>
              </li>
              <li>
                <a href="#faq" className="transition hover:text-white">
                  FAQ
                </a>
              </li>
              <li>
                <a href="#contact" className="transition hover:text-white">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Popular Services */}
          <div>
            <h4 className="mb-4 font-semibold">Popular Services</h4>
            <ul className="space-y-2 text-sm text-emerald-200">
              <li>
                <a href="#services" className="transition hover:text-white">
                  Standard service
                </a>
              </li>
              <li>
                <a href="#services" className="transition hover:text-white">
                  Major service
                </a>
              </li>
              <li>
                <a href="#services" className="transition hover:text-white">
                  Logbook service
                </a>
              </li>
              <li>
                <a href="#services" className="transition hover:text-white">
                  Car diagnostic
                </a>
              </li>
            </ul>
          </div>

          {/* Terms & Partner Links */}
          <div>
            <h4 className="mb-4 font-semibold">Terms</h4>
            <ul className="space-y-2 text-sm text-emerald-200">
              <li>
                <a href="#" className="transition hover:text-white">
                  Terms and Conditions
                </a>
              </li>
              <li>
                <a href="#" className="transition hover:text-white">
                  Privacy Policy
                </a>
              </li>
            </ul>

            {showPartnerLinks && (
              <>
                {/* Garage Links */}
                <div className="mt-6">
                  <h4 className="mb-2 font-semibold">For Garages</h4>
                  <div className="space-y-2">
                    <a
                      href="/garage/login"
                      className="block text-sm text-emerald-200 transition hover:text-white"
                    >
                      Garage Login →
                    </a>
                    <a
                      href="/garage/register"
                      className="block text-sm text-emerald-200 transition hover:text-white"
                    >
                      Garage Sign Up →
                    </a>
                  </div>
                </div>

                {/* Driver Links */}
                <div className="mt-6">
                  <h4 className="mb-2 font-semibold">For Drivers</h4>
                  <div className="space-y-2">
                    <a
                      href="/driver/login"
                      className="block text-sm text-emerald-200 transition hover:text-white"
                    >
                      Driver Login →
                    </a>
                    <a
                      href="/driver/register"
                      className="block text-sm text-emerald-200 transition hover:text-white"
                    >
                      Become a Driver →
                    </a>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-10 border-t border-emerald-800 pt-6 text-center text-xs text-emerald-300">
          © {new Date().getFullYear()} drivlet. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
