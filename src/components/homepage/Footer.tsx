// src/components/homepage/Footer.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Phone, Mail } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { FEATURES } from '@/lib/featureFlags';

export default function Footer() {
  const { data: session, status } = useSession();

  // Don't show garage/driver links if user is logged in OR if we're still loading
  const showPartnerLinks = status === 'unauthenticated';

  return (
    <footer className="bg-emerald-900 text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand column */}
          <div className="lg:col-span-1">
            <div className="relative mb-4 h-10 w-32">
              <Image
                src="/logo.png"
                alt="Drivlet – car service pickup and delivery"
                fill
                className="object-contain brightness-0 invert"
              />
            </div>
            <p className="text-sm text-emerald-200">
              Service done, without the run.
            </p>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-emerald-200">
                <Phone className="h-4 w-4 text-emerald-300" />
                <a href="tel:1300470886" className="transition hover:text-white">
                  1300 470 886
                </a>
              </div>
              <div className="flex items-center gap-2 text-sm text-emerald-200">
                <Mail className="h-4 w-4 text-emerald-300" />
                <a href="mailto:support@drivlet.com.au" className="transition hover:text-white">
                  support@drivlet.com.au
                </a>
              </div>
              <div className="flex items-center gap-1 text-xs text-emerald-300">
                <MapPin className="h-3.5 w-3.5" />
                Newcastle &amp; Canberra
              </div>
            </div>
          </div>

          {/* Meet drivlet */}
          <div>
            <h4 className="mb-4 font-semibold">Meet drivlet</h4>
            <ul className="space-y-2 text-sm text-emerald-200">
              <li>
                <a href="#how-it-works" className="transition hover:text-white">
                  How it works
                </a>
              </li>
              <li>
                <a href="#faq" className="transition hover:text-white">
                  FAQ
                </a>
              </li>
              <li>
                <Link href="/contact" className="transition hover:text-white">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/booking" className="transition hover:text-white">
                  Book Now
                </Link>
              </li>
              <li>
                <Link href="/track" className="transition hover:text-white">
                  Track Your Vehicle
                </Link>
              </li>
            </ul>
          </div>

          {/* Service Areas — critical for SEO internal linking */}
          <div>
            <h4 className="mb-4 font-semibold">Newcastle</h4>
            <ul className="space-y-2 text-sm text-emerald-200">
              <li>
                <Link href="/newcastle" className="transition hover:text-white">
                  Newcastle
                </Link>
              </li>
              <li>
                <Link href="/newcastle/charlestown" className="transition hover:text-white">
                  Charlestown
                </Link>
              </li>
              <li>
                <Link href="/newcastle/merewether" className="transition hover:text-white">
                  Merewether
                </Link>
              </li>
              <li>
                <Link href="/newcastle/lambton" className="transition hover:text-white">
                  Lambton
                </Link>
              </li>
              <li>
                <Link href="/newcastle/jesmond" className="transition hover:text-white">
                  Jesmond
                </Link>
              </li>
              <li>
                <Link href="/newcastle/wallsend" className="transition hover:text-white">
                  Wallsend
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold">Canberra</h4>
            <ul className="space-y-2 text-sm text-emerald-200">
              <li>
                <Link href="/canberra" className="transition hover:text-white">
                  Canberra
                </Link>
              </li>
              <li>
                <Link href="/canberra/belconnen" className="transition hover:text-white">
                  Belconnen
                </Link>
              </li>
              <li>
                <Link href="/canberra/woden" className="transition hover:text-white">
                  Woden
                </Link>
              </li>
              <li>
                <Link href="/canberra/gungahlin" className="transition hover:text-white">
                  Gungahlin
                </Link>
              </li>
              <li>
                <Link href="/canberra/tuggeranong" className="transition hover:text-white">
                  Tuggeranong
                </Link>
              </li>
              <li>
                <Link href="/canberra/braddon" className="transition hover:text-white">
                  Braddon
                </Link>
              </li>
            </ul>
          </div>

          {/* Terms & Partner Links */}
          <div>
            <h4 className="mb-4 font-semibold">Legal</h4>
            <ul className="space-y-2 text-sm text-emerald-200">
              <li>
                <a href="/policies#terms" className="transition hover:text-white">
                  Terms and Conditions
                </a>
              </li>
              <li>
                <a href="/policies#privacy" className="transition hover:text-white">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="/policies" className="transition hover:text-white">
                  All Policies
                </a>
              </li>
            </ul>

            {showPartnerLinks && (
              <>
                <div className="mt-6">
                  <h4 className="mb-2 font-semibold">Partners</h4>
                  <div className="space-y-2">
                    <Link
                      href="/garage/join"
                      className="block text-sm text-emerald-200 transition hover:text-white"
                    >
                      Join as a Garage →
                    </Link>
                    <Link
                      href="/driver/join"
                      className="block text-sm text-emerald-200 transition hover:text-white"
                    >
                      Become a Driver →
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-10 border-t border-emerald-800 pt-6 text-center text-xs text-emerald-300">
          <p>© {new Date().getFullYear()} Commuto Group Pty Ltd (ABN 73 687 063 618) trading as drivlet. All rights reserved.</p>
          <p className="mt-1">Car service pickup &amp; delivery in Newcastle, NSW and Canberra, ACT.</p>
        </div>
      </div>
    </footer>
  );
}
