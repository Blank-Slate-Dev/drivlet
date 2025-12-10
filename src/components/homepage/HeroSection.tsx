// src/components/homepage/HeroSection.tsx
'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowRight, CheckCircle2, Star } from 'lucide-react';

interface HeroSectionProps {
  onBookingClick: () => void;
}

export default function HeroSection({ onBookingClick }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 z-0 opacity-10">
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Road image - top-left corner */}
      <div className="pointer-events-none absolute left-0 -top-10 z-0">
        <Image
          src="/road_image.png"
          alt="Road background"
          width={800}
          height={800}
          className="origin-top-left scale-75 object-contain"
          priority
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Left: Hero text */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Car servicing,
              <br />
              <span className="text-emerald-300">made easy</span>
            </h1>
            <p className="mt-5 text-lg text-emerald-100 sm:text-xl">
              Hassle-free pick-up, service and drop-off while you work
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-center lg:justify-start">
              <button
                type="button"
                onClick={onBookingClick}
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-amber-400 px-7 py-3.5 text-base font-semibold text-slate-900 shadow-lg transition hover:bg-amber-300"
              >
                Book a service
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            {/* Trust indicators */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-emerald-200 lg:justify-start">
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-300" />
                <span>Fully insured</span>
              </div>
            </div>
          </motion.div>

          {/* Right: Car image with floating badge */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative"
          >
            <div className="relative">
              <Image
                src="/lamborghini_ariel_view.png"
                alt="drivlet branded car"
                width={700}
                height={400}
                className="mx-auto w-[60%] object-contain drop-shadow-2xl"
                priority
              />
              {/* Floating badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.5 }}
                className="absolute -bottom-4 right-4 flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-lg sm:right-8"
              >
                <CheckCircle2 className="h-4 w-4" />
                Collection & Delivery available
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
