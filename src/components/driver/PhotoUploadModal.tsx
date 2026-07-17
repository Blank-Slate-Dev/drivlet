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
  // Image as ImageIcon, // commented out — unused after fullscreen refactor
  MapPin,
  RefreshCw,
  WifiOff,
  Lock,
  Pencil,
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

interface PhotoData {
  id: string;
  checkpointType: CheckpointType;
  photoType: PhotoType;
  url: string;
  uploadedAt?: string;
  notes?: string;
  capturedAt?: string;
  capturedLocation?: string;
}

interface ViewingPhoto {
  id: string;
  url: string;
  notes?: string;
  capturedAt?: string;
  capturedLocation?: string;
  checkpoint: CheckpointType;
  photoType: PhotoType;
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

const REQUIRED_PHOTO_TYPES: PhotoType[] = ["front", "back", "left_side", "right_side"];

function isCheckpointComplete(
  checkpoint: CheckpointType,
  photos: Array<{ checkpointType: CheckpointType; photoType: PhotoType }>
): boolean {
  return REQUIRED_PHOTO_TYPES.every((pt) =>
    photos.some((p) => p.checkpointType === checkpoint && p.photoType === pt)
  );
}

function isCheckpointUnlocked(
  checkpoint: CheckpointType,
  photos: Array<{ checkpointType: CheckpointType; photoType: PhotoType }>
): boolean {
  const idx = CHECKPOINTS.findIndex((c) => c.type === checkpoint);
  if (idx === 0) return true;
  return CHECKPOINTS.slice(0, idx).every((c) => isCheckpointComplete(c.type, photos));
}

function getLockMessage(checkpoint: CheckpointType): string {
  const idx = CHECKPOINTS.findIndex((c) => c.type === checkpoint);
  if (idx <= 0) return "";
  const prev = CHECKPOINTS[idx - 1];
  return `Complete ${prev.label} photos to unlock`;
}

function formatCapturedDate(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

function formatCapturedTime(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
}

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
  const [consentAcknowledged, setConsentAcknowledged] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedSlot, setSelectedSlot] = useState<{
    checkpoint: CheckpointType;
    photoType: PhotoType;
  } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Capture details state
  const [captureDate, setCaptureDate] = useState("");
  const [captureTime, setCaptureTime] = useState("");
  const [captureLocation, setCaptureLocation] = useState("");
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [replacePhotoId, setReplacePhotoId] = useState<string | null>(null);

  // View/Edit photo state
  const [viewingPhoto, setViewingPhoto] = useState<ViewingPhoto | null>(null);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  const {
    photos,
    checkpointStatus,
    loading,
    uploadPhoto,
    deletePhoto,
    updatePhotoDetails,
    fetchPhotos,
    getPhoto,
    getUploadState,
    processQueue,
  } = usePhotoUpload(bookingId);

  // Fetch photos on mount
  useEffect(() => {
    if (isOpen) {
      fetchPhotos();
    }
  }, [isOpen, fetchPhotos]);

  // Restore consent acknowledgment for this booking (persisted per session)
  useEffect(() => {
    if (isOpen) {
      setConsentAcknowledged(
        sessionStorage.getItem(`photo-consent-${bookingId}`) === "true"
      );
    }
  }, [isOpen, bookingId]);

  const handleConsentChange = (checked: boolean) => {
    setConsentAcknowledged(checked);
    if (checked) {
      sessionStorage.setItem(`photo-consent-${bookingId}`, "true");
    } else {
      sessionStorage.removeItem(`photo-consent-${bookingId}`);
    }
  };

  // Auto-expand after fetch completes (loading transitions true→false)
  const prevLoadingRef = useRef(false);
  useEffect(() => {
    const wasLoading = prevLoadingRef.current;
    prevLoadingRef.current = loading;

    if (!isOpen) return;
    if (!(wasLoading && !loading)) return;

    const stageCheckpoint = getCheckpointFromStage(currentStage);
    if (stageCheckpoint && isCheckpointUnlocked(stageCheckpoint, photos)) {
      setExpandedCheckpoint(stageCheckpoint);
      return;
    }
    const firstIncomplete = CHECKPOINTS.find(
      (c) => isCheckpointUnlocked(c.type, photos) && !isCheckpointComplete(c.type, photos)
    );
    setExpandedCheckpoint(firstIncomplete?.type ?? "pre_pickup");
  }, [isOpen, loading, photos, currentStage]);

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

