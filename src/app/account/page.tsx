// src/app/account/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Lock,
  CheckCircle2,
  AlertCircle,
  Phone,
  User,
  Camera,
  Trash2,
  Heart,
  Loader2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AccountPage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();

  // Profile state
  const [mobile, setMobile] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Photo upload state
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Emergency contact state
  const [emergencyContact, setEmergencyContact] =
    useState<EmergencyContact | null>(null);
  const [ecName, setEcName] = useState("");
  const [ecRelationship, setEcRelationship] = useState("");
  const [ecPhone, setEcPhone] = useState("");
  const [ecEditing, setEcEditing] = useState(false);
  const [ecSaving, setEcSaving] = useState(false);
  const [ecError, setEcError] = useState("");
  const [ecSuccess, setEcSuccess] = useState("");

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch all data on mount
  useEffect(() => {
    if (status === "authenticated") {
      fetchProfile();
      fetchEmergencyContact();
    }
  }, [status]);

  const fetchProfile = async () => {
    try {
      setProfileLoading(true);
      const res = await fetch("/api/account/profile");
      if (res.ok) {
        const data = await res.json();
        setMobile(data.mobile || "");
        setProfilePhoto(data.profilePhoto || null);
      }
    } catch {
      console.error("Failed to fetch profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const fetchEmergencyContact = async () => {
    try {
      const res = await fetch("/api/customer/emergency-contact");
      if (res.ok) {
        const data = await res.json();
        if (data.emergencyContact) {
          setEmergencyContact(data.emergencyContact);
          setEcName(data.emergencyContact.name);
          setEcRelationship(data.emergencyContact.relationship);
          setEcPhone(data.emergencyContact.phone);
        }
      }
    } catch {
      console.error("Failed to fetch emergency contact");
    }
  };

  // ─── Profile Photo Handlers ─────────────────────────────────────────
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoError("");
    setUploadingPhoto(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/customer/profile-photo", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setPhotoError(data.error || "Failed to upload photo");
        return;
      }

      setProfilePhoto(data.url);
      await updateSession();
    } catch {
      setPhotoError("Something went wrong. Please try again.");
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handlePhotoDelete = async () => {
    setPhotoError("");
    setUploadingPhoto(true);

    try {
      const res = await fetch("/api/customer/profile-photo", {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setPhotoError(data.error || "Failed to delete photo");
        return;
      }

      setProfilePhoto(null);
      await updateSession();
    } catch {
      setPhotoError("Something went wrong. Please try again.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // ─── Profile Submit Handler ─────────────────────────────────────────
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");

    if (mobile) {
      const cleanMobile = mobile.replace(/\s/g, "");
      if (!/^04\d{8}$/.test(cleanMobile)) {
        setProfileError(
          "Please enter a valid Australian mobile number (04XX XXX XXX)"
        );
        return;
      }
    }

    setSavingProfile(true);

    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: mobile.replace(/\s/g, "") }),
      });

      const data = await res.json();

      if (!res.ok) {
        setProfileError(data.error || "Failed to update profile");
        return;
      }

      setProfileSuccess("Profile updated successfully");
    } catch {
      setProfileError("Something went wrong. Please try again.");
    } finally {
      setSavingProfile(false);
    }
  };

  // ─── Emergency Contact Handlers ─────────────────────────────────────
  const handleEcSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setEcError("");
    setEcSuccess("");

    if (!ecName || !ecRelationship || !ecPhone) {
      setEcError("All fields are required");
      return;
    }

    const cleanPhone = ecPhone.replace(/\s/g, "");
    if (!/^0[2-9]\d{8}$/.test(cleanPhone) && !/^04\d{8}$/.test(cleanPhone)) {
      setEcError("Please enter a valid Australian phone number");
      return;
    }

    setEcSaving(true);

    try {
      const res = await fetch("/api/customer/emergency-contact", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: ecName,
          relationship: ecRelationship,
          phone: ecPhone,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setEcError(data.error || "Failed to save emergency contact");
        return;
      }

      setEmergencyContact(data.emergencyContact);
      setEcSuccess("Emergency contact saved");
      setEcEditing(false);
    } catch {
      setEcError("Something went wrong. Please try again.");
    } finally {
      setEcSaving(false);
    }
  };

  const handleEcDelete = async () => {
    setEcError("");
    setEcSaving(true);

    try {
      const res = await fetch("/api/customer/emergency-contact", {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setEcError(data.error || "Failed to remove emergency contact");
        return;
      }

      setEmergencyContact(null);
      setEcName("");
      setEcRelationship("");
      setEcPhone("");
      setEcEditing(false);
      setEcSuccess("Emergency contact removed");
    } catch {
      setEcError("Something went wrong. Please try again.");
    } finally {
      setEcSaving(false);
    }
  };

  // ─── Password Handler ──────────────────────────────────────────────
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setError("All fields are required");
      return;
    }

    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
      setError("Password must be at least 8 characters with uppercase, lowercase, number, and special character");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError("New passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to change password");
        return;
      }

      setSuccess("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Auth guards ───────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600">Loading...</div>
      </main>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="mx-auto max-w-lg">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-emerald-600 mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="space-y-6">
          {/* ── Profile Photo & Info Card ────────────────────────────── */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h1 className="text-xl font-bold text-slate-900">
                Account Settings
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Logged in as{" "}
                {session?.user?.username || session?.user?.email}
              </p>
            </div>

            {/* Profile Photo */}
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <Camera className="h-5 w-5 text-slate-600" />
                <h2 className="text-lg font-semibold text-slate-900">
                  Profile Photo
                </h2>
              </div>

              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center">
                    {profilePhoto ? (
                      <Image
                        src={profilePhoto}
                        alt="Profile"
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-10 w-10 text-slate-400" />
                    )}
                  </div>
                  {uploadingPhoto && (
                    <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="px-4 py-2 text-sm font-medium text-emerald-600 border border-emerald-300 rounded-lg hover:bg-emerald-50 transition disabled:opacity-50"
                  >
                    {profilePhoto ? "Change Photo" : "Upload Photo"}
                  </button>
                  {profilePhoto && (
                    <button
                      type="button"
                      onClick={handlePhotoDelete}
                      disabled={uploadingPhoto}
                      className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                JPEG, PNG or WebP. Max 5MB.
              </p>
              {photoError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-600 text-sm">{photoError}</p>
                </div>
              )}
            </div>

            {/* Profile Information */}
            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <User className="h-5 w-5 text-slate-600" />
                  <h2 className="text-lg font-semibold text-slate-900">
                    Profile Information
                  </h2>
                </div>
                <p className="text-sm text-slate-500">
                  Update your contact information.
                </p>
              </div>

              {profileSuccess && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <p className="text-emerald-700 text-sm">{profileSuccess}</p>
                </div>
              )}

              {profileError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-600 text-sm">{profileError}</p>
                </div>
              )}

              <form onSubmit={handleProfileSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="mobile"
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    Mobile Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      id="mobile"
                      type="tel"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      disabled={profileLoading}
                      className="w-full pl-12 pr-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition disabled:opacity-50"
                      placeholder="04XX XXX XXX"
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">
                    Used for booking notifications and driver contact
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={savingProfile || profileLoading}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingProfile ? "Saving..." : "Save Changes"}
                </button>
              </form>
            </div>
          </div>

          {/* ── Emergency Contact Card ──────────────────────────────── */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 mb-1">
                    <Heart className="h-5 w-5 text-slate-600" />
                    <h2 className="text-lg font-semibold text-slate-900">
                      Emergency Contact
                    </h2>
                  </div>
                  {emergencyContact && !ecEditing && (
                    <button
                      type="button"
                      onClick={() => setEcEditing(true)}
                      className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      Edit
                    </button>
                  )}
                </div>
                <p className="text-sm text-slate-500">
                  Someone we can contact in case of an emergency during your
                  booking.
                </p>
              </div>

              {ecSuccess && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <p className="text-emerald-700 text-sm">{ecSuccess}</p>
                </div>
              )}

              {ecError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-600 text-sm">{ecError}</p>
                </div>
              )}

              {emergencyContact && !ecEditing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">
                        Name
                      </p>
                      <p className="text-sm font-medium text-slate-900">
                        {emergencyContact.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">
                        Relationship
                      </p>
                      <p className="text-sm font-medium text-slate-900">
                        {emergencyContact.relationship}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">
                      Phone
                    </p>
                    <p className="text-sm font-medium text-slate-900">
                      {emergencyContact.phone}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleEcDelete}
                    disabled={ecSaving}
                    className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleEcSave} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      value={ecName}
                      onChange={(e) => setEcName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                      placeholder="Full name"
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Relationship
                    </label>
                    <select
                      value={ecRelationship}
                      onChange={(e) => setEcRelationship(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    >
                      <option value="">Select...</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Partner">Partner</option>
                      <option value="Parent">Parent</option>
                      <option value="Sibling">Sibling</option>
                      <option value="Child">Child</option>
                      <option value="Friend">Friend</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={ecPhone}
                      onChange={(e) => setEcPhone(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                      placeholder="04XX XXX XXX"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={ecSaving}
                      className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {ecSaving ? "Saving..." : "Save Contact"}
                    </button>
                    {ecEditing && (
                      <button
                        type="button"
                        onClick={() => {
                          setEcEditing(false);
                          if (emergencyContact) {
                            setEcName(emergencyContact.name);
                            setEcRelationship(emergencyContact.relationship);
                            setEcPhone(emergencyContact.phone);
                          }
                        }}
                        className="px-4 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* ── Change Password Card ───────────────────────────────── */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Lock className="h-5 w-5 text-slate-600" />
                  <h2 className="text-lg font-semibold text-slate-900">
                    Change Password
                  </h2>
                </div>
                <p className="text-sm text-slate-500">
                  Enter your current password and choose a new password.
                </p>
              </div>

              {success && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <p className="text-emerald-700 text-sm">{success}</p>
                </div>
              )}

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="currentPassword"
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    Current Password
                  </label>
                  <input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    placeholder="Enter your current password"
                  />
                </div>

                <div>
                  <label
                    htmlFor="newPassword"
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    placeholder="Min 8 chars, upper, lower, number, special"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirmNewPassword"
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    Confirm New Password
                  </label>
                  <input
                    id="confirmNewPassword"
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    placeholder="Confirm your new password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Changing password..." : "Change Password"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
