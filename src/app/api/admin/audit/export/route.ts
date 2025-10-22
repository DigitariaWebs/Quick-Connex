import { NextRequest, NextResponse } from 'next/server';
import UnifiedAuditLog, { AuditCategory, ActorType, RiskLevel } from '@/models/UnifiedAuditLog';

/**
 * POST /api/admin/audit/export
 * 
 * Export audit logs (CSV, PDF, Excel)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      format = 'csv',
      category,
      actorType,
      riskLevel,
      actorId,
      startDate,
      endDate,
      isSensitive,
      requiresReview,
      outcome
    } = body;
    
    // Build query
    const query: any = {};
    
    if (category) query.category = category;
    if (actorType) query.actorType = actorType;
    if (riskLevel) query['securityContext.riskLevel'] = riskLevel;
    if (actorId) query.actorId = actorId;
    if (isSensitive) query['securityContext.isSensitive'] = true;
    if (requiresReview) query['securityContext.requiresReview'] = true;
    if (outcome) query.outcome = outcome;
    
    // Date range filtering
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    // Get audit logs for export
    const logs = await UnifiedAuditLog.find(query)
      .sort({ timestamp: -1 })
      .lean();
    
    // Generate export based on format
    let exportData: string;
    let contentType: string;
    let filename: string;
    
    const timestamp = new Date().toISOString().split('T')[0];
    
    switch (format.toLowerCase()) {
      case 'csv':
        exportData = generateCSV(logs);
        contentType = 'text/csv';
        filename = `audit-logs-${timestamp}.csv`;
        break;
        
      case 'json':
        exportData = JSON.stringify(logs, null, 2);
        contentType = 'application/json';
        filename = `audit-logs-${timestamp}.json`;
        break;
        
      default:
        return NextResponse.json(
          { success: false, error: 'Unsupported export format' },
          { status: 400 }
        );
    }
    
    // Return the export data
    return new NextResponse(exportData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': Buffer.byteLength(exportData).toString()
      }
    });
    
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export audit logs' },
      { status: 500 }
    );
  }
}

/**
 * Generate CSV from audit logs
 */
function generateCSV(logs: any[]): string {
  if (logs.length === 0) {
    return 'No audit logs found';
  }
  
  // CSV headers
  const headers = [
    'Timestamp',
    'Actor ID',
    'Actor Type',
    'Actor Email',
    'Actor Name',
    'Action',
    'Category',
    'Description',
    'Target Resource Type',
    'Target Resource ID',
    'Target Resource Name',
    'Risk Level',
    'Is Sensitive',
    'Requires Review',
    'Outcome',
    'Error Message',
    'IP Address',
    'User Agent',
    'Duration (ms)',
    'Is Automated',
    'Is Bulk Operation'
  ];
  
  // Convert logs to CSV rows
  const rows = logs.map(log => [
    log.timestamp,
    log.actorId || '',
    log.actorType || '',
    log.actorEmail || '',
    log.actorName || '',
    log.action || '',
    log.category || '',
    log.description || '',
    log.targetResource?.type || '',
    log.targetResource?.id || '',
    log.targetResource?.name || '',
    log.securityContext?.riskLevel || '',
    log.securityContext?.isSensitive || false,
    log.securityContext?.requiresReview || false,
    log.outcome || '',
    log.errorMessage || '',
    log.requestInfo?.ipAddress || '',
    log.requestInfo?.userAgent || '',
    log.duration || '',
    log.isAutomated || false,
    log.isBulkOperation || false
  ]);
  
  // Combine headers and rows
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  
  return csvContent;
}















