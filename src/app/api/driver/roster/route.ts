// src/app/api/driver/roster/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Roster from '@/models/Roster';
import User from '@/models/User';

// GET /api/driver/roster
// Returns the current or next upcoming published roster with only the
// requesting driver's own shifts.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'driver') {
      return NextResponse.json({ error: 'Not a driver' }, { status: 403 });
    }

    await connectDB();

    // Get the driver's profile ID
    const user = await User.findById(session.user.id).select('driverProfile').lean();
    if (!user?.driverProfile) {
      return NextResponse.json({ roster: null });
    }

    const driverProfileId = user.driverProfile.toString();
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Find the published roster that covers today, or the next upcoming one
    const roster = await Roster.findOne({
      status: 'published',
      periodEnd: { $gte: now },
    })
      .sort({ periodStart: 1 })
      .lean();

    if (!roster) {
      return NextResponse.json({ roster: null });
    }

    // Filter shifts to only this driver's own shifts
    const myShifts = roster.shifts.filter(
      (s) => s.driverId.toString() === driverProfileId
    );

    return NextResponse.json({
      roster: {
        _id: roster._id,
        periodStart: roster.periodStart,
        periodEnd: roster.periodEnd,
        status: roster.status,
        publishedAt: roster.publishedAt,
      },
      shifts: myShifts,
    });
  } catch (error) {
    console.error('Error fetching driver roster:', error);
    return NextResponse.json({ error: 'Failed to fetch roster' }, { status: 500 });
  }
}
