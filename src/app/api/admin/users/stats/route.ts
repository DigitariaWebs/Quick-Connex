import { NextRequest, NextResponse } from "next/server";
import { DatabaseService } from "@/lib/database";
import User from "@/models/User";
import { AuthService } from "@/lib/auth";

/**
 * GET /api/admin/users/stats
 * 
 * Fetch comprehensive user statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const { user } = await AuthService.requireAuth(request, {
      roles: ['admin', 'super_admin'],
      requireSession: true
    });

    // DatabaseService handles connection automatically
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
      DatabaseService.count(User, {}),
      
      // Status counts
      DatabaseService.count(User, { status: "approved" }),
      DatabaseService.count(User, { status: "pending" }),
      DatabaseService.count(User, { status: "suspended" }),
      DatabaseService.count(User, { status: "rejected" }),
      
      // New users this week
      DatabaseService.count(User, { createdAt: { $gte: startOfWeek } }),
      
      // New users this month
      DatabaseService.count(User, { createdAt: { $gte: startOfMonth } }),
      
      // Users by role
      DatabaseService.aggregate(User, [
        { $group: { _id: "$userType", count: { $sum: 1 } } },
      ]),
      
      // Users by organization
      DatabaseService.aggregate(User, [
        { $group: { _id: "$ciuss", count: { $sum: 1 } } },
      ]),
      
      // Login activity today
      DatabaseService.count(User, { lastLogin: { $gte: startOfToday } }),
      
      // Login activity this week
      DatabaseService.count(User, { lastLogin: { $gte: startOfWeek } }),
      
      // Login activity this month
      DatabaseService.count(User, { lastLogin: { $gte: startOfMonth } }),
      
      // Account status
      DatabaseService.count(User, { status: "approved" }),
      DatabaseService.count(User, { status: "pending" }),
      DatabaseService.count(User, { accountLockedUntil: { $gt: new Date() } }),
      DatabaseService.count(User, { userType: "super_admin" }),
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
    const organizationDetails = await DatabaseService.aggregate(User, [
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
