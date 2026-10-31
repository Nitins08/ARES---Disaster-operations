import React from 'react';
import { ShieldAlert, RefreshCw, Smartphone, Monitor, LogOut, Lock } from 'lucide-react';

interface HeaderProps {
  currentRoute: 'report' | 'console' | 'tracking' | 'login';
  onRouteChange: (route: 'report' | 'console' | 'login') => void;
  isAuthenticated: boolean;
  onLogout?: () => void;
  onSeedData?: () => void;
  isSeeding?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentRoute,
  onRouteChange,
  isAuthenticated,
  onLogout,
  onSeedData,
  isSeeding = false,
}) => {
  return (
    <header className="bg-white text-[#111827] border-b border-[#E5E7EB] sticky top-0 z-50 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
        {/* Brand Logo & Platform Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#0F766E] flex items-center justify-center text-white shadow-xs shrink-0">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-[#111827]">
                ARES
              </span>
            </div>
            <p className="text-[11px] text-[#64748B] hidden sm:block font-medium">
              Autonomous Response & Emergency Operations Platform
            </p>
          </div>
        </div>

        {/* Route Navigation Segmented Control */}
        <div className="flex items-center bg-[#F3F4F6] p-1 rounded-lg border border-[#E5E7EB]">
          <button
            onClick={() => onRouteChange('report')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition ${
              currentRoute === 'report'
                ? 'bg-[#0F766E] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#111827]'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Citizen Portal</span>
          </button>
          <button
            onClick={() => onRouteChange('console')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition ${
              currentRoute === 'console' || currentRoute === 'login'
                ? 'bg-[#0F766E] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#111827]'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Operations Console</span>
          </button>
        </div>

        {/* Admin Status & Actions */}
        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <>
              {/* Seed demo data button (Admin only) */}
              <button
                onClick={onSeedData}
                disabled={isSeeding}
                title="Seed realistic multi-incident disaster demo data"
                className="hidden sm:flex items-center gap-1.5 bg-white hover:bg-[#F9FAFB] text-[#111827] border border-[#E5E7EB] hover:border-[#D1D5DB] px-3 py-1 text-xs font-semibold rounded-lg shadow-xs transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#0F766E] ${isSeeding ? 'animate-spin' : ''}`} />
                <span>Demo Seed</span>
              </button>

              {/* Admin Logout button */}
              <button
                onClick={onLogout}
                title="Log out of Control Room"
                className="flex items-center gap-1.5 bg-white hover:bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] hover:border-[#F87171] px-3 py-1 text-xs font-semibold rounded-lg shadow-xs transition"
              >
                <LogOut className="w-3.5 h-3.5 text-[#DC2626]" />
                <span>Logout</span>
              </button>
            </>
          )}

          {!isAuthenticated && currentRoute !== 'login' && (
            <button
              onClick={() => onRouteChange('login')}
              className="flex items-center gap-1.5 bg-white hover:bg-[#F0FDFA] text-[#0F766E] border border-[#CCFBF1] hover:border-[#99F6E4] px-3 py-1 text-xs font-semibold rounded-lg shadow-xs transition"
            >
              <Lock className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>Admin Login</span>
            </button>
          )}

          {/* Live Polling Indicator */}
          {isAuthenticated && currentRoute === 'console' && (
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-semibold text-[#047857] bg-[#ECFDF5] border border-[#A7F3D0] px-2.5 py-1 rounded-full shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#047857] animate-pulse" />
              <span>Polling (3s)</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