  // Auto-request geolocation when preview opens
  useEffect(() => {
    if (!previewUrl || !selectedSlot) return;
    setIsGettingLocation(true);
    if (!navigator.geolocation) {
      setIsGettingLocation(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGpsCoords(coords);
        if (!captureLocation) {
          setCaptureLocation(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
        }
        setIsGettingLocation(false);
      },
      () => {
        setIsGettingLocation(false);
      },
      { timeout: 5000, maximumAge: 60000 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only trigger on preview open
  }, [previewUrl]);

  const getCheckpointFromStage = (stage?: string): CheckpointType | null => {
    if (!stage) return null;
    if (["driver_en_route", "car_picked_up"].includes(stage)) return "pre_pickup";
    if (["at_garage", "service_in_progress"].includes(stage)) return "service_dropoff";
    if (["awaiting_payment", "ready_for_return"].includes(stage)) return "service_pickup";
    if (["driver_returning", "delivered"].includes(stage)) return "final_delivery";
    return null;
  };

  const handleCaptureClick = (checkpoint: CheckpointType, photoType: PhotoType) => {
    if (!isCheckpointUnlocked(checkpoint, photos)) return;
    if (checkpoint === "pre_pickup" && !consentAcknowledged) return;
    setSelectedSlot({ checkpoint, photoType });
    setPreviewUrl(null);
    setNotes("");
    setSelectedFile(null);
    setReplacePhotoId(null);
    const now = new Date();
    setCaptureDate(now.toISOString().slice(0, 10));
    setCaptureTime(now.toTimeString().slice(0, 5));
    setCaptureLocation("");
    setGpsCoords(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedSlot) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result as string);
      setSelectedFile(file);
    };
    reader.readAsDataURL(file);

    e.target.value = "";
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedSlot) return;
    if (!captureLocation.trim()) return;

    const capturedAt = new Date(`${captureDate}T${captureTime}`).toISOString();

    await uploadPhoto(selectedFile, selectedSlot.checkpoint, selectedSlot.photoType, notes, {
      capturedAt,
      capturedLocation: captureLocation.trim(),
      gpsLatitude: gpsCoords?.lat,
      gpsLongitude: gpsCoords?.lng,
      replacePhotoId: replacePhotoId || undefined,
    });

    handleCancelPreview();
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
    setCaptureDate("");
    setCaptureTime("");
    setCaptureLocation("");
    setGpsCoords(null);
    setIsGettingLocation(false);
    setReplacePhotoId(null);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGpsCoords(coords);
        setCaptureLocation(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
        setIsGettingLocation(false);
      },
      () => {
        setIsGettingLocation(false);
      },
      { timeout: 5000, maximumAge: 60000 }
    );
  };

  // --- View / Edit / Replace handlers ---
  const handleViewPhoto = (photo: PhotoData) => {
    setViewingPhoto({
      id: photo.id,
      url: photo.url,
      notes: photo.notes,
      capturedAt: photo.capturedAt,
      capturedLocation: photo.capturedLocation,
      checkpoint: photo.checkpointType,
      photoType: photo.photoType,
    });
    setIsEditingDetails(false);
  };

  const handleStartEdit = () => {
    if (!viewingPhoto) return;
    setIsEditingDetails(true);
    setEditNotes(viewingPhoto.notes || "");
    if (viewingPhoto.capturedAt) {
      const d = new Date(viewingPhoto.capturedAt);
      setEditDate(d.toISOString().slice(0, 10));
      setEditTime(d.toTimeString().slice(0, 5));
    } else {
      setEditDate("");
      setEditTime("");
    }
    setEditLocation(viewingPhoto.capturedLocation || "");
  };

  const handleSaveDetails = async () => {
    if (!viewingPhoto) return;
    setIsSavingDetails(true);

    const capturedAt = editDate && editTime
      ? new Date(`${editDate}T${editTime}`).toISOString()
      : undefined;

    const ok = await updatePhotoDetails(viewingPhoto.id, {
      notes: editNotes,
      capturedAt,
      capturedLocation: editLocation,
    });

    setIsSavingDetails(false);
    if (ok) {
      setViewingPhoto({
        ...viewingPhoto,
        notes: editNotes,
        capturedAt,
        capturedLocation: editLocation,
      });
      setIsEditingDetails(false);
    }
  };

  const handleReplacePhoto = () => {
    if (!viewingPhoto) return;
    const rpId = viewingPhoto.id;
    const cpType = viewingPhoto.checkpoint;
    const ptType = viewingPhoto.photoType;
    setViewingPhoto(null);
    setReplacePhotoId(rpId);
    setSelectedSlot({ checkpoint: cpType, photoType: ptType });
    setNotes("");
    setPreviewUrl(null);
    setSelectedFile(null);
    const now = new Date();
    setCaptureDate(now.toISOString().slice(0, 10));
    setCaptureTime(now.toTimeString().slice(0, 5));
    setCaptureLocation("");
    setGpsCoords(null);
    setTimeout(() => fileInputRef.current?.click(), 50);
  };

  const handleDeleteFromViewer = async () => {
    if (!viewingPhoto) return;
    if (confirm("Delete this photo?")) {
      await deletePhoto(viewingPhoto.id, viewingPhoto.checkpoint, viewingPhoto.photoType);
      setViewingPhoto(null);
    }
  };

  const handleToggleCheckpoint = (checkpoint: CheckpointType) => {
    if (!isCheckpointUnlocked(checkpoint, photos)) return;
    setExpandedCheckpoint(expandedCheckpoint === checkpoint ? null : checkpoint);
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
    // z-[60] renders above the driver bottom tab bar (z-50); dvh (not vh)
    // excludes iOS Safari's browser chrome so the footer stays tappable.
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50">
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="w-full max-w-lg max-h-[92dvh] overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl flex flex-col"
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
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <p className="mt-2 text-sm text-slate-500">Loading photos...</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {CHECKPOINTS.map((checkpoint) => {
                const locked = !isCheckpointUnlocked(checkpoint.type, photos);
                const complete = isCheckpointComplete(checkpoint.type, photos);
                return (
                  <CheckpointSection
                    key={checkpoint.type}
                    checkpoint={checkpoint}
                    isExpanded={expandedCheckpoint === checkpoint.type}
                    onToggle={() => handleToggleCheckpoint(checkpoint.type)}
                    count={checkpointStatus[checkpoint.type]}
                    isComplete={complete}
                    isLocked={locked}
                    lockMessage={getLockMessage(checkpoint.type)}
                    onCapture={handleCaptureClick}
                    onDelete={handleDelete}
                    onViewPhoto={handleViewPhoto}
                    getPhoto={getPhoto}
                    getUploadState={getUploadState}
                    consentAcknowledged={
                      checkpoint.type === "pre_pickup" ? consentAcknowledged : undefined
                    }
                    onConsentChange={
                      checkpoint.type === "pre_pickup" ? handleConsentChange : undefined
                    }
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Save & Close Footer — safe-area padding keeps the button clear of
            the iOS home indicator when the sheet is flush with the bottom. */}
        <div className="sticky bottom-0 z-10 bg-white border-t border-slate-200 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button
            onClick={onClose}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-500 active:scale-[0.98]"
          >
            <Check className="h-5 w-5" />
            Save & Close
          </button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Preview Modal (new capture or replace) */}
        <AnimatePresence>
          {previewUrl && selectedSlot && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-black/95 flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex-shrink-0 flex items-center justify-between p-4 text-white">
                <div>
                  <p className="font-medium">
                    {CHECKPOINTS.find((c) => c.type === selectedSlot.checkpoint)?.label}
                  </p>
                  <p className="text-sm text-white/70">
                    {PHOTO_TYPES.find((p) => p.type === selectedSlot.photoType)?.label}
                    {replacePhotoId && " (Replacing)"}
                  </p>
                </div>
                <button onClick={handleCancelPreview} className="p-2">
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Image preview */}
              <div className="flex-1 min-h-0 flex items-center justify-center p-4">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              </div>

              {/* Footer: capture details + actions */}
              <div className="flex-shrink-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] space-y-3 overflow-y-auto max-h-[45dvh]">
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes (optional)"
                  className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />

                {/* Capture Details */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-white/60 uppercase tracking-wide">Capture Details</p>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={captureDate}
                      onChange={(e) => setCaptureDate(e.target.value)}
                      className="flex-1 rounded-xl bg-white/10 border border-white/20 px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 [color-scheme:dark]"
                    />
                    <input
                      type="time"
                      value={captureTime}
                      onChange={(e) => setCaptureTime(e.target.value)}
                      className="flex-1 rounded-xl bg-white/10 border border-white/20 px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 [color-scheme:dark]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={captureLocation}
                      onChange={(e) => setCaptureLocation(e.target.value)}
                      placeholder="Location *"
                      className="flex-1 rounded-xl bg-white/10 border border-white/20 px-3 py-2.5 text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      onClick={handleUseCurrentLocation}
                      disabled={isGettingLocation}
                      className="flex-shrink-0 rounded-xl bg-emerald-600/80 px-3 py-2.5 text-white hover:bg-emerald-600 disabled:opacity-50 transition flex items-center gap-1.5"
                      title="Use current location"
                    >
                      {isGettingLocation ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MapPin className="h-4 w-4" />
                      )}
                      <span className="text-xs">GPS</span>
                    </button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleCancelPreview}
                    className="flex-1 rounded-xl border border-white/30 py-3 font-semibold text-white hover:bg-white/10"
                  >
                    Retake
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={!captureLocation.trim()}
                    className="flex-1 rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Check className="h-5 w-5" />
                    Upload
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fullscreen Photo Viewer / Editor */}
        <AnimatePresence>
          {viewingPhoto && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-black flex flex-col"
            >
              {/* Header */}
              <div className="flex-shrink-0 flex items-center justify-between p-4 text-white">
                <div>
                  <p className="font-medium">
                    {CHECKPOINTS.find((c) => c.type === viewingPhoto.checkpoint)?.label}
                  </p>
                  <p className="text-sm text-white/70">
                    {PHOTO_TYPES.find((p) => p.type === viewingPhoto.photoType)?.label}
                  </p>
                </div>
                <button
                  onClick={() => { setViewingPhoto(null); setIsEditingDetails(false); }}
                  className="p-2"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Image */}
              <div className="flex-1 min-h-0 flex items-center justify-center p-4">
                <img
                  src={viewingPhoto.url}
                  alt="Photo"
                  className="max-w-full max-h-full object-contain"
                />
              </div>

              {/* Metadata & Actions */}
              <div className="flex-shrink-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] space-y-3 overflow-y-auto max-h-[45dvh]">
                {isEditingDetails ? (
                  /* --- Edit Mode --- */
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-white/60 uppercase tracking-wide">Edit Details</p>
                    <input
                      type="text"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Notes (optional)"
                      className="w-full rounded-xl bg-white/10 border border-white/20 px-3 py-2.5 text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="flex-1 rounded-xl bg-white/10 border border-white/20 px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 [color-scheme:dark]"
                      />
                      <input
                        type="time"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        className="flex-1 rounded-xl bg-white/10 border border-white/20 px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 [color-scheme:dark]"
                      />
                    </div>
                    <input
                      type="text"
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      placeholder="Location"
                      className="w-full rounded-xl bg-white/10 border border-white/20 px-3 py-2.5 text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={() => setIsEditingDetails(false)}
                        className="flex-1 rounded-xl border border-white/30 py-2.5 font-medium text-white hover:bg-white/10 text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveDetails}
                        disabled={isSavingDetails}
                        className="flex-1 rounded-xl bg-emerald-600 py-2.5 font-medium text-white hover:bg-emerald-500 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                      >
                        {isSavingDetails ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  /* --- View Mode --- */
                  <>
                    {(viewingPhoto.capturedAt || viewingPhoto.capturedLocation || viewingPhoto.notes) && (
                      <div className="rounded-xl bg-white/10 p-3 space-y-1.5">
                        {viewingPhoto.capturedAt && (
                          <p className="text-sm text-white/80">
                            <span className="text-white/50">Captured:</span>{" "}
                            {formatCapturedDate(viewingPhoto.capturedAt)}{" "}
                            {formatCapturedTime(viewingPhoto.capturedAt)}
                          </p>
                        )}
                        {viewingPhoto.capturedLocation && (
                          <p className="text-sm text-white/80 flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-white/50 flex-shrink-0" />
                            {viewingPhoto.capturedLocation}
                          </p>
                        )}
                        {viewingPhoto.notes && (
                          <p className="text-sm text-white/70 italic">{viewingPhoto.notes}</p>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={handleReplacePhoto}
                        className="flex-1 rounded-xl bg-white/10 border border-white/20 py-2.5 font-medium text-white hover:bg-white/20 flex items-center justify-center gap-2 text-sm"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Replace
                      </button>
                      <button
                        onClick={handleStartEdit}
                        className="flex-1 rounded-xl bg-white/10 border border-white/20 py-2.5 font-medium text-white hover:bg-white/20 flex items-center justify-center gap-2 text-sm"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit Details
                      </button>
                      <button
                        onClick={handleDeleteFromViewer}
                        className="rounded-xl bg-red-500/20 border border-red-500/30 px-4 py-2.5 font-medium text-red-400 hover:bg-red-500/30 flex items-center justify-center text-sm"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ─── CheckpointSection ───────────────────────────────────────────────

interface CheckpointSectionProps {
  checkpoint: { type: CheckpointType; label: string; description: string };
  isExpanded: boolean;
  onToggle: () => void;
  count: number;
  isComplete: boolean;
  isLocked: boolean;
  lockMessage: string;
  onCapture: (checkpoint: CheckpointType, photoType: PhotoType) => void;
  onDelete: (photoId: string, checkpoint: CheckpointType, photoType: PhotoType) => void;
  onViewPhoto: (photo: PhotoData) => void;
  getPhoto: (checkpoint: CheckpointType, photoType: PhotoType) => PhotoData | undefined;
  getUploadState: (
    checkpoint: CheckpointType,
    photoType: PhotoType
  ) => { status: string; progress: number; error?: string };
  consentAcknowledged?: boolean;
  onConsentChange?: (checked: boolean) => void;
}

function CheckpointSection({
  checkpoint,
  isExpanded,
  onToggle,
  count,
  isComplete,
  isLocked,
  lockMessage,
  onCapture,
  onDelete,
  onViewPhoto,
  getPhoto,
  getUploadState,
  consentAcknowledged,
  onConsentChange,
}: CheckpointSectionProps) {
  const requiresConsent = !!onConsentChange;
  const captureDisabled = requiresConsent && !consentAcknowledged;

  return (
    <div
      className={`rounded-2xl border transition-all ${
        isLocked
          ? "border-slate-200 bg-slate-50/50 opacity-60"
          : isComplete
          ? "border-emerald-200 bg-emerald-50/50"
          : "border-slate-200 bg-white"
      }`}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        disabled={isLocked}
        className={`w-full flex items-center justify-between p-4 ${
          isLocked ? "cursor-not-allowed" : ""
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full ${
              isLocked
                ? "bg-slate-200 text-slate-400"
                : isComplete
                ? "bg-emerald-500 text-white"
                : count > 0
                ? "bg-emerald-100 text-emerald-600"
                : "bg-slate-100 text-slate-400"
            }`}
          >
            {isLocked ? (
              <Lock className="h-5 w-5" />
            ) : isComplete ? (
              <Check className="h-5 w-5" />
            ) : (
              <Camera className="h-5 w-5" />
            )}
          </div>
          <div className="text-left">
            <p className={`font-semibold ${isLocked ? "text-slate-500" : "text-slate-900"}`}>
              {checkpoint.label}
            </p>
            <p className="text-xs text-slate-500">
              {isLocked ? lockMessage : checkpoint.description}
            </p>
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
          {!isLocked &&
            (isExpanded ? (
              <ChevronUp className="h-5 w-5 text-slate-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-slate-400" />
            ))}
        </div>
      </button>

      {/* Photo Grid */}
      <AnimatePresence>
        {isExpanded && !isLocked && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {/* Customer consent acknowledgment (pre-pickup only) */}
            {requiresConsent && (
              <div
                className={`mx-4 mb-3 rounded-xl border p-3 ${
                  consentAcknowledged
                    ? "border-emerald-200 bg-emerald-50/50"
                    : "border-amber-200 bg-amber-50"
                }`}
              >
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!consentAcknowledged}
                    onChange={(e) => onConsentChange?.(e.target.checked)}
                    className="mt-0.5 h-5 w-5 flex-shrink-0 rounded border-slate-300 accent-emerald-600"
                  />
                  <span className="text-sm text-slate-700">
                    I confirm the customer has been informed that photos of their
                    vehicle will be taken for condition records, and they consent.
                  </span>
                </label>
                {!consentAcknowledged && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-700">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    Photo capture is disabled until consent is acknowledged
                  </p>
                )}
              </div>
            )}

            <div
              className={`grid grid-cols-3 gap-2 px-4 pb-4 ${
                captureDisabled ? "opacity-50" : ""
              }`}
            >
              {PHOTO_TYPES.map((photoType) => (
                <PhotoSlot
                  key={photoType.type}
                  checkpoint={checkpoint.type}
                  photoType={photoType}
                  photo={getPhoto(checkpoint.type, photoType.type)}
                  uploadState={getUploadState(checkpoint.type, photoType.type)}
                  onCapture={() => onCapture(checkpoint.type, photoType.type)}
                  onDelete={onDelete}
                  onViewPhoto={onViewPhoto}
                  captureDisabled={captureDisabled}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── PhotoSlot ───────────────────────────────────────────────────────

interface PhotoSlotProps {
  checkpoint: CheckpointType;
  photoType: { type: PhotoType; label: string; icon: string };
  photo?: PhotoData;
  uploadState: { status: string; progress: number; error?: string };
  onCapture: () => void;
  onDelete: (photoId: string, checkpoint: CheckpointType, photoType: PhotoType) => void;
  onViewPhoto: (photo: PhotoData) => void;
  captureDisabled?: boolean;
}

function PhotoSlot({
  checkpoint,
  photoType,
  photo,
  uploadState,
  onCapture,
  onDelete,
  onViewPhoto,
  captureDisabled = false,
}: PhotoSlotProps) {
  if (photo) {
    return (
      <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
        <img
          src={photo.url}
          alt={photoType.label}
          className="w-full h-full object-cover cursor-pointer"
          onClick={() => onViewPhoto(photo)}
        />
        <button
          onClick={() => onDelete(photo.id, checkpoint, photoType.type)}
          className="absolute top-1 right-1 p-1.5 rounded-full bg-red-500/90 text-white hover:bg-red-600"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1">
          <p className="text-[10px] font-medium text-white">{photoType.label}</p>
          {photo.capturedAt && (
            <p className="text-[8px] text-white/70 leading-tight">
              {formatCapturedDate(photo.capturedAt)} {formatCapturedTime(photo.capturedAt)}
            </p>
          )}
        </div>
        <div className="absolute top-1 left-1 p-1 rounded-full bg-emerald-500">
          <Check className="h-3 w-3 text-white" />
        </div>
      </div>
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
        disabled={captureDisabled}
        className="relative aspect-square rounded-xl bg-red-50 border-2 border-dashed border-red-200 flex flex-col items-center justify-center hover:bg-red-100 transition disabled:cursor-not-allowed disabled:hover:bg-red-50"
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
      disabled={captureDisabled}
      className="relative aspect-square rounded-xl bg-slate-100 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center hover:bg-slate-50 hover:border-emerald-300 transition active:scale-95 disabled:cursor-not-allowed disabled:hover:bg-slate-100 disabled:hover:border-slate-200 disabled:active:scale-100"
    >
      <Camera className="h-6 w-6 text-slate-400" />
      <p className="text-[10px] font-medium text-slate-600 mt-1">{photoType.label}</p>
    </button>
  );
}
