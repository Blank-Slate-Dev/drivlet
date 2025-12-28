// src/components/tracking/GuestPhotosViewer.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronDown,
  ChevronUp,
  Check,
  Loader2,
  Camera,
  Clock,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
} from "lucide-react";

interface Photo {
  id: string;
  checkpointType: string;
  checkpointLabel: string;
  photoType: string;
  photoTypeLabel: string;
  url: string;
  uploadedAt: string;
  notes?: string;
}

interface Checkpoint {
  checkpoint: string;
  label: string;
  completedCount: number;
  requiredCount: number;
  photos: Photo[];
}

interface GuestPhotosViewerProps {
  email: string;
  registration: string;
  vehicleRegistration: string;
  vehicleState: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function GuestPhotosViewer({
  email,
  registration,
  vehicleRegistration,
  vehicleState,
  isOpen,
  onClose,
}: GuestPhotosViewerProps) {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCheckpoint, setExpandedCheckpoint] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  const fetchPhotos = useCallback(async () => {
    if (!email || !registration) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/bookings/track/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, registration }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch photos");
      }

      setCheckpoints(data.checkpoints || []);

      // Auto-expand first checkpoint with photos
      const firstWithPhotos = data.checkpoints?.find(
        (c: Checkpoint) => c.photos.length > 0
      );
      if (firstWithPhotos) {
        setExpandedCheckpoint(firstWithPhotos.checkpoint);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load photos");
    } finally {
      setLoading(false);
    }
  }, [email, registration]);

  useEffect(() => {
    if (isOpen) {
      fetchPhotos();
    }
  }, [isOpen, fetchPhotos]);

  // Poll for new photos every 30 seconds
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(fetchPhotos, 30000);
    return () => clearInterval(interval);
  }, [isOpen, fetchPhotos]);

  const getTotalPhotos = () => {
    return checkpoints.reduce((sum, cp) => sum + cp.photos.length, 0);
  };

  const getCompletedCheckpoints = () => {
    return checkpoints.filter((cp) => cp.completedCount >= 5).length;
  };

  const handlePrevPhoto = () => {
    if (!selectedPhoto) return;
    const currentCheckpoint = checkpoints.find(
      (cp) => cp.checkpoint === selectedPhoto.checkpointType
    );
    if (!currentCheckpoint) return;

    const currentIndex = currentCheckpoint.photos.findIndex(
      (p) => p.id === selectedPhoto.id
    );
    if (currentIndex > 0) {
      setSelectedPhoto(currentCheckpoint.photos[currentIndex - 1]);
      setPhotoIndex(currentIndex - 1);
    }
  };

  const handleNextPhoto = () => {
    if (!selectedPhoto) return;
    const currentCheckpoint = checkpoints.find(
      (cp) => cp.checkpoint === selectedPhoto.checkpointType
    );
    if (!currentCheckpoint) return;

    const currentIndex = currentCheckpoint.photos.findIndex(
      (p) => p.id === selectedPhoto.id
    );
    if (currentIndex < currentCheckpoint.photos.length - 1) {
      setSelectedPhoto(currentCheckpoint.photos[currentIndex + 1]);
      setPhotoIndex(currentIndex + 1);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md max-h-[85vh] overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-4 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold">Vehicle Photos</h2>
              <p className="text-sm text-emerald-100">
                {vehicleRegistration} ({vehicleState})
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-white/20 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Progress Summary */}
          {!loading && getTotalPhotos() > 0 && (
            <div className="mt-3 flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Camera className="h-4 w-4 text-emerald-200" />
                <span className="text-sm font-medium">{getTotalPhotos()} photos</span>
              </div>
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-2 w-2 rounded-full ${
                      i < getCompletedCheckpoints()
                        ? "bg-white"
                        : "bg-white/30"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-120px)]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <p className="mt-2 text-sm text-slate-500">Loading photos...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <Camera className="h-12 w-12 text-slate-300" />
              <p className="mt-4 text-sm text-slate-500 text-center">{error}</p>
              <button
                onClick={fetchPhotos}
                className="mt-4 text-sm font-medium text-emerald-600 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : getTotalPhotos() === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <Camera className="h-12 w-12 text-slate-300" />
              <p className="mt-4 text-sm font-medium text-slate-700">
                No photos yet
              </p>
              <p className="mt-1 text-sm text-slate-500 text-center">
                The driver will upload photos at each checkpoint
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {checkpoints
                .filter((cp) => cp.photos.length > 0)
                .map((checkpoint) => (
                  <CheckpointSection
                    key={checkpoint.checkpoint}
                    checkpoint={checkpoint}
                    isExpanded={expandedCheckpoint === checkpoint.checkpoint}
                    onToggle={() =>
                      setExpandedCheckpoint(
                        expandedCheckpoint === checkpoint.checkpoint
                          ? null
                          : checkpoint.checkpoint
                      )
                    }
                    onPhotoClick={(photo, index) => {
                      setSelectedPhoto(photo);
                      setPhotoIndex(index);
                    }}
                    email={email}
                    registration={registration}
                  />
                ))}

              {/* Pending checkpoints */}
              {checkpoints.filter((cp) => cp.photos.length === 0).length > 0 && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
                    Pending Checkpoints
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {checkpoints
                      .filter((cp) => cp.photos.length === 0)
                      .map((cp) => (
                        <span
                          key={cp.checkpoint}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-xs text-slate-500"
                        >
                          <Clock className="h-3 w-3" />
                          {cp.label}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Photo Lightbox */}
        <AnimatePresence>
          {selectedPhoto && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 bg-black flex flex-col rounded-2xl overflow-hidden"
              onClick={() => setSelectedPhoto(null)}
            >
              {/* Lightbox Header */}
              <div
                className="flex items-center justify-between p-4 text-white"
                onClick={(e) => e.stopPropagation()}
              >
                <div>
                  <p className="font-medium">{selectedPhoto.checkpointLabel}</p>
                  <p className="text-sm text-white/70">
                    {selectedPhoto.photoTypeLabel}
                  </p>
                </div>
                <button onClick={() => setSelectedPhoto(null)} className="p-2">
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Image */}
              <div className="flex-1 flex items-center justify-center p-4 relative">
                <img
                  src={`${selectedPhoto.url}?email=${encodeURIComponent(email)}&rego=${encodeURIComponent(registration)}`}
                  alt={selectedPhoto.photoTypeLabel}
                  className="max-w-full max-h-full object-contain rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                />

                {/* Navigation */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevPhoto();
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70"
                  disabled={photoIndex === 0}
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNextPhoto();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </div>

              {/* Footer */}
              <div
                className="p-4 text-white"
                onClick={(e) => e.stopPropagation()}
              >
                {selectedPhoto.notes && (
                  <p className="text-sm text-white/80 mb-2">
                    {selectedPhoto.notes}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <Clock className="h-3.5 w-3.5" />
                  {new Date(selectedPhoto.uploadedAt).toLocaleString("en-AU", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

function CheckpointSection({
  checkpoint,
  isExpanded,
  onToggle,
  onPhotoClick,
  email,
  registration,
}: {
  checkpoint: Checkpoint;
  isExpanded: boolean;
  onToggle: () => void;
  onPhotoClick: (photo: Photo, index: number) => void;
  email: string;
  registration: string;
}) {
  const isComplete = checkpoint.completedCount >= 5;

  return (
    <div
      className={`rounded-xl border transition-all ${
        isComplete
          ? "border-emerald-200 bg-emerald-50/50"
          : "border-slate-200 bg-white"
      }`}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3"
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full ${
              isComplete ? "bg-emerald-500 text-white" : "bg-blue-500 text-white"
            }`}
          >
            {isComplete ? (
              <Check className="h-4 w-4" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
          </div>
          <div className="text-left">
            <p className="font-semibold text-slate-900 text-sm">{checkpoint.label}</p>
            <p className="text-xs text-slate-500">
              {checkpoint.photos.length} photo{checkpoint.photos.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>

      {/* Photos Grid */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-3 gap-1.5 px-3 pb-3">
              {checkpoint.photos.map((photo, index) => (
                <button
                  key={photo.id}
                  onClick={() => onPhotoClick(photo, index)}
                  className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 group"
                >
                  <img
                    src={`${photo.url}?email=${encodeURIComponent(email)}&rego=${encodeURIComponent(registration)}`}
                    alt={photo.photoTypeLabel}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <ZoomIn className="h-5 w-5 text-white" />
                  </div>
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-0.5">
                    <p className="text-[9px] font-medium text-white truncate">
                      {photo.photoTypeLabel}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
