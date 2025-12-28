// src/hooks/usePhotoUpload.ts
// Custom hook for vehicle photo upload with offline support and compression
import { useState, useCallback, useRef } from "react";
import { CheckpointType, PhotoType } from "@/models/VehiclePhoto";

interface UploadedPhoto {
  id: string;
  checkpointType: CheckpointType;
  photoType: PhotoType;
  url: string;
  uploadedAt: string;
  notes?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
}

interface PhotoUploadState {
  [key: string]: {
    status: "idle" | "uploading" | "success" | "error" | "queued";
    progress: number;
    error?: string;
    photo?: UploadedPhoto;
  };
}

interface CheckpointStatus {
  pre_pickup: number;
  service_dropoff: number;
  service_pickup: number;
  final_delivery: number;
}

export function usePhotoUpload(bookingId: string) {
  const [uploadState, setUploadState] = useState<PhotoUploadState>({});
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [checkpointStatus, setCheckpointStatus] = useState<CheckpointStatus>({
    pre_pickup: 0,
    service_dropoff: 0,
    service_pickup: 0,
    final_delivery: 0,
  });
  const [loading, setLoading] = useState(false);
  const queueRef = useRef<Array<{ file: File; checkpoint: CheckpointType; photoType: PhotoType; notes?: string }>>([]);
  const isProcessingRef = useRef(false);

  // Generate unique key for photo state
  const getPhotoKey = (checkpoint: CheckpointType, photoType: PhotoType) =>
    `${checkpoint}_${photoType}`;

  // Compress image before upload
  const compressImage = async (file: File, maxWidth = 1920, quality = 0.8): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let { width, height } = img;

          // Scale down if larger than maxWidth
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Failed to get canvas context"));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error("Failed to compress image"));
              }
            },
            "image/jpeg",
            quality
          );
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  // Get GPS coordinates
  const getGPSCoordinates = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          resolve(null);
        },
        { timeout: 5000, maximumAge: 60000 }
      );
    });
  };

  // Upload single photo
  const uploadPhoto = useCallback(
    async (
      file: File,
      checkpoint: CheckpointType,
      photoType: PhotoType,
      notes?: string
    ): Promise<UploadedPhoto | null> => {
      const key = getPhotoKey(checkpoint, photoType);

      // Update state to uploading
      setUploadState((prev) => ({
        ...prev,
        [key]: { status: "uploading", progress: 0 },
      }));

      try {
        // Compress image
        setUploadState((prev) => ({
          ...prev,
          [key]: { status: "uploading", progress: 10 },
        }));

        const compressedBlob = await compressImage(file);

        // Get GPS coordinates
        setUploadState((prev) => ({
          ...prev,
          [key]: { status: "uploading", progress: 30 },
        }));

        const gps = await getGPSCoordinates();

        // Prepare form data
        const formData = new FormData();
        formData.append("photo", compressedBlob, `${photoType}.jpg`);
        formData.append("checkpoint_type", checkpoint);
        formData.append("photo_type", photoType);
        if (notes) formData.append("notes", notes);
        if (gps) {
          formData.append("gps_latitude", String(gps.lat));
          formData.append("gps_longitude", String(gps.lng));
        }

        setUploadState((prev) => ({
          ...prev,
          [key]: { status: "uploading", progress: 50 },
        }));

        // Upload
        const response = await fetch(`/api/driver/bookings/${bookingId}/photos`, {
          method: "POST",
          body: formData,
        });

        setUploadState((prev) => ({
          ...prev,
          [key]: { status: "uploading", progress: 90 },
        }));

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Upload failed");
        }

        const photo: UploadedPhoto = data.photo;

        // Update state
        setUploadState((prev) => ({
          ...prev,
          [key]: { status: "success", progress: 100, photo },
        }));

        setPhotos((prev) => [...prev.filter((p) => p.id !== photo.id), photo]);
        setCheckpointStatus(data.checkpointStatus);

        return photo;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Upload failed";
        setUploadState((prev) => ({
          ...prev,
          [key]: { status: "error", progress: 0, error: errorMsg },
        }));

        // Queue for retry if offline
        if (!navigator.onLine) {
          queueRef.current.push({ file, checkpoint, photoType, notes });
          setUploadState((prev) => ({
            ...prev,
            [key]: { status: "queued", progress: 0 },
          }));
        }

        return null;
      }
    },
    [bookingId]
  );

  // Process queued uploads
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || !navigator.onLine) return;

    isProcessingRef.current = true;
    const queue = [...queueRef.current];
    queueRef.current = [];

    for (const item of queue) {
      await uploadPhoto(item.file, item.checkpoint, item.photoType, item.notes);
    }

    isProcessingRef.current = false;
  }, [uploadPhoto]);

  // Retry failed upload
  const retryUpload = useCallback(
    async (checkpoint: CheckpointType, photoType: PhotoType, file: File, notes?: string) => {
      return uploadPhoto(file, checkpoint, photoType, notes);
    },
    [uploadPhoto]
  );

  // Delete photo
  const deletePhoto = useCallback(
    async (photoId: string, checkpoint: CheckpointType, photoType: PhotoType) => {
      const key = getPhotoKey(checkpoint, photoType);

      try {
        const response = await fetch(
          `/api/driver/bookings/${bookingId}/photos?photoId=${photoId}`,
          { method: "DELETE" }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Delete failed");
        }

        setUploadState((prev) => ({
          ...prev,
          [key]: { status: "idle", progress: 0 },
        }));

        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
        setCheckpointStatus(data.checkpointStatus);

        return true;
      } catch (error) {
        console.error("Delete error:", error);
        return false;
      }
    },
    [bookingId]
  );

  // Fetch existing photos
  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/driver/bookings/${bookingId}/photos`);
      const data = await response.json();

      if (response.ok) {
        setPhotos(data.photos || []);
        setCheckpointStatus(
          data.booking?.checkpointStatus || {
            pre_pickup: 0,
            service_dropoff: 0,
            service_pickup: 0,
            final_delivery: 0,
          }
        );

        // Update upload state for existing photos
        const newState: PhotoUploadState = {};
        (data.photos || []).forEach((photo: UploadedPhoto) => {
          const key = getPhotoKey(photo.checkpointType, photo.photoType);
          newState[key] = { status: "success", progress: 100, photo };
        });
        setUploadState(newState);
      }
    } catch (error) {
      console.error("Fetch photos error:", error);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  // Get photo for specific slot
  const getPhoto = useCallback(
    (checkpoint: CheckpointType, photoType: PhotoType) => {
      return photos.find(
        (p) => p.checkpointType === checkpoint && p.photoType === photoType
      );
    },
    [photos]
  );

  // Get upload state for specific slot
  const getUploadState = useCallback(
    (checkpoint: CheckpointType, photoType: PhotoType) => {
      const key = getPhotoKey(checkpoint, photoType);
      return uploadState[key] || { status: "idle", progress: 0 };
    },
    [uploadState]
  );

  return {
    photos,
    checkpointStatus,
    loading,
    uploadPhoto,
    deletePhoto,
    fetchPhotos,
    getPhoto,
    getUploadState,
    retryUpload,
    processQueue,
  };
}
