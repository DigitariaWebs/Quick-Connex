import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database/mongoose';
import { CIUSSS } from '@/models/CIUSSS';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    const limit = searchParams.get('limit');
    
    // Build query
    const query: any = {};
    if (isActive !== null) {
      query.isActive = isActive === 'true';
    }
    
    // Build options
    const options: any = {
      sort: { name: 1 } // Sort by name alphabetically
    };
    
    if (limit) {
      options.limit = parseInt(limit);
    }
    
    const ciusssList = await CIUSSS.find(query, null, options);
    
    return NextResponse.json({
      success: true,
      ciusss: ciusssList,
      count: ciusssList.length
    });
    
  } catch (error) {
    console.error('Error fetching CIUSSS:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch CIUSSS data',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { code, name, region, isActive = true } = body;
    
    // Validate required fields
    if (!code || !name) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Code and name are required' 
        },
        { status: 400 }
      );
    }
    
    // Check if CIUSSS with this code already exists
    const existingCIUSSS = await CIUSSS.findOne({ code: code.toUpperCase() });
    if (existingCIUSSS) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'CIUSSS with this code already exists' 
        },
        { status: 409 }
      );
    }
    
    const newCIUSSS = new CIUSSS({
      code: code.toUpperCase(),
      name,
      region,
      isActive
    });
    
    await newCIUSSS.save();
    
    return NextResponse.json({
      success: true,
      message: 'CIUSSS created successfully',
      ciusss: newCIUSSS
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating CIUSSS:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to create CIUSSS',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
