// src/app/api/garage/notifications/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Garage from "@/models/Garage";
import GarageNotification from "@/models/GarageNotification";

// GET - Fetch notifications for the garage
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "garage") {
      return NextResponse.json({ error: "Not a garage user" }, { status: 403 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const garage = await Garage.findOne({ userId: user._id });
    if (!garage) {
      return NextResponse.json({ error: "Garage profile not found" }, { status: 404 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const unreadOnly = searchParams.get("unread") === "true";

    // Build query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = { garageId: garage._id };
    if (unreadOnly) {
      query.isRead = false;
    }

    // Fetch notifications
    const notifications = await GarageNotification.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    // Get unread count
    const unreadCount = await GarageNotification.countDocuments({
      garageId: garage._id,
      isRead: false,
    });

    const total = await GarageNotification.countDocuments(query);

    return NextResponse.json({
      success: true,
      notifications: notifications.map((n) => ({
        ...n,
        _id: n._id.toString(),
        garageId: n.garageId.toString(),
        bookingId: n.bookingId?.toString(),
      })),
      unreadCount,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// POST - Mark notification(s) as read
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "garage") {
      return NextResponse.json({ error: "Not a garage user" }, { status: 403 });
    }

    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const garage = await Garage.findOne({ userId: user._id });
    if (!garage) {
      return NextResponse.json({ error: "Garage profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const { action, notificationId } = body;

    if (action === "mark_read" && notificationId) {
      // Mark single notification as read
      const notification = await GarageNotification.findOneAndUpdate(
        { _id: notificationId, garageId: garage._id },
        { isRead: true, readAt: new Date() },
        { new: true }
      );

      if (!notification) {
        return NextResponse.json(
          { error: "Notification not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        notification: {
          ...notification.toObject(),
          _id: notification._id.toString(),
        },
      });
    } else if (action === "mark_all_read") {
      // Mark all notifications as read
      const result = await GarageNotification.updateMany(
        { garageId: garage._id, isRead: false },
        { isRead: true, readAt: new Date() }
      );

      return NextResponse.json({
        success: true,
        updatedCount: result.modifiedCount,
      });
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'mark_read' or 'mark_all_read'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error updating notifications:", error);
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 }
    );
  }
}
