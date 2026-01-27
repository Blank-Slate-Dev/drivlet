'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { FEATURES } from '@/lib/featureFlags';

// Step data with gradient colors for the pills
const marketplaceSteps = [
  {
    step: '1',
    title: 'Book online in 2 clicks',
    description:
      'Share your rego, pick-up location, and service type. We handle the rest.',
    image: '/Phonestep1.png',
    gradient: 'from-cyan-400 to-teal-500',
  },
  {
    step: '2',
    title: 'Track your service',
    description:
      'Follow your vehicle in real-time from collection through to completion.',
    image: '/Phonestep2.png',
    gradient: 'from-violet-500 to-purple-600',
  },
  {
    step: '3',
    title: 'We deliver to the garage',
    description:
      'Our fully insured drivers deliver your car to our vetted service centre network.',
    image: '/Phonestep3.png',
    gradient: 'from-indigo-600 to-slate-800',
  },
  {
    step: '4',
    title: 'We return your car',
    description:
      'Once serviced, we bring your car back to you — safe, sound, and ready to drive.',
    image: '/Phonestep4.png',
    gradient: 'from-emerald-400 to-green-500',
  },
];

const transportSteps = [
  {
    step: '1',
    title: 'Book your pickup',
    description:
      'Enter your rego, pickup address, and service centre details. Quick and simple.',
    image: '/Phonestep1.png',
    gradient: 'from-cyan-400 to-teal-500',
  },
  {
    step: '2',
    title: 'Track in real-time',
    description:
      'Follow your vehicle every step of the way with live tracking updates.',
    image: '/Phonestep2.png',
    gradient: 'from-violet-500 to-purple-600',
  },
  {
    step: '3',
    title: 'Delivered to your service centre',
    description:
      'Our fully insured drivers deliver your car directly to your chosen garage.',
    image: '/Phonestep3.png',
    gradient: 'from-indigo-600 to-slate-800',
  },
  {
    step: '4',
    title: 'Returned to you',
    description:
      'Once your service is complete, we collect and return your car — hassle-free.',
    image: '/Phonestep4.png',
    gradient: 'from-emerald-400 to-green-500',
  },
];

