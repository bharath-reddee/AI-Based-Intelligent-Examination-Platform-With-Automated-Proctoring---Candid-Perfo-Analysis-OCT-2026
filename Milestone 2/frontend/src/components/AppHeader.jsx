import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Menu,
  LogOut,
  ShieldCheck,
} from 'lucide-react';

const AppHeader = ({ onOpenMobileNav }) => {
  const { user, role, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (location.pathname.includes('/attempt')) {
      const confirmAbandon = window.confirm(
        'You are currently engaged in an active examination session. Signing out now concludes this attempt and logs all completed answers according to assessment policies. Proceed?'
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

  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab');
  const currentRole = searchParams.get('role');

  const getPageInfo = () => {
    const path = location.pathname;

    if (role === 'admin') {
      if (path === '/admin/dashboard') {
        if (currentTab === 'queue') {
          return {
            title: 'Registration Verification Queue',
            subtitle: 'Validate pending student and faculty authorization requests',
          };
        }
        if (currentTab === 'directory' || currentTab === 'users') {
          if (currentRole === 'teacher') {
            return {
              title: 'Faculty Credential Directory',
              subtitle: 'Inspect verified educators and departmental affiliations',
            };
          }
          if (currentRole === 'student') {
            return {
              title: 'Candidate Roster Management',
              subtitle: 'Review enrolled examinees, roll numbers, and privileges',
            };
          }
          return {
            title: 'Institutional Directory & Governance',
            subtitle: 'Global registry of authenticated platform users',
          };
        }
        return {
          title: 'Institutional Control Center',
          subtitle: 'System infrastructure, proctoring integrity telemetry, and security activity',
        };
      }
    }

    if (role === 'teacher') {
      if (path === '/teacher/dashboard') {
        return {
          title: 'Faculty Academic Desk',
          subtitle: 'Active examination pipelines, candidate progression, and analytics summary',
        };
      }
      if (path === '/teacher/tests') {
        return {
          title: 'Faculty Assessment Bank',
          subtitle: 'Curate, publish, and evaluate proctored institutional examinations',
        };
      }
      if (path === '/teacher/create-exam') {
        return {
          title: 'Assessment Engineering Studio',
          subtitle: 'Synthesize multi-modal questions, schedule assessment windows, and adjust proctoring sensitivity',
        };
      }
      if (path.includes('/teacher/exams/') && path.includes('/results')) {
        return {
          title: 'Candidate Performance Analytics & Audit',
          subtitle: 'Comprehensive evaluation scoring, question breakdowns, and proctoring infraction logs',
        };
      }
      if (path === '/teacher/students') {
        return {
          title: 'Enrolled Candidate Directory',
          subtitle: 'Verified student cohorts registered under your academic department',
        };
      }
    }

    if (role === 'student') {
      if (path === '/student/dashboard') {
        return {
          title: 'Candidate Workspace',
          subtitle: 'Assigned examinations, academic timeline, and readiness verification',
        };
      }
      if (path === '/student/my-tests') {
        return {
          title: 'Academic Scorecards & History',
          subtitle: 'Evaluation reports, concept mastery tracking, and assessment records',
        };
      }
      if (path === '/student/mock-test') {
        return {
          title: 'Adaptive AI Diagnostic Simulator',
          subtitle: 'Synthesize curriculum-tailored practice modules with instant evaluation and reasoning feedback',
        };
      }
      if (path.includes('/readiness')) {
        return {
          title: 'Pre-Assessment Integrity Inspection',
          subtitle: 'Verify camera feed, audio stream, and browser environment before beginning',
        };
      }
      if (path.includes('/attempt')) {
        return {
          title: 'Proctored Assessment Session',
          subtitle: 'Autonomous biometric verification and infraction tracking are active',
        };
      }
    }

    return {
      title: 'Exam Mate Platform',
      subtitle: 'G. Pulla Reddy Engineering College',
    };
  };

  const { title, subtitle } = getPageInfo();

  const getUserInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    if (user?.first_name) return user.first_name[0].toUpperCase();
    if (user?.email) return user.email[0].toUpperCase();
    return 'U';
  };

  const getUserDisplayName = () => {
    if (user?.first_name) {
      return `${user.first_name} ${user.last_name || ''}`.trim();
    }
    return user?.email || 'User';
  };

  return (
    <header className="sticky top-0 z-30 rg-layout-header h-[72px] min-h-[72px] max-h-[72px] bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] px-4 sm:px-6 flex items-center justify-between shrink-0 box-border shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileNav}
          className="lg:hidden p-2 rounded-xl text-[#718096] hover:text-[#202B40] hover:bg-[#F5F7FC] border border-[#E2E8F0] focus:outline-none transition-colors"
          aria-label="Open sidebar navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-bold text-[#202B40] tracking-tight truncate leading-tight">
            {title}
          </h1>
          <p className="text-[11px] text-[#718096] truncate hidden sm:block">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 flex-shrink-0">
        <div className="flex items-center space-x-2.5 px-3 py-1.5 rounded-full bg-[#EDF2FA] border border-[#E2E8F0] shadow-sm">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#233B67] to-[#4169C1] text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
            {getUserInitials()}
          </div>
          <div className="text-left hidden lg:block">
            <div className="text-xs font-semibold text-[#202B40] leading-tight truncate max-w-[130px]">
              {getUserDisplayName()}
            </div>
            <div className="text-[10px] text-[#35A6A0] capitalize font-medium flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 inline text-[#35A6A0]" /> {role}
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center space-x-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold text-[#D95C65] hover:bg-red-50 border border-red-200/80 transition-all hover:border-red-300 cursor-pointer shadow-sm"
          title="Sign out of Exam Mate"
          aria-label="Sign out"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
