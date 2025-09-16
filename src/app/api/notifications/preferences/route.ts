import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { requireEmployeeOrManager, createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware';

// GET /api/notifications/preferences - Get user's notification preferences
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await requireEmployeeOrManager(request);
    if (!authResult.success) {
      return authResult.response;
    }

    await connectDB();

    const user = await User.findById(authResult.user._id).select('notificationPreferences');
    
    const defaultPreferences = {
      realtime: {
        enabled: true,
        sound: true,
        desktop: true,
        types: {
          transfer_status_change: true,
          new_transfer: true,
          urgent_transfer: true,
          transfer_reminder: true,
          system: true,
          scheduling: true
        }
      },
      email: {
        enabled: false,
        types: {
          transfer_status_change: false,
          new_transfer: true,
          urgent_transfer: true,
          transfer_reminder: false,
          system: true,
          scheduling: false
        }
      },
      sms: {
        enabled: false,
        types: {
          transfer_status_change: false,
          new_transfer: false,
          urgent_transfer: true,
          transfer_reminder: false,
          system: false,
          scheduling: false
        }
      },
      push: {
        enabled: false,
        types: {
          transfer_status_change: true,
          new_transfer: true,
          urgent_transfer: true,
          transfer_reminder: true,
          system: true,
          scheduling: true
        }
      },
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
        timezone: 'UTC'
      },
      frequency: {
        digest: false,
        digestInterval: 'daily', // 'hourly', 'daily', 'weekly'
        maxPerHour: 10,
        maxPerDay: 50
      }
    };

    const preferences = user?.notificationPreferences || defaultPreferences;

    return createSuccessResponse({
      preferences,
      userType: authResult.user.userType
    });

  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return createErrorResponse('Failed to fetch notification preferences', 'PREFERENCES_FETCH_ERROR', 500);
  }
}

// PUT /api/notifications/preferences - Update user's notification preferences
export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await requireEmployeeOrManager(request);
    if (!authResult.success) {
      return authResult.response;
    }

    await connectDB();

    const body = await request.json();
    const { preferences } = body;

    if (!preferences || typeof preferences !== 'object') {
      return createErrorResponse('Invalid preferences data', 'VALIDATION_ERROR', 400);
    }

    // Validate preferences structure
    const validTypes = ['transfer_status_change', 'new_transfer', 'urgent_transfer', 'transfer_reminder', 'system', 'scheduling'];
    const validChannels = ['realtime', 'email', 'sms', 'push'];

    for (const channel of validChannels) {
      if (preferences[channel]) {
        if (typeof preferences[channel].enabled !== 'boolean') {
          return createErrorResponse(`Invalid ${channel}.enabled value`, 'VALIDATION_ERROR', 400);
        }
        
        if (preferences[channel].types) {
          for (const type of validTypes) {
            if (preferences[channel].types[type] !== undefined && typeof preferences[channel].types[type] !== 'boolean') {
              return createErrorResponse(`Invalid ${channel}.types.${type} value`, 'VALIDATION_ERROR', 400);
            }
          }
        }
      }
    }

    // Validate quiet hours
    if (preferences.quietHours) {
      if (preferences.quietHours.enabled && typeof preferences.quietHours.enabled !== 'boolean') {
        return createErrorResponse('Invalid quietHours.enabled value', 'VALIDATION_ERROR', 400);
      }
      
      if (preferences.quietHours.start && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(preferences.quietHours.start)) {
        return createErrorResponse('Invalid quietHours.start format (use HH:MM)', 'VALIDATION_ERROR', 400);
      }
      
      if (preferences.quietHours.end && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(preferences.quietHours.end)) {
        return createErrorResponse('Invalid quietHours.end format (use HH:MM)', 'VALIDATION_ERROR', 400);
      }
    }

    // Update user preferences
    const updatedUser = await User.findByIdAndUpdate(
      authResult.user._id,
      { 
        notificationPreferences: preferences,
        updatedAt: new Date()
      },
      { new: true }
    ).select('notificationPreferences');

    if (!updatedUser) {
      return createErrorResponse('User not found', 'USER_NOT_FOUND', 404);
    }

    return createSuccessResponse({
      preferences: updatedUser.notificationPreferences,
      message: 'Notification preferences updated successfully'
    });

  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return createErrorResponse('Failed to update notification preferences', 'PREFERENCES_UPDATE_ERROR', 500);
  }
}

// POST /api/notifications/preferences - Reset preferences to defaults
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await requireEmployeeOrManager(request);
    if (!authResult.success) {
      return authResult.response;
    }

    await connectDB();

    const defaultPreferences = {
      realtime: {
        enabled: true,
        sound: true,
        desktop: true,
        types: {
          transfer_status_change: true,
          new_transfer: true,
          urgent_transfer: true,
          transfer_reminder: true,
          system: true,
          scheduling: true
        }
      },
      email: {
        enabled: false,
        types: {
          transfer_status_change: false,
          new_transfer: true,
          urgent_transfer: true,
          transfer_reminder: false,
          system: true,
          scheduling: false
        }
      },
      sms: {
        enabled: false,
        types: {
          transfer_status_change: false,
          new_transfer: false,
          urgent_transfer: true,
          transfer_reminder: false,
          system: false,
          scheduling: false
        }
      },
      push: {
        enabled: false,
        types: {
          transfer_status_change: true,
          new_transfer: true,
          urgent_transfer: true,
          transfer_reminder: true,
          system: true,
          scheduling: true
        }
      },
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
        timezone: 'UTC'
      },
      frequency: {
        digest: false,
        digestInterval: 'daily',
        maxPerHour: 10,
        maxPerDay: 50
      }
    };

    const updatedUser = await User.findByIdAndUpdate(
      authResult.user._id,
      { 
        notificationPreferences: defaultPreferences,
        updatedAt: new Date()
      },
      { new: true }
    ).select('notificationPreferences');

    if (!updatedUser) {
      return createErrorResponse('User not found', 'USER_NOT_FOUND', 404);
    }

    return createSuccessResponse({
      preferences: updatedUser.notificationPreferences,
      message: 'Notification preferences reset to defaults'
    });

  } catch (error) {
    console.error('Error resetting notification preferences:', error);
    return createErrorResponse('Failed to reset notification preferences', 'PREFERENCES_RESET_ERROR', 500);
  }
}
