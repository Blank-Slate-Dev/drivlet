// src/components/homepage/HowItWorksSection.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [direction, setDirection] = useState(0);

  const goToSlide = useCallback(
    (index: number) => {
      setDirection(index > currentIndex ? 1 : -1);
      setCurrentIndex(index);
    },
    [currentIndex]
  );

  const goToPrevious = useCallback(() => {
    setDirection(-1);
    // Linear: if at start, go to end; otherwise go back one
    setCurrentIndex((prev) => (prev === 0 ? steps.length - 1 : prev - 1));
  }, [steps.length]);

  const goToNext = useCallback(() => {
    setDirection(1);
    // Linear: if at end, restart from beginning
    setCurrentIndex((prev) => (prev === steps.length - 1 ? 0 : prev + 1));
  }, [steps.length]);

  // Auto-advance every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      goToNext();
    }, 5000);
    return () => clearInterval(timer);
  }, [goToNext]);

  const currentStep = steps[currentIndex];
  
  // Linear previews: only show adjacent steps in forward direction
  // Step 1: no prev, Step 2-4: show previous step
  const hasPrevPreview = currentIndex > 0;
  const prevStep = hasPrevPreview ? steps[currentIndex - 1] : null;
  
  // All steps show the next step, step 4 shows step 1 (restart indicator)
  const nextIndex = currentIndex === steps.length - 1 ? 0 : currentIndex + 1;
  const nextStep = steps[nextIndex];

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 200 : -200,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -200 : 200,
      opacity: 0,
    }),
  };

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
          {/* Main carousel area */}
          <div className="flex items-center justify-center">
            {/* Left Arrow */}
            <button
              onClick={goToPrevious}
              className="absolute left-0 z-20 flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:shadow-md sm:left-4 lg:left-8"
              aria-label="Previous step"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            {/* Slides Container */}
            <div className="relative flex w-full items-center justify-center py-8">
              {/* Previous slide preview (left) - only show if not on step 1 */}
              {hasPrevPreview && prevStep && (
                <div className="absolute left-0 hidden items-center opacity-40 lg:flex xl:left-8">
                  {/* Phone with gradient pill */}
                  <div className="relative flex h-[300px] w-[260px] items-end justify-center">
                    {/* Gradient pill background */}
                    <div
                      className={`absolute bottom-0 h-[170px] w-[220px] rounded-[2rem] bg-gradient-to-br ${prevStep.gradient}`}
                    />
                    {/* Phone image */}
                    <Image
                      src={prevStep.image}
                      alt={prevStep.title}
                      width={242}
                      height={276}
                      className="relative z-10"
                    />
                  </div>
                </div>
              )}

              {/* Current slide - center content */}
              <div className="flex w-full max-w-4xl flex-col items-center gap-8 lg:flex-row lg:items-center lg:justify-center lg:gap-12">
                {/* Step info - left side on desktop */}
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={`info-${currentIndex}`}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.35, ease: 'easeInOut' }}
                    className="order-2 text-center lg:order-1 lg:w-56 lg:text-left"
                  >
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border-2 border-slate-300 bg-white text-xl font-bold text-slate-500">
                      {currentStep.step}
                    </div>
                    <h3 className="mb-3 text-xl font-bold text-slate-900 sm:text-2xl">
                      {currentStep.title}
                    </h3>
                    <p className="text-base leading-relaxed text-slate-600">
                      {currentStep.description}
                    </p>
                  </motion.div>
                </AnimatePresence>

                {/* Phone mockup with gradient pill - center */}
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={`phone-${currentIndex}`}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.35, ease: 'easeInOut' }}
                    className="relative order-1 lg:order-2"
                  >
                    {/* Phone container */}
                    <div className="relative flex h-[320px] w-[280px] items-end justify-center">
                      {/* Gradient pill background - centered at bottom */}
                      <div
                        className={`absolute bottom-0 h-[180px] w-[240px] rounded-[2.5rem] bg-gradient-to-br shadow-lg ${currentStep.gradient}`}
                      />
                      {/* Phone image */}
                      <Image
                        src={currentStep.image}
                        alt={currentStep.title}
                        width={242}
                        height={276}
                        className="relative z-10 drop-shadow-xl"
                        priority
                      />
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Next step preview text - right side on desktop */}
                <div className="order-3 hidden w-56 opacity-40 lg:block">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-xl font-bold text-slate-300">
                    {nextStep.step}
                  </div>
                  <h3 className="mb-3 text-xl font-bold text-slate-400">
                    {nextStep.title}
                  </h3>
                  <p className="text-base leading-relaxed text-slate-400">
                    {nextStep.description}
                  </p>
                </div>
              </div>

              {/* Next slide preview (right) - always show next step */}
              <div className="absolute right-0 hidden items-center opacity-40 lg:flex xl:right-8">
                {/* Phone with gradient pill */}
                <div className="relative flex h-[300px] w-[260px] items-end justify-center">
                  {/* Gradient pill background */}
                  <div
                    className={`absolute bottom-0 h-[170px] w-[220px] rounded-[2rem] bg-gradient-to-br ${nextStep.gradient}`}
                  />
                  {/* Phone image */}
                  <Image
                    src={nextStep.image}
                    alt={nextStep.title}
                    width={242}
                    height={276}
                    className="relative z-10"
                  />
                </div>
              </div>
            </div>

            {/* Right Arrow */}
            <button
              onClick={goToNext}
              className="absolute right-0 z-20 flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:shadow-md sm:right-4 lg:right-8"
              aria-label="Next step"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>

          {/* Dot indicators */}
          <div className="mt-8 flex items-center justify-center gap-2">
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
