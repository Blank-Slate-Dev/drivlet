// src/app/driver/settings/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import {
  Settings,
  User,
  Phone,
  MapPin,
  Clock,
  Car,
  Shield,
  CreditCard,
  Bell,
  Save,
  Loader2,
  CheckCircle,
  AlertTriangle,
  LogOut,
  Calendar,
  Star,
  Briefcase,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  Edit2,
  X,
  Camera,
  Upload,
  Trash2,
  Home,
} from "lucide-react";

interface DriverSettings {
  profile: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: {
      street: string;
      suburb: string;
      state: string;
      postcode: string;
    };
    profilePhoto?: string;
  };
  license: {
    number: string;
    state: string;
    class: string;
    expiryDate: string;
  };
  vehicle: {
    make: string;
    model: string;
    year: number;
    color: string;
    registration: string;
    registrationState: string;
    registrationExpiry: string;
  } | null;
  hasOwnVehicle: boolean;
  availability: {
    [key: string]: {
      available: boolean;
      startTime: string;
      endTime: string;
    };
  };
  maxJobsPerDay: number;
  preferredAreas: string[];
  isActive: boolean;
  canAcceptJobs: boolean;
  status: string;
  onboardingStatus: string;
  metrics: {
    totalJobs: number;
    completedJobs: number;
    averageRating: number;
    totalRatings: number;
  };
  memberSince: string;
}

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT", "ACT"];

