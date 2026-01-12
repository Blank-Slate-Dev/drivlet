// src/app/garage/quotes/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronUp,
  Filter,
  Loader2,
  Car,
  Calendar,
  MapPin,
  RefreshCw,
  Search,
  Zap,
  Send,
  Tag,
  Plus,
  X,
  Shield,
  DollarSign,
  Eye,
  MessageSquare,
  ArrowRight,
  Wrench,
} from 'lucide-react';

type ServiceCategory = 'mechanical' | 'electrical' | 'bodywork' | 'tyres' | 'servicing' | 'other';

interface QuoteRequest {
  _id: string;
  vehicleRegistration: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  serviceCategory: ServiceCategory;
  serviceDescription: string;
  selectedServices: string[];
  urgency: 'immediate' | 'this_week' | 'flexible';
  locationAddress: string;
  status: string;
  quotesReceived: number;
  expiresAt: string;
  createdAt: string;
  hasSubmittedQuote?: boolean;
}

interface QuoteFormData {
  quotedAmount: string;
  estimatedDuration: string;
  availableFrom: string;
  includedServices: string[];
  warrantyOffered: string;
  additionalNotes: string;
}

interface FormErrors {
  quotedAmount?: string;
  estimatedDuration?: string;
  availableFrom?: string;
  includedServices?: string;
  general?: string;
}

const CATEGORY_CONFIG: Record<
  ServiceCategory,
  { label: string; color: string; bgColor: string; icon: React.ElementType }
> = {
  mechanical: { label: 'Mechanical', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: Wrench },
  electrical: { label: 'Electrical', color: 'text-amber-700', bgColor: 'bg-amber-100', icon: Zap },
  bodywork: { label: 'Bodywork', color: 'text-pink-700', bgColor: 'bg-pink-100', icon: Car },
  tyres: { label: 'Tyres & Wheels', color: 'text-slate-700', bgColor: 'bg-slate-200', icon: Car },
  servicing: { label: 'Servicing', color: 'text-emerald-700', bgColor: 'bg-emerald-100', icon: Wrench },
  other: { label: 'Other', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: Tag },
};

