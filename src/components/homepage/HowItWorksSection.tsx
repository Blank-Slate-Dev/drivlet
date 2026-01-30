// src/components/homepage/HowItWorksSection.tsx
'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { FEATURES } from '@/lib/featureFlags';

const marketplaceSteps = [
  {
    step: '1',
    title: 'Book online in 2 clicks',
    description:
      'Share your rego, pick-up location, and service type. We handle the rest.',
    image: '/step1_phone.png',
    gradient: 'from-emerald-400 to-green-500',
    overlayColor: 'to-emerald-400/90',
  },
  {
    step: '2',
    title: 'Track your service',
    description:
      'Follow your vehicle in real-time from collection through to completion.',
    image: '/step2_phone.png',
    gradient: 'from-violet-500 to-purple-600',
    overlayColor: 'to-violet-500/90',
  },
  {
    step: '3',
    title: 'We deliver to the garage',
    description:
      'Our fully insured drivers deliver your car to our vetted service centre network.',
    image: '/step3_phone.png',
    gradient: 'from-indigo-600 to-slate-800',
    overlayColor: 'to-indigo-600/90',
  },
  {
    step: '4',
    title: 'We return your car',
    description:
      'Once serviced, we bring your car back to you — safe, sound, and ready to drive.',
    image: '/step4_phone.png',
    gradient: 'from-cyan-400 to-teal-500',
    overlayColor: 'to-cyan-400/90',
  },
];

const transportSteps = [
  {
    step: '1',
    title: 'Book your pickup',
    description:
      'Enter your rego, pickup address, and service centre details. Quick and simple.',
    image: '/step1_phone.png',
    gradient: 'from-emerald-400 to-green-500',
    overlayColor: 'to-emerald-400/90',
  },
  {
    step: '2',
    title: 'Track in real-time',
    description:
      'Follow your vehicle every step of the way with live tracking updates.',
    image: '/step2_phone.png',
    gradient: 'from-violet-500 to-purple-600',
    overlayColor: 'to-violet-500/90',
  },
  {
    step: '3',
    title: 'Delivered to your service centre',
    description:
      'Our fully insured drivers deliver your car directly to your chosen garage.',
    image: '/step3_phone.png',
    gradient: 'from-indigo-600 to-slate-800',
    overlayColor: 'to-indigo-600/90',
  },
  {
    step: '4',
    title: 'Returned to you',
    description:
      'Once your service is complete, we collect and return your car — hassle-free.',
    image: '/step4_phone.png',
    gradient: 'from-cyan-400 to-teal-500',
    overlayColor: 'to-cyan-400/90',
  },
];

const phoneVariants = {
  enter: (direction: 'left' | 'right') => ({
    opacity: 0,
    x: direction === 'right' ? 100 : -100,
  }),
  center: {
    opacity: 1,
    x: 0,
  },
  exit: (direction: 'left' | 'right') => ({
    opacity: 0,
    x: direction === 'right' ? -100 : 100,
  }),
};

