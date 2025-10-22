/**
 * Timeline Service Test
 * 
 * Simple test to verify timeline service functionality
 */

import { TimelineService } from './TimelineService';
import { TimelineUtils } from './TimelineUtils';
import { AuditAction, ActorType, RiskLevel } from '@/models/UnifiedAuditLog';

/**
 * Test timeline service functionality
 */
export async function testTimelineService() {
  console.log('🧪 Testing Timeline Service...');
  
  try {
    // Test 1: Get transfer timeline
    console.log('\n1. Testing getTransferTimeline...');
    const transferId = 'test-transfer-123';
    const timeline = await TimelineService.getTransferTimeline(transferId, {
      page: 1,
      limit: 10,
      filters: {
        kind: 'transfer_created'
      }
    });
    
    console.log(`✅ Found ${timeline.items.length} timeline items`);
    console.log(`📊 Total: ${timeline.pagination.total}, Page: ${timeline.pagination.page}`);
    
    // Test 2: Get recent activity
    console.log('\n2. Testing getRecentActivity...');
    const recentActivity = await TimelineService.getRecentActivity({
      limit: 5,
      filters: {
        category: 'transfer_management' as any
      }
    });
    
    console.log(`✅ Found ${recentActivity.length} recent activities`);
    
    // Test 3: Get timeline stats
    console.log('\n3. Testing getTimelineStats...');
    const stats = await TimelineService.getTimelineStats(transferId);
    
    console.log(`✅ Timeline stats:`, {
      totalEvents: stats.totalEvents,
      statusChanges: stats.statusChanges,
      documentUploads: stats.documentUploads,
      lastActivity: stats.lastActivity
    });
    
    // Test 4: Test utility functions
    console.log('\n4. Testing TimelineUtils...');
    
    const eventKind = TimelineUtils.getEventKind(AuditAction.TRANSFER_CREATED);
    console.log(`✅ Event kind for TRANSFER_CREATED: ${eventKind}`);
    
    const badges = TimelineUtils.getEventBadges('transfer_created');
    console.log(`✅ Badges for transfer_created: ${badges.join(', ')}`);
    
    const title = TimelineUtils.generateEventTitle(
      AuditAction.TRANSFER_CREATED, 
      'John Doe', 
      'Patient X'
    );
    console.log(`✅ Generated title: ${title}`);
    
    const description = TimelineUtils.generateEventDescription(
      AuditAction.TRANSFER_CREATED,
      'John Doe',
      'Patient X'
    );
    console.log(`✅ Generated description: ${description}`);
    
    const actorName = TimelineUtils.getActorDisplayName({
      name: 'Jane Smith',
      email: 'jane@example.com',
      type: ActorType.ADMIN
    });
    console.log(`✅ Actor display name: ${actorName}`);
    
    const icon = TimelineUtils.getEventIcon('transfer_created');
    console.log(`✅ Event icon: ${icon}`);
    
    const riskColor = TimelineUtils.getRiskLevelColor(RiskLevel.HIGH);
    console.log(`✅ Risk level color: ${riskColor}`);
    
    console.log('\n🎉 All timeline service tests passed!');
    
  } catch (error) {
    console.error('❌ Timeline service test failed:', error);
    throw error;
  }
}

/**
 * Test timeline service with mock data
 */
export async function testTimelineServiceWithMockData() {
  console.log('🧪 Testing Timeline Service with Mock Data...');
  
  try {
    // Mock timeline items for testing
    const mockTimelineItems = [
      {
        timelineItemId: '1',
        transferId: 'transfer-123',
        kind: 'transfer_created',
        title: 'Transfer created by John Doe',
        description: 'New transfer request created for Patient X',
        timestamp: new Date('2024-01-15T10:30:00Z'),
        order: 0,
        actor: {
          id: 'user-123',
          type: ActorType.USER,
          name: 'John Doe',
          email: 'john@example.com',
          role: 'employee'
        },
        badges: ['new', 'transfer'],
        tags: ['transfer', 'creation'],
        isSensitive: false,
        requiresReview: false
      },
      {
        timelineItemId: '2',
        transferId: 'transfer-123',
        kind: 'transfer_approved',
        title: 'Transfer approved by Jane Smith',
        description: 'Transfer request has been approved',
        timestamp: new Date('2024-01-15T11:00:00Z'),
        order: 1,
        actor: {
          id: 'user-456',
          type: ActorType.ADMIN,
          name: 'Jane Smith',
          email: 'jane@example.com',
          role: 'manager'
        },
        badges: ['approved', 'status_change'],
        tags: ['transfer', 'approval', 'status'],
        isSensitive: false,
        requiresReview: false
      }
    ];
    
    // Test utility functions with mock data
    console.log('\n1. Testing utility functions with mock data...');
    
    const filteredItems = TimelineUtils.filterTimelineItems(mockTimelineItems, 'transfer');
    console.log(`✅ Filtered items: ${filteredItems.length}`);
    
    const groupedItems = TimelineUtils.groupTimelineItemsByDate(mockTimelineItems);
    console.log(`✅ Grouped by date: ${Object.keys(groupedItems).length} groups`);
    
    const sortedItems = TimelineUtils.sortTimelineItems(mockTimelineItems, true);
    console.log(`✅ Sorted items: ${sortedItems.length}`);
    
    // Test formatting functions
    console.log('\n2. Testing formatting functions...');
    
    mockTimelineItems.forEach((item, index) => {
      const formattedTime = TimelineUtils.formatTimestamp(item.timestamp);
      const actorIcon = TimelineUtils.getActorIcon(item.actor.type);
      const eventIcon = TimelineUtils.getEventIcon(item.kind);
      
      console.log(`✅ Item ${index + 1}: ${formattedTime} ${actorIcon} ${eventIcon} ${item.title}`);
    });
    
    console.log('\n🎉 Mock data tests passed!');
    
  } catch (error) {
    console.error('❌ Mock data test failed:', error);
    throw error;
  }
}

// Export test functions
export default {
  testTimelineService,
  testTimelineServiceWithMockData
};

