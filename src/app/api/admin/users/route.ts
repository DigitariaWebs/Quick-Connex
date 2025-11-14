import { NextRequest, NextResponse } from "next/server";
import { DatabaseService } from "@/lib/database";
import User from "@/models/User";
import { CIUSSS } from "@/models/CIUSSS";
import { AuthService } from "@/lib/auth";
import mongoose from "mongoose";

/**
 * GET /api/admin/users
 * 
 * Fetch users with advanced filtering, search, and pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const { user } = await AuthService.requireAuth(request, {
      roles: ['admin', 'super_admin'],
      requireSession: true
    });

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

    // Fetch users with Mongoose populate (much faster than manual queries)
    // This reduces 50+ queries to just 3 queries (main + 2 populate)
    const [users, total] = await Promise.all([
      User.find(filter)
        .populate('ciusss', 'code name region isActive')
        .populate('hospital', 'name address organization specialties isActive')
        .select('-password') // Exclude password from results
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(), // Use lean() for better performance (returns plain objects)
      User.countDocuments(filter),
    ]);

    // Ensure _id is serialized as string for all users
    const serializedUsers = users.map((user: any) => ({
      ...user,
      _id: user._id?.toString() || user._id,
      ciusss: user.ciusss ? {
        ...user.ciusss,
        _id: user.ciusss._id?.toString() || user.ciusss._id
      } : undefined,
      hospital: user.hospital ? {
        ...user.hospital,
        _id: user.hospital._id?.toString() || user.hospital._id
      } : undefined,
    }));

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: {
        users: serializedUsers,
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Admin users API error:", error);
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
    const { user } = await AuthService.requireAuth(request, {
      roles: ['admin', 'super_admin'],
      requireSession: true
    });

    // DatabaseService handles connection automatically
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
    const existingUser = await DatabaseService.findOne(User, { email });
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