import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database/mongoose';
import { CIUSSS } from '@/models/CIUSSS';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const { id } = params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid CIUSSS ID format' 
        },
        { status: 400 }
      );
    }
    
    const ciusss = await CIUSSS.findById(id);
    
    if (!ciusss) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'CIUSSS not found' 
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      ciusss
    });
    
  } catch (error) {
    console.error('Error fetching CIUSSS:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch CIUSSS',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const { id } = params;
    const body = await request.json();
    const { code, name, region, isActive } = body;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid CIUSSS ID format' 
        },
        { status: 400 }
      );
    }
    
    const ciusss = await CIUSSS.findById(id);
    
    if (!ciusss) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'CIUSSS not found' 
        },
        { status: 404 }
      );
    }
    
    // Update fields
    if (code !== undefined) ciusss.code = code.toUpperCase();
    if (name !== undefined) ciusss.name = name;
    if (region !== undefined) ciusss.region = region;
    if (isActive !== undefined) ciusss.isActive = isActive;
    
    await ciusss.save();
    
    return NextResponse.json({
      success: true,
      message: 'CIUSSS updated successfully',
      ciusss
    });
    
  } catch (error) {
    console.error('Error updating CIUSSS:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to update CIUSSS',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const { id } = params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid CIUSSS ID format' 
        },
        { status: 400 }
      );
    }
    
    const ciusss = await CIUSSS.findById(id);
    
    if (!ciusss) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'CIUSSS not found' 
        },
        { status: 404 }
      );
    }
    
    // Instead of deleting, mark as inactive
    ciusss.isActive = false;
    await ciusss.save();
    
    return NextResponse.json({
      success: true,
      message: 'CIUSSS deactivated successfully'
    });
    
  } catch (error) {
    console.error('Error deactivating CIUSSS:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to deactivate CIUSSS',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
