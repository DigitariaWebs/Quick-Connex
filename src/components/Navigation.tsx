'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function Navigation() {
  return (
    <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">🏥</span>
            </div>
            <span className="text-xl font-bold text-gray-800">
              Patient Management
            </span>
          </Link>
          
          <div className="flex items-center space-x-4">
            <Link 
              href="/dashboard"
              className="text-gray-600 hover:text-green-600 transition-colors duration-200 font-medium"
            >
              Dashboard
            </Link>
            <Link 
              href="/"
              className="text-gray-600 hover:text-green-600 transition-colors duration-200 font-medium"
            >
              Sign Up
            </Link>
            <Link 
              href="/api/seed-data"
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 transition-all duration-200 text-sm"
            >
              Seed Data
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
