// src/app/api/admin/users/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Booking from "@/models/Booking";
import { requireAdmin } from "@/lib/admin";
import type { UserRole } from "@/models/User";

interface CombinedUser {
  _id: string;
  username?: string;
  email?: string;
  name?: string;
  role: UserRole | "guest";
  accountStatus: "active" | "suspended" | "deleted";
  suspensionInfo?: {
    suspendedAt: string;
    suspendedBy: string;
    reason: string;
    suspendedUntil?: string;
    notes?: string;
  };
  bookingCount: number;
  isGuest: boolean;
  phone?: string;
  createdAt: string;
  updatedAt: string;
  lastBookingDate?: string;
  totalSpent?: number;
}

// GET /api/admin/users - Get all users (registered + guests) with booking counts
export async function GET() {
  const adminCheck = await requireAdmin();
  if (!adminCheck.authorized) {
    return adminCheck.response;
  }

  try {
    await connectDB();

    // Get all registered users (excluding password and deleted users)
    const registeredUsers = await User.find({
      accountStatus: { $ne: "deleted" }
    })
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    // Get booking counts and totals for registered users
    const userIds = registeredUsers.map((user) => user._id.toString());
    const registeredUserBookings = await Booking.aggregate([
      {
        $match: {
          userId: { $in: userIds.map(id => id) },
        },
      },
      {
        $group: {
          _id: "$userId",
          count: { $sum: 1 },
          totalSpent: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$paymentAmount", 0] } },
          lastBooking: { $max: "$createdAt" },
        },
      },
    ]);

    // Create a map of userId to booking stats
    const registeredBookingMap: Record<string, { count: number; totalSpent: number; lastBooking: Date }> = {};
    registeredUserBookings.forEach((item) => {
      registeredBookingMap[item._id?.toString() || ''] = {
        count: item.count,
        totalSpent: item.totalSpent,
        lastBooking: item.lastBooking,
      };
    });

    // Get unique guest users from bookings (those without userId but with isGuest: true)
    const guestBookings = await Booking.aggregate([
      {
        $match: {
          isGuest: true,
          userId: null,
        },
      },
      {
        $group: {
          _id: { $toLower: "$userEmail" },
          userName: { $first: "$userName" },
          userEmail: { $first: "$userEmail" },
          guestPhone: { $first: "$guestPhone" },
          count: { $sum: 1 },
          totalSpent: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$paymentAmount", 0] } },
          firstBooking: { $min: "$createdAt" },
          lastBooking: { $max: "$createdAt" },
        },
      },
      {
        $sort: { lastBooking: -1 },
      },
    ]);

    // Combine registered users with booking data
    const combinedUsers: CombinedUser[] = registeredUsers.map((user) => {
      const bookingStats = registeredBookingMap[user._id.toString()];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userDoc = user as any;
      return {
        _id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role || "user",
        accountStatus: userDoc.accountStatus || "active",
        suspensionInfo: userDoc.suspensionInfo ? {
          suspendedAt: userDoc.suspensionInfo.suspendedAt?.toISOString(),
          suspendedBy: userDoc.suspensionInfo.suspendedBy?.toString(),
          reason: userDoc.suspensionInfo.reason,
          suspendedUntil: userDoc.suspensionInfo.suspendedUntil?.toISOString(),
          notes: userDoc.suspensionInfo.notes,
        } : undefined,
        bookingCount: bookingStats?.count || 0,
        isGuest: false,
        createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: user.updatedAt?.toISOString() || new Date().toISOString(),
        lastBookingDate: bookingStats?.lastBooking?.toISOString(),
        totalSpent: bookingStats?.totalSpent || 0,
      };
    });

    // Add guest users
    guestBookings.forEach((guest) => {
      // Check if this email is already a registered user
      const existingUser = combinedUsers.find(
        (u) => u.email?.toLowerCase() === guest._id
      );
      
      if (!existingUser) {
        combinedUsers.push({
          _id: `guest_${guest._id}`,
          name: guest.userName,
          email: guest.userEmail,
          phone: guest.guestPhone,
          role: "guest",
          accountStatus: "active", // Guests are always active
          bookingCount: guest.count,
          isGuest: true,
          createdAt: guest.firstBooking?.toISOString() || new Date().toISOString(),
          updatedAt: guest.lastBooking?.toISOString() || new Date().toISOString(),
          lastBookingDate: guest.lastBooking?.toISOString(),
          totalSpent: guest.totalSpent || 0,
        });
      } else {
        // Update the registered user's booking count to include any guest bookings with same email
        existingUser.bookingCount += guest.count;
        existingUser.totalSpent = (existingUser.totalSpent || 0) + (guest.totalSpent || 0);
      }
    });

    // Sort by most recent activity
    combinedUsers.sort((a, b) => {
      const dateA = new Date(a.lastBookingDate || a.createdAt);
      const dateB = new Date(b.lastBookingDate || b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });

    // Calculate statistics
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const stats = {
      totalUsers: combinedUsers.length,
      registeredUsers: registeredUsers.length,
      guestUsers: combinedUsers.filter((u) => u.isGuest).length,
      activeUsers: combinedUsers.filter((u) => u.bookingCount > 0).length,
      newThisWeek: combinedUsers.filter(
        (u) => new Date(u.createdAt) >= weekAgo
      ).length,
      newToday: combinedUsers.filter((u) => new Date(u.createdAt) >= today).length,
    };

    return NextResponse.json({
      users: combinedUsers,
      stats,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
