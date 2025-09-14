'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  MapPin, 
  Phone, 
  User, 
  FileText, 
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

interface TransferRequest {
  _id: string;
  transferId: string;
  patientId: string;
  patient: {
    patientId: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
    phone: string;
    currentHospital?: string;
    currentDepartment?: string;
  };
  fromHospital: string;
  fromDepartment: string;
  toHospital: string;
  toDepartment: string;
  requestedBy: {
    firstName: string;
    lastName: string;
    email: string;
    userType: string;
  };
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  requestedDate: string;
  scheduledDate?: string;
  notes?: string;
}

interface TransferRequestCardProps {
  transfer: TransferRequest;
  onAccept: (transferId: string) => void;
}

export default function TransferRequestCard({ transfer, onAccept }: TransferRequestCardProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-200',
        icon: 'text-red-500',
        gradient: 'from-red-500 to-pink-500'
      };
      case 'high': return {
        bg: 'bg-orange-100',
        text: 'text-orange-800',
        border: 'border-orange-200',
        icon: 'text-orange-500',
        gradient: 'from-orange-500 to-amber-500'
      };
      case 'medium': return {
        bg: 'bg-amber-100',
        text: 'text-amber-800',
        border: 'border-amber-200',
        icon: 'text-amber-500',
        gradient: 'from-amber-500 to-yellow-500'
      };
      case 'low': return {
        bg: 'bg-green-100',
        text: 'text-green-800',
        border: 'border-green-200',
        icon: 'text-green-500',
        gradient: 'from-green-500 to-emerald-500'
      };
      default: return {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        border: 'border-gray-200',
        icon: 'text-gray-500',
        gradient: 'from-gray-500 to-slate-500'
      };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return {
        bg: 'bg-amber-100',
        text: 'text-amber-800',
        icon: <Clock size={12} className="mr-1 text-amber-500" />
      };
      case 'accepted': return {
        bg: 'bg-green-100',
        text: 'text-green-800',
        icon: <CheckCircle2 size={12} className="mr-1 text-green-500" />
      };
      case 'in_progress': return {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        icon: <ArrowRight size={12} className="mr-1 text-blue-500" />
      };
      case 'completed': return {
        bg: 'bg-purple-100',
        text: 'text-purple-800',
        icon: <CheckCircle2 size={12} className="mr-1 text-purple-500" />
      };
      case 'cancelled': return {
        bg: 'bg-red-100',
        text: 'text-red-800',
        icon: <AlertTriangle size={12} className="mr-1 text-red-500" />
      };
      default: return {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        icon: null
      };
    }
  };

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      const response = await fetch(`/api/transfers/${transfer._id}/accept`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assignedTo: 'current-user-id', // This should come from auth context
          notes: 'Transfer accepted by employee'
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        onAccept(transfer._id);
      } else {
        alert(data.error || 'Failed to accept transfer');
      }
    } catch (error) {
      console.error('Error accepting transfer:', error);
      alert('Network error occurred');
    } finally {
      setIsAccepting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const priorityColors = getPriorityColor(transfer.priority);
  const statusColors = getStatusColor(transfer.status);

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)' }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100 hover:border-gray-200"
    >
      {/* Priority Indicator */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${priorityColors.gradient}`}></div>
      
      {/* Header */}
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <User size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                {transfer.patient.firstName} {transfer.patient.lastName}
              </h3>
              <div className="flex items-center text-xs text-gray-500">
                <span className="mr-2">ID: {transfer.patient.patientId}</span>
                <span className="flex items-center">
                  {statusColors.icon}
                  <span className={`capitalize ${statusColors.text}`}>
                    {transfer.status.replace('_', ' ')}
                  </span>
                </span>
              </div>
            </div>
          </div>
          
          <div className={`px-2.5 py-1 rounded-full text-xs font-semibold ${priorityColors.bg} ${priorityColors.text} border ${priorityColors.border} uppercase`}>
            {transfer.priority}
          </div>
        </div>

        {/* Patient Info */}
        <div className="grid grid-cols-2 gap-y-2 gap-x-4 mt-4">
          <div className="flex items-center text-sm">
            <User size={14} className="mr-2 text-gray-400" />
            <span className="text-gray-700">{calculateAge(transfer.patient.dateOfBirth)} yrs, {transfer.patient.gender}</span>
          </div>
          <div className="flex items-center text-sm">
            <Phone size={14} className="mr-2 text-gray-400" />
            <span className="text-gray-700">{transfer.patient.phone}</span>
          </div>
          <div className="flex items-center text-sm col-span-2">
            <MapPin size={14} className="mr-2 text-gray-400 flex-shrink-0" />
            <span className="text-gray-700 truncate">
              {transfer.patient.currentHospital || 'No current hospital'} 
              {transfer.patient.currentDepartment && ` - ${transfer.patient.currentDepartment}`}
            </span>
          </div>
        </div>
      </div>

      {/* Transfer Route */}
      <div className="px-5 py-3 bg-gray-50 border-y border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-1">From</p>
            <p className="text-sm font-medium text-gray-800 truncate">{transfer.fromHospital}</p>
            <p className="text-xs text-gray-600">{transfer.fromDepartment}</p>
          </div>
          
          <div className="px-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <ArrowRight size={16} className="text-blue-600" />
            </div>
          </div>
          
          <div className="flex-1 text-right">
            <p className="text-xs text-gray-500 mb-1">To</p>
            <p className="text-sm font-medium text-gray-800 truncate">{transfer.toHospital}</p>
            <p className="text-xs text-gray-600">{transfer.toDepartment}</p>
          </div>
        </div>
      </div>

      {/* Transfer Details */}
      <div className="px-5 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center text-sm">
            <Calendar size={14} className="mr-2 text-gray-400" />
            <span className="text-gray-700">{formatDate(transfer.requestedDate)}</span>
          </div>
          
          <div className="text-xs text-gray-500">
            Requested by <span className="font-medium text-gray-700">{transfer.requestedBy.firstName}</span>
          </div>
        </div>
        
        <div className="mb-3">
          <div className="flex items-start mb-1">
            <FileText size={14} className="mr-2 text-gray-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-700">{transfer.reason}</p>
          </div>
        </div>

        {/* Actions */}
        {transfer.status === 'pending' && (
          <div className="mt-4 flex space-x-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleAccept}
              disabled={isAccepting}
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isAccepting ? 'Accepting...' : 'Accept Transfer'}
            </motion.button>
            
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowDetails(!showDetails)}
              className="px-3 py-2 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center"
            >
              {showDetails ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </motion.button>
          </div>
        )}

        {/* Additional Details */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-4 pt-4 border-t border-gray-100 overflow-hidden"
            >
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Transfer ID:</span>
                  <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{transfer.transferId}</span>
                </div>
                
                {transfer.scheduledDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Scheduled Date:</span>
                    <span className="text-gray-700">{formatDate(transfer.scheduledDate)}</span>
                  </div>
                )}
                
                {transfer.notes && (
                  <div className="mt-2">
                    <p className="text-gray-500 mb-1">Notes:</p>
                    <p className="text-gray-700 bg-gray-50 p-2 rounded-lg text-xs">{transfer.notes}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}