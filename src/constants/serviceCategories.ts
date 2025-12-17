// src/constants/serviceCategories.ts
// Service categories and items for booking flow

export interface ServiceCategory {
  id: string;
  name: string;
  icon: string; // lucide-react icon name
  services: string[];
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    id: 'general_servicing',
    name: 'General Servicing & Inspections',
    icon: 'ClipboardCheck',
    services: [
      'Logbook servicing',
      'Minor service (oil & filter)',
      'Major service',
      'General mechanical repairs',
      'Pre-purchase inspections',
      'Roadworthy / safety inspections',
      'Fleet servicing',
    ],
  },
  {
    id: 'engine_drivetrain',
    name: 'Engine & Drivetrain',
    icon: 'Cog',
    services: [
      'Engine diagnostics and repairs',
      'Timing belt or timing chain replacement',
      'Fuel system repairs',
      'Diesel repairs and diagnostics',
      'DPF cleaning or repairs',
      'Automatic transmission servicing',
      'Manual transmission servicing',
      'Clutch replacement',
    ],
  },
  {
    id: 'brakes_steering_suspension',
    name: 'Brakes, Steering & Suspension',
    icon: 'Disc3',
    services: [
      'Brake pads and discs replacement',
      'Brake inspections',
      'Brake fluid replacement',
      'Steering repairs',
      'Suspension repairs (shocks, struts, bushes)',
    ],
  },
  {
    id: 'tyres_wheels',
    name: 'Tyres & Wheels',
    icon: 'Circle',
    services: [
      'New tyres supply and fitting',
      'Puncture repairs',
      'Wheel balancing',
      'Wheel alignment',
    ],
  },
  {
    id: 'cooling_ac',
    name: 'Cooling & Air Conditioning',
    icon: 'Thermometer',
    services: [
      'Cooling system repairs',
      'Radiator repairs or replacement',
      'Water pump replacement',
      'Air conditioning diagnostics',
      'Air conditioning regas',
      'Air conditioning repairs',
    ],
  },
  {
    id: 'auto_electrical',
    name: 'Auto Electrical & Electronics',
    icon: 'Zap',
    services: [
      'Battery testing and replacement',
      'Starter motor or alternator repairs',
      'Auto electrical fault diagnosis',
      'Lighting repairs',
      'Wiring repairs',
      'Computer diagnostics',
      'Accessory installation (dash cams, head units, sensors)',
    ],
  },
  {
    id: 'exhaust_emissions',
    name: 'Exhaust & Emissions',
    icon: 'Wind',
    services: [
      'Exhaust repairs or replacement',
      'Catalytic converter repairs',
      'Emissions and sensor repairs',
    ],
  },
  {
    id: 'hybrid_ev',
    name: 'Hybrid, EV & Alternative Fuel',
    icon: 'BatteryCharging',
    services: [
      'Hybrid vehicle servicing',
      'Electric vehicle servicing',
      'High-voltage system work (hybrid/EV)',
      'LPG system repairs',
    ],
  },
  {
    id: 'body_glass',
    name: 'Body, Glass & Appearance',
    icon: 'Sparkles',
    services: [
      'Panel beating and body repairs',
      'Paint repairs',
      'Dent removal',
      'Windscreen replacement',
      'Detailing (interior and exterior)',
      'Headlight restoration',
    ],
  },
  {
    id: '4x4_accessories',
    name: '4x4 & Accessories',
    icon: 'Truck',
    services: [
      '4x4 and off-road upgrades',
      'Tow bar installation',
      'Roof racks and roof boxes',
      'Performance upgrades',
    ],
  },
];

// Common/quick-select services
export const COMMON_SERVICES = [
  'Logbook servicing',
  'Minor service (oil & filter)',
  'Brake pads and discs replacement',
  'Air conditioning regas',
  'Battery testing and replacement',
];

// Selected services type for booking
export interface SelectedServiceCategory {
  category: string;
  services: string[];
}

// Helper functions
export function getAllServices(): string[] {
  return SERVICE_CATEGORIES.flatMap((cat) => cat.services);
}

export function getCategoryById(id: string): ServiceCategory | undefined {
  return SERVICE_CATEGORIES.find((cat) => cat.id === id);
}

export function getCategoryByName(name: string): ServiceCategory | undefined {
  return SERVICE_CATEGORIES.find((cat) => cat.name === name);
}

export function getServicesByCategory(categoryId: string): string[] {
  const category = getCategoryById(categoryId);
  return category?.services || [];
}

export function getCategoryForService(serviceName: string): ServiceCategory | undefined {
  return SERVICE_CATEGORIES.find((cat) => cat.services.includes(serviceName));
}

export function getTotalSelectedCount(selectedServices: SelectedServiceCategory[]): number {
  return selectedServices.reduce((total, cat) => total + cat.services.length, 0);
}

export function getPrimaryCategory(selectedServices: SelectedServiceCategory[]): string | null {
  if (selectedServices.length === 0) return null;

  // Find the category with the most selected services
  let maxCount = 0;
  let primaryCategoryId: string | null = null;

  for (const selection of selectedServices) {
    if (selection.services.length > maxCount) {
      maxCount = selection.services.length;
      primaryCategoryId = selection.category;
    }
  }

  return primaryCategoryId;
}

// Format selected services for display
export function formatSelectedServices(selectedServices: SelectedServiceCategory[]): string {
  const total = getTotalSelectedCount(selectedServices);
  if (total === 0) return 'No services selected';
  if (total === 1) {
    const service = selectedServices.find(s => s.services.length > 0)?.services[0];
    return service || 'No services selected';
  }
  return `${total} services selected`;
}
