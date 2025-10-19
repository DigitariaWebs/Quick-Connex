/**
 * Session Repository
 * 
 * Clean data access layer for session operations.
 * Single responsibility: database operations for sessions.
 */

import dbConnect from '@/lib/database/mongoose';
import Session from '@/models/Session';

export interface SessionQuery {
  sessionId?: string;
  userId?: string;
  isActive?: boolean;
  revoked?: boolean;
  expiresAt?: { $gt?: Date; $lt?: Date };
}

export interface SessionProjection {
  sessionId?: number;
  userId?: number;
  deviceInfo?: number;
  ipAddress?: number;
  expiresAt?: number;
  lastAccessedAt?: number;
  createdAt?: number;
  securityContext?: number;
  sessionType?: number;
  isPrimary?: number;
}

export class SessionRepository {
  
  /**
   * Find session by ID
   */
  static async findById(sessionId: string, projection?: SessionProjection): Promise<any> {
    await dbConnect();
    
    const query: SessionQuery = { sessionId, isActive: true, revoked: false };
    const options = projection ? { projection } : {};
    
    return await Session.findOne(query, options).lean();
  }
  
  /**
   * Find sessions by user ID
   */
  static async findByUserId(userId: string, projection?: SessionProjection): Promise<any[]> {
    await dbConnect();
    
    const query: SessionQuery = { userId, isActive: true, revoked: false };
    const options = projection ? { projection } : {};
    
    return await Session.find(query, options).lean();
  }
  
  /**
   * Find expired sessions
   */
  static async findExpired(): Promise<any[]> {
    await dbConnect();
    
    return await Session.find({
      $or: [
        { expiresAt: { $lt: new Date() } },
        { revoked: true, revokedAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
      ]
    }).lean();
  }
  
  /**
   * Count sessions by criteria
   */
  static async countSessions(query: SessionQuery): Promise<number> {
    await dbConnect();
    
    return await Session.countDocuments(query);
  }
  
  /**
   * Get session statistics
   */
  static async getSessionStats(): Promise<{
    total: number;
    active: number;
    expired: number;
    highRisk: number;
  }> {
    await dbConnect();
    
    const now = new Date();
    
    const [total, active, expired, highRisk] = await Promise.all([
      Session.countDocuments({}),
      Session.countDocuments({ isActive: true, revoked: false, expiresAt: { $gt: now } }),
      Session.countDocuments({ expiresAt: { $lt: now } }),
      Session.countDocuments({ 
        isActive: true, 
        revoked: false, 
        'securityContext.riskScore': { $gte: 70 } 
      })
    ]);
    
    return { total, active, expired, highRisk };
  }
  
  /**
   * Get session distribution by type
   */
  static async getSessionDistribution(): Promise<Record<string, number>> {
    await dbConnect();
    
    const distribution = await Session.aggregate([
      { $match: { isActive: true, revoked: false } },
      { $group: { _id: '$sessionType', count: { $sum: 1 } } }
    ]);
    
    const result: Record<string, number> = {};
    distribution.forEach(item => {
      result[item._id] = item.count;
    });
    
    return result;
  }
  
  /**
   * Get average session age
   */
  static async getAverageSessionAge(): Promise<number> {
    await dbConnect();
    
    const result = await Session.aggregate([
      { $match: { isActive: true, revoked: false } },
      {
        $group: {
          _id: null,
          averageAge: { $avg: { $subtract: [new Date(), '$createdAt'] } }
        }
      }
    ]);
    
    return result[0]?.averageAge ? Math.floor(result[0].averageAge / (1000 * 60)) : 0;
  }
  
  /**
   * Delete expired sessions
   */
  static async deleteExpiredSessions(): Promise<number> {
    await dbConnect();
    
    const result = await Session.deleteMany({
      $or: [
        { expiresAt: { $lt: new Date() } },
        { revoked: true, revokedAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
      ]
    });
    
    return result.deletedCount || 0;
  }
  
  /**
   * Batch update sessions
   */
  static async batchUpdate(updates: Array<{ sessionId: string; updates: any }>): Promise<number> {
    await dbConnect();
    
    const bulkOps = updates.map(({ sessionId, updates }) => ({
      updateOne: {
        filter: { sessionId },
        update: { $set: updates }
      }
    }));
    
    const result = await Session.bulkWrite(bulkOps);
    return result.modifiedCount || 0;
  }
}
