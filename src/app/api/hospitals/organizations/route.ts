import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import Hospital from '@/models/Hospital';

// GET /api/hospitals/organizations - Get all organization types and regions
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

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

  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch organizations' },
      { status: 500 }
    );
  }
}
