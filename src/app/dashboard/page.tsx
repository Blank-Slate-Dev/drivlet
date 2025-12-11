"use client";

import Link from "next/link";
import {
  Clock,
  Briefcase,
  ArrowLeftRight,
  ShieldCheck,
  CheckCircle2,
  Circle,
  MapPin,
  Calendar,
  Car,
  Wrench,
  ChevronRight,
} from "lucide-react";

type JourneyStage =
  | "Booking Confirmed"
  | "Driver En Route To You"
  | "Car Picked Up"
  | "At Garage"
  | "Service In Progress"
  | "Driver En Route Back"
  | "Delivered";

type BusinessStage = "Stage 1" | "Stage 2" | "Stage 3";

interface CarJourneyStatus {
  ownerName: string;
  carNickname?: string;
  make: string;
  model: string;
  plate: string;
  serviceType: string;
  currentStage: JourneyStage;
  overallProgress: number;
  pickupWindow: string;
  garageName: string;
  garageAddress: string;
  etaToGarage?: string;
  etaReturn?: string;
  lastUpdated: string;
  notes?: string;
  businessStage: BusinessStage;
}

const mockCarJourney: CarJourneyStatus = {
  ownerName: "Gerome",
  carNickname: "Daily Driver",
  make: "Toyota",
  model: "Corolla",
  plate: "DRIVLET-01",
  serviceType: "Logbook Service",
  currentStage: "Service In Progress",
  overallProgress: 72,
  pickupWindow: "Today, 8:30–9:00 AM",
  garageName: "Sydney Auto Care",
  garageAddress: "123 Example Street, Sydney NSW",
  etaToGarage: "Today, 9:15 AM",
  etaReturn: "Today, 4:30 PM",
  lastUpdated: "11 Dec 2025, 1:45 PM",
  notes:
    "Your car is currently on the hoist. Mechanic is completing the scheduled service.",
  businessStage: "Stage 1",
};

interface JourneyEvent {
  stage: JourneyStage;
  title: string;
  timestamp: string;
  description: string;
  completed: boolean;
}

const mockJourneyEvents: JourneyEvent[] = [
  {
    stage: "Booking Confirmed",
    title: "Booking Confirmed",
    timestamp: "10 Dec 2025, 3:15 PM",
    description: "We've locked in your pick-up and service details.",
    completed: true,
  },
  {
    stage: "Driver En Route To You",
    title: "Driver En Route",
    timestamp: "11 Dec 2025, 8:35 AM",
    description: "Your Drivlet driver is on the way to your location.",
    completed: true,
  },
  {
    stage: "Car Picked Up",
    title: "Car Picked Up",
    timestamp: "11 Dec 2025, 8:55 AM",
    description: "We've picked up your car and are heading to the garage.",
    completed: true,
  },
  {
    stage: "At Garage",
    title: "Arrived At Garage",
    timestamp: "11 Dec 2025, 9:20 AM",
    description: "Your car has arrived at the selected garage.",
    completed: true,
  },
  {
    stage: "Service In Progress",
    title: "Service In Progress",
    timestamp: "11 Dec 2025, 11:00 AM",
    description: "The mechanic is currently working on your car.",
    completed: false,
  },
  {
    stage: "Driver En Route Back",
    title: "Driver En Route Back",
    timestamp: "-",
    description:
      "Once the service is complete, we'll drive your car back to you.",
    completed: false,
  },
  {
    stage: "Delivered",
    title: "Car Delivered",
    timestamp: "-",
    description: "Your car is back with you and the journey is complete.",
    completed: false,
  },
];

interface CarHeaderProps {
  status: CarJourneyStatus;
}

function CarHeader({ status }: CarHeaderProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-600">Your Car Journey</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            {status.make} {status.model}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <Car className="h-4 w-4 text-slate-400" />
              {status.plate}
            </span>
            {status.carNickname && (
              <span className="text-slate-400">"{status.carNickname}"</span>
            )}
          </div>
        </div>
        <div className="hidden sm:flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
          <Car className="h-8 w-8 text-emerald-600" />
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-500">
        Sit back while we handle the pick-up, drop-off, and return.
      </p>
    </div>
  );
}

interface StatusSummaryProps {
  status: CarJourneyStatus;
}

