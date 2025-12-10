// src/components/homepage/RegistrationPlate.tsx
'use client';

import Image from 'next/image';

type StateCode = 'NSW' | 'QLD' | 'VIC' | 'SA' | 'WA' | 'TAS' | 'NT' | 'ACT';

const statePlateTemplates: Record<StateCode, string | null> = {
  NSW: '/nsw_registration_plate_template.png',
  QLD: '/qld_registration_plate_template.png',
  WA: '/wa_registration_plate_template.png',
  SA: '/sa_registration_plate_template.png',
  VIC: '/vic_registration_plate_template.png',
  TAS: '/tas_registration_plate_template.png',
  NT: '/nt_registration_plate_template.png',
  ACT: '/act_registration_plate_template.png',
};

// States that have templates ready
const availablePlateTemplates: StateCode[] = ['NSW', 'QLD', 'WA', 'SA'];

interface RegistrationPlateProps {
  plate: string;
  state: StateCode;
}

export default function RegistrationPlate({ plate, state }: RegistrationPlateProps) {
  const templatePath = statePlateTemplates[state];
  const hasTemplate = availablePlateTemplates.includes(state);

  // Format plate to uppercase and limit to 6 characters
  const formattedPlate = plate.toUpperCase().slice(0, 6);

  if (!hasTemplate || !templatePath) {
    // Fallback: simple styled plate for states without templates
    return (
      <div className="relative flex h-[70px] w-[247px] items-center justify-center rounded-lg border-4 border-slate-700 bg-slate-900">
        <span className="text-2xl font-bold tracking-[0.3em] text-white">
          {formattedPlate || '------'}
        </span>
        <span className="absolute bottom-1 right-2 text-[8px] text-slate-400">
          {state}
        </span>
      </div>
    );
  }

  return (
    <div className="relative h-[70px] w-[247px]">
      {/* Plate template image - scaled from 1993x565 to ~247x70 (maintaining aspect ratio) */}
      <Image
        src={templatePath}
        alt={`${state} registration plate`}
        fill
        className="rounded-md object-contain"
      />
      {/* Plate text overlay - positioned in center of plate */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="text-2xl font-bold tracking-[0.25em] text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]"
          style={{
            fontFamily: 'Arial, sans-serif',
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
          }}
        >
          {formattedPlate || '------'}
        </span>
      </div>
    </div>
  );
}

export type { StateCode };
