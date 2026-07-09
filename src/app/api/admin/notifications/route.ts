import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { requireValidOrigin } from "@/lib/validation";
import { connectDB } from "@/lib/mongodb";
import AdminNotification from "@/models/AdminNotification";
import Incident from "@/models/Incident";

const OPEN_INCIDENT_STATUSES = ["open", "investigating", "awaiting_response"];

export async function GET() {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) return adminCheck.response;

  try {
    await connectDB();

    const [notifications, unreadCount, openIncidentCount] = await Promise.all([
      AdminNotification.find().sort({ createdAt: -1 }).limit(30).lean(),
      AdminNotification.countDocuments({ isRead: false }),
      Incident.countDocuments({ status: { $in: OPEN_INCIDENT_STATUSES } }),
    ]);

    return NextResponse.json({ notifications, unreadCount, openIncidentCount });
  } catch (error) {
    console.error("Failed to fetch admin notifications:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) return adminCheck.response;

  const originCheck = requireValidOrigin(request);
  if (!originCheck.valid) {
    return NextResponse.json({ error: originCheck.error }, { status: 403 });
  }

  try {
    const body = await request.json();

    await connectDB();

    if (body.action === "mark_read") {
      if (!body.id || typeof body.id !== "string") {
        return NextResponse.json({ error: "Notification id is required" }, { status: 400 });
      }

      const notification = await AdminNotification.findByIdAndUpdate(
        body.id,
        { isRead: true, readAt: new Date() },
        { new: true }
      );

      if (!notification) {
        return NextResponse.json({ error: "Notification not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true, notification });
    }

    if (body.action === "mark_all_read") {
      await AdminNotification.updateMany(
        { isRead: false },
        { isRead: true, readAt: new Date() }
      );

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to update admin notifications:", error);
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}
