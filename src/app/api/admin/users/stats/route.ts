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

    // Get current date for calculations
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    // Optimize: Use a single aggregation pipeline to get all stats at once
    // This is much faster than multiple separate count queries
    const [
      statsResult,
      usersByRole,
      usersByOrganization,
      organizationDetails,
    ] = await Promise.all([
      // Single aggregation to get all counts
      User.aggregate([
        {
          $facet: {
            total: [{ $count: "count" }],
            byStatus: [
              { $group: { _id: "$status", count: { $sum: 1 } } }
            ],
            newThisWeek: [
              { $match: { createdAt: { $gte: startOfWeek } } },
              { $count: "count" }
            ],
            newThisMonth: [
              { $match: { createdAt: { $gte: startOfMonth } } },
              { $count: "count" }
            ],
            loginToday: [
              { $match: { lastLogin: { $gte: startOfToday } } },
              { $count: "count" }
            ],
            loginThisWeek: [
              { $match: { lastLogin: { $gte: startOfWeek } } },
              { $count: "count" }
            ],
            loginThisMonth: [
              { $match: { lastLogin: { $gte: startOfMonth } } },
              { $count: "count" }
            ],
            locked: [
              { $match: { accountLockedUntil: { $gt: new Date() } } },
              { $count: "count" }
            ],
            superAdmins: [
              { $match: { userType: "super_admin" } },
              { $count: "count" }
            ],
          }
        }
      ]),
      // Users by role
      User.aggregate([
        { $group: { _id: "$userType", count: { $sum: 1 } } },
      ]),
      // Users by CIUSSS
      User.aggregate([
        { $group: { _id: "$ciuss", count: { $sum: 1 } } },
      ]),
      // Organization details with lookup
      User.aggregate([
        { $lookup: { from: "organizations", localField: "organization", foreignField: "_id", as: "orgDetails" } },
        { $unwind: "$orgDetails" },
        { $group: { _id: "$organization", name: { $first: "$orgDetails.name" }, count: { $sum: 1 } } },
      ]),
    ]);

    // Extract stats from aggregation result
    const statsData = statsResult[0];
    const totalUsers = statsData.total[0]?.count || 0;
    const statusCounts = statsData.byStatus.reduce((acc: any, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, {});
    const approvedUsers = statusCounts.approved || 0;
    const pendingUsers = statusCounts.pending || 0;
    const suspendedUsers = statusCounts.suspended || 0;
    const rejectedUsers = statusCounts.rejected || 0;
    const newThisWeek = statsData.newThisWeek[0]?.count || 0;
    const newThisMonth = statsData.newThisMonth[0]?.count || 0;
    const loginActivityToday = statsData.loginToday[0]?.count || 0;
    const loginActivityThisWeek = statsData.loginThisWeek[0]?.count || 0;
    const loginActivityThisMonth = statsData.loginThisMonth[0]?.count || 0;
    const lockedUsers = statsData.locked[0]?.count || 0;
    const superAdminUsers = statsData.superAdmins[0]?.count || 0;

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
    organizationDetails.forEach((org: any) => {
      organizationStats[org._id?.toString() || org._id] = {
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
        approved: approvedUsers,
        pending: pendingUsers,
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
