/**
 * Hospital Controller
 * 
 * Hospital management operations.
 */

import { Request, Response } from 'express';
import { ResponseBuilder } from '@/utils/response.util';
import { DatabaseService } from '@/lib/database';
import Hospital from '@/models/Hospital';

/**
 * GET /api/hospitals - List hospitals
 */
export async function getHospitals(req: Request, res: Response): Promise<Response> {
  try {
    const {
      search,
      organizationType,
      region,
      limit = '50'
    } = req.query;

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

    // Execute query using DatabaseService
    const hospitals = await DatabaseService.findMany(Hospital, query, {
      select: 'name address organization specialties',
      sort: { 'organization.type': 1, 'organization.name': 1, name: 1 },
      limit: parseInt(limit as string)
    });

    return ResponseBuilder.success(res, {
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
    return ResponseBuilder.serverError(res, 'Failed to fetch hospitals');
  }
}

/**
 * POST /api/hospitals?action=organizations - Get organization types
 */
export async function getOrganizations(req: Request, res: Response): Promise<Response> {
  try {
    const { action } = req.query;

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

      return ResponseBuilder.success(res, { organizations });
    }

    return ResponseBuilder.badRequest(res, 'Invalid action');

  } catch (error) {
    console.error('Error fetching organizations:', error);
    return ResponseBuilder.serverError(res, 'Failed to fetch organizations');
  }
}