function StatusSummary({ status }: StatusSummaryProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700"
          role="status"
          aria-label={`Current stage: ${status.currentStage}`}
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          {status.currentStage}
        </span>
        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600">
          {status.serviceType}
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-100">
            <Calendar className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Pickup Window
            </p>
            <p className="mt-0.5 text-sm font-medium text-slate-900">
              {status.pickupWindow}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-100">
            <Wrench className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Garage
            </p>
            <p className="mt-0.5 text-sm font-medium text-slate-900">
              {status.garageName}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-100">
            <MapPin className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Location
            </p>
            <p className="mt-0.5 text-sm font-medium text-slate-900">
              {status.garageAddress}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-100">
            <Clock className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Est. Return
            </p>
            <p className="mt-0.5 text-sm font-medium text-slate-900">
              {status.etaReturn || "TBD"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">Overall Progress</span>
          <span className="font-semibold text-emerald-600">
            {status.overallProgress}%
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-3 rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${status.overallProgress}%` }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={status.overallProgress}
            aria-label={`Journey progress: ${status.overallProgress}%`}
          />
        </div>
      </div>

      {status.notes && (
        <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
            What's Happening Now
          </p>
          <p className="mt-1 text-sm text-emerald-800">{status.notes}</p>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-400">
        Last updated: {status.lastUpdated}
      </p>
    </div>
  );
}

interface JourneyStepperProps {
  events: JourneyEvent[];
  currentStage: JourneyStage;
}

function JourneyStepper({ events, currentStage }: JourneyStepperProps) {
  const getStepStatus = (event: JourneyEvent) => {
    if (event.completed) return "completed";
    if (event.stage === currentStage) return "current";
    return "upcoming";
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-lg font-semibold text-slate-900">
        Journey Stages
      </h2>

      {/* Desktop horizontal stepper */}
      <div className="hidden lg:block">
        <div className="relative flex items-start justify-between">
          {/* Connecting line background */}
          <div className="absolute left-0 right-0 top-5 z-0 h-0.5 bg-slate-200" />

          {events.map((event, index) => {
            const stepStatus = getStepStatus(event);
            return (
              <div
                key={event.stage}
                className="relative z-10 flex flex-1 flex-col items-center"
              >
                {/* Progress line */}
                {index > 0 && (
                  <div
                    className={`absolute right-1/2 top-5 h-0.5 w-full ${
                      events[index - 1].completed
                        ? "bg-emerald-500"
                        : "bg-slate-200"
                    }`}
                  />
                )}
                <div
                  className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                    stepStatus === "completed"
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : stepStatus === "current"
                        ? "border-emerald-500 bg-white text-emerald-600 ring-4 ring-emerald-50"
                        : "border-slate-300 bg-white text-slate-400"
                  }`}
                  aria-label={`${event.title}: ${stepStatus}`}
                >
                  {stepStatus === "completed" ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <span className="text-xs font-bold">{index + 1}</span>
                  )}
                </div>
                <p
                  className={`mt-3 max-w-[100px] text-center text-xs font-medium ${
                    stepStatus === "completed"
                      ? "text-emerald-600"
                      : stepStatus === "current"
                        ? "text-slate-900"
                        : "text-slate-400"
                  }`}
                >
                  {event.title}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile vertical stepper */}
      <div className="lg:hidden">
        <div className="relative">
          {events.map((event, index) => {
            const stepStatus = getStepStatus(event);
            return (
              <div key={event.stage} className="relative flex gap-4 pb-6">
                {/* Vertical line */}
                {index < events.length - 1 && (
                  <div
                    className={`absolute left-[15px] top-10 h-[calc(100%-24px)] w-0.5 ${
                      event.completed ? "bg-emerald-500" : "bg-slate-200"
                    }`}
                  />
                )}
                {/* Circle */}
                <div
                  className={`relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                    stepStatus === "completed"
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : stepStatus === "current"
                        ? "border-emerald-500 bg-white text-emerald-600 ring-4 ring-emerald-50"
                        : "border-slate-300 bg-white text-slate-400"
                  }`}
                >
                  {stepStatus === "completed" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <span className="text-xs font-bold">{index + 1}</span>
                  )}
                </div>
                {/* Content */}
                <div className="flex-1 pt-1">
                  <p
                    className={`text-sm font-medium ${
                      stepStatus === "completed"
                        ? "text-emerald-600"
                        : stepStatus === "current"
                          ? "text-slate-900"
                          : "text-slate-400"
                    }`}
                  >
                    {event.title}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface ActivityTimelineProps {
  events: JourneyEvent[];
}

function ActivityTimeline({ events }: ActivityTimelineProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-6 text-lg font-semibold text-slate-900">Live Updates</h2>
      <div className="relative">
        {events.map((event, index) => (
          <div key={event.stage} className="relative flex gap-4 pb-6 last:pb-0">
            {/* Vertical line */}
            {index < events.length - 1 && (
              <div
                className={`absolute left-[7px] top-4 h-[calc(100%-8px)] w-0.5 ${
                  event.completed ? "bg-emerald-200" : "bg-slate-200"
                }`}
              />
            )}
            {/* Dot */}
            <div
              className={`relative z-10 mt-1 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full ${
                event.completed
                  ? "bg-emerald-500"
                  : "border-2 border-slate-300 bg-white"
              }`}
            >
              {event.completed && (
                <CheckCircle2 className="h-4 w-4 text-white" />
              )}
            </div>
            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3
                  className={`text-sm font-medium ${
                    event.completed ? "text-slate-900" : "text-slate-400"
                  }`}
                >
                  {event.title}
                </h3>
                <span className="text-xs text-slate-400">{event.timestamp}</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">{event.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StageOneBenefits() {
  const benefits = [
    {
      icon: Clock,
      text: "No waiting at the mechanic",
    },
    {
      icon: Briefcase,
      text: "No time off work to drop off or pick up your car",
    },
    {
      icon: ArrowLeftRight,
      text: "No transport hassles — we bring the car back to you",
    },
    {
      icon: ShieldCheck,
      text: "No awkward upsells — you stay in control of approvals",
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">
        What Drivlet Handles For You
      </h2>
      <ul className="space-y-3">
        {benefits.map((benefit, index) => (
          <li key={index} className="flex items-start gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-50">
              <benefit.icon className="h-4 w-4 text-emerald-600" />
            </div>
            <span className="pt-1 text-sm text-slate-600">{benefit.text}</span>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-sm text-slate-500">
        Right now, Drivlet is in Stage 1 of our model: we specialise in pick-up
        and drop-off while your trusted garage completes the work.
      </p>
    </div>
  );
}

interface RoadmapCardProps {
  currentBusinessStage: BusinessStage;
}

function RoadmapCard({ currentBusinessStage }: RoadmapCardProps) {
  const stages = [
    {
      stage: "Stage 1" as BusinessStage,
      title: "Pick-Up & Drop-Off",
      description:
        "We collect your car, deliver it to the garage, and return it when done.",
    },
    {
      stage: "Stage 2" as BusinessStage,
      title: "Better Pricing",
      description:
        "We negotiate discounted rates with partner garages on your behalf.",
    },
    {
      stage: "Stage 3" as BusinessStage,
      title: "Full Booking Integration",
      description:
        "Book everything in Drivlet — garages operate as fulfilment partners.",
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-2 text-lg font-semibold text-slate-900">
        The Drivlet Roadmap
      </h2>
      <p className="mb-5 text-sm text-slate-500">
        Where we're heading — building the future of car servicing.
      </p>
      <div className="space-y-3">
        {stages.map((item) => {
          const isCurrentStage = item.stage === currentBusinessStage;
          return (
            <div
              key={item.stage}
              className={`rounded-xl border p-4 transition-all ${
                isCurrentStage
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-slate-100 bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-semibold uppercase tracking-wide ${
                    isCurrentStage ? "text-emerald-600" : "text-slate-400"
                  }`}
                >
                  {item.stage}
                </span>
                {isCurrentStage && (
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    Current
                  </span>
                )}
              </div>
              <h3
                className={`mt-1 font-medium ${
                  isCurrentStage ? "text-slate-900" : "text-slate-500"
                }`}
              >
                {item.title}
              </h3>
              <p
                className={`mt-1 text-sm ${
                  isCurrentStage ? "text-slate-600" : "text-slate-400"
                }`}
              >
                {item.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DashboardHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-xl font-bold text-emerald-600">
          drivlet
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm font-medium text-slate-600 transition hover:text-emerald-600"
          >
            Home
          </Link>
          <Link
            href="/account"
            className="flex items-center gap-1 text-sm font-medium text-slate-600 transition hover:text-emerald-600"
          >
            Account
            <ChevronRight className="h-4 w-4" />
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <DashboardHeader />

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <CarHeader status={mockCarJourney} />

        <StatusSummary status={mockCarJourney} />

        <JourneyStepper
          events={mockJourneyEvents}
          currentStage={mockCarJourney.currentStage}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <ActivityTimeline events={mockJourneyEvents} />
          <div className="space-y-6">
            <StageOneBenefits />
            <RoadmapCard currentBusinessStage={mockCarJourney.businessStage} />
          </div>
        </div>
      </div>
    </main>
  );
}