export default function HowItWorksSection() {
  const steps = FEATURES.SERVICE_SELECTION ? marketplaceSteps : transportSteps;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set([0]));
  const [isAnimating, setIsAnimating] = useState(false);

  // Detect screen size after mount
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  const goToSlide = useCallback(
    (index: number) => {
      if (isAnimating || index === currentIndex) return;
      setIsAnimating(true);
      setDirection(index > currentIndex ? 'right' : 'left');
      setCurrentIndex(index);
      setTimeout(() => setIsAnimating(false), 500);
    },
    [currentIndex, isAnimating]
  );

  const goToPrevious = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setDirection('left');
    setCurrentIndex((prev) => (prev === 0 ? steps.length - 1 : prev - 1));
    setTimeout(() => setIsAnimating(false), 500);
  }, [steps.length, isAnimating]);

  const goToNext = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setDirection('right');
    setCurrentIndex((prev) => (prev === steps.length - 1 ? 0 : prev + 1));
    setTimeout(() => setIsAnimating(false), 500);
  }, [steps.length, isAnimating]);

  const handleImageLoad = (index: number) => {
    setLoadedImages((prev) => new Set([...prev, index]));
  };

  const currentStep = steps[currentIndex];

  // Loading state
  if (isDesktop === null) {
    return (
      <section
        id="how-it-works"
        className="relative border-b border-slate-200 bg-white py-16 sm:py-20"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              How it works
            </h2>
          </div>
          <div className="flex justify-center">
            <div className="h-[380px] w-[300px] animate-pulse rounded-3xl bg-slate-100" />
          </div>
        </div>
      </section>
    );
  }

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
          {/* Navigation Arrows */}
          <button
            onClick={goToPrevious}
            disabled={isAnimating}
            className="absolute left-2 top-1/2 z-30 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:shadow-md disabled:opacity-50 lg:left-4"
            aria-label="Previous step"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <button
            onClick={goToNext}
            disabled={isAnimating}
            className="absolute right-2 top-1/2 z-30 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:shadow-md disabled:opacity-50 lg:right-4"
            aria-label="Next step"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Main Content */}
          <div className="px-16 lg:px-24">
            {/* Desktop Layout - with framer-motion */}
            {isDesktop && (
              <div className="flex items-center justify-center gap-12">
                {/* Left: Current Step Text */}
                <div className="w-56 flex-shrink-0">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`text-${currentIndex}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-left"
                    >
                      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border-2 border-slate-300 bg-white text-xl font-bold text-slate-500">
                        {currentStep.step}
                      </div>
                      <h3 className="mb-3 text-xl font-bold text-slate-900">
                        {currentStep.title}
                      </h3>
                      <p className="text-sm leading-relaxed text-slate-600">
                        {currentStep.description}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Center: Phone with Gradient Pill */}
                <div className="relative flex-shrink-0">
                  <AnimatePresence mode="wait" initial={false} custom={direction}>
                    <motion.div
                      key={`phone-${currentIndex}`}
                      custom={direction}
                      variants={phoneVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                    >
                      <div className="relative flex h-[380px] w-[300px] items-end justify-center pb-[20px]">
                        <div
                          className={`absolute bottom-0 h-[245px] w-[270px] rounded-[2.5rem] bg-gradient-to-br shadow-lg ${currentStep.gradient}`}
                        />
                        {!loadedImages.has(currentIndex) && (
                          <div className="absolute z-10 h-[349px] w-[220px] animate-pulse rounded-[2.5rem] bg-slate-200/60" />
                        )}
                        <div className="relative z-10 w-[220px]">
                          <Image
                            src={currentStep.image}
                            alt={currentStep.title}
                            width={600}
                            height={951}
                            className={`h-auto w-[220px] ${!loadedImages.has(currentIndex) ? 'opacity-0' : ''}`}
                            priority={currentIndex === 0}
                            onLoad={() => handleImageLoad(currentIndex)}
                          />
                          <div
                            className={`pointer-events-none absolute bottom-0 left-0 h-20 w-full bg-gradient-to-b from-transparent ${currentStep.overlayColor}`}
                          />
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Mobile Layout - CSS transitions */}
            {!isDesktop && (
              <div className="flex flex-col items-center">
                <div className="relative h-[380px] w-[300px] overflow-hidden">
                  {steps.map((step, index) => (
                    <div
                      key={step.step}
                      className="absolute inset-0 flex items-end justify-center pb-[20px] transition-all duration-300 ease-in-out"
                      style={{
                        transform: `translateX(${
                          index === currentIndex
                            ? '0%'
                            : index < currentIndex
                              ? '-100%'
                              : '100%'
                        })`,
                        opacity: index === currentIndex ? 1 : 0,
                      }}
                    >
                      <div
                        className={`absolute bottom-0 h-[245px] w-[270px] rounded-[2.5rem] bg-gradient-to-br shadow-lg ${step.gradient}`}
                      />
                      <div className="relative z-10 w-[220px]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={step.image}
                          alt={step.title}
                          className="h-auto w-[220px]"
                          loading={index === 0 ? 'eager' : 'lazy'}
                        />
                        <div
                          className={`pointer-events-none absolute bottom-0 left-0 h-20 w-full bg-gradient-to-b from-transparent ${step.overlayColor}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Text below */}
                <div className="mt-6 text-center">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg border-2 border-slate-300 bg-white text-lg font-bold text-slate-500">
                    {currentStep.step}
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-slate-900">
                    {currentStep.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-600">
                    {currentStep.description}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Dot indicators */}
          <div className="mt-8 flex items-center justify-center gap-2">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                disabled={isAnimating}
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
