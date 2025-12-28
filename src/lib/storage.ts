// src/lib/storage.ts
// Photo storage utility with cloud migration support
// Currently uses local filesystem, structured for easy S3/Cloudinary migration

import fs from "fs/promises";
import path from "path";
import { CheckpointType, PhotoType } from "@/models/VehiclePhoto";

// Configuration
const UPLOAD_BASE_DIR = process.env.UPLOAD_DIR || "uploads";
const VEHICLE_PHOTOS_DIR = "vehicle-photos";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png"];

export interface UploadResult {
  success: boolean;
  filePath?: string;
  cloudUrl?: string;
  error?: string;
  fileSize?: number;
}

export interface StorageConfig {
  provider: "local" | "s3" | "cloudinary";
  bucket?: string;
  region?: string;
  cloudName?: string;
}

// Get current storage configuration
export function getStorageConfig(): StorageConfig {
  // Currently hardcoded to local, but reads from env for easy migration
  const provider = (process.env.STORAGE_PROVIDER as StorageConfig["provider"]) || "local";

  return {
    provider,
    bucket: process.env.S3_BUCKET,
    region: process.env.S3_REGION || "ap-southeast-2",
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  };
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
  return path.join(
    UPLOAD_BASE_DIR,
    VEHICLE_PHOTOS_DIR,
    bookingId,
    checkpointType,
    filename
  );
}

/**
 * Ensure directory exists
 */
async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Upload file to local storage
 * This function is designed to be easily swapped with S3/Cloudinary implementation
 */
async function uploadToLocal(
  buffer: Buffer,
  filePath: string
): Promise<UploadResult> {
  try {
    const dir = path.dirname(filePath);
    await ensureDir(dir);
    await fs.writeFile(filePath, buffer);

    return {
      success: true,
      filePath,
      fileSize: buffer.length,
    };
  } catch (error) {
    console.error("Local upload error:", error);
    return {
      success: false,
      error: "Failed to save file to local storage",
    };
  }
}

/**
 * Upload file to S3 (placeholder for future implementation)
 */
async function uploadToS3(
  buffer: Buffer,
  filePath: string,
  _config: StorageConfig
): Promise<UploadResult> {
  // TODO: Implement S3 upload when needed
  // Example implementation:
  // const s3 = new S3Client({ region: config.region });
  // const key = filePath.replace(/\\/g, '/');
  // await s3.send(new PutObjectCommand({
  //   Bucket: config.bucket,
  //   Key: key,
  //   Body: buffer,
  //   ContentType: mimeType,
  // }));
  // return {
  //   success: true,
  //   filePath: key,
  //   cloudUrl: `https://${config.bucket}.s3.${config.region}.amazonaws.com/${key}`,
  // };

  console.warn("S3 upload not implemented, falling back to local storage");
  return uploadToLocal(buffer, filePath);
}

/**
 * Upload file to Cloudinary (placeholder for future implementation)
 */
async function uploadToCloudinary(
  buffer: Buffer,
  filePath: string,
  _config: StorageConfig
): Promise<UploadResult> {
  // TODO: Implement Cloudinary upload when needed
  // Example implementation:
  // const result = await cloudinary.uploader.upload_stream({
  //   folder: `vehicle-photos/${bookingId}/${checkpointType}`,
  //   public_id: photoType,
  // });
  // return {
  //   success: true,
  //   cloudUrl: result.secure_url,
  // };

  console.warn("Cloudinary upload not implemented, falling back to local storage");
  return uploadToLocal(buffer, filePath);
}

/**
 * Main upload function - routes to appropriate storage provider
 */
export async function uploadToCloud(
  buffer: Buffer,
  filePath: string
): Promise<UploadResult> {
  const config = getStorageConfig();

  switch (config.provider) {
    case "s3":
      return uploadToS3(buffer, filePath, config);
    case "cloudinary":
      return uploadToCloudinary(buffer, filePath, config);
    case "local":
    default:
      return uploadToLocal(buffer, filePath);
  }
}

/**
 * Delete file from storage
 */
export async function deleteFromStorage(filePath: string): Promise<boolean> {
  const config = getStorageConfig();

  try {
    switch (config.provider) {
      case "s3":
        // TODO: Implement S3 delete
        console.warn("S3 delete not implemented");
        return false;
      case "cloudinary":
        // TODO: Implement Cloudinary delete
        console.warn("Cloudinary delete not implemented");
        return false;
      case "local":
      default:
        await fs.unlink(filePath);
        return true;
    }
  } catch (error) {
    console.error("Delete error:", error);
    return false;
  }
}

/**
 * Get file from storage
 */
export async function getFromStorage(filePath: string): Promise<Buffer | null> {
  const config = getStorageConfig();

  try {
    switch (config.provider) {
      case "s3":
        // TODO: Implement S3 get
        console.warn("S3 get not implemented, trying local");
        return fs.readFile(filePath);
      case "cloudinary":
        // TODO: Implement Cloudinary get (would use URL instead)
        console.warn("Cloudinary get not implemented, trying local");
        return fs.readFile(filePath);
      case "local":
      default:
        return fs.readFile(filePath);
    }
  } catch (error) {
    console.error("Get file error:", error);
    return null;
  }
}

/**
 * Check if file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get public URL for a photo
 * For local storage, returns an API route
 * For cloud storage, returns the direct URL
 */
export function getPhotoUrl(photoId: string, cloudUrl?: string): string {
  if (cloudUrl) {
    return cloudUrl;
  }
  return `/api/photos/${photoId}`;
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
