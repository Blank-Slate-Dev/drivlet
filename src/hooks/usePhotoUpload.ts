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
  capturedAt?: string;
  capturedLocation?: string;
}

interface PhotoMetadata {
  capturedAt?: string;
  capturedLocation?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  replacePhotoId?: string;
}

interface QueueItem {
  file: File;
  checkpoint: CheckpointType;
  photoType: PhotoType;
  notes?: string;
  metadata?: PhotoMetadata;
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
  const queueRef = useRef<QueueItem[]>([]);
  const isProcessingRef = useRef(false);

  const getPhotoKey = (checkpoint: CheckpointType, photoType: PhotoType) =>
    `${checkpoint}_${photoType}`;

  const compressImage = async (file: File, maxWidth = 1920, quality = 0.8): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let { width, height } = img;

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

  const uploadPhoto = useCallback(
    async (
      file: File,
      checkpoint: CheckpointType,
      photoType: PhotoType,
      notes?: string,
      metadata?: PhotoMetadata
    ): Promise<UploadedPhoto | null> => {
      const key = getPhotoKey(checkpoint, photoType);

      setUploadState((prev) => ({
        ...prev,
        [key]: { status: "uploading", progress: 0 },
      }));

      try {
        setUploadState((prev) => ({
          ...prev,
          [key]: { status: "uploading", progress: 10 },
        }));

        const compressedBlob = await compressImage(file);

        setUploadState((prev) => ({
          ...prev,
          [key]: { status: "uploading", progress: 30 },
        }));

        // Use provided GPS or auto-fetch as fallback
        let gpsLat = metadata?.gpsLatitude;
        let gpsLng = metadata?.gpsLongitude;
        if (gpsLat == null || gpsLng == null) {
          const gps = await getGPSCoordinates();
          if (gps) {
            gpsLat = gps.lat;
            gpsLng = gps.lng;
          }
        }

        const formData = new FormData();
        formData.append("photo", compressedBlob, `${photoType}.jpg`);
        formData.append("checkpoint_type", checkpoint);
        formData.append("photo_type", photoType);
        if (notes) formData.append("notes", notes);
        if (gpsLat != null) formData.append("gps_latitude", String(gpsLat));
        if (gpsLng != null) formData.append("gps_longitude", String(gpsLng));
        if (metadata?.capturedAt) formData.append("captured_at", metadata.capturedAt);
        if (metadata?.capturedLocation) formData.append("captured_location", metadata.capturedLocation);
        if (metadata?.replacePhotoId) formData.append("replace_photo_id", metadata.replacePhotoId);

        setUploadState((prev) => ({
          ...prev,
          [key]: { status: "uploading", progress: 50 },
        }));

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

        setUploadState((prev) => ({
          ...prev,
          [key]: { status: "success", progress: 100, photo },
        }));

        setPhotos((prev) => {
          let updated = prev.filter((p) => p.id !== photo.id);
          // On replace, also remove the superseded photo from local state
          if (metadata?.replacePhotoId) {
            updated = updated.filter((p) => p.id !== metadata.replacePhotoId);
          }
          return [...updated, photo];
        });
        setCheckpointStatus(data.checkpointStatus);

        return photo;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Upload failed";
        setUploadState((prev) => ({
          ...prev,
          [key]: { status: "error", progress: 0, error: errorMsg },
        }));

        if (!navigator.onLine) {
          queueRef.current.push({ file, checkpoint, photoType, notes, metadata });
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

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || !navigator.onLine) return;

    isProcessingRef.current = true;
    const queue = [...queueRef.current];
    queueRef.current = [];

    for (const item of queue) {
      await uploadPhoto(item.file, item.checkpoint, item.photoType, item.notes, item.metadata);
    }

    isProcessingRef.current = false;
  }, [uploadPhoto]);

  const retryUpload = useCallback(
    async (checkpoint: CheckpointType, photoType: PhotoType, file: File, notes?: string, metadata?: PhotoMetadata) => {
      return uploadPhoto(file, checkpoint, photoType, notes, metadata);
    },
    [uploadPhoto]
  );

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

  const updatePhotoDetails = useCallback(
    async (
      photoId: string,
      updates: { notes?: string; capturedAt?: string; capturedLocation?: string }
    ): Promise<boolean> => {
      try {
        const response = await fetch(`/api/driver/bookings/${bookingId}/photos`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoId, ...updates }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Update failed");
        }

        const data = await response.json();

        setPhotos((prev) =>
          prev.map((p) =>
            p.id === photoId
              ? {
                  ...p,
                  notes: data.photo.notes,
                  capturedAt: data.photo.capturedAt,
                  capturedLocation: data.photo.capturedLocation,
                }
              : p
          )
        );

        return true;
      } catch (error) {
        console.error("Update details error:", error);
        return false;
      }
    },
    [bookingId]
  );

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

  const getPhoto = useCallback(
    (checkpoint: CheckpointType, photoType: PhotoType) => {
      return photos.find(
        (p) => p.checkpointType === checkpoint && p.photoType === photoType
      );
    },
    [photos]
  );

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
    updatePhotoDetails,
    fetchPhotos,
    getPhoto,
    getUploadState,
    retryUpload,
    processQueue,
  };
}
