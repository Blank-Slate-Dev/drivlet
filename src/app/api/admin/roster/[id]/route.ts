// src/app/api/admin/roster/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/admin';
import Roster from '@/models/Roster';

// PATCH /api/admin/roster/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) return adminCheck.response;

  const { id } = await params;

  try {
    await connectDB();

    const body = await request.json();
    const { shifts, status } = body;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update: Record<string, any> = { updatedAt: new Date() };

    if (shifts !== undefined) {
      update.shifts = shifts;
    }

    if (status !== undefined) {
      if (!['draft', 'published'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
      }
      update.status = status;
      if (status === 'published') {
        update.publishedAt = new Date();
      }
    }

    const roster = await Roster.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    );

    if (!roster) {
      return NextResponse.json({ error: 'Roster not found' }, { status: 404 });
    }

    return NextResponse.json({ roster });
  } catch (error) {
    console.error('Error updating roster:', error);
    return NextResponse.json({ error: 'Failed to update roster' }, { status: 500 });
  }
}
