// src/app/garage/services/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  DollarSign,
  Clock,
  Car,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Eye,
  EyeOff,
  Settings,
  Wrench,
} from "lucide-react";

// Types
interface PriceEntry {
  vehicleCategory: string;
  priceFrom: number;
  priceTo?: number;
  estimatedHours: number;
  notes?: string;
}

interface ServiceOffering {
  _id?: string;
  category: string;
  name: string;
  description?: string;
  prices: PriceEntry[];
  isActive: boolean;
  includesPickup: boolean;
  requiresBooking: boolean;
}

interface ServicePricing {
  _id?: string;
  services: ServiceOffering[];
  acceptsManualTransmission: boolean;
  acceptsElectricVehicles: boolean;
  acceptsHybridVehicles: boolean;
  acceptsDiesel: boolean;
  drivletEnabled: boolean;
  drivletPickupFee: number;
  drivletRadius: number;
  leadTimeHours: number;
  maxDailyBookings: number;
  isPublished: boolean;
}

// Constants
const SERVICE_CATEGORIES = [
  { id: "logbook_service", label: "Logbook Service" },
  { id: "major_service", label: "Major Service" },
  { id: "minor_service", label: "Minor Service" },
  { id: "brake_service", label: "Brake Service" },
  { id: "tyre_service", label: "Tyre Service" },
  { id: "battery", label: "Battery Replacement" },
  { id: "air_conditioning", label: "Air Conditioning" },
  { id: "diagnostics", label: "Diagnostics" },
  { id: "oil_change", label: "Oil Change" },
  { id: "wheel_alignment", label: "Wheel Alignment" },
  { id: "suspension", label: "Suspension" },
  { id: "transmission", label: "Transmission" },
  { id: "clutch", label: "Clutch" },
  { id: "exhaust", label: "Exhaust" },
  { id: "electrical", label: "Electrical" },
  { id: "roadworthy", label: "Roadworthy Certificate" },
  { id: "pre_purchase_inspection", label: "Pre-Purchase Inspection" },
  { id: "other", label: "Other Services" },
];

const VEHICLE_CATEGORIES = [
  { id: "small_car", label: "Small Car", example: "Toyota Yaris, Mazda 2" },
  { id: "medium_car", label: "Medium Car", example: "Toyota Camry, Mazda 3" },
  { id: "large_car", label: "Large Car", example: "BMW 5 Series" },
  { id: "small_suv", label: "Small SUV", example: "RAV4, CX-5" },
  { id: "large_suv", label: "Large SUV", example: "Prado, Everest" },
  { id: "ute", label: "Ute", example: "Hilux, Ranger" },
  { id: "commercial", label: "Commercial", example: "Hiace, Transit" },
  { id: "european", label: "European", example: "Audi, BMW, Mercedes" },
  { id: "performance", label: "Performance", example: "GTI, WRX" },
];