const URGENCY_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  immediate: { label: 'Urgent', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
  this_week: { label: 'This Week', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
  flexible: { label: 'Flexible', color: 'text-sky-700', bgColor: 'bg-sky-50', borderColor: 'border-sky-200' },
};

// Get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

interface QuoteRequestCardProps {
  request: QuoteRequest;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onQuoteSubmitted: () => void;
}

function QuoteRequestCard({
  request,
  index,
  isExpanded,
  onToggleExpand,
  onQuoteSubmitted,
}: QuoteRequestCardProps) {
  const [formData, setFormData] = useState<QuoteFormData>({
    quotedAmount: '',
    estimatedDuration: '',
    availableFrom: getTodayDate(),
    includedServices: [...(request.selectedServices || [])],
    warrantyOffered: '',
    additionalNotes: '',
  });
  const [newService, setNewService] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const categoryConfig = CATEGORY_CONFIG[request.serviceCategory];
  const urgencyConfig = URGENCY_CONFIG[request.urgency];
  const CategoryIcon = categoryConfig?.icon || Wrench;

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  const getDaysUntilExpiry = (expiresAt: string) => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const daysUntilExpiry = getDaysUntilExpiry(request.expiresAt);
  const isNew = getDaysUntilExpiry(request.createdAt) >= -1; // Posted within last day

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    const amount = parseFloat(formData.quotedAmount);
    if (!formData.quotedAmount || isNaN(amount) || amount <= 0) {
      newErrors.quotedAmount = 'Please enter a valid amount greater than $0';
    }

    if (!formData.estimatedDuration || formData.estimatedDuration.trim().length === 0) {
      newErrors.estimatedDuration = 'Please enter an estimated duration';
    }

    if (!formData.availableFrom) {
      newErrors.availableFrom = 'Please select an availability date';
    }

    if (formData.includedServices.length === 0) {
      newErrors.includedServices = 'At least one service must be included';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddService = () => {
    const trimmedService = newService.trim();
    if (trimmedService && !formData.includedServices.includes(trimmedService)) {
      setFormData((prev) => ({
        ...prev,
        includedServices: [...prev.includedServices, trimmedService],
      }));
      setNewService('');
      if (errors.includedServices) {
        setErrors((prev) => ({ ...prev, includedServices: undefined }));
      }
    }
  };

  const handleRemoveService = (serviceToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      includedServices: prev.includedServices.filter((s) => s !== serviceToRemove),
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddService();
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    setErrors({});

    try {
      const response = await fetch('/api/garage/quotes/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteRequestId: request._id,
          quotedAmount: parseFloat(formData.quotedAmount) * 100,
          estimatedDuration: formData.estimatedDuration.trim(),
          includedServices: formData.includedServices,
          warrantyOffered: formData.warrantyOffered.trim() || undefined,
          additionalNotes: formData.additionalNotes.trim() || undefined,
          availableFrom: formData.availableFrom,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          setErrors(data.errors);
        } else {
          setErrors({ general: data.error || 'Failed to submit quote' });
        }
        return;
      }

      onQuoteSubmitted();
    } catch {
      setErrors({ general: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="group"
    >
      <div
        className={`relative bg-white rounded-2xl overflow-hidden transition-all duration-300 ease-out ${
          request.hasSubmittedQuote
            ? 'border-2 border-emerald-200 shadow-sm shadow-emerald-100'
            : isExpanded
            ? 'border-2 border-emerald-500 shadow-xl shadow-emerald-100/50 scale-[1.01]'
            : 'border border-slate-200 shadow-sm hover:shadow-lg hover:border-slate-300 hover:scale-[1.005]'
        }`}
      >
        {/* Gradient accent bar */}
        <div
          className={`absolute top-0 left-0 right-0 h-1 ${
            request.hasSubmittedQuote
              ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
              : request.urgency === 'immediate'
              ? 'bg-gradient-to-r from-red-400 to-orange-500'
              : 'bg-gradient-to-r from-emerald-500 to-teal-500'
          }`}
        />

        {/* Card Content */}
        <div className="p-5 sm:p-6">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              {/* Vehicle Icon */}
              <div
                className={`relative flex-shrink-0 h-14 w-14 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 ${
                  request.hasSubmittedQuote
                    ? 'bg-gradient-to-br from-emerald-100 to-teal-100'
                    : 'bg-gradient-to-br from-slate-100 to-slate-50'
                }`}
              >
                <Car
                  className={`h-7 w-7 ${
                    request.hasSubmittedQuote ? 'text-emerald-600' : 'text-slate-600'
                  }`}
                />
                {isNew && !request.hasSubmittedQuote && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
                )}
              </div>

              {/* Vehicle Info */}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                    {request.vehicleRegistration}
                  </h3>
                  {isNew && !request.hasSubmittedQuote && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500 text-white">
                      New
                    </span>
                  )}
                </div>
                {request.vehicleMake && (
                  <p className="text-sm text-slate-600 font-medium">
                    {request.vehicleYear} {request.vehicleMake} {request.vehicleModel}
                  </p>
                )}
              </div>
            </div>

            {/* Quote Count Badge */}
            <div
              className={`flex-shrink-0 text-center px-4 py-2.5 rounded-xl transition-all duration-300 ${
                request.quotesReceived > 0
                  ? 'bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200'
                  : 'bg-slate-50'
              }`}
              title={`${request.quotesReceived} quote${request.quotesReceived !== 1 ? 's' : ''} received`}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-slate-500" />
                <span className="text-xl font-bold text-slate-700">{request.quotesReceived}</span>
              </div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mt-0.5">
                Quote{request.quotesReceived !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Badges Row */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            {/* Category Badge */}
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-transform hover:scale-105 ${categoryConfig?.bgColor} ${categoryConfig?.color}`}
            >
              <CategoryIcon className="h-3.5 w-3.5" />
              {categoryConfig?.label || request.serviceCategory}
            </span>

            {/* Urgency Badge */}
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-transform hover:scale-105 ${urgencyConfig?.bgColor} ${urgencyConfig?.color} ${urgencyConfig?.borderColor}`}
            >
              {request.urgency === 'immediate' && <Zap className="h-3.5 w-3.5" />}
              {request.urgency === 'this_week' && <Clock className="h-3.5 w-3.5" />}
              {request.urgency === 'flexible' && <Calendar className="h-3.5 w-3.5" />}
              {urgencyConfig?.label}
            </span>

            {/* Status Badge */}
            {request.hasSubmittedQuote && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200 transition-transform hover:scale-105">
                <CheckCircle className="h-3.5 w-3.5" />
                Quote Submitted
              </span>
            )}
          </div>

          {/* Service Description */}
          <div className="mb-4">
            <p className="text-sm text-slate-700 leading-relaxed line-clamp-2">
              {request.serviceDescription}
            </p>
          </div>

          {/* Selected Services Tags */}
          {request.selectedServices && request.selectedServices.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {request.selectedServices.slice(0, 4).map((service, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200 transition-colors"
                >
                  <Tag className="h-3 w-3" />
                  {service}
                </span>
              ))}
              {request.selectedServices.length > 4 && (
                <span className="px-2.5 py-1 rounded-md bg-slate-50 text-slate-500 text-xs font-medium">
                  +{request.selectedServices.length - 4} more
                </span>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-slate-100 my-4" />

          {/* Footer: Meta Info & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span className="truncate max-w-[200px]">{request.locationAddress}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-slate-400" />
                {getTimeAgo(request.createdAt)}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 ${
                  daysUntilExpiry <= 2 ? 'text-amber-600 font-medium' : ''
                }`}
              >
                <Calendar className="h-4 w-4" />
                {daysUntilExpiry > 0 ? `${daysUntilExpiry}d left` : 'Expires today'}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              {request.hasSubmittedQuote ? (
                <Link
                  href={`/garage/quotes/view/${request._id}`}
                  className="group/btn inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ease-out bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border border-emerald-200 hover:from-emerald-100 hover:to-teal-100 hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-100 active:scale-[0.98]"
                >
                  <Eye className="h-4 w-4 transition-transform group-hover/btn:scale-110" />
                  View Quote
                  <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
                </Link>
              ) : (
                <button
                  onClick={onToggleExpand}
                  className={`group/btn inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ease-out ${
                    isExpanded
                      ? 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 active:scale-[0.98]'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-200 hover:from-emerald-500 hover:to-teal-500 hover:shadow-lg hover:shadow-emerald-200 hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-4 w-4 transition-transform group-hover/btn:-translate-y-0.5" />
                      Close Form
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                      Submit Quote
                      <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Expandable Quote Form */}
        <AnimatePresence>
          {isExpanded && !request.hasSubmittedQuote && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="border-t-2 border-emerald-100 bg-gradient-to-b from-slate-50 to-white p-5 sm:p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <Send className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-900">Submit Your Quote</h4>
                    <p className="text-sm text-slate-500">
                      Fill in the details below to submit your quote
                    </p>
                  </div>
                </div>

                {/* General error */}
                {errors.general && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3"
                  >
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 font-medium">{errors.general}</p>
                  </motion.div>
                )}

                <div className="space-y-5">
                  {/* Row 1: Amount and Duration */}
                  <div className="grid gap-5 sm:grid-cols-2">
                    {/* Quoted Amount */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Quoted Amount <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={formData.quotedAmount}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, quotedAmount: e.target.value }))
                          }
                          className={`w-full pl-12 pr-16 py-3 rounded-xl border-2 transition-all duration-200 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 ${
                            errors.quotedAmount
                              ? 'border-red-300 bg-red-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">
                          AUD
                        </span>
                      </div>
                      {errors.quotedAmount && (
                        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5" />
                          {errors.quotedAmount}
                        </p>
                      )}
                    </div>

                    {/* Estimated Duration */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Estimated Duration <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., 2 hours, 1 day, 2-3 hours"
                        value={formData.estimatedDuration}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, estimatedDuration: e.target.value }))
                        }
                        className={`w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 ${
                          errors.estimatedDuration
                            ? 'border-red-300 bg-red-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      />
                      {errors.estimatedDuration && (
                        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5" />
                          {errors.estimatedDuration}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Available From and Warranty */}
                  <div className="grid gap-5 sm:grid-cols-2">
                    {/* Available From */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Available From <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                          type="date"
                          min={getTodayDate()}
                          value={formData.availableFrom}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, availableFrom: e.target.value }))
                          }
                          className={`w-full pl-12 pr-4 py-3 rounded-xl border-2 transition-all duration-200 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 ${
                            errors.availableFrom
                              ? 'border-red-300 bg-red-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        />
                      </div>
                      {errors.availableFrom && (
                        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5" />
                          {errors.availableFrom}
                        </p>
                      )}
                    </div>

                    {/* Warranty */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Warranty Offered{' '}
                        <span className="text-slate-400 font-normal">(optional)</span>
                      </label>
                      <div className="relative">
                        <Shield className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="e.g., 12 months / 20,000km"
                          value={formData.warrantyOffered}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, warrantyOffered: e.target.value }))
                          }
                          className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 hover:border-slate-300 transition-all duration-200 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Included Services */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Included Services <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        placeholder="Add a service..."
                        value={newService}
                        onChange={(e) => setNewService(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 ${
                          errors.includedServices && formData.includedServices.length === 0
                            ? 'border-red-300 bg-red-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={handleAddService}
                        className="px-4 py-3 rounded-xl bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-all duration-200 hover:scale-105 active:scale-95"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>
                    {errors.includedServices && (
                      <p className="mb-3 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {errors.includedServices}
                      </p>
                    )}
                    {formData.includedServices.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.includedServices.map((service, idx) => (
                          <motion.span
                            key={idx}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-100 text-emerald-700 text-sm font-medium"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            {service}
                            <button
                              type="button"
                              onClick={() => handleRemoveService(service)}
                              className="hover:text-emerald-900 hover:bg-emerald-200 rounded-full p-0.5 transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </motion.span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Additional Notes */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Additional Notes{' '}
                      <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Any additional information about your quote..."
                      value={formData.additionalNotes}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, additionalNotes: e.target.value }))
                      }
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 hover:border-slate-300 transition-all duration-200 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 resize-none"
                    />
                  </div>

                  {/* Validity notice */}
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <p className="text-sm text-blue-700">
                      Your quote will be valid for 14 days from submission.
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold shadow-md shadow-emerald-200 transition-all duration-200 hover:from-emerald-500 hover:to-teal-500 hover:shadow-lg hover:shadow-emerald-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="h-5 w-5" />
                          Submit Quote
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={onToggleExpand}
                      disabled={submitting}
                      className="px-6 py-3.5 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold transition-all duration-200 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function GarageQuoteRequestsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<ServiceCategory | 'all'>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedQuoteId, setExpandedQuoteId] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/garage/quotes');
    } else if (session?.user?.role !== 'garage') {
      router.push('/');
    }
  }, [sessionStatus, session, router]);

  const fetchQuoteRequests = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (urgencyFilter !== 'all') params.append('urgency', urgencyFilter);

      const response = await fetch(`/api/garage/quote-requests?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch quote requests');
      }

      setQuoteRequests(data.quoteRequests);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (session?.user?.role === 'garage') {
      fetchQuoteRequests();
    }
  }, [session, categoryFilter, urgencyFilter]);

  const handleToggleExpand = (requestId: string) => {
    setExpandedQuoteId((prev) => (prev === requestId ? null : requestId));
  };

  const handleQuoteSubmitted = () => {
    setExpandedQuoteId(null);
    fetchQuoteRequests(true);
  };

  const filteredRequests = quoteRequests.filter((request) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      request.vehicleRegistration.toLowerCase().includes(search) ||
      request.serviceDescription.toLowerCase().includes(search) ||
      request.vehicleMake?.toLowerCase().includes(search) ||
      request.vehicleModel?.toLowerCase().includes(search) ||
      request.locationAddress.toLowerCase().includes(search)
    );
  });

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="h-16 w-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          </div>
          <p className="text-slate-600 font-medium">Loading quote requests...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user?.role !== 'garage') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 backdrop-blur-xl bg-white/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Quote Requests
              </h1>
              <p className="mt-1 text-slate-600">
                Browse and submit quotes for customer service requests
              </p>
            </div>
            <button
              onClick={() => fetchQuoteRequests(true)}
              disabled={refreshing}
              className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-slate-200 bg-white text-slate-700 font-medium transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 transition-transform ${
                  refreshing ? 'animate-spin' : 'group-hover:rotate-180'
                }`}
              />
              Refresh
            </button>
          </div>

          {/* Search and filters */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by registration, vehicle, location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-200 transition-all duration-200 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 hover:border-slate-300"
              />
            </div>

            {/* Category filter */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as ServiceCategory | 'all')}
                  className="pl-12 pr-8 py-3 rounded-xl border-2 border-slate-200 bg-white appearance-none cursor-pointer transition-all duration-200 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 hover:border-slate-300"
                >
                  <option value="all">All Categories</option>
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Urgency filter */}
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="px-4 py-3 rounded-xl border-2 border-slate-200 bg-white appearance-none cursor-pointer transition-all duration-200 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 hover:border-slate-300"
            >
              <option value="all">All Urgency</option>
              <option value="immediate">Urgent</option>
              <option value="this_week">This Week</option>
              <option value="flexible">Flexible</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3"
          >
            <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800">Error loading requests</p>
              <p className="text-sm text-red-600 mt-0.5">{error}</p>
            </div>
          </motion.div>
        )}

        {filteredRequests.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-slate-100 mb-5">
              <FileText className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">No quote requests found</h3>
            <p className="mt-2 text-slate-600 max-w-md mx-auto">
              {searchTerm || categoryFilter !== 'all' || urgencyFilter !== 'all'
                ? 'Try adjusting your filters to see more requests.'
                : 'New quote requests will appear here as customers submit them.'}
            </p>
          </motion.div>
        ) : (
          <div className="grid gap-5">
            <AnimatePresence mode="popLayout">
              {filteredRequests.map((request, index) => (
                <QuoteRequestCard
                  key={request._id}
                  request={request}
                  index={index}
                  isExpanded={expandedQuoteId === request._id}
                  onToggleExpand={() => handleToggleExpand(request._id)}
                  onQuoteSubmitted={handleQuoteSubmitted}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