export default function DriverSettingsPage() {
  const { data: session } = useSession();
  const [settings, setSettings] = useState<DriverSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeSection, setActiveSection] = useState("profile");

  // Photo upload state
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editable fields
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState({
    street: "",
    suburb: "",
    state: "NSW",
    postcode: "",
  });
  const [availability, setAvailability] = useState<DriverSettings["availability"]>({});
  const [maxJobsPerDay, setMaxJobsPerDay] = useState(10);
  const [preferredAreas, setPreferredAreas] = useState<string[]>([]);
  const [preferredAreasInput, setPreferredAreasInput] = useState("");
  const [isActive, setIsActive] = useState(true);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/driver/settings");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch settings");
      }

      setSettings(data);
      setPhone(data.profile.phone);
      setAddress(data.profile.address);
      setAvailability(data.availability);
      setMaxJobsPerDay(data.maxJobsPerDay);
      setPreferredAreas(data.preferredAreas || []);
      setIsActive(data.isActive);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/driver/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          address,
          availability,
          maxJobsPerDay,
          preferredAreas,
          isActive,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save settings");
      }

      setSuccess("Settings saved successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setPhotoError("Please upload a JPEG, PNG, or WebP image");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("Image must be smaller than 5MB");
      return;
    }

    setUploadingPhoto(true);
    setPhotoError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/driver/profile-photo", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to upload photo");
      }

      // Update local state with new photo URL
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              profile: { ...prev.profile, profilePhoto: data.url },
            }
          : null
      );

      setSuccess("Profile photo updated!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeletePhoto = async () => {
    if (!settings?.profile.profilePhoto) return;

    setUploadingPhoto(true);
    setPhotoError("");

    try {
      const res = await fetch("/api/driver/profile-photo", {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete photo");
      }

      // Update local state
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              profile: { ...prev.profile, profilePhoto: undefined },
            }
          : null
      );

      setSuccess("Profile photo removed!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Failed to delete photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleAddPreferredArea = () => {
    if (preferredAreasInput.trim() && preferredAreas.length < 20) {
      setPreferredAreas([...preferredAreas, preferredAreasInput.trim()]);
      setPreferredAreasInput("");
    }
  };

  const handleRemovePreferredArea = (index: number) => {
    setPreferredAreas(preferredAreas.filter((_, i) => i !== index));
  };

  const handleAvailabilityChange = (
    day: string,
    field: "available" | "startTime" | "endTime",
    value: boolean | string
  ) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: "/driver/login" });
  };

  const sections = [
    { key: "profile", label: "Profile", icon: User },
    { key: "availability", label: "Availability", icon: Clock },
    { key: "preferences", label: "Preferences", icon: Settings },
    { key: "account", label: "Account", icon: Shield },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
          <p className="mt-2 text-sm text-slate-500">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-4 text-lg font-medium text-red-900">Failed to load settings</h3>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <button
            onClick={fetchSettings}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">
          Manage your profile, availability, and preferences
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <AlertTriangle className="h-4 w-4" />
          {error}
          <button onClick={() => setError("")} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          <CheckCircle className="h-4 w-4" />
          {success}
        </motion.div>
      )}

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-slate-200 bg-white p-2">
            {sections.map((section) => (
              <button
                key={section.key}
                onClick={() => setActiveSection(section.key)}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium transition ${
                  activeSection === section.key
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <section.icon className="h-5 w-5" />
                {section.label}
                <ChevronRight className="ml-auto h-4 w-4 opacity-50" />
              </button>
            ))}
          </div>

          {/* Quick Stats */}
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Your Stats</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Total Jobs</span>
                <span className="font-medium text-slate-900">
                  {settings.metrics.totalJobs}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Completed</span>
                <span className="font-medium text-emerald-600">
                  {settings.metrics.completedJobs}
                </span>
              </div>
              {settings.metrics.totalRatings > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Rating</span>
                  <span className="flex items-center gap-1 font-medium text-amber-600">
                    <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                    {settings.metrics.averageRating.toFixed(1)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Member Since</span>
                <span className="font-medium text-slate-900">
                  {new Date(settings.memberSince).toLocaleDateString("en-AU", {
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Profile Section */}
          {activeSection === "profile" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Profile Photo */}
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="mb-4 text-lg font-semibold text-slate-900">
                  Profile Photo
                </h3>
                <p className="mb-4 text-sm text-slate-500">
                  This photo will be shown to customers when you accept their job.
                  A professional photo helps build trust.
                </p>

                <div className="flex items-center gap-6">
                  {/* Photo Preview */}
                  <div className="relative">
                    <div className="h-24 w-24 overflow-hidden rounded-full bg-slate-100 ring-4 ring-slate-50">
                      {settings.profile.profilePhoto ? (
                        <Image
                          src={settings.profile.profilePhoto}
                          alt="Profile"
                          width={96}
                          height={96}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <User className="h-10 w-10 text-slate-400" />
                        </div>
                      )}
                    </div>
                    {uploadingPhoto && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                      </div>
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handlePhotoUpload}
                        className="hidden"
                        id="photo-upload"
                      />
                      <label
                        htmlFor="photo-upload"
                        className={`inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                          uploadingPhoto
                            ? "bg-slate-100 text-slate-400"
                            : "bg-emerald-600 text-white hover:bg-emerald-500"
                        }`}
                      >
                        {uploadingPhoto ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        {settings.profile.profilePhoto ? "Change Photo" : "Upload Photo"}
                      </label>

                      {settings.profile.profilePhoto && (
                        <button
                          onClick={handleDeletePhoto}
                          disabled={uploadingPhoto}
                          className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </button>
                      )}
                    </div>

                    {photoError && (
                      <p className="mt-2 text-sm text-red-600">{photoError}</p>
                    )}

                    <p className="mt-2 text-xs text-slate-500">
                      JPEG, PNG or WebP. Max 5MB. Square images work best.
                    </p>
                  </div>
                </div>
              </div>

              {/* Basic Info (Read Only) */}
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="mb-4 text-lg font-semibold text-slate-900">
                  Personal Information
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-500">Name</label>
                    <p className="mt-1 text-slate-900">
                      {settings.profile.firstName} {settings.profile.lastName}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500">Email</label>
                    <p className="mt-1 text-slate-900">{settings.profile.email}</p>
                  </div>
                </div>
              </div>

              {/* Contact Info (Editable) */}
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="mb-4 text-lg font-semibold text-slate-900">
                  Contact Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                      placeholder="0400 000 000"
                    />
                  </div>
                </div>
              </div>

              {/* Address (Editable) */}
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="mb-4 text-lg font-semibold text-slate-900">Address</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700">Street</label>
                    <input
                      type="text"
                      value={address.street}
                      onChange={(e) => setAddress({ ...address, street: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Suburb</label>
                    <input
                      type="text"
                      value={address.suburb}
                      onChange={(e) => setAddress({ ...address, suburb: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">State</label>
                      <select
                        value={address.state}
                        onChange={(e) => setAddress({ ...address, state: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                      >
                        {STATES.map((state) => (
                          <option key={state} value={state}>
                            {state}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">
                        Postcode
                      </label>
                      <input
                        type="text"
                        value={address.postcode}
                        onChange={(e) => setAddress({ ...address, postcode: e.target.value })}
                        maxLength={4}
                        className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* License Info (Read Only) */}
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="mb-4 text-lg font-semibold text-slate-900">License Details</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-500">
                      License Number
                    </label>
                    <p className="mt-1 font-mono text-slate-900">{settings.license.number}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500">
                      State / Class
                    </label>
                    <p className="mt-1 text-slate-900">
                      {settings.license.state} / Class {settings.license.class}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500">Expiry</label>
                    <p className="mt-1 text-slate-900">
                      {new Date(settings.license.expiryDate).toLocaleDateString("en-AU")}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Availability Section */}
          {activeSection === "availability" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Active Status */}
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Available for Jobs</h3>
                    <p className="text-sm text-slate-500">
                      Toggle off when you&apos;re not available to accept new jobs
                    </p>
                  </div>
                  <button
                    onClick={() => setIsActive(!isActive)}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition ${
                      isActive ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${
                        isActive ? "translate-x-7" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Weekly Schedule */}
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="mb-4 text-lg font-semibold text-slate-900">Weekly Schedule</h3>
                <div className="space-y-3">
                  {DAYS.map((day) => (
                    <div
                      key={day}
                      className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-100 p-3"
                    >
                      <div className="w-24">
                        <span className="text-sm font-medium capitalize text-slate-700">
                          {day}
                        </span>
                      </div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={availability[day]?.available ?? true}
                          onChange={(e) =>
                            handleAvailabilityChange(day, "available", e.target.checked)
                          }
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-sm text-slate-600">Available</span>
                      </label>
                      {availability[day]?.available && (
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={availability[day]?.startTime || "07:00"}
                            onChange={(e) =>
                              handleAvailabilityChange(day, "startTime", e.target.value)
                            }
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                          />
                          <span className="text-slate-400">to</span>
                          <input
                            type="time"
                            value={availability[day]?.endTime || "18:00"}
                            onChange={(e) =>
                              handleAvailabilityChange(day, "endTime", e.target.value)
                            }
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Max Jobs */}
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="mb-4 text-lg font-semibold text-slate-900">Daily Job Limit</h3>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={maxJobsPerDay}
                    onChange={(e) => setMaxJobsPerDay(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="w-16 rounded-lg bg-slate-100 px-3 py-2 text-center font-semibold text-slate-900">
                    {maxJobsPerDay}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  Maximum number of jobs you can accept per day
                </p>
              </div>
            </motion.div>
          )}

          {/* Preferences Section */}
          {activeSection === "preferences" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Preferred Areas */}
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="mb-4 text-lg font-semibold text-slate-900">Preferred Areas</h3>
                <p className="mb-4 text-sm text-slate-500">
                  Jobs in your preferred areas will be highlighted. You can still accept jobs
                  from other areas.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={preferredAreasInput}
                    onChange={(e) => setPreferredAreasInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleAddPreferredArea()}
                    placeholder="Enter suburb or postcode"
                    className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <button
                    onClick={handleAddPreferredArea}
                    disabled={!preferredAreasInput.trim() || preferredAreas.length >= 20}
                    className="rounded-lg bg-emerald-600 px-4 py-2.5 font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
                {preferredAreas.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {preferredAreas.map((area, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700"
                      >
                        {area}
                        <button
                          onClick={() => handleRemovePreferredArea(index)}
                          className="hover:text-emerald-900"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Account Section */}
          {activeSection === "account" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Account Status */}
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="mb-4 text-lg font-semibold text-slate-900">Account Status</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Application Status</span>
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        settings.status === "approved"
                          ? "bg-emerald-100 text-emerald-700"
                          : settings.status === "pending"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {settings.status.charAt(0).toUpperCase() + settings.status.slice(1)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Onboarding Status</span>
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        settings.onboardingStatus === "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {settings.onboardingStatus === "active" ? "Active" : "Pending"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Can Accept Jobs</span>
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        settings.canAcceptJobs
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {settings.canAcceptJobs ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sign Out */}
              <div className="rounded-xl border border-red-200 bg-red-50 p-6">
                <h3 className="mb-2 text-lg font-semibold text-red-900">Sign Out</h3>
                <p className="mb-4 text-sm text-red-700">
                  You will be signed out of your driver account.
                </p>
                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-500"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </motion.div>
          )}

          {/* Save Button */}
          {activeSection !== "account" && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-500 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Save className="h-5 w-5" />
                )}
                Save Changes
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Return to Home Button */}
      <div className="mt-8 flex justify-center pb-8">
        <Link
          href="/driver/dashboard"
          className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200 active:scale-95"
        >
          <Home className="h-4 w-4" />
          Return to Home
        </Link>
      </div>
    </div>
  );
}
