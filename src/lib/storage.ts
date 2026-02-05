// src/lib/storage.ts
// Photo storage utility using Vercel Blob

import { put, del } from "@vercel/blob";
import { CheckpointType, PhotoType } from "@/models/VehiclePhoto";

// Configuration
const MAX_FILE_SIZE = 4.5 * 1024 * 1024; // 4.5MB (Vercel serverless request body limit)
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png"];

export interface UploadResult {
  success: boolean;
  filePath?: string;
  cloudUrl?: string;
  error?: string;
  fileSize?: number;
}

/**
 * Validate file before upload
 */
export function validateFile(
  buffer: Buffer,
  mimeType: string
): { valid: boolean; error?: string } {
  // Check file size
  if (buffer.length > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  // Check mime type
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`,
    };
  }

  // Basic magic number check for images
  const jpegMagic = buffer.slice(0, 3).toString("hex") === "ffd8ff";
  const pngMagic = buffer.slice(0, 8).toString("hex") === "89504e470d0a1a0a";

  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
    if (!jpegMagic) {
      return { valid: false, error: "File content does not match JPEG format" };
    }
  } else if (mimeType.includes("png")) {
    if (!pngMagic) {
      return { valid: false, error: "File content does not match PNG format" };
    }
  }

  return { valid: true };
}

/**
 * Generate file path for vehicle photo
 */
export function generateFilePath(
  bookingId: string,
  checkpointType: CheckpointType,
  photoType: PhotoType,
  extension: string
): string {
  const timestamp = Date.now();
  const filename = `${photoType}_${timestamp}.${extension}`;
  return `vehicle-photos/${bookingId}/${checkpointType}/${filename}`;
}

/**
 * Upload file to Vercel Blob
 */
export async function uploadToCloud(
  buffer: Buffer,
  filePath: string
): Promise<UploadResult> {
  try {
    const blob = await put(filePath, buffer, {
      access: "public",
      addRandomSuffix: false,
    });

    return {
      success: true,
      filePath,
      cloudUrl: blob.url,
      fileSize: buffer.length,
    };
  } catch (error) {
    console.error("Vercel Blob upload error:", error);
    return {
      success: false,
      error: "Failed to upload file to storage",
    };
  }
}

/**
 * Delete file from Vercel Blob
 * Accepts a blob URL (cloudUrl from the VehiclePhoto record)
 */
export async function deleteFromStorage(url: string): Promise<boolean> {
  try {
    await del(url);
    return true;
  } catch (error) {
    console.error("Vercel Blob delete error:", error);
    return false;
  }
}

/**
 * Get file extension from mime type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/png":
      return "png";
    default:
      return "jpg";
  }
}

/**
 * Get public URL for a photo
 * Returns the direct cloud URL if available, otherwise falls back to API route
 */
export function getPhotoUrl(photoId: string, cloudUrl?: string): string {
  if (cloudUrl) {
    return cloudUrl;
  }
  return `/api/photos/${photoId}`;
}