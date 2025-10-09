"use client";

import { useAuth } from "@/hooks/auth/useAuth";
import NotificationManager from "./NotificationManager";

/**
 * Global Notification System Component
 *
 * This component provides toast notifications throughout the entire application.
 * It automatically integrates with the SSE system and shows notifications
 * when users receive real-time updates.
 */
export default function GlobalNotificationSystem() {
  const { user, isAuthenticated } = useAuth();

  // Only render for authenticated users
  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <NotificationManager
      userId={user._id}
      userType={user.userType}
      showToasts={true}
      showPanel={false} // We only want toasts globally, not the panel
      maxToasts={5}
      toastAutoHide={true}
      toastHideDelay={5000}
      enableSound={true}
      soundFile="/notification-sound.mp3"
    />
  );
}
