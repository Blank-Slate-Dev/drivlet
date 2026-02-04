// src/components/homepage/TestimonialsSection.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
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

// Placeholder testimonials shown when no real ones exist in the database
const PLACEHOLDER_TESTIMONIALS: Testimonial[] = [
  // Newcastle
  {
    _id: "placeholder-1",
    customerName: "Emily R.",
    customerLocation: "Charlestown, Newcastle",
    rating: 5,
    review:
      "Sharjeel picked up my car right on time and kept me updated the whole way. Didn't have to take a minute off work!",
    vehicleType: "Toyota Corolla",
    serviceType: "Regular Service",
  },
  // Newcastle
  {
    _id: "placeholder-2",
    customerName: "James T.",
    customerLocation: "Mayfield, Newcastle",
    rating: 5,
    review:
      "Oakley made it so easy. Booked online in two minutes, car collected from home and back by the afternoon. Super convenient.",
    vehicleType: "Mazda CX-5",
    serviceType: "Major Service",
  },
  // Canberra
  {
    _id: "placeholder-3",
    customerName: "Priya M.",
    customerLocation: "Belconnen, Canberra",
    rating: 5,
    review:
      "Hanzla went above and beyond. I was nervous but he was so careful and communicative. Seamless from start to finish.",
    vehicleType: "Kia Sportage",
    serviceType: "Regular Service",
  },
  // Newcastle
  {
    _id: "placeholder-4",
    customerName: "Sarah K.",
    customerLocation: "Lambton, Newcastle",
    rating: 5,
    review:
      "Gerome was super professional and friendly. He sent me photos when the car arrived at the mechanic. Great for busy parents!",
    vehicleType: "Hyundai Tucson",
    serviceType: "Quick Service",
  },
  // Newcastle
  {
    _id: "placeholder-5",
    customerName: "Daniel W.",
    customerLocation: "Merewether, Newcastle",
    rating: 5,
    review:
      "Raheel handled everything perfectly. Needed a major service and didn't have to rearrange my day. The tracking feature is brilliant.",
    vehicleType: "Ford Ranger",
    serviceType: "Major Service",
  },
  // Newcastle
  {
    _id: "placeholder-6",
    customerName: "Chris B.",
    customerLocation: "Adamstown, Newcastle",
    rating: 5,
    review:
      "Tom was great — on time, polite, and my car came back spotless. Honestly the easiest service experience I've ever had.",
    vehicleType: "Volkswagen Golf",
    serviceType: "Regular Service",
  },
  // Newcastle
  {
    _id: "placeholder-7",
    customerName: "Lauren P.",
    customerLocation: "Jesmond, Newcastle",
    rating: 5,
    review:
      "Matt was fantastic. He kept me in the loop the entire time and even called to confirm drop-off. Will be using Drivlet every time now.",
    vehicleType: "Honda CR-V",
    serviceType: "Quick Service",
  },
  // Canberra
  {
    _id: "placeholder-8",
    customerName: "Nathan S.",
    customerLocation: "Woden, Canberra",
    rating: 5,
    review:
      "Abdul was incredibly professional. Picked up my car early and had it back ahead of schedule. Can't wait for Drivlet to grow here!",
    vehicleType: "Subaru Outback",
    serviceType: "Major Service",
  },
];

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

      <p className="text-slate-700 text-sm leading-relaxed flex-1">
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
        {[1, 2, 3, 4].map((i) => (
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

/**
 * Hook that returns true when viewport is below the given width.
 */
function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsMobile(e.matches);
    onChange(mql); // set initial
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [breakpoint]);

  return isMobile;
}

export default function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<1 | -1>(1);

  const isMobile = useIsMobile(); // true when < 640px (sm breakpoint)
  const itemsPerPage = isMobile ? 2 : 4;

  const AUTO_SCROLL_MS = 15000; // 15 seconds
  const SWIPE_THRESHOLD = 50; // px needed to trigger swipe

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const res = await fetch("/api/testimonials");
        if (res.ok) {
          const data = await res.json();
          const fetched = data.testimonials || [];
          setTestimonials(
            fetched.length > 0 ? fetched : PLACEHOLDER_TESTIMONIALS
          );
        } else {
          setTestimonials(PLACEHOLDER_TESTIMONIALS);
        }
      } catch {
        console.error("Failed to fetch testimonials, using placeholders");
        setTestimonials(PLACEHOLDER_TESTIMONIALS);
      } finally {
        setLoading(false);
      }
    };
    fetchTestimonials();
  }, []);

  const totalPages = Math.ceil(testimonials.length / itemsPerPage);
  const shouldCycle = totalPages > 1;

  // Reset page to 0 when items-per-page changes (e.g. rotating device)
  useEffect(() => {
    setCurrentPage(0);
  }, [itemsPerPage]);

  const goToPage = useCallback(
    (page: number) => {
      const target = ((page % totalPages) + totalPages) % totalPages;
      setSwipeDirection(
        target > currentPage ||
          (currentPage === totalPages - 1 && target === 0)
          ? 1
          : -1
      );
      setCurrentPage(target);
    },
    [totalPages, currentPage]
  );

  const nextPage = useCallback(() => {
    setSwipeDirection(1);
    setCurrentPage((prev) => (prev + 1) % totalPages);
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setSwipeDirection(-1);
    setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);
  }, [totalPages]);

  // Auto-cycle every 15 seconds
  useEffect(() => {
    if (!shouldCycle || isPaused) return;

    const interval = setInterval(nextPage, AUTO_SCROLL_MS);
    return () => clearInterval(interval);
  }, [shouldCycle, isPaused, nextPage]);

  // Swipe handler
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -SWIPE_THRESHOLD) {
      nextPage();
    } else if (info.offset.x > SWIPE_THRESHOLD) {
      prevPage();
    }
  };

  const currentTestimonials = testimonials.slice(
    currentPage * itemsPerPage,
    currentPage * itemsPerPage + itemsPerPage
  );

  // Slide variants for left/right transition
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 120 : -120,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -120 : 120,
      opacity: 0,
    }),
  };

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
          <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: itemsPerPage }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <div className="relative min-h-[320px] overflow-hidden touch-pan-y">
            <AnimatePresence mode="wait" custom={swipeDirection}>
              <motion.div
                key={currentPage}
                custom={swipeDirection}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: "easeInOut" }}
                drag={isMobile ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.15}
                onDragEnd={handleDragEnd}
                className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4 cursor-grab active:cursor-grabbing sm:cursor-default"
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
                onClick={() => goToPage(index)}
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
