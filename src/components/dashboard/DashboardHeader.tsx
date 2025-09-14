'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Menu, X, User } from 'lucide-react';

interface DashboardHeaderProps {
  userType: 'employee' | 'manager';
}

export default function DashboardHeader({ userType }: DashboardHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-white/90 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 shadow-sm"
    >
      <div className="container mx-auto px-4 py-3">
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-blue-500 rounded-xl flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-lg">🏥</span>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">
                Patient Management
              </h1>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                {userType} Dashboard
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {/* Notification Icon */}
            <button className="relative p-2 rounded-full hover:bg-gray-100 transition-colors">
              <Bell size={20} className="text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* User Profile */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
                <User size={16} className="text-white" />
              </div>
              <div className="hidden lg:block">
                <p className="text-sm font-medium text-gray-800">John Smith</p>
                <p className="text-xs text-gray-500">Employee</p>
              </div>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden mt-3 py-3 border-t border-gray-200"
            >
              <div className="flex flex-col space-y-3">
                <div className="flex items-center space-x-3 p-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center">
                    <User size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">John Smith</p>
                    <p className="text-xs text-gray-500">Employee</p>
                  </div>
                </div>
                <button className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Bell size={18} className="text-gray-600" />
                  <span className="text-sm text-gray-700">Notifications</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}