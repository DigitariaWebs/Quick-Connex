import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database/mongoose';
import Hospital from '@/models/Hospital';

// GET /api/hospitals - Get all hospitals with optional search and filtering
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const organizationType = searchParams.get('organizationType');
    const region = searchParams.get('region');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build query
    const query: any = { isActive: true };

    // Add search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { 'organization.name': { $regex: search, $options: 'i' } },
        { 'organization.region': { $regex: search, $options: 'i' } }
      ];
    }

    // Add organization type filter
    if (organizationType) {
      query['organization.type'] = organizationType;
    }

    // Add region filter
    if (region) {
      query['organization.region'] = { $regex: region, $options: 'i' };
    }

    // Execute query
    const hospitals = await Hospital.find(query)
      .select('name address organization specialties')
      .sort({ 'organization.type': 1, 'organization.name': 1, name: 1 })
      .limit(limit);

    return NextResponse.json({
      success: true,
      hospitals: hospitals.map(hospital => ({
        _id: hospital._id,
        name: hospital.name,
        address: hospital.address,
        organization: hospital.organization,
        specialties: hospital.specialties
      }))
    });

  } catch (error) {
    console.error('Error fetching hospitals:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch hospitals' },
      { status: 500 }
    );
  }
}

// GET /api/hospitals/organizations - Get all organization types and regions
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'organizations') {
      // Get all organization types and regions
      const organizations = await Hospital.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: {
              type: '$organization.type',
              name: '$organization.name',
              region: '$organization.region'
            },
            count: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: '$_id.type',
            organizations: {
              $push: {
                name: '$_id.name',
                region: '$_id.region',
                count: '$count'
              }
            }
          }
        },
        { $sort: { '_id': 1 } }
      ]);

      return NextResponse.json({
        success: true,
        organizations
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch organizations' },
      { status: 500 }
    );
  }
}
