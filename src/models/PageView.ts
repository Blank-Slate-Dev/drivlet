// src/models/PageView.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export type DeviceType = "mobile" | "tablet" | "desktop";

export interface IPageView extends Document {
  /** Pathname only, no query string. e.g. "/newcastle/hamilton" */
  path: string;
  /** Visitor's city, from Vercel's x-vercel-ip-city header */
  visitorCity: string;
  /** Visitor's state/region, e.g. "NSW" */
  visitorRegion?: string;
  /** ISO country code, e.g. "AU" */
  visitorCountry?: string;
  /**
   * Anonymised visitor fingerprint. A daily-rotating SHA-256 of
   * IP + user agent + server secret. Lets us count unique people
   * per day without ever storing an IP address.
   */
  visitorHash: string;
  /** External referring hostname, e.g. "google.com". Undefined for direct/internal. */
  referrerHost?: string;
  deviceType: DeviceType;
  createdAt: Date;
  updatedAt: Date;
}

const PageViewSchema = new Schema<IPageView>(
  {
    path: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    visitorCity: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      default: "Unknown",
    },
    visitorRegion: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    visitorCountry: {
      type: String,
      trim: true,
      maxlength: 8,
    },
    visitorHash: {
      type: String,
      required: true,
      maxlength: 64,
    },
    referrerHost: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    deviceType: {
      type: String,
      enum: ["mobile", "tablet", "desktop"],
      default: "desktop",
    },
  },
  {
    timestamps: true,
  }
);

// Query indexes — every dashboard query filters on a date range first.
PageViewSchema.index({ createdAt: -1 });
PageViewSchema.index({ createdAt: -1, visitorCity: 1 });
PageViewSchema.index({ createdAt: -1, path: 1 });

// Retention: rows self-delete after 400 days, so the collection never grows
// without bound but you keep enough history for year-on-year comparison.
PageViewSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 400 }
);

const PageView: Model<IPageView> =
  mongoose.models.PageView ||
  mongoose.model<IPageView>("PageView", PageViewSchema);

export default PageView;