// src/app/api/admin/testimonials/seed/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { seedTestimonials } from "@/lib/seedTestimonials";

// POST - Seed test testimonials
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const count = await seedTestimonials();

    if (count === 0) {
      return NextResponse.json(
        { error: "Testimonials already exist. Seed only works on empty collection." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${count} testimonials`,
      count,
    });
  } catch (error) {
    console.error("Error seeding testimonials:", error);
    return NextResponse.json(
      { error: "Failed to seed testimonials" },
      { status: 500 }
    );
  }
}
