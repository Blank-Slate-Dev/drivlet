// src/components/customer/VehiclePhotosViewer.tsx
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
  Download,
  Image as ImageIcon,
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

interface VehiclePhotosViewerProps {
  bookingId: string;
  vehicleRegistration: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function VehiclePhotosViewer({
  bookingId,
  vehicleRegistration,
  isOpen,
  onClose,
}: VehiclePhotosViewerProps) {
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCheckpoint, setExpandedCheckpoint] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  const fetchPhotos = useCallback(async () => {
    if (!bookingId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/customer/bookings/${bookingId}/photos`);
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
  }, [bookingId]);

  useEffect(() => {
    if (isOpen) {
      fetchPhotos();
    }
  }, [isOpen, fetchPhotos]);

  // Poll for new photos every 30 seconds when viewing
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(fetchPhotos, 30000);
    return () => clearInterval(interval);
  }, [isOpen, fetchPhotos]);

  const getTotalPhotos = () => {
    return checkpoints.reduce((sum, cp) => sum + cp.photos.length, 0);
  };

  const getOverallProgress = () => {
    const total = checkpoints.reduce((sum, cp) => sum + cp.completedCount, 0);
    return Math.round((total / 20) * 100);
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="w-full max-w-lg max-h-[90vh] overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Vehicle Photos</h2>
              <p className="text-sm text-slate-500">{vehicleRegistration}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 -m-2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Progress */}
          {!loading && checkpoints.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="font-medium text-slate-700">
                  {getTotalPhotos()} photos taken
                </span>
                <span className="font-bold text-emerald-600">
                  {getOverallProgress()}% complete
                </span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${getOverallProgress()}%` }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                />
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-150px)]">
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
              <p className="mt-4 text-sm font-medium text-slate-700">No photos yet</p>
              <p className="mt-1 text-sm text-slate-500 text-center">
                The driver will upload photos at each checkpoint
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {checkpoints.map((checkpoint) => (
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
                />
              ))}
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
              className="absolute inset-0 z-30 bg-black flex flex-col"
              onClick={() => setSelectedPhoto(null)}
            >
              {/* Lightbox Header */}
              <div
                className="flex items-center justify-between p-4 text-white"
                onClick={(e) => e.stopPropagation()}
              >
                <div>
                  <p className="font-medium">{selectedPhoto.checkpointLabel}</p>
                  <p className="text-sm text-white/70">{selectedPhoto.photoTypeLabel}</p>
                </div>
                <button onClick={() => setSelectedPhoto(null)} className="p-2">
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Image */}
              <div className="flex-1 flex items-center justify-center p-4 relative">
                <img
                  src={selectedPhoto.url}
                  alt={selectedPhoto.photoTypeLabel}
                  className="max-w-full max-h-full object-contain rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                />

                {/* Navigation arrows */}
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

              {/* Lightbox Footer */}
              <div
                className="p-4 text-white"
                onClick={(e) => e.stopPropagation()}
              >
                {selectedPhoto.notes && (
                  <p className="text-sm text-white/80 mb-2">{selectedPhoto.notes}</p>
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
    </div>
  );
}

function CheckpointSection({
  checkpoint,
  isExpanded,
  onToggle,
  onPhotoClick,
}: {
  checkpoint: Checkpoint;
  isExpanded: boolean;
  onToggle: () => void;
  onPhotoClick: (photo: Photo, index: number) => void;
}) {
  const isComplete = checkpoint.completedCount >= 5;
  const hasPhotos = checkpoint.photos.length > 0;

  return (
    <div
      className={`rounded-2xl border transition-all ${
        isComplete
          ? "border-emerald-200 bg-emerald-50/50"
          : hasPhotos
          ? "border-blue-200 bg-blue-50/30"
          : "border-slate-200 bg-slate-50/50"
      }`}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4"
        disabled={!hasPhotos}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full ${
              isComplete
                ? "bg-emerald-500 text-white"
                : hasPhotos
                ? "bg-blue-500 text-white"
                : "bg-slate-200 text-slate-400"
            }`}
          >
            {isComplete ? (
              <Check className="h-5 w-5" />
            ) : (
              <Camera className="h-5 w-5" />
            )}
          </div>
          <div className="text-left">
            <p className="font-semibold text-slate-900">{checkpoint.label}</p>
            <p className="text-xs text-slate-500">
              {hasPhotos
                ? `${checkpoint.photos.length} photo${checkpoint.photos.length !== 1 ? "s" : ""}`
                : "Pending"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasPhotos ? (
            <>
              <span
                className={`text-sm font-medium ${
                  isComplete ? "text-emerald-600" : "text-blue-600"
                }`}
              >
                {checkpoint.completedCount}/{checkpoint.requiredCount}
              </span>
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-slate-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-slate-400" />
              )}
            </>
          ) : (
            <Clock className="h-5 w-5 text-slate-300" />
          )}
        </div>
      </button>

      {/* Photos Grid */}
      <AnimatePresence>
        {isExpanded && hasPhotos && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-3 gap-2 px-4 pb-4">
              {checkpoint.photos.map((photo, index) => (
                <button
                  key={photo.id}
                  onClick={() => onPhotoClick(photo, index)}
                  className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 group"
                >
                  <img
                    src={photo.url}
                    alt={photo.photoTypeLabel}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <ZoomIn className="h-6 w-6 text-white" />
                  </div>
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1">
                    <p className="text-[10px] font-medium text-white truncate">
                      {photo.photoTypeLabel}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Timestamp */}
            {checkpoint.photos.length > 0 && (
              <div className="px-4 pb-3 flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  Last updated:{" "}
                  {new Date(
                    checkpoint.photos[checkpoint.photos.length - 1].uploadedAt
                  ).toLocaleString("en-AU", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
