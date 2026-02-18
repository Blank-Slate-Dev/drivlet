// src/app/policies/page.tsx
'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/homepage/Footer';
import {
  Shield,
  FileText,
  Eye,
  AlertTriangle,
  Clock,
  Mail,
  MessageSquare,
  ChevronDown,
  Phone,
  Globe,
  ExternalLink,
} from 'lucide-react';

// ════════════════════════════════════════════════════════════════════════
// Policy data
// ════════════════════════════════════════════════════════════════════════

interface PolicySection {
  id: string;
  title: string;
  shortTitle: string;
  icon: React.ElementType;
  lastUpdated: string;
  summary: string;
  content: React.ReactNode;
}

const policies: PolicySection[] = [
  {
    id: 'terms',
    title: 'Website Terms and Conditions',
    shortTitle: 'Terms',
    icon: FileText,
    lastUpdated: '9 February 2026',
    summary:
      'Covers the use of the Drivlet platform, service bookings, payment processing, liability, and your rights and responsibilities.',
    content: (
      <>
        <p className="text-sm text-slate-500 mb-6">
          Commuto Group Pty Ltd (ABN 73 687 063 618) trading as Drivlet
        </p>

        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-5 mb-8">
          <h4 className="font-semibold text-emerald-900 mb-3">Quick summary</h4>
          <ul className="space-y-2 text-sm text-emerald-800">
            <li className="flex gap-2"><span className="text-emerald-500 mt-0.5">•</span>We provide scheduled vehicle pick-up, delivery to your nominated workshop, and return of your vehicle.</li>
            <li className="flex gap-2"><span className="text-emerald-500 mt-0.5">•</span>You choose your workshop and pay the workshop directly for servicing/repairs.</li>
            <li className="flex gap-2"><span className="text-emerald-500 mt-0.5">•</span>We take condition photos and capture handover sign-offs at pick-up and return.</li>
            <li className="flex gap-2"><span className="text-emerald-500 mt-0.5">•</span>Distance-based surcharges may apply based on driving distance from pick-up to workshop (shown at checkout).</li>
            <li className="flex gap-2"><span className="text-emerald-500 mt-0.5">•</span>We only accept vehicles under AUD $100,000 market value.</li>
            <li className="flex gap-2"><span className="text-emerald-500 mt-0.5">•</span>Drivlet maintains commercial insurance for vehicle transport activities. This does not replace your own motor insurance.</li>
          </ul>
        </div>

        <div className="space-y-8">
          <PolicyClause number="1" title="Acceptance">
            <p>By using the Site or placing a booking, you agree to these Terms and the linked policies. If you do not agree, do not use the Site or place a booking.</p>
          </PolicyClause>

          <PolicyClause number="2" title="Linked Policies">
            <p>Linked policies form part of these Terms: Cancellation, Rescheduling and Refunds Policy, Privacy Policy, and Complaints Handling Policy.</p>
          </PolicyClause>

          <PolicyClause number="3" title="Who We Are">
            <p>Commuto Group Pty Ltd (ABN 73 687 063 618) trading as Drivlet (we, us, our) operates the Drivlet brand and provides the Services described in these Terms.</p>
          </PolicyClause>

          <PolicyClause number="4" title="Our Service and the Workshop Relationship">
            <p>We provide scheduled vehicle pick-up, delivery to your nominated service centre/workshop (Workshop), and return of your vehicle (Services).</p>
            <p className="mt-3">Unless we clearly state otherwise for a particular booking:</p>
            <ul className="mt-2 space-y-1.5 text-slate-600">
              <li className="flex gap-2"><span className="text-slate-400">•</span>you choose the Workshop and you pay the Workshop directly for servicing/repairs;</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>Workshop services are supplied by the Workshop, not by us; and</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>we do not control Workshop pricing, workmanship, parts, warranties or timelines.</li>
            </ul>
          </PolicyClause>

          <PolicyClause number="5" title="Eligibility, Authority and Safety">
            <p><strong>Vehicle value cap:</strong> we only accept vehicles with an estimated market value under AUD $100,000. If we reasonably believe the vehicle exceeds this cap, we may refuse or cancel the booking.</p>
            <p className="mt-3"><strong>Authority to hand over:</strong> you confirm you are authorised to give us custody of the vehicle and you authorise our employee drivers to drive the vehicle solely for completing the Services.</p>
            <p className="mt-3"><strong>Roadworthiness and legality:</strong> you must ensure the vehicle is registered and, to the best of your knowledge, safe and lawful to drive. We may refuse or stop a service where it is unsafe or unlawful to proceed.</p>
            <p className="mt-3"><strong>Accurate vehicle details:</strong> you must provide accurate vehicle details including transmission type (automatic/manual) and any immobiliser/special starting instructions.</p>
          </PolicyClause>

          <PolicyClause number="6" title="Bookings, Time Windows and Changes">
            <p>Bookings are scheduled using pick-up and return time windows. Times are estimates and may change due to traffic, Workshop readiness, weather, or operational constraints.</p>
            <p className="mt-3">A booking is confirmed when you receive a booking confirmation from us (by email/SMS or within the Site).</p>
            <p className="mt-3">You must provide accurate addresses, access notes, vehicle details and Workshop details. If information is incorrect or incomplete, the service may be delayed or may be unable to proceed.</p>
          </PolicyClause>

          <PolicyClause number="7" title="Fees, Cancellations and Refunds">
            <p>You pay us a service fee for the Services (Drivlet Service Fee). The fee and what it includes will be shown at checkout or in your booking confirmation.</p>
            <p className="mt-3"><strong>Distance-based surcharge:</strong> an additional surcharge may apply based on the driving distance between your pick-up location and your nominated Workshop (calculated at checkout). The surcharge covers the round trip. All prices are in AUD and include GST.</p>
            <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200 p-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-slate-600">0–12 km</span><span className="font-medium text-slate-900">No extra fee</span>
                <span className="text-slate-600">12–15 km</span><span className="font-medium text-slate-900">+$29</span>
                <span className="text-slate-600">15–18 km</span><span className="font-medium text-slate-900">+$49</span>
                <span className="text-slate-600">18+ km</span><span className="font-medium text-slate-900">Contact us</span>
              </div>
            </div>
            <p className="mt-3">Workshop charges are separate and are paid by you directly to the Workshop.</p>
            <p className="mt-3">Cancellations, rescheduling and refunds are governed by our Cancellation, Rescheduling and Refunds Policy.</p>
          </PolicyClause>

          <PolicyClause number="8" title="Handover Process, Evidence and Personal Items">
            <p>We use a structured handover process. This may include condition photos, timestamps and electronic sign-offs at pick-up and return.</p>
            <p className="mt-3">You (or your authorised representative) must be available and contactable during the relevant time windows to complete a safe handover.</p>
            <p className="mt-3">You must remove personal items and valuables before pick-up. To the extent permitted by law, we are not responsible for loss of, or damage to, personal items left in the vehicle.</p>
            <p className="mt-3">If you believe our team has caused damage, notify us as soon as possible (ideally within 24 hours) with details and photos so we can investigate promptly.</p>
          </PolicyClause>

          <PolicyClause number="9" title="Tolls, Parking and Infringements">
            <p>We may use reasonable routes to complete the Services, which may include toll roads where practical.</p>
            <p className="mt-3">Unless we tell you otherwise at booking, tolls and ordinary parking costs directly incurred in providing the Services are included in the Drivlet Service Fee.</p>
            <p className="mt-3">We take reasonable care to avoid infringements. If an infringement occurs due to our driver&apos;s actions while providing the Services, we will handle it. If it relates to pre-existing vehicle status or customer-provided instructions, you are responsible.</p>
          </PolicyClause>

          <PolicyClause number="10" title="Tracking, Communications and Privacy">
            <p>We coordinate Services using our web app and operational systems. During an active booking, we may track driver location through the Drivlet web app for dispatch, customer support, safety and incident management.</p>
            <p className="mt-3">We may contact you by phone, SMS or email about your booking. Our collection and handling of personal information is described in our Privacy Policy.</p>
          </PolicyClause>

          <PolicyClause number="11" title="Liability and Australian Consumer Law">
            <p>Nothing in these Terms excludes, restricts or modifies any rights you may have under the Australian Consumer Law or other laws that cannot be excluded.</p>
            <p className="mt-3">To the extent permitted by law:</p>
            <ul className="mt-2 space-y-1.5 text-slate-600">
              <li className="flex gap-2"><span className="text-slate-400">•</span>we are not liable for indirect or consequential loss;</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>we are not responsible for Workshop services; and</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>for service delays not caused by our negligence, our liability is limited to resupplying the Services or refunding the Drivlet Service Fee.</li>
            </ul>
            <p className="mt-3">Drivlet maintains commercial insurance for vehicle transport activities. This does not replace your own motor insurance.</p>
          </PolicyClause>

          <PolicyClause number="12" title="Website Use and Intellectual Property">
            <p>The Site and its content are owned by or licensed to us. You must not copy, modify, distribute, reverse engineer, scrape, interfere with, or misuse the Site except as permitted by law.</p>
          </PolicyClause>

          <PolicyClause number="13" title="Complaints, Changes and Governing Law">
            <p>If you have a complaint, contact us with your booking reference and a clear description of the issue.</p>
            <p className="mt-3">We may update these Terms from time to time. The version published on the Site at the time you place your booking will generally apply to that booking, unless the law requires otherwise.</p>
            <p className="mt-3">These Terms are governed by the laws of New South Wales, Australia. You submit to the non-exclusive jurisdiction of the courts of New South Wales.</p>
          </PolicyClause>
        </div>
      </>
    ),
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    shortTitle: 'Privacy',
    icon: Eye,
    lastUpdated: '9 February 2026',
    summary:
      'How Drivlet collects, uses, stores, and protects your personal information under the Australian Privacy Act 1988.',
    content: (
      <>
        <p className="text-sm text-slate-500 mb-6">
          Commuto Group Pty Ltd (ABN 73 687 063 618) trading as Drivlet
        </p>

        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-5 mb-8">
          <p className="text-sm text-emerald-800">
            <strong>Quick summary:</strong> We collect only what we need to pick up and return your vehicle safely. We take condition photos and capture handover sign-offs. We share limited details with your nominated workshop to complete handover. We do not sell your information. Some service providers may store or process personal information outside Australia.
          </p>
        </div>

        <div className="space-y-8">
          <PolicyClause title="What We Collect">
            <ul className="space-y-1.5 text-slate-600">
              <li className="flex gap-2"><span className="text-slate-400">•</span>Your details (name, phone number, email).</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>Booking details (pick-up/return address, access notes, time windows, and your nominated workshop details).</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>Vehicle details for safe handling (registration, make/model, transmission, special instructions).</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>Handover records (condition photos, notes, timestamps and electronic sign-offs).</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>Support communications (messages, emails, call notes, and call recordings where we notify you).</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>Payment records for Drivlet fees (status, receipts and transaction identifiers). Card details are handled by our payment provider.</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>Website usage data (IP address, device/browser information, and basic analytics/cookies).</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>Any additional information you choose to provide.</li>
            </ul>
            <p className="mt-3 text-slate-600"><strong>Sensitive information:</strong> we do not generally collect sensitive information. If we need it, we will only collect it with your consent or where required/authorised by law.</p>
          </PolicyClause>

          <PolicyClause title="Why We Use It">
            <ul className="space-y-1.5 text-slate-600">
              <li className="flex gap-2"><span className="text-slate-400">•</span>To provide pick-up, delivery to your nominated workshop, and return.</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>To coordinate safe handovers and reduce disputes (photos and sign-offs).</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>To communicate about timing, changes, cancellations, incidents and support.</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>To handle incidents, claims, complaints and dispute resolution.</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>To prevent fraud, keep our people and customers safe, and protect our systems.</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>To comply with legal, regulatory and tax obligations, and to improve our service.</li>
            </ul>
          </PolicyClause>

          <PolicyClause title="When We Share It">
            <ul className="space-y-1.5 text-slate-600">
              <li className="flex gap-2"><span className="text-slate-400">•</span>Drivlet staff and employee drivers who need it to complete your booking.</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>Your nominated workshop (typically your name, timing, vehicle handover details). We do not share your payment details with the workshop.</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>Service providers who help us run the business (payment processing, IT/hosting, communications, analytics). Some may store or process data outside Australia.</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>Insurers and professional advisers where needed.</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>Regulators or law enforcement where required or authorised by law.</li>
            </ul>
          </PolicyClause>

          <PolicyClause title="Security, Retention and Your Choices">
            <p>We take reasonable steps to protect personal information using technical and organisational measures. No system is 100% secure, but we work to reduce risk and respond to incidents appropriately.</p>
            <p className="mt-3">We keep information only as long as needed for bookings, safety/incident handling, dispute resolution, and legal requirements, then delete or de-identify it.</p>
            <p className="mt-3">You can request access or corrections by emailing support@drivlet.com.au (we may verify your identity and aim to respond within 30 days). You can opt out of marketing anytime. If you have a privacy complaint, contact us. If not satisfied, you may contact the OAIC.</p>
            <p className="mt-3">Nothing in this Privacy Policy limits your rights under the Privacy Act 1988 (Cth) and the Australian Privacy Principles.</p>
          </PolicyClause>
        </div>
      </>
    ),
  },
  {
    id: 'cancellation',
    title: 'Cancellation, Rescheduling & Refunds',
    shortTitle: 'Cancellation',
    icon: Clock,
    lastUpdated: '9 February 2026',
    summary:
      'Conditions under which bookings can be cancelled, applicable refund timeframes, and fees that may apply.',
    content: (
      <>
        <p className="text-sm text-slate-500 mb-6">
          Commuto Group Pty Ltd (ABN 73 687 063 618) trading as Drivlet
        </p>

        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-5 mb-8">
          <h4 className="font-semibold text-emerald-900 mb-3">At a glance</h4>
          <ul className="space-y-2 text-sm text-emerald-800">
            <li className="flex gap-2"><span className="text-emerald-500 mt-0.5">•</span><strong>More than 3 hours before pick-up:</strong> full refund / free reschedule.</li>
            <li className="flex gap-2"><span className="text-emerald-500 mt-0.5">•</span><strong>Within 3 hours of pick-up:</strong> generally non-refundable, except where required under Australian Consumer Law.</li>
            <li className="flex gap-2"><span className="text-emerald-500 mt-0.5">•</span><strong>No-show / not reachable / car not accessible:</strong> generally non-refundable.</li>
            <li className="flex gap-2"><span className="text-emerald-500 mt-0.5">•</span><strong>If Drivlet cancels:</strong> full refund or reschedule.</li>
            <li className="flex gap-2"><span className="text-emerald-500 mt-0.5">•</span><strong>Workshop charges:</strong> paid directly to the workshop — their terms are separate.</li>
          </ul>
        </div>

        <div className="space-y-8">
          <PolicyClause title="How to Cancel or Reschedule">
            <p>Cancel or request a reschedule using the cancellation link in your confirmation message, or contact us. Your cancellation time is when we receive the request (not when you send it).</p>
          </PolicyClause>

          <PolicyClause title="What This Covers">
            <p>This policy covers the Drivlet service fee for scheduled pick-up and return of your vehicle (including any distance/zone fee). If your workshop timing changes, we&apos;ll work with you to adjust the return time where possible.</p>
          </PolicyClause>

          <PolicyClause title="Refund and Rescheduling Rules">
            <p><strong>Before pick-up happens:</strong> the 3-hour rule above applies based on the start of your pick-up time window (subject to Australian Consumer Law).</p>
            <p className="mt-3"><strong>After pick-up is completed:</strong> the Drivlet service fee is generally non-refundable because the service has already been performed and costs have been incurred, except where required under Australian Consumer Law.</p>
            <p className="mt-3"><strong>Return timing changes:</strong> if the workshop is not ready when expected, we will coordinate a revised return window. This is usually treated as a reschedule (no extra charge where reasonable, subject to availability).</p>
          </PolicyClause>

          <PolicyClause title="No Refund When We Can't Proceed Due to Customer Fault">
            <p>The Drivlet service fee is generally non-refundable if we cannot complete the service due to:</p>
            <ul className="mt-2 space-y-1.5 text-slate-600">
              <li className="flex gap-2"><span className="text-slate-400">•</span>You are not present to hand over/receive keys.</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>You are not reachable when contact is needed.</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>The vehicle is blocked in, in a locked area, or access instructions are incorrect.</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>Keys are not available, or the vehicle can&apos;t be operated due to undisclosed requirements.</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>Access conditions are unsafe or impractical.</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>The vehicle cannot be safely or lawfully driven.</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>Information provided is materially incorrect.</li>
            </ul>
          </PolicyClause>

          <PolicyClause title="If Handover Fails (Our Standard Process)">
            <ul className="space-y-1.5 text-slate-600">
              <li className="flex gap-2"><span className="text-slate-400">•</span>Make 2 call attempts and send 2 SMS messages.</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>Wait up to 10 minutes where reasonable and safe.</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>Record evidence (time, location, notes and photos).</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>If we still cannot proceed, the booking may be marked &quot;Unable to Proceed&quot; and the service fee will generally be non-refundable.</li>
            </ul>
          </PolicyClause>

          <PolicyClause title="If Drivlet Cancels">
            <p>If we cancel due to our own fault (for example, driver unavailability), we will provide a full refund of the Drivlet service fee unless you choose to reschedule instead.</p>
          </PolicyClause>

          <PolicyClause title="Refund Processing">
            <p>Approved refunds are issued to the original payment method unless otherwise agreed. Processing times vary depending on your bank/payment provider.</p>
          </PolicyClause>

          <PolicyClause title="Australian Consumer Law">
            <p>Nothing in this policy is intended to exclude, restrict or modify any consumer guarantees or rights you may have under the Australian Consumer Law or other laws that cannot be excluded.</p>
          </PolicyClause>
        </div>
      </>
    ),
  },
  {
    id: 'damage-claims',
    title: 'Damage & Claims Policy',
    shortTitle: 'Damage & Claims',
    icon: AlertTriangle,
    lastUpdated: '9 February 2026',
    summary:
      'Our condition reporting process, damage claims procedures, and the vehicle value limits that apply to our service.',
    content: (
      <>
        <p className="text-sm text-slate-500 mb-6">
          Commuto Group Pty Ltd (ABN 73 687 063 618) trading as Drivlet
        </p>

        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-5 mb-8">
          <h4 className="font-semibold text-emerald-900 mb-3">At a glance</h4>
          <ul className="space-y-2 text-sm text-emerald-800">
            <li className="flex gap-2"><span className="text-emerald-500 mt-0.5">•</span>We take condition photos and capture handover sign-offs at pick-up and return.</li>
            <li className="flex gap-2"><span className="text-emerald-500 mt-0.5">•</span>If you believe new damage occurred, tell us as soon as possible and provide photos.</li>
            <li className="flex gap-2"><span className="text-emerald-500 mt-0.5">•</span>As a guide, notify us within 24 hours of the return handover time.</li>
            <li className="flex gap-2"><span className="text-emerald-500 mt-0.5">•</span>We will investigate using handover photos, timestamps, notes, and driver statements.</li>
            <li className="flex gap-2"><span className="text-emerald-500 mt-0.5">•</span>Nothing in this policy limits your rights under Australian Consumer Law.</li>
          </ul>
        </div>

        <div className="space-y-8">
          <PolicyClause title="What Counts as a Damage Claim">
            <ul className="space-y-1.5 text-slate-600">
              <li className="flex gap-2"><span className="text-slate-400">•</span>New dents, scratches, paint damage, broken mirrors/trim, wheel damage, or glass damage not documented at pick-up.</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>Interior damage not documented at pick-up.</li>
            </ul>
          </PolicyClause>

          <PolicyClause title="What Is Not Covered">
            <ul className="space-y-1.5 text-slate-600">
              <li className="flex gap-2"><span className="text-slate-400">•</span>Pre-existing damage, wear and tear, mechanical faults, warning lights, or issues from workshop servicing.</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>Damage caused by the nominated workshop is the workshop&apos;s responsibility.</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>Damage reported unreasonably late where delay prevents fair investigation.</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>To the extent permitted by law, items left in the vehicle that are lost or stolen.</li>
            </ul>
          </PolicyClause>

          <PolicyClause title="How to Lodge a Claim">
            <ul className="space-y-1.5 text-slate-600">
              <li className="flex gap-2"><span className="text-slate-400">•</span>Submit the online Damage Claim Form via our website (recommended).</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>Or email support@drivlet.com.au with subject: Damage Claim – [Booking ID].</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>Include: your name, Booking ID, booking date, addresses, and a description.</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>Attach clear photos/video (wide shot + close-ups) and any supporting documents.</li>
            </ul>
          </PolicyClause>

          <PolicyClause title="Timeframes">
            <ul className="space-y-1.5 text-slate-600">
              <li className="flex gap-2"><span className="text-slate-400">•</span>Notify us as soon as reasonably practicable (as a guide, within 24 hours).</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>Within 2 business days: we acknowledge receipt.</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>Within 10 business days: we aim to provide an initial outcome or update.</li>
            </ul>
          </PolicyClause>

          <PolicyClause title="How We Investigate">
            <ul className="space-y-1.5 text-slate-600">
              <li className="flex gap-2"><span className="text-slate-400">•</span>Review pick-up and return condition photos and sign-offs.</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>Check timestamps and job status logs.</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>Speak with the driver(s) involved and review notes.</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>Where relevant, confirm handover details with your nominated workshop.</li>
            </ul>
          </PolicyClause>

          <PolicyClause title="Possible Outcomes">
            <ul className="space-y-1.5 text-slate-600">
              <li className="flex gap-2"><span className="text-slate-400">•</span>If we accept responsibility, we may arrange repair, reimburse reasonable repair costs, and/or refer to our insurer.</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>If we do not accept responsibility, we will explain why.</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>If responsibility is unclear, we may request independent assessment.</li>
            </ul>
          </PolicyClause>

          <PolicyClause title="After-Hours Returns">
            <p>If the vehicle is returned after-hours (for example, left in an agreed safe location), you should inspect it as soon as reasonably possible. Any claim should be lodged as soon as reasonably practicable (as a guide, within 24 hours of first becoming aware of the issue), and you should provide photos taken at first discovery.</p>
          </PolicyClause>

          <PolicyClause title="Australian Consumer Law">
            <p>Nothing in this policy is intended to exclude, restrict or modify any consumer guarantees or rights you may have under the Australian Consumer Law or other laws that cannot be excluded.</p>
          </PolicyClause>

          <PolicyClause title="Escalation">
            <p>If you&apos;re not satisfied with the outcome, you can follow our Complaints Handling Policy.</p>
          </PolicyClause>
        </div>
      </>
    ),
  },
  {
    id: 'complaints',
    title: 'Complaints Handling Policy',
    shortTitle: 'Complaints',
    icon: MessageSquare,
    lastUpdated: '9 February 2026',
    summary:
      'How we receive, assess and resolve complaints in a consistent, fair and timely way.',
    content: (
      <>
        <p className="text-sm text-slate-500 mb-6">
          Commuto Group Pty Ltd (ABN 73 687 063 618) trading as Drivlet
        </p>

        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-5 mb-8">
          <p className="text-sm text-emerald-800">
            We take complaints seriously and use them to improve our service. Nothing in this Policy limits your rights under Australian Consumer Law.
          </p>
        </div>

        <div className="space-y-8">
          <PolicyClause number="1" title="What Is a Complaint?">
            <p>A complaint is an expression of dissatisfaction about Drivlet that requires a response or resolution. This can include service delays, communication issues, billing concerns, or concerns about vehicle handover/handling.</p>
          </PolicyClause>

          <PolicyClause number="2" title="What We Need from You">
            <ul className="space-y-1.5 text-slate-600">
              <li className="flex gap-2"><span className="text-slate-400">•</span>Your full name and contact number.</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>Booking reference (if available).</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>The date of service and the address(es) involved.</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>A clear description of the issue.</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>Any supporting information (photos, screenshots, messages).</li>
            </ul>
          </PolicyClause>

          <PolicyClause number="3" title="How to Lodge a Complaint">
            <p>You can lodge a complaint via our website, by phone, or by email. If there is an immediate safety risk or accident, call 000 first.</p>
          </PolicyClause>

          <PolicyClause number="4" title="Response Timeframes">
            <ul className="space-y-1.5 text-slate-600">
              <li className="flex gap-2"><span className="text-slate-400">•</span><strong>Acknowledgement:</strong> within 2 business days.</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span><strong>Initial assessment:</strong> within 5 business days.</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span><strong>Outcome / resolution:</strong> typically within 10 business days, or we will update you with the expected timeframe.</li>
            </ul>
          </PolicyClause>

          <PolicyClause number="5" title="Vehicle Condition Concerns">
            <p>If you believe your vehicle was damaged during a booking, raise it at return handover where possible. If discovered after, notify us as soon as reasonably practicable (as a guide, within 24 hours) with photos and a description.</p>
          </PolicyClause>

          <PolicyClause number="6" title="What Outcomes May Be Offered">
            <ul className="space-y-1.5 text-slate-600">
              <li className="flex gap-2"><span className="text-slate-400">•</span>An explanation and apology.</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>A service credit or partial refund of the Drivlet service fee.</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>Re-performing or arranging a remedial service.</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>Claims referral/support where relevant.</li>
              <li className="flex gap-2"><span className="text-slate-400">•</span>Process improvements and staff coaching.</li>
            </ul>
          </PolicyClause>

          <PolicyClause number="7" title="Complaints Relating to Workshops">
            <p>Workshops are independent third parties. Workshop pricing, workmanship, parts, and warranties are the Workshop&apos;s responsibility. We may help you with information or communication, but you may need to resolve the issue directly with the Workshop.</p>
          </PolicyClause>

          <PolicyClause number="8" title="Escalation">
            <p>If you are not satisfied with the outcome, you may request escalation for review by a senior team member. If we cannot resolve the complaint, you may seek external dispute resolution options including NSW Fair Trading.</p>
          </PolicyClause>

          <PolicyClause number="9" title="Privacy">
            <p>We handle complaint information in accordance with our Privacy Policy. We may share information with service providers, insurers or professional advisers where reasonably necessary to investigate and resolve the complaint.</p>
          </PolicyClause>

          <PolicyClause number="10" title="Record Keeping and Continuous Improvement">
            <p>We keep records of complaints to monitor trends and improve our service. Records may include the complaint summary, evidence received, actions taken, and the final outcome.</p>
          </PolicyClause>

          <PolicyClause number="11" title="Updates to This Policy">
            <p>We may update this Policy from time to time. The version published on our website applies at the time you lodge your complaint.</p>
          </PolicyClause>
        </div>
      </>
    ),
  },
];

