import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useNotificationSSE } from './useNotificationSSE';

interface UrgentTransfer {
  id: string;
  transferId: string;
  patientName: string;
  fromHospital: string;
  toHospital: string;
  priority: "urgent" | "stat";
  requestedTime: string;
  reason: string;
  timeElapsed: string;
}

interface UrgentAlertsData {
  urgentTransfers: UrgentTransfer[];
  loading: boolean;
  error: string | null;
}

export function useUrgentAlerts() {
  const { user, isAuthenticated } = useAuth();
  const { connected, error: sseError, lastMessage } = useNotificationSSE();
  const [data, setData] = useState<UrgentAlertsData>({
    urgentTransfers: [],
    loading: true,
    error: null,
  });

  const fetchUrgentTransfers = async (showLoading = false) => {
    if (!isAuthenticated || !user) return;

    try {
      setData(prev => ({ ...prev, loading: showLoading, error: null }));

      // Fetch urgent transfers (STAT and urgent priority)
      const response = await fetch('/api/transfers?status=all', {
        credentials: 'include',
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error('Failed to fetch urgent transfers');
      }

      const transfers = data.data.transfers || [];
      
      // Filter and format urgent transfers
      const urgentTransfers: UrgentTransfer[] = transfers
        .filter((t: any) => t.priority === 'urgent' || t.priority === 'stat')
        .slice(0, 5)
        .map((transfer: any) => {
          const requestedTime = new Date(transfer.requestedDate);
          const now = new Date();
          const timeElapsed = Math.floor((now.getTime() - requestedTime.getTime()) / (1000 * 60));
          
          return {
            id: transfer._id,
            transferId: transfer.transferId,
            patientName: transfer.patientInfo ? `${transfer.patientInfo.firstName} ${transfer.patientInfo.lastName}` : 'Unknown Patient',
            fromHospital: transfer.fromHospitalName,
            toHospital: transfer.toHospitalName,
            priority: transfer.priority === 'stat' ? 'stat' : 'urgent',
            requestedTime: requestedTime.toISOString(),
            reason: transfer.reason,
            timeElapsed: timeElapsed < 60 ? `${timeElapsed} min` : `${Math.floor(timeElapsed / 60)}h`,
          };
        });

      setData({
        urgentTransfers,
        loading: false,
        error: null,
      });

    } catch (error) {
      console.error('Error fetching urgent transfers:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch urgent transfers',
      }));
    }
  };

  const dismissAlert = async (alertId: string) => {
    // For now, just remove from local state
    // In the future, this could mark the alert as dismissed in the database
    setData(prev => ({
      ...prev,
      urgentTransfers: prev.urgentTransfers.filter(alert => alert.id !== alertId),
    }));
  };

  // Handle SSE messages for real-time updates
  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'urgent_alerts_update') {
        // Update urgent transfers from SSE
        setData(prev => ({
          ...prev,
          urgentTransfers: lastMessage.data?.urgentTransfers || prev.urgentTransfers
        }));
      } else if (lastMessage.type === 'urgent_transfer') {
        // Add new urgent transfer
        const newUrgentTransfer: UrgentTransfer = {
          id: lastMessage.data?.transfer?.id || lastMessage.id,
          transferId: lastMessage.transferId || '',
          patientName: lastMessage.data?.transfer?.patient ? 
            `${lastMessage.data.transfer.patient.firstName} ${lastMessage.data.transfer.patient.lastName}` : 
            'Unknown Patient',
          fromHospital: lastMessage.data?.transfer?.fromHospital || '',
          toHospital: lastMessage.data?.transfer?.toHospital || '',
          priority: lastMessage.data?.transfer?.priority === 'stat' ? 'stat' : 'urgent',
          requestedTime: new Date().toISOString(),
          reason: lastMessage.data?.transfer?.reason || '',
          timeElapsed: '0 min',
        };
        
        setData(prev => ({
          ...prev,
          urgentTransfers: [newUrgentTransfer, ...prev.urgentTransfers].slice(0, 5)
        }));
      }
    }
  }, [lastMessage]);

  useEffect(() => {
    // Initial load with loading state
    fetchUrgentTransfers(true);
  }, [isAuthenticated, user]);

  return {
    ...data,
    dismissAlert,
    refetch: fetchUrgentTransfers,
  };
}
