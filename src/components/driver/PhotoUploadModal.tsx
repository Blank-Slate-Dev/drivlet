// src/components/driver/PhotoUploadModal.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Camera,
  Check,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Trash2,
  Image as ImageIcon,
  MapPin,
  RefreshCw,
  WifiOff,
} from "lucide-react";
import { usePhotoUpload } from "@/hooks/usePhotoUpload";
import { CheckpointType, PhotoType } from "@/models/VehiclePhoto";

interface PhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  customerName: string;
  vehicleRegistration: string;
  vehicleState: string;
  currentStage?: string;
}

const CHECKPOINTS: { type: CheckpointType; label: string; description: string }[] = [
  {
    type: "pre_pickup",
    label: "Pre-Pickup",
    description: "Photos at customer location before pickup",
  },
  {
    type: "service_dropoff",
    label: "Service Drop-off",
    description: "Photos when dropping at garage",
  },
  {
    type: "service_pickup",
    label: "Service Pickup",
    description: "Photos when picking up from garage",
  },
  {
    type: "final_delivery",
    label: "Final Delivery",
    description: "Photos when returning to customer",
  },
];

const PHOTO_TYPES: { type: PhotoType; label: string; icon: string }[] = [
  { type: "front", label: "Front", icon: "🚗" },
  { type: "back", label: "Back", icon: "🚙" },
  { type: "left_side", label: "Left Side", icon: "◀️" },
  { type: "right_side", label: "Right Side", icon: "▶️" },
  { type: "odometer", label: "Odometer", icon: "🔢" },
];

