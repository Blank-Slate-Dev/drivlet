// src/config/timeSlots.ts

export const PICKUP_SLOTS = [
  { value: '8am-9am', label: '8:00 AM - 9:00 AM', hour: 8 },
  { value: '9am-10am', label: '9:00 AM - 10:00 AM', hour: 9 },
  { value: '10am-11am', label: '10:00 AM - 11:00 AM', hour: 10 },
  { value: '11am-12pm', label: '11:00 AM - 12:00 PM', hour: 11 },
] as const;

export const DROPOFF_SLOTS = [
  { value: '1pm-2pm', label: '1:00 PM - 2:00 PM', hour: 13 },
  { value: '2pm-3pm', label: '2:00 PM - 3:00 PM', hour: 14 },
  { value: '3pm-4pm', label: '3:00 PM - 4:00 PM', hour: 15 },
  { value: '4pm-5pm', label: '4:00 PM - 5:00 PM', hour: 16 },
] as const;

export const MAX_BOOKINGS_PER_SLOT = 2;

export const SERVICE_TYPES = [
  {
    value: 'quick_service',
    label: 'Quick Service',
    description: 'Oil change, basic inspection',
    estimatedHours: 2,
  },
  {
    value: 'regular_service',
    label: 'Regular Service',
    description: 'Standard service, brake check, fluid top-up',
    estimatedHours: 4,
  },
  {
    value: 'major_service',
    label: 'Major Service',
    description: 'Comprehensive service, detailed inspection',
    estimatedHours: 7,
  },
] as const;

export type PickupSlot = typeof PICKUP_SLOTS[number]['value'];
export type DropoffSlot = typeof DROPOFF_SLOTS[number]['value'];
export type ServiceTypeValue = typeof SERVICE_TYPES[number]['value'];

export const PICKUP_SLOT_VALUES = PICKUP_SLOTS.map(s => s.value);
export const DROPOFF_SLOT_VALUES = DROPOFF_SLOTS.map(s => s.value);
export const SERVICE_TYPE_VALUES = SERVICE_TYPES.map(s => s.value);

export function getServiceTypeByValue(value: string) {
  return SERVICE_TYPES.find(s => s.value === value);
}

export function getPickupSlotLabel(value: string) {
  return PICKUP_SLOTS.find(s => s.value === value)?.label || value;
}

export function getDropoffSlotLabel(value: string) {
  return DROPOFF_SLOTS.find(s => s.value === value)?.label || value;
}
