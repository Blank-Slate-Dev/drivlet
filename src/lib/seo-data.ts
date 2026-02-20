// src/lib/seo-data.ts
// Centralised SEO data for location pages, structured data, and metadata

export const BASE_URL = 'https://drivlet.com.au';
export const BUSINESS_NAME = 'Drivlet';
export const BUSINESS_PHONE = '1300 470 886';
export const BUSINESS_EMAIL = 'support@drivlet.com.au';
export const BUSINESS_ABN = '73 687 063 618';
export const BUSINESS_LEGAL_NAME = 'Commuto Group Pty Ltd';

// ─── Location Data ──────────────────────────────────────────────────────

export interface SuburbData {
  slug: string;
  name: string;
  postcode: string;
  description: string;
}

export interface CityData {
  slug: string;
  name: string;
  state: string;
  stateShort: string;
  latitude: number;
  longitude: number;
  heroHeading: string;
  heroSubheading: string;
  metaTitle: string;
  metaDescription: string;
  suburbs: SuburbData[];
  nearbyAreas: string[];
}

export const LOCATIONS: Record<string, CityData> = {
  newcastle: {
    slug: 'newcastle',
    name: 'Newcastle',
    state: 'New South Wales',
    stateShort: 'NSW',
    latitude: -32.9283,
    longitude: 151.7817,
    heroHeading: 'Car service pickup & delivery in Newcastle',
    heroSubheading:
      'We pick up your car from anywhere in the Newcastle region, deliver it to your chosen mechanic, and return it — so you can get on with your day.',
    metaTitle: 'Car Service Pickup & Delivery Newcastle | Drivlet',
    metaDescription:
      'Get your car serviced without leaving work. Drivlet picks up your car in Newcastle, takes it to your mechanic, and returns it. From $119. Book online today.',
    suburbs: [
      { slug: 'charlestown', name: 'Charlestown', postcode: '2290', description: 'Charlestown is one of Newcastle\'s busiest hubs. Skip the hassle of dropping your car at the mechanic — Drivlet picks it up from your home or workplace in Charlestown and returns it serviced.' },
      { slug: 'merewether', name: 'Merewether', postcode: '2291', description: 'Living in Merewether and need your car serviced? Drivlet handles the pickup and return so you can enjoy the beach or stay productive at work.' },
      { slug: 'mayfield', name: 'Mayfield', postcode: '2304', description: 'Mayfield residents can now get their car serviced without rearranging their day. Drivlet picks up, delivers, and returns your car from Mayfield.' },
      { slug: 'lambton', name: 'Lambton', postcode: '2299', description: 'Car service pickup and delivery in Lambton. We collect your car, take it to the mechanic, and bring it back — all while you carry on with your day.' },
      { slug: 'adamstown', name: 'Adamstown', postcode: '2289', description: 'Adamstown car owners can skip the service centre waiting room. Drivlet picks up your car and returns it after servicing — simple as that.' },
      { slug: 'jesmond', name: 'Jesmond', postcode: '2299', description: 'Need your car serviced in Jesmond? Drivlet takes care of pickup and return so you don\'t have to take time off work or organise a lift.' },
      { slug: 'wallsend', name: 'Wallsend', postcode: '2287', description: 'Wallsend residents — get your car picked up, serviced, and returned without lifting a finger. Drivlet handles the logistics.' },
      { slug: 'hamilton', name: 'Hamilton', postcode: '2303', description: 'Car service made easy in Hamilton. Drivlet picks up your car from home or work, drops it to the mechanic, and brings it back.' },
      { slug: 'broadmeadow', name: 'Broadmeadow', postcode: '2292', description: 'Broadmeadow car service pickup and delivery. We collect your car, coordinate with your mechanic, and return your vehicle when it\'s done.' },
      { slug: 'kotara', name: 'Kotara', postcode: '2289', description: 'Skip the trip to the mechanic in Kotara. Drivlet picks up your car, takes it to your chosen service centre, and delivers it back.' },
      { slug: 'waratah', name: 'Waratah', postcode: '2298', description: 'Waratah car service pickup and return. No waiting rooms, no time off work — just hassle-free car servicing with Drivlet.' },
      { slug: 'new-lambton', name: 'New Lambton', postcode: '2305', description: 'New Lambton car owners: Drivlet picks up your car, gets it serviced at your chosen workshop, and brings it back. All from $119.' },
      { slug: 'belmont', name: 'Belmont', postcode: '2280', description: 'Belmont car service pickup and delivery. Drivlet takes the hassle out of getting your car serviced — we handle pickup, delivery, and return.' },
      { slug: 'lake-macquarie', name: 'Lake Macquarie', postcode: '2283', description: 'Serving the Lake Macquarie area. Drivlet picks up your car, drops it at your mechanic, and returns it — saving you time and stress.' },
      { slug: 'maitland', name: 'Maitland', postcode: '2320', description: 'Maitland car service pickup available. Drivlet collects your car, takes it to the workshop, and returns it — distance surcharges may apply.' },
    ],
    nearbyAreas: ['Hunter Valley', 'Central Coast', 'Port Stephens', 'Cessnock', 'Raymond Terrace'],
  },

  canberra: {
    slug: 'canberra',
    name: 'Canberra',
    state: 'Australian Capital Territory',
    stateShort: 'ACT',
    latitude: -35.2809,
    longitude: 149.1300,
    heroHeading: 'Car service pickup & delivery in Canberra',
    heroSubheading:
      'We pick up your car from anywhere in the Canberra region, deliver it to your chosen mechanic, and return it — so you can get on with your day.',
    metaTitle: 'Car Service Pickup & Delivery Canberra | Drivlet',
    metaDescription:
      'Get your car serviced without leaving work. Drivlet picks up your car in Canberra, takes it to your mechanic, and returns it. From $119. Book online today.',
    suburbs: [
      { slug: 'belconnen', name: 'Belconnen', postcode: '2617', description: 'Belconnen car service made easy. Drivlet picks up your car from home or the office, delivers it to your mechanic, and returns it when it\'s ready.' },
      { slug: 'woden', name: 'Woden', postcode: '2606', description: 'Woden residents — get your car picked up, serviced, and returned without taking time off. Drivlet handles the logistics.' },
      { slug: 'tuggeranong', name: 'Tuggeranong', postcode: '2900', description: 'Car service pickup and delivery in Tuggeranong. We collect your car, take it to the workshop, and bring it back.' },
      { slug: 'gungahlin', name: 'Gungahlin', postcode: '2912', description: 'Gungahlin car owners: skip the trip to the mechanic. Drivlet picks up your car and returns it serviced — all while you\'re at work.' },
      { slug: 'weston-creek', name: 'Weston Creek', postcode: '2611', description: 'Weston Creek car service pickup. Drivlet collects your car, coordinates with your mechanic, and delivers it back when the work is done.' },
      { slug: 'kingston', name: 'Kingston', postcode: '2604', description: 'Kingston car service made simple. Drivlet handles the pickup and return so you don\'t have to organise a lift or wait at the workshop.' },
      { slug: 'braddon', name: 'Braddon', postcode: '2612', description: 'Working in Braddon? Drivlet picks up your car, takes it to the service centre, and returns it — no disruption to your day.' },
      { slug: 'fyshwick', name: 'Fyshwick', postcode: '2609', description: 'Fyshwick car service pickup and delivery. Many service centres are in this area — Drivlet can get your car there and back while you work.' },
      { slug: 'mitchell', name: 'Mitchell', postcode: '2911', description: 'Mitchell is home to many mechanics and service centres. Drivlet picks up your car and delivers it here for servicing, then returns it to you.' },
      { slug: 'phillip', name: 'Phillip', postcode: '2606', description: 'Phillip car service pickup. Drivlet collects your car from home or work, takes it to your chosen mechanic in Phillip, and brings it back.' },
    ],
    nearbyAreas: ['Queanbeyan', 'Jerrabomberra', 'Murrumbateman', 'Yass', 'Bungendore'],
  },
};

