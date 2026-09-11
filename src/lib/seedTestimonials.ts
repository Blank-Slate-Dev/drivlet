// src/lib/seedTestimonials.ts
//
// NEUTRALISED pre-launch (2026-09-11): this file previously seeded 8
// fabricated customer testimonials (fictional names, reviews and ratings)
// which the homepage then displayed as genuine — fake-review territory
// (ACCC). The seed list is now empty and seeding is a no-op. Real
// testimonials are created through the admin testimonials page or the
// customer feedback flow. If a demo environment ever needs sample data,
// add it behind an explicit non-production env check — never ship it.

import { connectDB } from "@/lib/mongodb";
import Testimonial from "@/models/Testimonial";

const testTestimonials: never[] = [];

export async function seedTestimonials(): Promise<number> {
  await connectDB();

  const count = await Testimonial.countDocuments();
  if (count > 0) {
    return 0;
  }

  // Empty seed list — intentionally a no-op (see header comment).
  if (testTestimonials.length === 0) {
    return 0;
  }

  await Testimonial.insertMany(testTestimonials);
  return testTestimonials.length;
}