// ════════════════════════════════════════════════════════════════════════
// Components
// ════════════════════════════════════════════════════════════════════════

function PolicyClause({
  number,
  title,
  children,
}: {
  number?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="text-base font-semibold text-slate-900 mb-3">
        {number && <span className="text-emerald-600 mr-1">{number}.</span>}
        {title}
      </h4>
      <div className="text-[15px] leading-relaxed text-slate-600">{children}</div>
    </div>
  );
}

function PolicyCard({
  policy,
  isExpanded,
  onToggle,
}: {
  policy: PolicySection;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const Icon = policy.icon;

  return (
    <section id={policy.id} className="scroll-mt-28">
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm transition-shadow hover:shadow-md">
        {/* Header — always visible */}
        <button
          onClick={onToggle}
          className="w-full flex items-start gap-4 p-6 sm:p-8 text-left cursor-pointer"
        >
          <div className="rounded-xl bg-emerald-100 p-2.5 flex-shrink-0">
            <Icon className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-slate-900">{policy.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{policy.summary}</p>
            <p className="mt-2 text-xs text-slate-400">
              Last updated: {policy.lastUpdated}
            </p>
          </div>
          <div
            className={`mt-1 flex-shrink-0 rounded-full bg-slate-100 p-1.5 transition-transform duration-300 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          >
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </div>
        </button>

        {/* Expandable content */}
        <div
          className={`overflow-hidden transition-all duration-500 ease-in-out ${
            isExpanded ? 'max-h-[10000px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="px-6 sm:px-8 pb-8 pt-0">
            <div className="border-t border-slate-100 pt-6">{policy.content}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Page
// ════════════════════════════════════════════════════════════════════════

export default function PoliciesPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleBookingClick = () => {
    window.location.href = '/#book';
  };

  const togglePolicy = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const scrollToPolicy = (id: string) => {
    setExpandedId(id);
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  return (
    <>
      <Header onBookingClick={handleBookingClick} />
      <main className="min-h-screen bg-slate-50">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700 py-16 pb-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
            <Shield className="mx-auto h-12 w-12 text-emerald-200 mb-4" />
            <h1 className="text-3xl font-bold text-white sm:text-4xl">Our Policies</h1>
            <p className="mt-3 text-emerald-200 text-lg">
              Transparency and trust are at the heart of everything we do.
            </p>

            {/* Quick nav pills */}
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {policies.map((p) => (
                <button
                  key={p.id}
                  onClick={() => scrollToPolicy(p.id)}
                  className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
                >
                  {p.shortTitle}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mx-auto max-w-4xl px-4 sm:px-6 -mt-8">
          <div className="space-y-4">
            {policies.map((policy) => (
              <PolicyCard
                key={policy.id}
                policy={policy}
                isExpanded={expandedId === policy.id}
                onToggle={() => togglePolicy(policy.id)}
              />
            ))}
          </div>

          {/* Contact bar */}
          <div className="mt-10 mb-16 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="rounded-xl bg-emerald-200 p-3 flex-shrink-0">
                <Mail className="h-6 w-6 text-emerald-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-emerald-900">
                  Questions about our policies?
                </h3>
                <p className="mt-1 text-sm text-emerald-700">
                  We&apos;re here to help. Reach out by email, phone, or through our website.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <a
                  href="mailto:support@drivlet.com.au"
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
                >
                  <Mail className="h-4 w-4" />
                  Email Us
                </a>
                <a
                  href="tel:1300470886"
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                >
                  <Phone className="h-4 w-4" />
                  1300 470 886
                </a>
                <a
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                >
                  <Globe className="h-4 w-4" />
                  Contact Page
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
