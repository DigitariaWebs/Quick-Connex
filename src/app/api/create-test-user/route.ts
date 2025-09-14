import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    // Connect to MongoDB
    console.log('🔄 API: Attempting to connect to MongoDB...');
    await dbConnect();
    console.log('✅ API: MongoDB connection established');

    // Create test users with known passwords
    const testUsers = [
      {
        userType: 'manager' as const,
        firstName: 'Test',
        lastName: 'Manager',
        email: 'manager@test.com',
        phone: '(555) 000-0001',
        password: 'password123',
        post: 'Test Manager',
        class: 'A'
      },
      {
        userType: 'employee' as const,
        firstName: 'Test',
        lastName: 'Employee',
        email: 'employee@test.com',
        phone: '(555) 000-0002',
        password: 'password123',
        opiqPermit: 'TEST-OPIQ-001',
        rcr: 'TEST-RCR-001'
      }
    ];

    const createdUsers = [];

    for (const userData of testUsers) {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      
      if (existingUser) {
        console.log(`⚠️ API: User ${userData.email} already exists, skipping...`);
        continue;
      }

      // Hash the password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
      
      // Create user with hashed password
      const userToCreate = {
        ...userData,
        password: hashedPassword
      };

      const newUser = new User(userToCreate);
      const savedUser = await newUser.save();
      
      console.log(`✅ API: Test user created: ${savedUser.email}`);
      createdUsers.push({
        email: savedUser.email,
        userType: savedUser.userType,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName
      });
    }

    return NextResponse.json({
      message: 'Test users created successfully',
      users: createdUsers,
      loginCredentials: {
        manager: {
          email: 'manager@test.com',
          password: 'password123'
        },
        employee: {
          email: 'employee@test.com',
          password: 'password123'
        }
      }
    });

  } catch (error) {
    console.error('❌ API: Failed to create test users:', error);
    return NextResponse.json(
      { message: 'Failed to create test users', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
