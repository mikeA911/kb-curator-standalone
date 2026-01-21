import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { clearBrowserData } from '../lib/utils';
import { Info, LogOut, Trash2, Settings, LayoutDashboard } from 'lucide-react';
import AboutModal from './AboutModal';

export default function Header() {
  const { profile, signOut, isAdmin, isCurator } = useAuth();
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side: Logo/Title */}
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="flex items-center gap-2">
              <span className="text-2xl">🌱</span>
              <span className="text-xl font-bold text-gray-900 hidden sm:block">Rhubarb Curator</span>
            </Link>
          </div>

          {/* Right side: Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setIsAboutOpen(true)}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              title="About Rhubarb Curator"
            >
              <Info className="w-4 h-4" />
              <span className="hidden md:block">About</span>
            </button>

            {profile && (
              <>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                    title="Admin Settings"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="hidden md:block">Admin</span>
                  </Link>
                )}

                <div className="h-6 w-px bg-gray-200 mx-1"></div>

                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex flex-col items-end">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {isAdmin ? 'Admin' : isCurator ? 'Curator' : 'User'}
                    </span>
                    <span className="text-sm text-gray-700 font-medium truncate max-w-[150px]">
                      {profile?.email}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={async () => {
                        if (confirm('Clear all browser data and cache? You will be logged out.')) {
                          await clearBrowserData();
                          await signOut();
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                      title="Clear Cache"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => signOut()}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      title="Logout"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}

            {!profile && (
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>

      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </header>
  );
}
