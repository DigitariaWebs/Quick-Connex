"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import SuccessNotification from "@/components/ui/notifications/SuccessNotification";

interface NotificationContextType {
  showSuccess: (message: string, duration?: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notification, setNotification] = useState<{
    isVisible: boolean;
    message: string;
    duration: number;
  }>({
    isVisible: false,
    message: "",
    duration: 3000,
  });

  const showSuccess = (message: string, duration: number = 3000) => {
    setNotification({
      isVisible: true,
      message,
      duration,
    });
  };

  const hideNotification = () => {
    setNotification((prev) => ({
      ...prev,
      isVisible: false,
    }));
  };

  return (
    <NotificationContext.Provider value={{ showSuccess }}>
      {children}
      <SuccessNotification
        isVisible={notification.isVisible}
        message={notification.message}
        duration={notification.duration}
        onClose={hideNotification}
      />
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
}
