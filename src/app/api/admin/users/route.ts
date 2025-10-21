import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/database/mongoose";
import User from "@/models/User";
import { CIUSSS } from "@/models/CIUSSS";
import Hospital from "@/models/Hospital";
import mongoose from "mongoose";
import { requireAdmin, handleAuthError, createSuccessResponse } from "@/lib/auth/auth-utils";

/**
 * GET /api/admin/users
 * 
 * Fetch users with advanced filtering, search, and pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    console.log('🔍 Admin Users API: Starting authentication...');
    const { user } = await requireAdmin();
    console.log('🔍 Admin Users API: Authentication successful, user:', {
      hasUser: !!user,
      userType: user?.userType,
      hasId: !!user?._id,
      idType: typeof user?._id
    });

    await dbConnect();
    
    // Ensure models are registered
    const { CIUSSS } = await import("@/models/CIUSSS");
    const Hospital = await import("@/models/Hospital");

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "25");
    const search = searchParams.get("search") || "";
    const userType = searchParams.get("userType")?.split(",") || [];
    const status = searchParams.get("status")?.split(",") || [];
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build filter object
    const filter: any = {};

    // Search filter
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { userId: { $regex: search, $options: "i" } },
      ];
    }

    // UserType filter
    if (userType.length > 0) {
      filter.userType = { $in: userType };
    }

    // Status filter
    if (status.length > 0) {
      filter.status = { $in: status };
    }


    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch users without population first to avoid ObjectId casting errors
    console.log('🔍 Admin Users API: Fetching users without population...');
    const [rawUsers, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);
    
    console.log('🔍 Admin Users API: Found raw users:', rawUsers.length);
    if (rawUsers.length > 0) {
      console.log('🔍 Admin Users API: Sample user data:', {
        id: rawUsers[0]._id,
        name: `${rawUsers[0].firstName} ${rawUsers[0].lastName}`,
        userType: rawUsers[0].userType,
        ciusssType: typeof rawUsers[0].ciusss,
        ciusssValue: rawUsers[0].ciusss,
        hospitalType: typeof rawUsers[0].hospital,
        hospitalValue: rawUsers[0].hospital
      });
    }

    // Manually populate CIUSSS and Hospital data
    console.log('🔍 Admin Users API: Manually populating CIUSSS and Hospital data...');
    const users = await Promise.all(rawUsers.map(async (user) => {
      const populatedUser = { ...user };
      
      // Handle CIUSSS population
      if (user.ciusss) {
        try {
          // Check if ciusss is an ObjectId or string
          if (typeof user.ciusss === 'string') {
            // If it's a string, try to find by code
            const ciusss = await CIUSSS.findOne({ code: user.ciusss });
            populatedUser.ciusss = ciusss;
          } else {
            // If it's an ObjectId, populate normally
            const ciusss = await CIUSSS.findById(user.ciusss);
            populatedUser.ciusss = ciusss;
          }
        } catch (error) {
          console.warn(`⚠️ Failed to populate CIUSSS for user ${user._id}:`, error.message);
          populatedUser.ciusss = null;
        }
      }
      
      // Handle Hospital population
      if (user.hospital) {
        try {
          // Check if hospital is an ObjectId or string
          if (typeof user.hospital === 'string') {
            // If it's a string, try to find by name
            const hospital = await Hospital.default.findOne({ name: user.hospital });
            populatedUser.hospital = hospital;
          } else {
            // If it's an ObjectId, populate normally
            const hospital = await Hospital.default.findById(user.hospital);
            populatedUser.hospital = hospital;
          }
        } catch (error) {
          console.warn(`⚠️ Failed to populate Hospital for user ${user._id}:`, error.message);
          populatedUser.hospital = null;
        }
      }
      
      return populatedUser;
    }));
    
    console.log('🔍 Admin Users API: Successfully populated users:', users.length);

    const totalPages = Math.ceil(total / limit);

    const responseData = {
      success: true,
      data: {
        users,
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
    
    console.log('🔍 Admin Users API: Response data structure:', {
      success: responseData.success,
      usersCount: responseData.data.users.length,
      total: responseData.data.total,
      pagination: {
        page: responseData.data.page,
        limit: responseData.data.limit,
        totalPages: responseData.data.totalPages
      }
    });

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("❌ Admin users API error:", error);
    console.error("❌ Error details:", {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch users',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users
 * 
 * Create a new user
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const { user } = await requireAdmin();

    await dbConnect();
    
    // Ensure models are registered
    const { CIUSSS } = await import("@/models/CIUSSS");
    const Hospital = await import("@/models/Hospital");

    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      userType,
      ciusssId,
      hospitalId,
      phone,
      post,
    } = body;

    // Validate CIUSSS and Hospital references for managers
    if (userType === 'manager') {
      // Validate CIUSSS reference
      if (ciusssId) {
        // Ensure it's a valid ObjectId, not a string
        if (!mongoose.Types.ObjectId.isValid(ciusssId)) {
          return NextResponse.json(
            { 
              success: false, 
              message: "CIUSSS reference must be a valid ObjectId",
              error: "Invalid CIUSSS format"
            },
            { status: 400 }
          );
        }
        
        const ciusssExists = await CIUSSS.findById(ciusssId);
        if (!ciusssExists) {
          return NextResponse.json(
            { 
              success: false, 
              message: "CIUSSS reference not found in database",
              error: "Invalid CIUSSS reference"
            },
            { status: 400 }
          );
        }
      }
      
      // Validate Hospital reference
      if (hospitalId) {
        // Ensure it's a valid ObjectId, not a string
        if (!mongoose.Types.ObjectId.isValid(hospitalId)) {
          return NextResponse.json(
            { 
              success: false, 
              message: "Hospital reference must be a valid ObjectId",
              error: "Invalid Hospital format"
            },
            { status: 400 }
          );
        }
        
        const hospitalExists = await mongoose.models.Hospital?.findById(hospitalId);
        if (!hospitalExists) {
          return NextResponse.json(
            { 
              success: false, 
              message: "Hospital reference not found in database",
              error: "Invalid Hospital reference"
            },
            { status: 400 }
          );
        }
      }
    }

    // Validate required fields
    if (!firstName || !lastName || !email || !userType) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Create new user
    const newUser = new User({
      firstName,
      lastName,
      email,
      userType,
      phone,
      ciusss: ciusssId,
      hospital: hospitalId,
      post: post,
      status: "pending",
    });

    await newUser.save();

    // Populate related data
    await newUser.populate("ciusss", "code name region isActive");
    await newUser.populate("hospital", "name address organization specialties isActive");

    return NextResponse.json({
      success: true,
      data: { user: newUser },
      message: "User created successfully",
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}