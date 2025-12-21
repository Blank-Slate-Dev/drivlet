// src/app/garage/settings/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Building2,
  User,
  Bell,
  Lock,
  MapPin,
  Phone,
  Mail,
  Clock,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Link2,
  Unlink,
} from "lucide-react";

interface GarageProfile {
  _id: string;
  businessName: string;
  tradingName?: string;
  abn: string;
  businessAddress: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
  };
  primaryContact: {
    name: string;
    role: string;
    phone: string;
    email: string;
  };
  afterHoursContact?: {
    name?: string;
    phone?: string;
  };
  linkedGarageName?: string;
  linkedGarageAddress?: string;
  linkedGaragePlaceId?: string;
  serviceRadius: number;
  status: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  newBookingAlerts: boolean;
  bookingUpdates: boolean;
  dailySummary: boolean;
}

type SettingsTab = "profile" | "notifications" | "security" | "linked-garage";

export default function GarageSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [profile, setProfile] = useState<GarageProfile | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    newBookingAlerts: true,
    bookingUpdates: true,
    dailySummary: false,
  });

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Contact edit state
  const [editingContact, setEditingContact] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    role: "",
    phone: "",
    email: "",
  });

  // After hours contact edit state
  const [editingAfterHours, setEditingAfterHours] = useState(false);
  const [afterHoursForm, setAfterHoursForm] = useState({
    name: "",
    phone: "",
  });

  // Redirect if not authenticated or not a garage user
  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/garage/login");
      return;
    }

    if (session.user.role !== "garage") {
      router.push("/");
      return;
    }
  }, [session, status, router]);

  // Fetch profile data
  useEffect(() => {
    if (session?.user.role === "garage") {
      fetchProfile();
    }
  }, [session]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/garage/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile(data.garage);
        if (data.garage?.primaryContact) {
          setContactForm(data.garage.primaryContact);
        }
        if (data.garage?.afterHoursContact) {
          setAfterHoursForm(data.garage.afterHoursContact);
        }
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContact = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/garage/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryContact: contactForm }),
      });

      if (res.ok) {
        setSuccess("Contact information updated successfully");
        setEditingContact(false);
        fetchProfile();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update contact");
      }
    } catch (err) {
      setError("Failed to update contact information");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAfterHours = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/garage/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ afterHoursContact: afterHoursForm }),
      });

      if (res.ok) {
        setSuccess("After hours contact updated successfully");
        setEditingAfterHours(false);
        fetchProfile();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update after hours contact");
      }
    } catch (err) {
      setError("Failed to update after hours contact");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.ok) {
        setSuccess("Password changed successfully");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to change password");
      }
    } catch (err) {
      setError("Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/garage/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationSettings }),
      });

      if (res.ok) {
        setSuccess("Notification preferences saved");
      } else {
        setError("Failed to save notification preferences");
      }
    } catch (err) {
      setError("Failed to save notification preferences");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your garage profile and preferences
          </p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-emerald-700">
            <CheckCircle className="h-5 w-5" />
            {success}
          </div>
        )}
        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Sidebar Navigation */}
          <div className="w-full lg:w-64 shrink-0">
            <nav className="space-y-1 rounded-xl border border-slate-200 bg-white p-2">
              {[
                { id: "profile" as SettingsTab, label: "Business Profile", icon: Building2 },
                { id: "notifications" as SettingsTab, label: "Notifications", icon: Bell },
                { id: "security" as SettingsTab, label: "Security", icon: Lock },
                { id: "linked-garage" as SettingsTab, label: "Linked Garage", icon: Link2 },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSuccess("");
                    setError("");
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                    activeTab === tab.id
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="rounded-xl border border-slate-200 bg-white">
              {/* Profile Tab */}
              {activeTab === "profile" && (
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-6">Business Profile</h2>

                  {/* Business Info (Read-only) */}
                  <div className="mb-8">
                    <h3 className="text-sm font-medium text-slate-700 mb-4">Business Information</h3>
                    <div className="rounded-lg border border-slate-200 p-4 bg-slate-50">
                      <dl className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <dt className="text-xs text-slate-500">Business Name</dt>
                          <dd className="mt-1 font-medium text-slate-900">{profile?.businessName}</dd>
                        </div>
                        {profile?.tradingName && (
                          <div>
                            <dt className="text-xs text-slate-500">Trading Name</dt>
                            <dd className="mt-1 font-medium text-slate-900">{profile.tradingName}</dd>
                          </div>
                        )}
                        <div>
                          <dt className="text-xs text-slate-500">ABN</dt>
                          <dd className="mt-1 font-medium text-slate-900">{profile?.abn}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-slate-500">Service Radius</dt>
                          <dd className="mt-1 font-medium text-slate-900">{profile?.serviceRadius} km</dd>
                        </div>
                        <div className="sm:col-span-2">
                          <dt className="text-xs text-slate-500">Business Address</dt>
                          <dd className="mt-1 font-medium text-slate-900">
                            {profile?.businessAddress.street}, {profile?.businessAddress.suburb},{" "}
                            {profile?.businessAddress.state} {profile?.businessAddress.postcode}
                          </dd>
                        </div>
                      </dl>
                      <p className="mt-4 text-xs text-slate-500">
                        To update business information, please contact support.
                      </p>
                    </div>
                  </div>

                  {/* Primary Contact (Editable) */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-slate-700">Primary Contact</h3>
                      {!editingContact && (
                        <button
                          onClick={() => setEditingContact(true)}
                          className="text-sm text-emerald-600 hover:text-emerald-700"
                        >
                          Edit
                        </button>
                      )}
                    </div>

                    {editingContact ? (
                      <div className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                            <input
                              type="text"
                              value={contactForm.name}
                              onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 focus:border-emerald-500 focus:ring-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                            <input
                              type="text"
                              value={contactForm.role}
                              onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })}
                              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 focus:border-emerald-500 focus:ring-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                            <input
                              type="tel"
                              value={contactForm.phone}
                              onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 focus:border-emerald-500 focus:ring-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                            <input
                              type="email"
                              value={contactForm.email}
                              onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 focus:border-emerald-500 focus:ring-emerald-500"
                            />
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={handleSaveContact}
                            disabled={saving}
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingContact(false);
                              if (profile?.primaryContact) {
                                setContactForm(profile.primaryContact);
                              }
                            }}
                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-slate-200 p-4">
                        <dl className="grid gap-4 sm:grid-cols-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-slate-400" />
                            <div>
                              <dt className="text-xs text-slate-500">Name</dt>
                              <dd className="font-medium text-slate-900">{profile?.primaryContact.name}</dd>
                            </div>
                          </div>
                          <div>
                            <dt className="text-xs text-slate-500">Role</dt>
                            <dd className="font-medium text-slate-900">{profile?.primaryContact.role}</dd>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-slate-400" />
                            <div>
                              <dt className="text-xs text-slate-500">Phone</dt>
                              <dd className="font-medium text-slate-900">{profile?.primaryContact.phone}</dd>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-slate-400" />
                            <div>
                              <dt className="text-xs text-slate-500">Email</dt>
                              <dd className="font-medium text-slate-900">{profile?.primaryContact.email}</dd>
                            </div>
                          </div>
                        </dl>
                      </div>
                    )}
                  </div>

                  {/* After Hours Contact */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-slate-700">After Hours Contact</h3>
                      {!editingAfterHours && (
                        <button
                          onClick={() => setEditingAfterHours(true)}
                          className="text-sm text-emerald-600 hover:text-emerald-700"
                        >
                          Edit
                        </button>
                      )}
                    </div>

                    {editingAfterHours ? (
                      <div className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                            <input
                              type="text"
                              value={afterHoursForm.name}
                              onChange={(e) => setAfterHoursForm({ ...afterHoursForm, name: e.target.value })}
                              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 focus:border-emerald-500 focus:ring-emerald-500"
                              placeholder="Optional"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                            <input
                              type="tel"
                              value={afterHoursForm.phone}
                              onChange={(e) => setAfterHoursForm({ ...afterHoursForm, phone: e.target.value })}
                              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 focus:border-emerald-500 focus:ring-emerald-500"
                              placeholder="Optional"
                            />
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={handleSaveAfterHours}
                            disabled={saving}
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingAfterHours(false);
                              if (profile?.afterHoursContact) {
                                setAfterHoursForm(profile.afterHoursContact);
                              }
                            }}
                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-slate-200 p-4">
                        {profile?.afterHoursContact?.phone ? (
                          <dl className="grid gap-4 sm:grid-cols-2">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-slate-400" />
                              <div>
                                <dt className="text-xs text-slate-500">Name</dt>
                                <dd className="font-medium text-slate-900">
                                  {profile.afterHoursContact.name || "Not set"}
                                </dd>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-slate-400" />
                              <div>
                                <dt className="text-xs text-slate-500">Phone</dt>
                                <dd className="font-medium text-slate-900">{profile.afterHoursContact.phone}</dd>
                              </div>
                            </div>
                          </dl>
                        ) : (
                          <p className="text-sm text-slate-500">No after hours contact set</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === "notifications" && (
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-6">Notification Preferences</h2>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">Email Notifications</p>
                        <p className="text-sm text-slate-500">Receive notifications via email</p>
                      </div>
                      <button
                        onClick={() => setNotificationSettings({
                          ...notificationSettings,
                          emailNotifications: !notificationSettings.emailNotifications
                        })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                          notificationSettings.emailNotifications ? "bg-emerald-600" : "bg-slate-200"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                            notificationSettings.emailNotifications ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">New Booking Alerts</p>
                        <p className="text-sm text-slate-500">Get notified when a new booking is assigned</p>
                      </div>
                      <button
                        onClick={() => setNotificationSettings({
                          ...notificationSettings,
                          newBookingAlerts: !notificationSettings.newBookingAlerts
                        })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                          notificationSettings.newBookingAlerts ? "bg-emerald-600" : "bg-slate-200"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                            notificationSettings.newBookingAlerts ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">Booking Updates</p>
                        <p className="text-sm text-slate-500">Get notified about booking status changes</p>
                      </div>
                      <button
                        onClick={() => setNotificationSettings({
                          ...notificationSettings,
                          bookingUpdates: !notificationSettings.bookingUpdates
                        })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                          notificationSettings.bookingUpdates ? "bg-emerald-600" : "bg-slate-200"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                            notificationSettings.bookingUpdates ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">Daily Summary</p>
                        <p className="text-sm text-slate-500">Receive a daily summary of your bookings</p>
                      </div>
                      <button
                        onClick={() => setNotificationSettings({
                          ...notificationSettings,
                          dailySummary: !notificationSettings.dailySummary
                        })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                          notificationSettings.dailySummary ? "bg-emerald-600" : "bg-slate-200"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                            notificationSettings.dailySummary ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="pt-4">
                      <button
                        onClick={handleSaveNotifications}
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Preferences
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === "security" && (
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-6">Security Settings</h2>

                  <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
                    <h3 className="text-sm font-medium text-slate-700">Change Password</h3>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          required
                          className="w-full rounded-lg border border-slate-300 px-4 py-2 pr-10 text-slate-900 focus:border-emerald-500 focus:ring-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          minLength={8}
                          className="w-full rounded-lg border border-slate-300 px-4 py-2 pr-10 text-slate-900 focus:border-emerald-500 focus:ring-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">Must be at least 8 characters</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 focus:border-emerald-500 focus:ring-emerald-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                      Update Password
                    </button>
                  </form>

                  <div className="mt-8 pt-8 border-t border-slate-200">
                    <h3 className="text-sm font-medium text-slate-700 mb-4">Account Information</h3>
                    <div className="rounded-lg border border-slate-200 p-4">
                      <dl className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-slate-400" />
                          <div>
                            <dt className="text-xs text-slate-500">Login Email</dt>
                            <dd className="font-medium text-slate-900">{session?.user.email}</dd>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <div>
                            <dt className="text-xs text-slate-500">Account Status</dt>
                            <dd className="font-medium text-slate-900 capitalize">{profile?.status}</dd>
                          </div>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>
              )}

              {/* Linked Garage Tab */}
              {activeTab === "linked-garage" && (
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-slate-900 mb-2">Linked Garage Location</h2>
                  <p className="text-sm text-slate-500 mb-6">
                    This is the garage location that customers select when making bookings.
                    Bookings for this location will appear on your dashboard.
                  </p>

                  {profile?.linkedGarageName ? (
                    <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                          <Link2 className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900">{profile.linkedGarageName}</h3>
                          {profile.linkedGarageAddress && (
                            <p className="mt-1 text-sm text-slate-600 flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {profile.linkedGarageAddress}
                            </p>
                          )}
                          {profile.linkedGaragePlaceId && (
                            <p className="mt-2 text-xs text-slate-500">
                              Place ID: {profile.linkedGaragePlaceId}
                            </p>
                          )}
                        </div>
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                          Active
                        </span>
                      </div>

                      <div className="mt-6 rounded-lg bg-white p-4">
                        <h4 className="text-sm font-medium text-slate-700 mb-2">How it works</h4>
                        <ul className="space-y-2 text-sm text-slate-600">
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5" />
                            When customers search for garages and select yours, bookings are automatically assigned to you
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5" />
                            You&apos;ll receive instant notifications for new bookings
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5" />
                            Bookings appear on your dashboard where you can accept or decline
                          </li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                      <Unlink className="mx-auto h-12 w-12 text-slate-400" />
                      <h3 className="mt-4 font-semibold text-slate-900">No Garage Linked</h3>
                      <p className="mt-2 text-sm text-slate-500">
                        Your account isn&apos;t linked to a garage location yet.
                        Bookings cannot be automatically assigned until you link your garage.
                      </p>
                      <p className="mt-4 text-xs text-slate-500">
                        Please contact support to link your garage location.
                      </p>
                    </div>
                  )}

                  <div className="mt-6 rounded-lg bg-amber-50 border border-amber-200 p-4">
                    <div className="flex gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">Need to change your linked location?</p>
                        <p className="mt-1 text-sm text-amber-700">
                          Contact support at <a href="mailto:support@drivlet.com" className="underline">support@drivlet.com</a> to
                          update your linked garage location.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
