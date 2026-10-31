import React, { useState } from 'react';
import { Lock, User, AlertCircle, ArrowLeft, KeyRound, ShieldCheck } from 'lucide-react';
import { loginAdmin } from '../../lib/auth';

interface AdminLoginPageProps {
  onLoginSuccess: () => void;
  onNavigateToPublic: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onLoginSuccess,
  onNavigateToPublic,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please enter both administrator username and password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const result = await loginAdmin(username.trim(), password.trim());
    setIsSubmitting(false);

    if (result.success) {
      onLoginSuccess();
    } else {
      setErrorMsg(result.error || 'Invalid administrator credentials. Access denied.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center p-4 bg-[#F9FAFB]">
      <div className="max-w-md w-full bg-white border border-[#E5E7EB] rounded-2xl shadow-sm p-6 sm:p-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-[#0F766E] flex items-center justify-center text-white shadow-xs mb-3">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#0F766E] bg-[#F0FDFA] border border-[#CCFBF1] px-2.5 py-0.5 rounded-full">
            Restricted Operational Portal
          </span>
          <h1 className="text-xl font-extrabold text-[#111827] tracking-tight mt-2">
            Control Room Authentication
          </h1>
          <p className="text-xs text-[#64748B] mt-1 max-w-xs leading-relaxed">
            Authorized personnel only. Access live incident triage, GPS dispatch, and emergency operations.
          </p>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626]" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#64748B]" />
              Admin Username
            </label>
            <input
              type="text"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="w-full text-xs border border-[#E5E7EB] rounded-lg p-2.5 bg-white text-[#111827] placeholder:text-[#94A3B8] focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E] focus:outline-none transition"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[#64748B]" />
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full text-xs border border-[#E5E7EB] rounded-lg p-2.5 bg-white text-[#111827] placeholder:text-[#94A3B8] focus:ring-2 focus:ring-[#0F766E]/20 focus:border-[#0F766E] focus:outline-none transition"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-2.5 bg-[#0F766E] hover:bg-[#0d655e] text-white font-bold text-xs rounded-lg shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isSubmitting ? 'Authenticating...' : 'Sign In to Operations Console'}</span>
          </button>
        </form>

        {/* Public Citizen Navigation */}
        <div className="pt-4 border-t border-[#E5E7EB] flex flex-col items-center gap-2">
          <button
            onClick={onNavigateToPublic}
            className="text-xs text-[#0F766E] hover:text-[#0d655e] font-semibold flex items-center gap-1.5 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Public Citizen Reporting Portal</span>
          </button>
          <span className="text-[11px] text-[#64748B]">
            Citizens and volunteers do not need to log in to report emergencies.
          </span>
        </div>
      </div>
    </div>
  );
};
