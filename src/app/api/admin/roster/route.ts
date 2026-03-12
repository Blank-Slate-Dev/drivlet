// src/app/api/admin/roster/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/admin';
import Roster from '@/models/Roster';
import Driver from '@/models/Driver';
import User from '@/models/User';
import { getCurrentFortnightStart, getPeriodEnd } from '@/lib/roster';

// GET /api/admin/roster?period=YYYY-MM-DD
export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) return adminCheck.response;

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const periodParam = searchParams.get('period');

    let periodStart: Date;
    if (periodParam) {
      periodStart = new Date(periodParam);
      periodStart.setHours(0, 0, 0, 0);
    } else {
      periodStart = getCurrentFortnightStart();
    }

    // Find roster for this period
    const roster = await Roster.findOne({ periodStart }).lean();

    // Fetch all active approved drivers for the edit form
    // Drivers are stored separately from User — look up via User.driverProfile
    const activeUsers = await User.find({ role: 'driver' })
      .select('_id driverProfile')
      .lean();

    const driverProfileIds = activeUsers
      .map((u) => u.driverProfile)
      .filter((id): id is Types.ObjectId => id !== undefined);

    const drivers = await Driver.find({
      _id: { $in: driverProfileIds },
      status: 'approved',
      onboardingStatus: 'active',
    })
      .select('_id firstName lastName')
      .lean();

    return NextResponse.json({
      roster: roster ?? null,
      drivers,
      periodStart: periodStart.toISOString(),
      periodEnd: getPeriodEnd(periodStart).toISOString(),
    });
  } catch (error) {
    console.error('Error fetching roster:', error);
    return NextResponse.json({ error: 'Failed to fetch roster' }, { status: 500 });
  }
}

// POST /api/admin/roster
// Creates (or replaces) a roster for the given periodStart
export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) return adminCheck.response;

  try {
    await connectDB();

    const body = await request.json();
    const { periodStart: periodStartStr, shifts = [] } = body;

    if (!periodStartStr) {
      return NextResponse.json({ error: 'periodStart is required' }, { status: 400 });
    }

    const periodStart = new Date(periodStartStr);
    periodStart.setHours(0, 0, 0, 0);
    const periodEnd = getPeriodEnd(periodStart);

    const adminUserId = adminCheck.session.user.id;

    const roster = await Roster.findOneAndUpdate(
      { periodStart },
      {
        $setOnInsert: {
          periodStart,
          periodEnd,
          status: 'draft',
          createdBy: adminUserId,
        },
        $set: { shifts, updatedAt: new Date() },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ roster }, { status: 201 });
  } catch (error) {
    console.error('Error creating roster:', error);
    return NextResponse.json({ error: 'Failed to create roster' }, { status: 500 });
  }
}
