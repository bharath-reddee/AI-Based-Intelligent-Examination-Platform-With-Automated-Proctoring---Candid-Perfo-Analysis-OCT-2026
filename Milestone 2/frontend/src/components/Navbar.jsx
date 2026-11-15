import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, LogOut } from 'lucide-react';

const Navbar = () => {
  const { user, role, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    if (location.pathname.includes('/attempt')) {
      const confirmAbandon = window.confirm(
        'You are currently engaged in an active examination. Signing out will terminate this session and submit your recorded responses. Do you wish to continue?'
      );
      if (!confirmAbandon) return;
    }
    const previousRole = role;
    logout();
    if (previousRole === 'admin') {
      navigate('/admin/login');
    } else if (previousRole === 'teacher') {
      navigate('/login?role=teacher');
    } else {
      navigate('/login?role=student');
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">

        {/* Brand Logo */}
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#233B67] to-[#4169C1] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-200">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold font-heading tracking-tight text-[#233B67] block leading-tight">
              Exam<span className="text-[#35A6A0]">Mate</span>
            </span>
            <span className="text-[10px] text-[#718096] block font-sans leading-tight">
              G. Pulla Reddy Engineering College
            </span>
          </div>
        </Link>

        {/* Public Navigation Links */}
        {!isAuthenticated && (
          <div className="hidden md:flex items-center space-x-1">
            <Link
              to="/"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive('/') ? 'text-[#4169C1] bg-[#4169C1]/10 font-semibold' : 'text-[#718096] hover:text-[#202B40] hover:bg-[#F5F7FC]'
              }`}
            >
              Platform Overview
            </Link>
            <Link
              to="/student/register"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive('/student/register') ? 'text-[#4169C1] bg-[#4169C1]/10 font-semibold' : 'text-[#718096] hover:text-[#202B40] hover:bg-[#F5F7FC]'
              }`}
            >
              Candidate Enrollment
            </Link>
            <Link
              to="/teacher/register"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive('/teacher/register') ? 'text-[#4169C1] bg-[#4169C1]/10 font-semibold' : 'text-[#718096] hover:text-[#202B40] hover:bg-[#F5F7FC]'
              }`}
            >
              Faculty Onboarding
            </Link>
          </div>
        )}

        {/* Auth Controls */}
        <div className="flex items-center space-x-2.5">
          {isAuthenticated ? (
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2.5 px-3 py-1.5 rounded-full bg-[#EDF2FA] border border-[#E2E8F0]">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#233B67] to-[#4169C1] text-white flex items-center justify-center font-bold text-xs uppercase">
                  {user?.first_name ? user.first_name[0] : 'U'}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-semibold text-[#202B40] leading-tight">
                    {user?.first_name} {user?.last_name}
                  </div>
                  <div className="text-[10px] text-[#35A6A0] capitalize font-medium flex items-center gap-1">
                    <ShieldCheck className="w-2.5 h-2.5 inline" /> {role}
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#D95C65] hover:bg-red-50 border border-red-200/80 transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl text-sm font-semibold text-[#202B40] bg-white hover:bg-[#EDF2FA] border border-[#E2E8F0] transition-all shadow-sm"
              >
                Sign In
              </Link>
              <Link
                to="/admin/login"
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#233B67] bg-[#233B67]/8 hover:bg-[#233B67]/15 border border-[#233B67]/20 transition-all flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#4169C1]" />
                <span>Administration</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