export default function GarageServicesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [garageName, setGarageName] = useState("");

  const [servicePricing, setServicePricing] = useState<ServicePricing>({
    services: [],
    acceptsManualTransmission: true,
    acceptsElectricVehicles: false,
    acceptsHybridVehicles: true,
    acceptsDiesel: true,
    drivletEnabled: true,
    drivletPickupFee: 0,
    drivletRadius: 15,
    leadTimeHours: 24,
    maxDailyBookings: 5,
    isPublished: false,
  });

  // Modal state
  const [showAddService, setShowAddService] = useState(false);
  const [editingService, setEditingService] = useState<ServiceOffering | null>(null);
  const [expandedService, setExpandedService] = useState<string | null>(null);

  // Fetch service pricing
  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch("/api/garage/services");
      const data = await res.json();

      if (res.ok && data.servicePricing) {
        setServicePricing(data.servicePricing);
        setGarageName(data.garageName || "");
      }
    } catch {
      setError("Failed to load services");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user?.role !== "garage") {
      router.push("/garage/login");
      return;
    }
    fetchServices();
  }, [session, status, router, fetchServices]);

  // Save all changes
  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/garage/services", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(servicePricing),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      setSuccess("Services saved successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // Add new service
  const handleAddService = (service: ServiceOffering) => {
    setServicePricing((prev) => ({
      ...prev,
      services: [...prev.services, service],
    }));
    setShowAddService(false);
  };

  // Update service
  const handleUpdateService = (index: number, service: ServiceOffering) => {
    setServicePricing((prev) => ({
      ...prev,
      services: prev.services.map((s, i) => (i === index ? service : s)),
    }));
    setEditingService(null);
  };

  // Delete service
  const handleDeleteService = (index: number) => {
    if (!confirm("Are you sure you want to delete this service?")) return;
    setServicePricing((prev) => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index),
    }));
  };

  // Toggle service active state
  const toggleServiceActive = (index: number) => {
    setServicePricing((prev) => ({
      ...prev,
      services: prev.services.map((s, i) =>
        i === index ? { ...s, isActive: !s.isActive } : s
      ),
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/garage/dashboard")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Service Catalog</h1>
              <p className="text-sm text-slate-500">{garageName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddService(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-500 transition"
            >
              <Plus className="h-4 w-4" />
              Add Service
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 transition disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </button>
          </div>
        </div>

        {/* Messages */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-4 text-red-700"
            >
              <AlertCircle className="h-5 w-5 shrink-0" />
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-emerald-700"
            >
              <CheckCircle className="h-5 w-5 shrink-0" />
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content - Services List */}
          <div className="lg:col-span-2 space-y-4">
            {servicePricing.services.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
                <Wrench className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-4 text-lg font-medium text-slate-900">No services yet</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Add your first service to start building your pricing catalog.
                </p>
                <button
                  onClick={() => setShowAddService(true)}
                  className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition"
                >
                  <Plus className="h-4 w-4" />
                  Add Your First Service
                </button>
              </div>
            ) : (
              servicePricing.services.map((service, index) => (
                <ServiceCard
                  key={index}
                  service={service}
                  isExpanded={expandedService === `${index}`}
                  onToggleExpand={() =>
                    setExpandedService(expandedService === `${index}` ? null : `${index}`)
                  }
                  onEdit={() => setEditingService(service)}
                  onDelete={() => handleDeleteService(index)}
                  onToggleActive={() => toggleServiceActive(index)}
                />
              ))
            )}
          </div>

          {/* Sidebar - Settings */}
          <div className="space-y-6">
            {/* Publication Status */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900">Catalog Status</h3>
                <button
                  onClick={() =>
                    setServicePricing((prev) => ({ ...prev, isPublished: !prev.isPublished }))
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    servicePricing.isPublished ? "bg-emerald-600" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                      servicePricing.isPublished ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {servicePricing.isPublished ? (
                  <>
                    <Eye className="h-4 w-4 text-emerald-600" />
                    <span className="text-emerald-700">Published - Visible to customers</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-500">Draft - Not visible to customers</span>
                  </>
                )}
              </div>
            </div>

            {/* Vehicle Settings */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Car className="h-5 w-5 text-slate-600" />
                Vehicle Types
              </h3>
              <div className="space-y-3">
                {[
                  { key: "acceptsManualTransmission", label: "Manual Transmission" },
                  { key: "acceptsElectricVehicles", label: "Electric Vehicles" },
                  { key: "acceptsHybridVehicles", label: "Hybrid Vehicles" },
                  { key: "acceptsDiesel", label: "Diesel Vehicles" },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center justify-between">
                    <span className="text-sm text-slate-700">{label}</span>
                    <input
                      type="checkbox"
                      checked={servicePricing[key as keyof ServicePricing] as boolean}
                      onChange={(e) =>
                        setServicePricing((prev) => ({
                          ...prev,
                          [key]: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Drivlet Settings */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Settings className="h-5 w-5 text-slate-600" />
                Drivlet Pickup Settings
              </h3>
              <div className="space-y-4">
                <label className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">Accept Drivlet Bookings</span>
                  <input
                    type="checkbox"
                    checked={servicePricing.drivletEnabled}
                    onChange={(e) =>
                      setServicePricing((prev) => ({
                        ...prev,
                        drivletEnabled: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </label>

                {servicePricing.drivletEnabled && (
                  <>
                    <div>
                      <label className="block text-sm text-slate-700 mb-1.5">
                        Pickup Radius (km)
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={50}
                        value={servicePricing.drivletRadius}
                        onChange={(e) =>
                          setServicePricing((prev) => ({
                            ...prev,
                            drivletRadius: parseInt(e.target.value) || 15,
                          }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-slate-700 mb-1.5">
                        Lead Time (hours)
                      </label>
                      <input
                        type="number"
                        min={2}
                        max={72}
                        value={servicePricing.leadTimeHours}
                        onChange={(e) =>
                          setServicePricing((prev) => ({
                            ...prev,
                            leadTimeHours: parseInt(e.target.value) || 24,
                          }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-slate-700 mb-1.5">
                        Max Daily Bookings
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={servicePricing.maxDailyBookings}
                        onChange={(e) =>
                          setServicePricing((prev) => ({
                            ...prev,
                            maxDailyBookings: parseInt(e.target.value) || 5,
                          }))
                        }
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Service Modal */}
      <AnimatePresence>
        {(showAddService || editingService) && (
          <ServiceModal
            service={editingService || undefined}
            onSave={(service) => {
              if (editingService) {
                const index = servicePricing.services.findIndex(
                  (s) => s.category === editingService.category && s.name === editingService.name
                );
                if (index >= 0) handleUpdateService(index, service);
              } else {
                handleAddService(service);
              }
            }}
            onClose={() => {
              setShowAddService(false);
              setEditingService(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Service Card Component
function ServiceCard({
  service,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  service: ServiceOffering;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}) {
  const categoryLabel = SERVICE_CATEGORIES.find((c) => c.id === service.category)?.label || service.category;

  return (
    <div
      className={`rounded-xl border bg-white transition ${
        service.isActive ? "border-slate-200" : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-slate-900 truncate">{service.name}</h3>
              {!service.isActive && (
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                  Inactive
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">{categoryLabel}</p>
            {service.description && (
              <p className="mt-1 text-sm text-slate-600 line-clamp-1">{service.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleActive}
              className={`rounded-lg p-2 transition ${
                service.isActive
                  ? "text-emerald-600 hover:bg-emerald-50"
                  : "text-slate-400 hover:bg-slate-100"
              }`}
              title={service.isActive ? "Deactivate" : "Activate"}
            >
              {service.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
            <button
              onClick={onEdit}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            >
              <Edit3 className="h-4 w-4" />
            </button>
            <button
              onClick={onDelete}
              className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={onToggleExpand}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 transition"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Price preview */}
        {service.prices.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {service.prices.slice(0, 3).map((price, i) => {
              const vehicleLabel = VEHICLE_CATEGORIES.find((v) => v.id === price.vehicleCategory)?.label;
              return (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
                >
                  <span className="font-medium">{vehicleLabel}:</span>
                  <span>${(price.priceFrom / 100).toFixed(0)}</span>
                  {price.priceTo && <span>- ${(price.priceTo / 100).toFixed(0)}</span>}
                </span>
              );
            })}
            {service.prices.length > 3 && (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
                +{service.prices.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Expanded pricing table */}
      <AnimatePresence>
        {isExpanded && service.prices.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-slate-100"
          >
            <div className="p-4 bg-slate-50">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-slate-500 uppercase">
                    <th className="pb-2">Vehicle Type</th>
                    <th className="pb-2">Price</th>
                    <th className="pb-2">Est. Time</th>
                    <th className="pb-2">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {service.prices.map((price, i) => {
                    const vehicle = VEHICLE_CATEGORIES.find((v) => v.id === price.vehicleCategory);
                    return (
                      <tr key={i}>
                        <td className="py-2">
                          <span className="font-medium text-slate-900">{vehicle?.label}</span>
                          <span className="block text-xs text-slate-400">{vehicle?.example}</span>
                        </td>
                        <td className="py-2 text-slate-900">
                          ${(price.priceFrom / 100).toFixed(0)}
                          {price.priceTo && ` - $${(price.priceTo / 100).toFixed(0)}`}
                        </td>
                        <td className="py-2 text-slate-600">{price.estimatedHours}h</td>
                        <td className="py-2 text-slate-500">{price.notes || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Service Modal Component
function ServiceModal({
  service,
  onSave,
  onClose,
}: {
  service?: ServiceOffering;
  onSave: (service: ServiceOffering) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<ServiceOffering>(
    service || {
      category: "",
      name: "",
      description: "",
      prices: [],
      isActive: true,
      includesPickup: true,
      requiresBooking: true,
    }
  );

  const [showPriceForm, setShowPriceForm] = useState(false);
  const [editingPriceIndex, setEditingPriceIndex] = useState<number | null>(null);
  const [priceForm, setPriceForm] = useState<PriceEntry>({
    vehicleCategory: "",
    priceFrom: 0,
    estimatedHours: 2,
  });

  const handleSavePrice = () => {
    if (!priceForm.vehicleCategory || priceForm.priceFrom <= 0) return;

    if (editingPriceIndex !== null) {
      setFormData((prev) => ({
        ...prev,
        prices: prev.prices.map((p, i) => (i === editingPriceIndex ? priceForm : p)),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        prices: [...prev.prices, priceForm],
      }));
    }

    setShowPriceForm(false);
    setEditingPriceIndex(null);
    setPriceForm({ vehicleCategory: "", priceFrom: 0, estimatedHours: 2 });
  };

  const handleDeletePrice = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      prices: prev.prices.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = () => {
    if (!formData.category || !formData.name) return;
    onSave(formData);
  };

  // Get available vehicle categories (not yet added)
  const availableVehicles = VEHICLE_CATEGORIES.filter(
    (v) => !formData.prices.some((p) => p.vehicleCategory === v.id) || editingPriceIndex !== null
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {service ? "Edit Service" : "Add New Service"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: "calc(90vh - 140px)" }}>
          <div className="space-y-5">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Service Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => {
                  const category = e.target.value;
                  const categoryData = SERVICE_CATEGORIES.find((c) => c.id === category);
                  setFormData((prev) => ({
                    ...prev,
                    category,
                    name: prev.name || categoryData?.label || "",
                  }));
                }}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">Select a category...</option>
                {SERVICE_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Service Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Full Logbook Service"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Description (optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what's included in this service..."
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
              />
            </div>

            {/* Pricing Matrix */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-slate-700">Pricing by Vehicle Type</label>
                <button
                  onClick={() => {
                    setShowPriceForm(true);
                    setEditingPriceIndex(null);
                    setPriceForm({ vehicleCategory: "", priceFrom: 0, estimatedHours: 2 });
                  }}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-500"
                >
                  <Plus className="h-4 w-4" />
                  Add Price
                </button>
              </div>

              {formData.prices.length > 0 ? (
                <div className="space-y-2">
                  {formData.prices.map((price, index) => {
                    const vehicle = VEHICLE_CATEGORIES.find((v) => v.id === price.vehicleCategory);
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
                      >
                        <div className="flex items-center gap-4">
                          <div>
                            <span className="font-medium text-slate-900">{vehicle?.label}</span>
                            <span className="ml-2 text-sm text-slate-500">{vehicle?.example}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1 text-slate-900">
                            <DollarSign className="h-4 w-4 text-slate-400" />
                            <span className="font-semibold">
                              {(price.priceFrom / 100).toFixed(0)}
                              {price.priceTo && ` - ${(price.priceTo / 100).toFixed(0)}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-500">
                            <Clock className="h-4 w-4" />
                            <span>{price.estimatedHours}h</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingPriceIndex(index);
                                setPriceForm(price);
                                setShowPriceForm(true);
                              }}
                              className="rounded p-1.5 text-slate-400 hover:bg-white hover:text-slate-600"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePrice(index)}
                              className="rounded p-1.5 text-slate-400 hover:bg-white hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border-2 border-dashed border-slate-200 p-8 text-center">
                  <DollarSign className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-sm text-slate-500">
                    No pricing added yet. Add prices for different vehicle types.
                  </p>
                </div>
              )}

              {/* Add/Edit Price Form */}
              <AnimatePresence>
                {showPriceForm && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-4 overflow-hidden rounded-lg border border-emerald-200 bg-emerald-50"
                  >
                    <div className="p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Vehicle Type
                          </label>
                          <select
                            value={priceForm.vehicleCategory}
                            onChange={(e) =>
                              setPriceForm((prev) => ({ ...prev, vehicleCategory: e.target.value }))
                            }
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="">Select...</option>
                            {availableVehicles.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Estimated Hours
                          </label>
                          <input
                            type="number"
                            min={0.5}
                            step={0.5}
                            value={priceForm.estimatedHours}
                            onChange={(e) =>
                              setPriceForm((prev) => ({
                                ...prev,
                                estimatedHours: parseFloat(e.target.value) || 2,
                              }))
                            }
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Price From ($)
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={(priceForm.priceFrom / 100).toFixed(0)}
                            onChange={(e) =>
                              setPriceForm((prev) => ({
                                ...prev,
                                priceFrom: (parseFloat(e.target.value) || 0) * 100,
                              }))
                            }
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Price To ($) - Optional
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={priceForm.priceTo ? (priceForm.priceTo / 100).toFixed(0) : ""}
                            onChange={(e) =>
                              setPriceForm((prev) => ({
                                ...prev,
                                priceTo: e.target.value ? (parseFloat(e.target.value) || 0) * 100 : undefined,
                              }))
                            }
                            placeholder="Optional"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          Notes (optional)
                        </label>
                        <input
                          type="text"
                          value={priceForm.notes || ""}
                          onChange={(e) =>
                            setPriceForm((prev) => ({ ...prev, notes: e.target.value }))
                          }
                          placeholder="e.g., Includes genuine parts"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setShowPriceForm(false);
                            setEditingPriceIndex(null);
                          }}
                          className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSavePrice}
                          disabled={!priceForm.vehicleCategory || priceForm.priceFrom <= 0}
                          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          {editingPriceIndex !== null ? "Update Price" : "Add Price"}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Options */}
            <div className="border-t border-slate-200 pt-5">
              <label className="text-sm font-medium text-slate-700">Options</label>
              <div className="mt-3 space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.includesPickup}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, includesPickup: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-slate-700">Available for Drivlet pickup</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.requiresBooking}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, requiresBooking: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-slate-700">Requires advance booking</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!formData.category || !formData.name}
            className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
          >
            {service ? "Update Service" : "Add Service"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
