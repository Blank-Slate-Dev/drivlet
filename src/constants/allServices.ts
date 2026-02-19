// src/constants/allServices.ts
// Full services catalog for randomized display on homepage

import {
  BookOpen,
  Settings,
  Wrench,
  ClipboardCheck,
  FileCheck,
  Zap,
  RefreshCw,
  Cog,
  Circle,
  Disc,
  ArrowUpDown,
  Target,
  CircleDot,
  Scale,
  Snowflake,
  Thermometer,
  Battery,
  Plug,
  Cpu,
  Sparkles,
  Paintbrush,
  Hammer,
  Square,
  Leaf,
  BatteryCharging,
  Mountain,
  Link,
  type LucideIcon,
} from 'lucide-react';

export interface ServiceItem {
  id: string;
  title: string;
  price: string;
  color: string;
  icon: LucideIcon;
  category: string;
}

export const ALL_SERVICES: ServiceItem[] = [
  // General Servicing & Inspections
  {
    id: 'logbook-service',
    title: 'Logbook Service',
    price: 'From $119 pick-up fee',
    color: 'bg-blue-500',
    icon: BookOpen,
    category: 'general',
  },
  {
    id: 'minor-service',
    title: 'Minor Service',
    price: 'From $119 pick-up fee',
    color: 'bg-sky-500',
    icon: Settings,
    category: 'general',
  },
  {
    id: 'major-service',
    title: 'Major Service',
    price: 'From $119 pick-up fee',
    color: 'bg-emerald-500',
    icon: Wrench,
    category: 'general',
  },
  {
    id: 'pre-purchase-inspection',
    title: 'Pre-Purchase Inspection',
    price: 'From $119 pick-up fee',
    color: 'bg-teal-500',
    icon: ClipboardCheck,
    category: 'general',
  },
  {
    id: 'roadworthy-inspection',
    title: 'Roadworthy Inspection',
    price: 'From $119 pick-up fee',
    color: 'bg-cyan-500',
    icon: FileCheck,
    category: 'general',
  },

  // Engine & Drivetrain
  {
    id: 'engine-diagnostics',
    title: 'Engine Diagnostics',
    price: 'From $119 pick-up fee',
    color: 'bg-purple-500',
    icon: Zap,
    category: 'engine',
  },
  {
    id: 'timing-belt-replacement',
    title: 'Timing Belt Replacement',
    price: 'From $119 pick-up fee',
    color: 'bg-violet-500',
    icon: RefreshCw,
    category: 'engine',
  },
  {
    id: 'transmission-service',
    title: 'Transmission Service',
    price: 'From $119 pick-up fee',
    color: 'bg-indigo-500',
    icon: Cog,
    category: 'engine',
  },
  {
    id: 'clutch-replacement',
    title: 'Clutch Replacement',
    price: 'From $119 pick-up fee',
    color: 'bg-fuchsia-500',
    icon: Circle,
    category: 'engine',
  },

  // Brakes & Suspension
  {
    id: 'brake-service',
    title: 'Brake Service',
    price: 'From $119 pick-up fee',
    color: 'bg-red-500',
    icon: Disc,
    category: 'brakes',
  },
  {
    id: 'suspension-repairs',
    title: 'Suspension Repairs',
    price: 'From $119 pick-up fee',
    color: 'bg-rose-500',
    icon: ArrowUpDown,
    category: 'brakes',
  },
  {
    id: 'wheel-alignment',
    title: 'Wheel Alignment',
    price: 'From $119 pick-up fee',
    color: 'bg-pink-500',
    icon: Target,
    category: 'brakes',
  },

  // Tyres & Wheels
  {
    id: 'new-tyres',
    title: 'New Tyres',
    price: 'From $119 pick-up fee',
    color: 'bg-slate-600',
    icon: CircleDot,
    category: 'tyres',
  },
  {
    id: 'wheel-balancing',
    title: 'Wheel Balancing',
    price: 'From $119 pick-up fee',
    color: 'bg-gray-500',
    icon: Scale,
    category: 'tyres',
  },

  // Cooling & Air Con
  {
    id: 'air-con-regas',
    title: 'Air Con Regas',
    price: 'From $119 pick-up fee',
    color: 'bg-cyan-500',
    icon: Snowflake,
    category: 'cooling',
  },
  {
    id: 'cooling-system-repair',
    title: 'Cooling System Repair',
    price: 'From $119 pick-up fee',
    color: 'bg-blue-400',
    icon: Thermometer,
    category: 'cooling',
  },

  // Auto Electrical
  {
    id: 'battery-replacement',
    title: 'Battery Replacement',
    price: 'From $119 pick-up fee',
    color: 'bg-yellow-500',
    icon: Battery,
    category: 'electrical',
  },
  {
    id: 'auto-electrical',
    title: 'Auto Electrical',
    price: 'From $119 pick-up fee',
    color: 'bg-amber-500',
    icon: Plug,
    category: 'electrical',
  },
  {
    id: 'computer-diagnostics',
    title: 'Computer Diagnostics',
    price: 'From $119 pick-up fee',
    color: 'bg-orange-500',
    icon: Cpu,
    category: 'electrical',
  },

  // Body & Appearance
  {
    id: 'detailing',
    title: 'Detailing',
    price: 'From $119 pick-up fee',
    color: 'bg-amber-400',
    icon: Sparkles,
    category: 'body',
  },
  {
    id: 'paint-repairs',
    title: 'Paint Repairs',
    price: 'From $119 pick-up fee',
    color: 'bg-lime-500',
    icon: Paintbrush,
    category: 'body',
  },
  {
    id: 'dent-removal',
    title: 'Dent Removal',
    price: 'From $119 pick-up fee',
    color: 'bg-green-500',
    icon: Hammer,
    category: 'body',
  },
  {
    id: 'windscreen-replacement',
    title: 'Windscreen Replacement',
    price: 'From $119 pick-up fee',
    color: 'bg-teal-400',
    icon: Square,
    category: 'body',
  },

  // Specialty
  {
    id: 'hybrid-servicing',
    title: 'Hybrid Servicing',
    price: 'From $119 pick-up fee',
    color: 'bg-green-600',
    icon: Leaf,
    category: 'specialty',
  },
  {
    id: 'ev-servicing',
    title: 'EV Servicing',
    price: 'From $119 pick-up fee',
    color: 'bg-emerald-400',
    icon: BatteryCharging,
    category: 'specialty',
  },
  {
    id: '4x4-upgrades',
    title: '4x4 Upgrades',
    price: 'From $119 pick-up fee',
    color: 'bg-orange-600',
    icon: Mountain,
    category: 'specialty',
  },
  {
    id: 'tow-bar-installation',
    title: 'Tow Bar Installation',
    price: 'From $119 pick-up fee',
    color: 'bg-stone-500',
    icon: Link,
    category: 'specialty',
  },
];

