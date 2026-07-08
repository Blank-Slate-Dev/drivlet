// src/lib/photoRequirements.ts
// Single source of truth for compulsory custody-checkpoint photos.
// Used by BOTH the driver UI (src/app/driver/jobs/page.tsx) and the status-update
// API (src/app/api/driver/jobs/route.ts) so the rules can never drift apart.
//
// Photos live in the VehiclePhoto collection, keyed by (checkpointType, photoType).
// Slot keys below are the ACTUAL PhotoType values from src/models/VehiclePhoto.ts
// ("front" | "back" | "left_side" | "right_side" | "odometer"). No parallel scheme.

import type { CheckpointType, PhotoType } from "@/models/VehiclePhoto";

// The three custody checkpoints that gate a status advance (per SOP).
export type GatedCheckpoint = Extract<
  CheckpointType,
  "pre_pickup" | "service_dropoff" | "service_pickup"
>;

export interface CheckpointRequirement {
  /** Specific photo slots that must EACH be present (empty = any photo counts). */
  requiredSlots: PhotoType[];
  /** Minimum number of non-superseded photos at this checkpoint. */
  min: number;
  /** Human label for the checkpoint. */
  label: string;
}

// SOP minimums:
//  - Pickup (customer handover): 4 exterior wides + 1 odometer/fuel = 5
//  - Drop-off (workshop): 1 proof-of-drop-off (any angle)
//  - Return pickup (from workshop): 4 exterior wides
export const PHOTO_REQUIREMENTS: Record<GatedCheckpoint, CheckpointRequirement> = {
  pre_pickup: {
    requiredSlots: ["front", "back", "left_side", "right_side", "odometer"],
    min: 5,
    label: "Pickup (customer handover)",
  },
  service_dropoff: {
    requiredSlots: [], // any single photo is acceptable proof of drop-off
    min: 1,
    label: "Drop-off (workshop)",
  },
  service_pickup: {
    requiredSlots: ["front", "back", "left_side", "right_side"],
    min: 4,
    label: "Return pickup (from workshop)",
  },
};

// Sentinel used when a checkpoint requires a count but no specific slot (drop-off proof).
export const DROPOFF_PROOF_SLOT = "dropoff_proof";

// Display labels for slots (UI checklist).
export const SLOT_LABELS: Record<string, string> = {
  front: "Front",
  back: "Rear",
  left_side: "Left side",
  right_side: "Right side",
  odometer: "Odometer / fuel",
  [DROPOFF_PROOF_SLOT]: "Proof of drop-off",
};

// Maps a driver status-update action to the checkpoint it must satisfy first.
// Only these actions are gated; all other transitions are unaffected.
export const ACTION_CHECKPOINT: Record<string, GatedCheckpoint> = {
  collected: "pre_pickup",
  picked_up: "pre_pickup", // legacy alias
  dropped_at_workshop: "service_dropoff",
  at_garage: "service_dropoff", // legacy alias
  collected_from_workshop: "service_pickup",
};

// Minimal photo shape both callers can satisfy (VehiclePhoto docs and the UI's
// fetched photo list both expose checkpointType + photoType).
export interface MinimalPhoto {
  checkpointType: string;
  photoType: string;
  superseded?: boolean;
}

export interface CheckpointValidation {
  valid: boolean;
  /** Missing slot keys (PhotoType values, or DROPOFF_PROOF_SLOT). */
  missing: string[];
  /** All slot keys required for the checklist (present + missing). */
  requiredSlots: string[];
  present: number;
  required: number;
}

/**
 * Validate a booking's stored photos against a checkpoint's requirements.
 * Superseded photos are ignored. Pure and synchronous — the API passes DB docs,
 * the UI passes the fetched photo list, both flow through the same rules.
 */
export function validateCheckpointPhotos(
  photos: MinimalPhoto[],
  checkpoint: GatedCheckpoint
): CheckpointValidation {
  const req = PHOTO_REQUIREMENTS[checkpoint];

  const active = photos.filter(
    (p) => p.checkpointType === checkpoint && p.superseded !== true
  );
  const presentTypes = new Set(active.map((p) => p.photoType));

  let requiredSlots: string[];
  let missing: string[];

  if (req.requiredSlots.length > 0) {
    requiredSlots = [...req.requiredSlots];
    missing = req.requiredSlots.filter((slot) => !presentTypes.has(slot));
  } else {
    // Count-only checkpoint (drop-off proof): one generic slot.
    requiredSlots = [DROPOFF_PROOF_SLOT];
    missing = active.length >= req.min ? [] : [DROPOFF_PROOF_SLOT];
  }

  const valid = missing.length === 0 && active.length >= req.min;

  return { valid, missing, requiredSlots, present: active.length, required: req.min };
}
