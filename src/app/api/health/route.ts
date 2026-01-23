// src/app/api/health/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";

export async function GET() {
  try {
    // Test MongoDB connection
    await connectDB();

    // Check if MONGODB_URI is defined
    const hasMongoURI = !!process.env.MONGODB_URI;

    return NextResponse.json({
      status: "ok",
      mongodb: "connected",
      env: {
        MONGODB_URI: hasMongoURI ? "defined" : "missing",
        NEXTAUTH_URL: process.env.NEXTAUTH_URL ? "defined" : "missing",
        NODE_ENV: process.env.NODE_ENV,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        env: {
          MONGODB_URI: process.env.MONGODB_URI ? "defined" : "missing",
        },
      },
      { status: 500 }
    );
  }
}