export default function HowItWorksSection() {
  const steps = FEATURES.SERVICE_SELECTION ? marketplaceSteps : transportSteps;
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? steps.length - 1 : prev - 1));
  }, [steps.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === steps.length - 1 ? 0 : prev + 1));
  }, [steps.length]);

  // Auto-advance every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      goToNext();
    }, 5000);
    return () => clearInterval(timer);
  }, [goToNext]);

  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden border-b border-slate-200 bg-white py-16 sm:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            How it works
          </h2>
          <p className="mt-3 text-lg text-slate-600">
            {FEATURES.SERVICE_SELECTION
              ? 'Car maintenance, made easy in'
              : 'Vehicle transport, made easy in'}{' '}
            <span className="relative inline-block font-semibold">
              4 steps
              <svg
                className="absolute -bottom-1 left-0 w-full"
                height="6"
                viewBox="0 0 100 6"
                preserveAspectRatio="none"
              >
                <path
                  d="M0 5 Q 50 0 100 5"
                  stroke="#fbbf24"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
            </span>
          </p>
        </div>

        {/* Carousel Container */}
        <div className="relative">
          {/* Left Arrow */}
          <button
            onClick={goToPrevious}
            className="absolute left-0 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:shadow-md sm:left-2 lg:left-4"
            aria-label="Previous step"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          {/* Carousel Track Container */}
          <div className="overflow-hidden px-14 py-8 sm:px-16 lg:px-20">
            {/* Sliding Track - all slides in a row */}
            <motion.div
              className="flex"
              animate={{ x: `${-currentIndex * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            >
              {steps.map((step, index) => {
                // For each slide, determine what previews to show
                const showLeftPreview = index > 0;
                const leftPreview = showLeftPreview ? steps[index - 1] : null;
                const showRightPreview = index < steps.length - 1;
                const rightPreview = showRightPreview ? steps[index + 1] : null;

                return (
                  <div
                    key={step.step}
                    className="flex w-full flex-shrink-0 items-center justify-center"
                  >
                    <div className="flex w-full max-w-6xl items-center justify-center gap-4 lg:gap-8">
                      {/* Left phone preview */}
                      <div className="hidden w-[200px] flex-shrink-0 lg:block xl:w-[240px]">
                        {showLeftPreview && leftPreview && (
                          <div className="relative flex h-[260px] w-full items-end justify-center opacity-40">
                            <div
                              className={`absolute bottom-0 h-[150px] w-[180px] rounded-[1.75rem] bg-gradient-to-br ${leftPreview.gradient}`}
                            />
                            <Image
                              src={leftPreview.image}
                              alt={leftPreview.title}
                              width={200}
                              height={228}
                              className="relative z-10"
                            />
                          </div>
                        )}
                      </div>

                      {/* Step info - left of center phone */}
                      <div className="hidden w-48 flex-shrink-0 text-left lg:block xl:w-56">
                        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border-2 border-slate-300 bg-white text-xl font-bold text-slate-500">
                          {step.step}
                        </div>
                        <h3 className="mb-3 text-xl font-bold text-slate-900 xl:text-2xl">
                          {step.title}
                        </h3>
                        <p className="text-sm leading-relaxed text-slate-600 xl:text-base">
                          {step.description}
                        </p>
                      </div>

                      {/* Center phone with gradient pill */}
                      <div className="flex flex-col items-center">
                        <div className="relative flex h-[320px] w-[280px] items-end justify-center">
                          <div
                            className={`absolute bottom-0 h-[180px] w-[240px] rounded-[2.5rem] bg-gradient-to-br shadow-lg ${step.gradient}`}
                          />
                          <Image
                            src={step.image}
                            alt={step.title}
                            width={242}
                            height={276}
                            className="relative z-10 drop-shadow-xl"
                            priority={index === 0}
                          />
                        </div>
                        {/* Mobile: show text below phone */}
                        <div className="mt-6 text-center lg:hidden">
                          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg border-2 border-slate-300 bg-white text-lg font-bold text-slate-500">
                            {step.step}
                          </div>
                          <h3 className="mb-2 text-lg font-bold text-slate-900">
                            {step.title}
                          </h3>
                          <p className="text-sm leading-relaxed text-slate-600">
                            {step.description}
                          </p>
                        </div>
                      </div>

                      {/* Next step preview text - right of center phone */}
                      <div className="hidden w-48 flex-shrink-0 text-left lg:block xl:w-56">
                        {showRightPreview && rightPreview && (
                          <div className="opacity-40">
                            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-xl font-bold text-slate-300">
                              {rightPreview.step}
                            </div>
                            <h3 className="mb-3 text-xl font-bold text-slate-400 xl:text-2xl">
                              {rightPreview.title}
                            </h3>
                            <p className="text-sm leading-relaxed text-slate-400 xl:text-base">
                              {rightPreview.description}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Right phone preview */}
                      <div className="hidden w-[200px] flex-shrink-0 lg:block xl:w-[240px]">
                        {showRightPreview && rightPreview && (
                          <div className="relative flex h-[260px] w-full items-end justify-center opacity-40">
                            <div
                              className={`absolute bottom-0 h-[150px] w-[180px] rounded-[1.75rem] bg-gradient-to-br ${rightPreview.gradient}`}
                            />
                            <Image
                              src={rightPreview.image}
                              alt={rightPreview.title}
                              width={200}
                              height={228}
                              className="relative z-10"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </div>

          {/* Right Arrow */}
          <button
            onClick={goToNext}
            className="absolute right-0 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:shadow-md sm:right-2 lg:right-4"
            aria-label="Next step"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Dot indicators */}
          <div className="mt-6 flex items-center justify-center gap-2">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? 'w-8 bg-emerald-500'
                    : 'w-2 bg-slate-300 hover:bg-slate-400'
                }`}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