// ─── FAQ Data (shared + location-specific) ──────────────────────────────

export const GLOBAL_FAQS = [
  {
    question: 'How does Drivlet work?',
    answer:
      'Book a pick-up and return window and enter your workshop details. We pick up your car, drop it to your chosen service centre, then return it when it\'s ready.',
  },
  {
    question: 'Who drives my car?',
    answer:
      'A Drivlet employee driver. We use condition photos and sign-off at pick-up and return for transparency.',
  },
  {
    question: 'Is my car insured?',
    answer:
      'Yes — your car is covered while it\'s in Drivlet\'s care during pick-up, delivery to your workshop, and return (subject to our Terms).',
  },
  {
    question: 'How much does it cost?',
    answer:
      'Our flat-rate transport fee starts at $119. Distance-based surcharges may apply depending on the driving distance from pick-up to your workshop.',
  },
  {
    question: 'How do I pay — Drivlet vs the service centre?',
    answer:
      'You pay Drivlet for transport when you book. You pay the service centre directly for the service/repairs.',
  },
  {
    question: 'Do I need a service centre booking first?',
    answer:
      'Yes. You book your service with your chosen workshop first, then book Drivlet for the transport.',
  },
  {
    question: 'Can I cancel or reschedule?',
    answer:
      'Yes. More than 3 hours before pick-up = full refund or reschedule. Within 3 hours = no refund. Full rules are in our Cancellation & Refunds Policy.',
  },
];

export function getLocationFAQs(city: string) {
  return [
    ...GLOBAL_FAQS,
    {
      question: `What areas in ${city} do you cover?`,
      answer: `We cover all suburbs across the greater ${city} region. Distance-based surcharges may apply for locations further from the service centre.`,
    },
    {
      question: `How do I book a car service pickup in ${city}?`,
      answer: `Visit drivlet.com.au and click "Book Now". Enter your ${city} address, your workshop details, and choose a pickup window. Payment is taken at booking.`,
    },
  ];
}