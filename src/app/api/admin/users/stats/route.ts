import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/database/mongoose";
import User from "@/models/User";
import { requireAdminWithSession } from "@/lib/auth/session-auth-middleware";

/**
 * GET /api/admin/users/stats
 * 
 * Fetch comprehensive user statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await requireAdminWithSession(request);
    if (!authResult.success) {
      return authResult.response;
    }

    await dbConnect();

    // Get current date for calculations
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    // Calculate all statistics in parallel
    const [
      totalUsers,
      approvedUsers,
      pendingUsers,
      suspendedUsers,
      rejectedUsers,
      newThisWeek,
      newThisMonth,
      usersByRole,
      usersByOrganization,
      loginActivityToday,
      loginActivityThisWeek,
      loginActivityThisMonth,
      approvedUsersCount,
      pendingUsersCount,
      lockedUsers,
      superAdminUsers,
    ] = await Promise.all([
      // Total users
      User.countDocuments(),
      
      // Status counts
      User.countDocuments({ status: "approved" }),
      User.countDocuments({ status: "pending" }),
      User.countDocuments({ status: "suspended" }),
      User.countDocuments({ status: "rejected" }),
      
      // New users this week
      User.countDocuments({ createdAt: { $gte: startOfWeek } }),
      
      // New users this month
      User.countDocuments({ createdAt: { $gte: startOfMonth } }),
      
      // Users by role
      User.aggregate([
        { $group: { _id: "$userType", count: { $sum: 1 } } },
      ]),
      
      // Users by organization
      User.aggregate([
        { $group: { _id: "$ciuss", count: { $sum: 1 } } },
      ]),
      
      // Login activity today
      User.countDocuments({ lastLogin: { $gte: startOfToday } }),
      
      // Login activity this week
      User.countDocuments({ lastLogin: { $gte: startOfWeek } }),
      
      // Login activity this month
      User.countDocuments({ lastLogin: { $gte: startOfMonth } }),
      
      // Account status
      User.countDocuments({ status: "approved" }),
      User.countDocuments({ status: "pending" }),
      User.countDocuments({ accountLockedUntil: { $gt: new Date() } }),
      User.countDocuments({ isSuperAdmin: true }),
    ]);

    // Process role statistics
    const roleStats = {
      employees: 0,
      managers: 0,
      admins: 0,
      superAdmins: 0,
    };

    usersByRole.forEach((role) => {
      switch (role._id) {
        case "employee":
          roleStats.employees = role.count;
          break;
        case "manager":
          roleStats.managers = role.count;
          break;
        case "admin":
          roleStats.admins = role.count;
          break;
        case "super_admin":
          roleStats.superAdmins = role.count;
          break;
      }
    });

    // Process organization statistics
    const organizationStats: Record<string, { name: string; count: number }> = {};
    
    // Get organization details for populated stats
    const organizationDetails = await User.aggregate([
      { $lookup: { from: "organizations", localField: "organization", foreignField: "_id", as: "orgDetails" } },
      { $unwind: "$orgDetails" },
      { $group: { _id: "$organization", name: { $first: "$orgDetails.name" }, count: { $sum: 1 } } },
    ]);

    organizationDetails.forEach((org) => {
      organizationStats[org._id] = {
        name: org.name,
        count: org.count,
      };
    });

    // Compile final statistics
    const stats = {
      total: totalUsers,
      approved: approvedUsers,
      pending: pendingUsers,
      suspended: suspendedUsers,
      rejected: rejectedUsers,
      newThisWeek,
      newThisMonth,
      byRole: roleStats,
      byOrganization: organizationStats,
      loginActivity: {
        today: loginActivityToday,
        thisWeek: loginActivityThisWeek,
        thisMonth: loginActivityThisMonth,
      },
      accountHealth: {
        approved: approvedUsersCount,
        pending: pendingUsersCount,
        locked: lockedUsers,
        superAdmin: superAdminUsers,
      },
    };

    return NextResponse.json({
      success: true,
      data: {
        stats,
        lastUpdated: new Date(),
      },
    });
  } catch (error) {
    console.error("Error fetching user statistics:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
