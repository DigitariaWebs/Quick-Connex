/**
 * CIUSSS Controller
 * 
 * CIUSSS management operations.
 */

import { Request, Response } from 'express';
import { ResponseBuilder } from '@/utils/response.util';
import { DatabaseService } from '@/lib/database';
import { CIUSSS } from '@/models/CIUSSS';

/**
 * GET /api/ciusss - List CIUSSS centers
 */
export async function getCIUSSS(req: Request, res: Response): Promise<Response> {
  try {
    const { isActive, limit } = req.query;
    
    // Build query
    const query: any = {};
    if (isActive !== null && isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    // Build options
    const options: any = {
      sort: { name: 1 } // Sort by name alphabetically
    };
    
    if (limit) {
      options.limit = parseInt(limit as string);
    }
    
    const ciusssList = await DatabaseService.findMany(CIUSSS, query, options);
    
    return ResponseBuilder.success(res, {
      ciusss: ciusssList,
      count: ciusssList.length
    });
    
  } catch (error) {
    console.error('Error fetching CIUSSS:', error);
    return ResponseBuilder.serverError(res, 'Failed to fetch CIUSSS data');
  }
}

/**
 * POST /api/ciusss - Create CIUSSS center
 */
export async function createCIUSSS(req: Request, res: Response): Promise<Response> {
  try {
    const { code, name, region, isActive = true } = req.body;
    
    // Validate required fields
    if (!code || !name) {
      return ResponseBuilder.badRequest(res, 'Code and name are required');
    }
    
    // Check if CIUSSS with this code already exists
    const existingCIUSSS = await DatabaseService.findOne(CIUSSS, { code: code.toUpperCase() });
    if (existingCIUSSS) {
      return ResponseBuilder.conflict(res, 'CIUSSS with this code already exists');
    }
    
    const newCIUSSS = new CIUSSS({
      code: code.toUpperCase(),
      name,
      region,
      isActive
    });
    
    await newCIUSSS.save();
    
    return ResponseBuilder.created(res, { ciusss: newCIUSSS });
    
  } catch (error) {
    console.error('Error creating CIUSSS:', error);
    return ResponseBuilder.serverError(res, 'Failed to create CIUSSS');
  }
}
