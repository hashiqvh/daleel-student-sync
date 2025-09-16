'use client';

import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-3 mb-4 md:mb-0">
            <div className="h-10 w-10 relative">
              <Image
                src="/image.png"
                alt="Daleel Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Daleel Student Management</h3>
              <p className="text-xs text-gray-600">Powered by PACE Group IT Department</p>
            </div>
          </div>
          
          <div className="text-center md:text-right">
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} PACE Group. All rights reserved.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Developed by IT Department
            </p>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-center text-xs text-gray-500">
            <div className="flex items-center space-x-4 mb-2 sm:mb-0">
              <span>Version 1.0.0</span>
              <span>•</span>
              <span>Secure Access</span>
              <span>•</span>
              <span>Student Data Management</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>System Online</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

