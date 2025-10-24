import { NextRequest, NextResponse } from 'next/server';
import User from '@/models/User';
import { AuthService } from '@/lib/auth';// GET /api/notifications/preferences - Get user's notification preferences
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { user } = await AuthService.requireAuth(request, {
      roles: ['employee', 'manager', 'admin', 'super_admin'],
      requireSession: true
    });

    // DatabaseService handles connection automatically
const userDoc = await User.findById(user._id).select('notificationPreferences');
    
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

    const preferences = defaultPreferences;

    return NextResponse.json({
      success: true,
      data: {
        preferences,
        userType: user.userType
      },
      message: 'Notification preferences retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }
      if (error.message.includes('Access denied')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 403 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/notifications/preferences - Update user's notification preferences
export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const { user } = await AuthService.requireAuth(request, {
      roles: ['employee', 'manager', 'admin', 'super_admin'],
      requireSession: true
    });

    // DatabaseService handles connection automatically
const body = await request.json();
    const { preferences } = body;

    if (!preferences || typeof preferences !== 'object') {
      return NextResponse.json({ error: 'Invalid preferences data' }, { status: 400 });
    }

    // Validate preferences structure
    const validTypes = ['transfer_status_change', 'new_transfer', 'urgent_transfer', 'transfer_reminder', 'system', 'scheduling'];
    const validChannels = ['realtime', 'email', 'sms', 'push'];

    for (const channel of validChannels) {
      if (preferences[channel]) {
        if (typeof preferences[channel].enabled !== 'boolean') {
          return NextResponse.json({ error: `Invalid ${channel}.enabled value` }, { status: 400 });
        }
        
        if (preferences[channel].types) {
          for (const type of validTypes) {
            if (preferences[channel].types[type] !== undefined && typeof preferences[channel].types[type] !== 'boolean') {
              return NextResponse.json({ error: `Invalid ${channel}.types.${type} value` }, { status: 400 });
            }
          }
        }
      }
    }

    // Validate quiet hours
    if (preferences.quietHours) {
      if (preferences.quietHours.enabled && typeof preferences.quietHours.enabled !== 'boolean') {
        return NextResponse.json({ error: 'Invalid quietHours.enabled value' }, { status: 400 });
      }
      
      if (preferences.quietHours.start && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(preferences.quietHours.start)) {
        return NextResponse.json({ error: 'Invalid quietHours.start format (use HH:MM)' }, { status: 400 });
      }
      
      if (preferences.quietHours.end && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(preferences.quietHours.end)) {
        return NextResponse.json({ error: 'Invalid quietHours.end format (use HH:MM)' }, { status: 400 });
      }
    }

    // Update user preferences
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { 
        notificationPreferences: preferences,
        updatedAt: new Date()
      },
      { new: true }
    ).select('notificationPreferences');

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        preferences: preferences
      },
      message: 'Notification preferences updated successfully'
    });

  } catch (error) {
    console.error('Error updating notification preferences:', error);
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }
      if (error.message.includes('Access denied')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 403 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/notifications/preferences - Reset preferences to defaults
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { user } = await AuthService.requireAuth(request, {
      roles: ['employee', 'manager', 'admin', 'super_admin'],
      requireSession: true
    });

    // DatabaseService handles connection automatically
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
      user._id,
      { 
        notificationPreferences: defaultPreferences,
        updatedAt: new Date()
      },
      { new: true }
    ).select('notificationPreferences');

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        preferences: defaultPreferences
      },
      message: 'Notification preferences reset to defaults'
    });

  } catch (error) {
    console.error('Error resetting notification preferences:', error);
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }
      if (error.message.includes('Access denied')) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 403 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
