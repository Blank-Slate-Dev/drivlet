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

  // Format plate with dot separator when 6 characters
  const renderPlateText = () => {
    if (!formattedPlate) {
      return '------';
    }

    // Only show dot when exactly 6 characters are entered
    if (formattedPlate.length === 6) {
      const firstHalf = formattedPlate.slice(0, 3);
      const secondHalf = formattedPlate.slice(3, 6);

      return (
        <>
          <span style={{ letterSpacing: '4px' }}>{firstHalf}</span>

          <span
            style={{
              display: 'inline-block',
              width: '6px',
              height: '6px',
              backgroundColor: '#ffffff',
              borderRadius: '50%',
              margin: '0 8px 0 4px', // ✅ balanced: 4px letterSpacing + 4px margin = 8px (left), 8px (right)
              verticalAlign: 'middle',
              boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
            }}
          />

          <span style={{ letterSpacing: '4px' }}>{secondHalf}</span>
        </>
      );
    }

    return <span style={{ letterSpacing: '4px' }}>{formattedPlate}</span>;
  };

  return (
    <div
      className="relative flex h-[70px] w-[280px] overflow-hidden rounded-lg"
      style={{
        // Outer chrome/silver border with gradient to simulate light reflection
        background:
          'linear-gradient(180deg, #f0f0f0 0%, #ffffff 20%, #d8d8d8 50%, #b0b0b0 80%, #c8c8c8 100%)',
        padding: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.1)',
      }}
    >
      {/* Inner plate - black with subtle gradient for depth */}
      <div
        className="relative flex h-full w-full items-center overflow-hidden rounded-md"
        style={{
          background:
            'linear-gradient(180deg, #1f1f1f 0%, #151515 40%, #0d0d0d 60%, #151515 100%)',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)',
        }}
      >
        {/* Subtle light reflection overlay on plate */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'linear-gradient(160deg, rgba(255,255,255,0.06) 0%, transparent 35%)',
          }}
        />

        {/* State letters - vertical on left side */}
        <div
          className="flex flex-col items-center justify-center"
          style={{
            minWidth: '36px',
            paddingLeft: '8px',
            paddingRight: '4px',
          }}
        >
          {stateLetters.map((letter, index) => (
            <span
              key={index}
              className="leading-none"
              style={{
                fontFamily:
                  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontSize: '13px',
                fontWeight: 700,
                color: '#ffffff',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                lineHeight: '1.2',
              }}
            >
              {letter}
            </span>
          ))}
        </div>

        {/* Plate number - main text */}
        <div className="flex flex-1 items-center justify-center pr-4">
          <span
            style={{
              fontFamily:
                'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontSize: '32px',
              fontWeight: 700,
              color: '#ffffff',
              textShadow: '0 1px 2px rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {renderPlateText()}
          </span>
        </div>
      </div>
    </div>
  );
}

export type { StateCode };