/**
 * Get a random selection of services with category diversity
 * Ensures visual variety by picking from different categories when possible
 */
export function getRandomServices(count: number = 4): ServiceItem[] {
  // Get unique categories
  const categories = [...new Set(ALL_SERVICES.map((s) => s.category))];
  const selected: ServiceItem[] = [];

  // Shuffle categories to randomize which ones we pick from first
  const shuffledCategories = categories.sort(() => Math.random() - 0.5);

  // Pick one from each category first (up to count)
  for (const cat of shuffledCategories.slice(0, count)) {
    const catServices = ALL_SERVICES.filter((s) => s.category === cat);
    const randomService = catServices[Math.floor(Math.random() * catServices.length)];
    selected.push(randomService);
  }

  // If we need more, add random ones not already selected
  while (selected.length < count) {
    const remaining = ALL_SERVICES.filter((s) => !selected.includes(s));
    const random = remaining[Math.floor(Math.random() * remaining.length)];
    selected.push(random);
  }

  // Final shuffle to randomize display order
  return selected.sort(() => Math.random() - 0.5);
}

/**
 * Simple random selection without category diversity
 * Uses Fisher-Yates shuffle for true randomness
 */
export function getRandomServicesSimple(count: number = 4): ServiceItem[] {
  const shuffled = [...ALL_SERVICES];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}
