// src/components/homepage/TestimonialsSection.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Quote } from "lucide-react";

interface Testimonial {
  _id: string;
  customerName: string;
  customerLocation?: string;
  rating: number;
  review: string;
  vehicleType?: string;
  serviceType?: string;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating
              ? "fill-emerald-500 text-emerald-500"
              : "fill-slate-200 text-slate-200"
          }`}
        />
      ))}
    </div>
  );
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm h-full flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <StarRating rating={testimonial.rating} />
        <Quote className="h-5 w-5 text-emerald-200" />
      </div>

      <p className="text-slate-700 text-sm leading-relaxed line-clamp-5 flex-1">
        &ldquo;{testimonial.review}&rdquo;
      </p>

      <div className="mt-4 pt-4 border-t border-slate-100">
        <p className="font-semibold text-slate-900 text-sm">
          {testimonial.customerName}
        </p>
        {testimonial.customerLocation && (
          <p className="text-xs text-slate-500 mt-0.5">
            {testimonial.customerLocation}
          </p>
        )}
        {(testimonial.vehicleType || testimonial.serviceType) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {testimonial.vehicleType && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {testimonial.vehicleType}
              </span>
            )}
            {testimonial.serviceType && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                {testimonial.serviceType}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse">
      <div className="flex gap-1 mb-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-4 w-4 rounded bg-slate-200" />
        ))}
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-slate-200 rounded w-full" />
        <div className="h-3 bg-slate-200 rounded w-full" />
        <div className="h-3 bg-slate-200 rounded w-3/4" />
      </div>
      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="h-4 bg-slate-200 rounded w-24" />
        <div className="h-3 bg-slate-200 rounded w-32 mt-1" />
      </div>
    </div>
  );
}

export default function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const ITEMS_PER_PAGE = 4;

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const res = await fetch("/api/testimonials");
        if (res.ok) {
          const data = await res.json();
          setTestimonials(data.testimonials || []);
        }
      } catch {
        console.error("Failed to fetch testimonials");
      } finally {
        setLoading(false);
      }
    };
    fetchTestimonials();
  }, []);

  const totalPages = Math.ceil(testimonials.length / ITEMS_PER_PAGE);
  const shouldCycle = testimonials.length > ITEMS_PER_PAGE;

  const nextPage = useCallback(() => {
    setCurrentPage((prev) => (prev + 1) % totalPages);
  }, [totalPages]);

  // Auto-cycle every 5 seconds
  useEffect(() => {
    if (!shouldCycle || isPaused) return;

    const interval = setInterval(nextPage, 5000);
    return () => clearInterval(interval);
  }, [shouldCycle, isPaused, nextPage]);

  const currentTestimonials = testimonials.slice(
    currentPage * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE + ITEMS_PER_PAGE
  );

  // Don't render if fetch failed and no testimonials
  if (!loading && testimonials.length === 0) return null;

  return (
    <section
      id="testimonials"
      className="bg-slate-50 py-16 sm:py-20"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            What Our Customers Say
          </h2>
          <p className="mt-3 text-slate-600 max-w-2xl mx-auto">
            Real experiences from real customers in the Newcastle region
          </p>
        </div>

        {/* Cards */}
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <div className="relative min-h-[320px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentPage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
              >
                {currentTestimonials.map((testimonial) => (
                  <TestimonialCard
                    key={testimonial._id}
                    testimonial={testimonial}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* Dot indicators */}
        {shouldCycle && totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: totalPages }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPage(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentPage
                    ? "w-6 bg-emerald-600"
                    : "w-2 bg-slate-300 hover:bg-slate-400"
                }`}
                aria-label={`Go to page ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