export default function PhotoUploadModal({
  isOpen,
  onClose,
  bookingId,
  customerName,
  vehicleRegistration,
  vehicleState,
  currentStage,
}: PhotoUploadModalProps) {
  const [expandedCheckpoint, setExpandedCheckpoint] = useState<CheckpointType | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedSlot, setSelectedSlot] = useState<{
    checkpoint: CheckpointType;
    photoType: PhotoType;
  } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const {
    photos,
    checkpointStatus,
    loading,
    uploadPhoto,
    deletePhoto,
    fetchPhotos,
    getPhoto,
    getUploadState,
    processQueue,
  } = usePhotoUpload(bookingId);

  // Fetch photos on mount
  useEffect(() => {
    if (isOpen) {
      fetchPhotos();
      // Auto-expand current checkpoint based on stage
      const checkpointFromStage = getCheckpointFromStage(currentStage);
      if (checkpointFromStage) {
        setExpandedCheckpoint(checkpointFromStage);
      } else {
        setExpandedCheckpoint("pre_pickup");
      }
    }
  }, [isOpen, fetchPhotos, currentStage]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [processQueue]);

  const getCheckpointFromStage = (stage?: string): CheckpointType | null => {
    if (!stage) return null;
    if (["driver_en_route", "car_picked_up"].includes(stage)) return "pre_pickup";
    if (["at_garage", "service_in_progress"].includes(stage)) return "service_dropoff";
    if (["awaiting_payment", "ready_for_return"].includes(stage)) return "service_pickup";
    if (["driver_returning", "delivered"].includes(stage)) return "final_delivery";
    return null;
  };

  const handleCaptureClick = (checkpoint: CheckpointType, photoType: PhotoType) => {
    setSelectedSlot({ checkpoint, photoType });
    setPreviewUrl(null);
    setNotes("");
    setSelectedFile(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedSlot) return;

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result as string);
      setSelectedFile(file);
    };
    reader.readAsDataURL(file);

    // Clear input for next selection
    e.target.value = "";
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedSlot) return;

    await uploadPhoto(selectedFile, selectedSlot.checkpoint, selectedSlot.photoType, notes);
    setSelectedSlot(null);
    setPreviewUrl(null);
    setNotes("");
    setSelectedFile(null);
  };

  const handleDelete = async (photoId: string, checkpoint: CheckpointType, photoType: PhotoType) => {
    if (confirm("Delete this photo?")) {
      await deletePhoto(photoId, checkpoint, photoType);
    }
  };

  const handleCancelPreview = () => {
    setSelectedSlot(null);
    setPreviewUrl(null);
    setNotes("");
    setSelectedFile(null);
  };

  const getTotalProgress = () => {
    const total =
      checkpointStatus.pre_pickup +
      checkpointStatus.service_dropoff +
      checkpointStatus.service_pickup +
      checkpointStatus.final_delivery;
    return Math.round((total / 20) * 100);
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
              <p className="text-sm text-slate-500">
                {customerName} • {vehicleRegistration} ({vehicleState})
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 -m-2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Overall Progress */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="font-medium text-slate-700">Overall Progress</span>
              <span className="font-bold text-emerald-600">{getTotalProgress()}%</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${getTotalProgress()}%` }}
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
              />
            </div>
          </div>

          {/* Offline Warning */}
          {!isOnline && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700">
              <WifiOff className="h-4 w-4" />
              <span>Offline - Photos will upload when connected</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <p className="mt-2 text-sm text-slate-500">Loading photos...</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {CHECKPOINTS.map((checkpoint) => (
                <CheckpointSection
                  key={checkpoint.type}
                  checkpoint={checkpoint}
                  isExpanded={expandedCheckpoint === checkpoint.type}
                  onToggle={() =>
                    setExpandedCheckpoint(
                      expandedCheckpoint === checkpoint.type ? null : checkpoint.type
                    )
                  }
                  count={checkpointStatus[checkpoint.type]}
                  onCapture={handleCaptureClick}
                  onDelete={handleDelete}
                  getPhoto={getPhoto}
                  getUploadState={getUploadState}
                />
              ))}
            </div>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Preview Modal */}
        <AnimatePresence>
          {previewUrl && selectedSlot && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 bg-black/90 flex flex-col"
            >
              <div className="flex items-center justify-between p-4 text-white">
                <div>
                  <p className="font-medium">
                    {CHECKPOINTS.find((c) => c.type === selectedSlot.checkpoint)?.label}
                  </p>
                  <p className="text-sm text-white/70">
                    {PHOTO_TYPES.find((p) => p.type === selectedSlot.photoType)?.label}
                  </p>
                </div>
                <button onClick={handleCancelPreview} className="p-2">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="flex-1 flex items-center justify-center p-4">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              </div>

              <div className="p-4 space-y-3">
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes (optional)"
                  className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleCancelPreview}
                    className="flex-1 rounded-xl border border-white/30 py-3 font-semibold text-white hover:bg-white/10"
                  >
                    Retake
                  </button>
                  <button
                    onClick={handleUpload}
                    className="flex-1 rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-500 flex items-center justify-center gap-2"
                  >
                    <Check className="h-5 w-5" />
                    Upload
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

interface CheckpointSectionProps {
  checkpoint: { type: CheckpointType; label: string; description: string };
  isExpanded: boolean;
  onToggle: () => void;
  count: number;
  onCapture: (checkpoint: CheckpointType, photoType: PhotoType) => void;
  onDelete: (photoId: string, checkpoint: CheckpointType, photoType: PhotoType) => void;
  getPhoto: (checkpoint: CheckpointType, photoType: PhotoType) => {
    id: string;
    url: string;
    notes?: string;
  } | undefined;
  getUploadState: (
    checkpoint: CheckpointType,
    photoType: PhotoType
  ) => { status: string; progress: number; error?: string };
}

function CheckpointSection({
  checkpoint,
  isExpanded,
  onToggle,
  count,
  onCapture,
  onDelete,
  getPhoto,
  getUploadState,
}: CheckpointSectionProps) {
  const isComplete = count >= 5;

  return (
    <div
      className={`rounded-2xl border transition-all ${
        isComplete
          ? "border-emerald-200 bg-emerald-50/50"
          : "border-slate-200 bg-white"
      }`}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4"
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full ${
              isComplete
                ? "bg-emerald-500 text-white"
                : count > 0
                ? "bg-emerald-100 text-emerald-600"
                : "bg-slate-100 text-slate-400"
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
            <p className="text-xs text-slate-500">{checkpoint.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-medium ${
              isComplete ? "text-emerald-600" : "text-slate-500"
            }`}
          >
            {count}/5
          </span>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-slate-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-slate-400" />
          )}
        </div>
      </button>

      {/* Photo Grid */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-3 gap-2 px-4 pb-4">
              {PHOTO_TYPES.map((photoType) => (
                <PhotoSlot
                  key={photoType.type}
                  checkpoint={checkpoint.type}
                  photoType={photoType}
                  photo={getPhoto(checkpoint.type, photoType.type)}
                  uploadState={getUploadState(checkpoint.type, photoType.type)}
                  onCapture={() => onCapture(checkpoint.type, photoType.type)}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface PhotoSlotProps {
  checkpoint: CheckpointType;
  photoType: { type: PhotoType; label: string; icon: string };
  photo?: { id: string; url: string; notes?: string };
  uploadState: { status: string; progress: number; error?: string };
  onCapture: () => void;
  onDelete: (photoId: string, checkpoint: CheckpointType, photoType: PhotoType) => void;
}

function PhotoSlot({
  checkpoint,
  photoType,
  photo,
  uploadState,
  onCapture,
  onDelete,
}: PhotoSlotProps) {
  const [showFullscreen, setShowFullscreen] = useState(false);

  if (photo) {
    return (
      <>
        <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
          <img
            src={photo.url}
            alt={photoType.label}
            className="w-full h-full object-cover cursor-pointer"
            onClick={() => setShowFullscreen(true)}
          />
          <button
            onClick={() => onDelete(photo.id, checkpoint, photoType.type)}
            className="absolute top-1 right-1 p-1.5 rounded-full bg-red-500/90 text-white hover:bg-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1">
            <p className="text-[10px] font-medium text-white">{photoType.label}</p>
          </div>
          <div className="absolute top-1 left-1 p-1 rounded-full bg-emerald-500">
            <Check className="h-3 w-3 text-white" />
          </div>
        </div>

        {/* Fullscreen Modal */}
        {showFullscreen && (
          <div
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
            onClick={() => setShowFullscreen(false)}
          >
            <button
              className="absolute top-4 right-4 p-2 text-white"
              onClick={() => setShowFullscreen(false)}
            >
              <X className="h-8 w-8" />
            </button>
            <img
              src={photo.url}
              alt={photoType.label}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        )}
      </>
    );
  }

  if (uploadState.status === "uploading") {
    return (
      <div className="relative aspect-square rounded-xl bg-slate-100 flex flex-col items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        <p className="text-[10px] text-slate-500 mt-1">{uploadState.progress}%</p>
        <p className="text-[10px] font-medium text-slate-600 mt-1">{photoType.label}</p>
      </div>
    );
  }

  if (uploadState.status === "error") {
    return (
      <button
        onClick={onCapture}
        className="relative aspect-square rounded-xl bg-red-50 border-2 border-dashed border-red-200 flex flex-col items-center justify-center hover:bg-red-100 transition"
      >
        <AlertCircle className="h-5 w-5 text-red-400" />
        <p className="text-[10px] font-medium text-red-600 mt-1">Retry</p>
        <p className="text-[10px] text-red-500">{photoType.label}</p>
      </button>
    );
  }

  if (uploadState.status === "queued") {
    return (
      <div className="relative aspect-square rounded-xl bg-amber-50 border-2 border-dashed border-amber-200 flex flex-col items-center justify-center">
        <WifiOff className="h-5 w-5 text-amber-400" />
        <p className="text-[10px] font-medium text-amber-600 mt-1">Queued</p>
        <p className="text-[10px] text-amber-500">{photoType.label}</p>
      </div>
    );
  }

  return (
    <button
      onClick={onCapture}
      className="relative aspect-square rounded-xl bg-slate-100 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center hover:bg-slate-50 hover:border-emerald-300 transition active:scale-95"
    >
      <Camera className="h-6 w-6 text-slate-400" />
      <p className="text-[10px] font-medium text-slate-600 mt-1">{photoType.label}</p>
    </button>
  );
}
