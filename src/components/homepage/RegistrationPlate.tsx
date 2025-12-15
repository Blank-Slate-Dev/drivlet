// src/components/homepage/RegistrationPlate.tsx
'use client';

type StateCode = 'NSW' | 'QLD' | 'VIC' | 'SA' | 'WA' | 'TAS' | 'NT' | 'ACT';

interface RegistrationPlateProps {
  plate: string;
  state: StateCode;
}

export default function RegistrationPlate({ plate, state }: RegistrationPlateProps) {
  // Format plate to uppercase and limit to 6 characters
  const formattedPlate = plate.toUpperCase().slice(0, 6);
  
  // Split state into individual letters for vertical display
  const stateLetters = state.split('');

  return (
    <div 
      className="relative flex h-[52px] w-[220px] overflow-hidden rounded-[4px]"
      style={{
        // Outer chrome/silver border with gradient to simulate light reflection
        background: 'linear-gradient(180deg, #e8e8e8 0%, #ffffff 15%, #d0d0d0 50%, #a8a8a8 85%, #c0c0c0 100%)',
        padding: '3px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.5)',
      }}
    >
      {/* Inner plate - black with subtle gradient for depth */}
      <div 
        className="relative flex h-full w-full items-center overflow-hidden rounded-[2px]"
        style={{
          background: 'linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 30%, #0f0f0f 70%, #1a1a1a 100%)',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5), inset 0 -1px 2px rgba(255,255,255,0.05)',
        }}
      >
        {/* Subtle light reflection overlay on plate */}
        <div 
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.03) 100%)',
          }}
        />
        
        {/* State letters - vertical on left side */}
        <div 
          className="flex flex-col items-center justify-center px-2"
          style={{
            minWidth: '28px',
          }}
        >
          {stateLetters.map((letter, index) => (
            <span
              key={index}
              className="leading-none"
              style={{
                fontFamily: '"Arial Black", "Helvetica Neue", Arial, sans-serif',
                fontSize: '11px',
                fontWeight: 900,
                color: '#ffffff',
                textShadow: '0 1px 2px rgba(0,0,0,0.8), 0 0 1px rgba(255,255,255,0.3)',
                letterSpacing: '0.5px',
                lineHeight: '1.1',
              }}
            >
              {letter}
            </span>
          ))}
        </div>
        
        {/* Vertical separator line */}
        <div 
          className="h-[70%] w-[1px] opacity-30"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, #666 20%, #888 50%, #666 80%, transparent 100%)',
          }}
        />
        
        {/* Plate number - main text */}
        <div className="flex flex-1 items-center justify-center px-3">
          <span
            style={{
              fontFamily: '"Arial Black", "Helvetica Neue", Arial, sans-serif',
              fontSize: '28px',
              fontWeight: 900,
              color: '#ffffff',
              letterSpacing: '3px',
              textShadow: `
                0 1px 0 #cccccc,
                0 2px 0 #c9c9c9,
                0 3px 0 #bbb,
                0 4px 0 #b9b9b9,
                0 5px 1px rgba(0,0,0,.1),
                0 0 5px rgba(0,0,0,.1),
                0 1px 3px rgba(0,0,0,.3),
                0 3px 5px rgba(0,0,0,.2),
                0 5px 10px rgba(0,0,0,.25),
                0 10px 10px rgba(0,0,0,.2),
                0 20px 20px rgba(0,0,0,.15),
                0 0 2px rgba(255,255,255,0.4)
              `,
              // Chrome/3D effect
              WebkitTextStroke: '0.5px rgba(200,200,200,0.3)',
            }}
          >
            {formattedPlate || '------'}
          </span>
        </div>
      </div>
    </div>
  );
}

export type { StateCode };
