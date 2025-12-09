import { NextResponse } from 'next/server';

const AUTOGRAB_BASE_URL = 'https://api.autograb.com.au/v2/vehicles/registrations';

type StateCode =
  | 'NSW'
  | 'NT'
  | 'QLD'
  | 'SA'
  | 'TAS'
  | 'VIC'
  | 'WA'
  | 'ACT';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const plate = searchParams.get('plate');
    const state = searchParams.get('state');
    const region = searchParams.get('region') ?? 'au'; // default to AU

    if (!plate || !state) {
      return NextResponse.json(
        { error: 'Missing required query params: plate and state.' },
        { status: 400 }
      );
    }

    // Basic validation on state
    const allowedStates: StateCode[] = [
      'NSW',
      'NT',
      'QLD',
      'SA',
      'TAS',
      'VIC',
      'WA',
      'ACT',
    ];

    if (!allowedStates.includes(state.toUpperCase() as StateCode)) {
      return NextResponse.json(
        { error: 'Invalid state code. Use one of NSW, NT, QLD, SA, TAS, VIC, WA, ACT.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.AUTOGRAB_API_KEY;

    if (!apiKey) {
      console.error('AUTOGRAB_API_KEY is not set in environment variables');
      return NextResponse.json(
        { error: 'Server configuration error. API key missing.' },
        { status: 500 }
      );
    }

    // Build query params for AutoGrab
    const url = new URL(`${AUTOGRAB_BASE_URL}/${encodeURIComponent(plate)}`);

    url.searchParams.set('region', region);
    url.searchParams.set('state', state.toUpperCase());
    // Optional: ask for extra data – you can tweak this later
    url.searchParams.set(
      'features',
      'extended_data,additional_upstream_data,vehicle_age,writeoff_info,registration_status,build_data'
    );
    // If you want more candidates returned:
    // url.searchParams.set('prefer_more_results', 'true');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        ApiKey: apiKey,
        Accept: 'application/json',
      },
      // If they ever want IP-based rate limiting this helps show proper IP:
      // next: { revalidate: 0 } // always fresh
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error('AutoGrab API error:', response.status, text);

      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Vehicle not found for that plate/state.' },
          { status: 404 }
        );
      }

      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Unauthorised with AutoGrab. Check your API key.' },
          { status: 502 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to fetch vehicle data from AutoGrab.' },
        { status: 502 }
      );
    }

    const data = await response.json();

    // Optionally, you can trim this down before returning.
    // For now, just proxy the full response from AutoGrab:
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error('Unexpected error in /api/rego:', err);
    return NextResponse.json(
      { error: 'Unexpected server error.' },
      { status: 500 }
    );
  }
}
