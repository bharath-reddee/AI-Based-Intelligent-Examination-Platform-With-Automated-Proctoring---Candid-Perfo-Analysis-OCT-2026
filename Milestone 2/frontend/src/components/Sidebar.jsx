import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  LayoutDashboard,
  ClipboardList,
  FileQuestion,
  Users,
  GraduationCap,
  Clock,
  Sparkles,
  X,
  Award,
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const { role } = useAuth();
  const location = useLocation();

  const handleNavClick = (e, targetPath) => {
    if (location.pathname.includes('/attempt') && targetPath !== location.pathname) {
      const confirmLeave = window.confirm(
        'Attention: Leaving the examination interface registers a proctoring infraction or submits your assessment. Do you want to proceed?'
      );
      if (!confirmLeave) {
        e.preventDefault();
        return;
      }
    }
    if (onClose) {
      onClose();
    }
  };

  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab');
  const currentRole = searchParams.get('role');

  const getNavSections = () => {
    if (role === 'admin') {
      return [
        {
          category: 'GOVERNANCE',
          items: [
            {
              label: 'Executive Monitor',
              path: '/admin/dashboard',
              icon: LayoutDashboard,
              isActive:
                location.pathname === '/admin/dashboard' &&
                (!currentTab || currentTab === 'overview'),
              description: 'Platform metrics & infrastructure health',
            },
          ],
        },
        {
          category: 'IDENTITY CONTROL',
          items: [
            {
              label: 'Verification Queue',
              path: '/admin/dashboard?tab=queue',
              icon: Clock,
              isActive:
                location.pathname === '/admin/dashboard' &&
                currentTab === 'queue',
              description: 'Pending student & faculty validations',
            },
            {
              label: 'Candidate Directory',
              path: '/admin/dashboard?tab=users&role=student',
              icon: GraduationCap,
              isActive:
                location.pathname === '/admin/dashboard' &&
                currentTab === 'users' &&
                currentRole === 'student',
              description: 'Enrolled examinees & credentials',
            },
            {
              label: 'Faculty Directory',
              path: '/admin/dashboard?tab=users&role=teacher',
              icon: Users,
              isActive:
                location.pathname === '/admin/dashboard' &&
                currentTab === 'users' &&
                currentRole === 'teacher',
              description: 'Authorized department educators',
            },
          ],
        },
      ];
    }

    if (role === 'teacher') {
      return [
        {
          category: 'INSTRUCTIONAL SUITE',
          items: [
            {
              label: 'Faculty Workspace',
              path: '/teacher/dashboard',
              icon: LayoutDashboard,
              isActive: location.pathname === '/teacher/dashboard',
              description: 'Assessment telemetry & summary',
            },
          ],
        },
        {
          category: 'ASSESSMENT ENGINE',
          items: [
            {
              label: 'Test Bank & Records',
              path: '/teacher/tests',
              icon: ClipboardList,
              isActive: location.pathname === '/teacher/tests',
              description: 'Manage active tests & schedules',
            },
            {
              label: 'Question Engineering',
              path: '/teacher/create-exam',
              icon: FileQuestion,
              isActive: location.pathname === '/teacher/create-exam',
              description: 'Synthesize AI & custom questions',
            },
          ],
        },
        {
          category: 'COHORT OVERSIGHT',
          items: [
            {
              label: 'Student Directory',
              path: '/teacher/students',
              icon: Users,
              isActive: location.pathname === '/teacher/students',
              description: 'Candidate roster & academic records',
            },
          ],
        },
      ];
    }

    if (role === 'student') {
      return [
        {
          category: 'CANDIDATE DESK',
          items: [
            {
              label: 'Student Workspace',
              path: '/student/dashboard',
              icon: LayoutDashboard,
              isActive: location.pathname === '/student/dashboard',
              description: 'Scheduled tests & active assignments',
            },
          ],
        },
        {
          category: 'PERFORMANCE SUITE',
          items: [
            {
              label: 'Evaluation Records',
              path: '/student/my-tests',
              icon: Award,
              isActive: location.pathname === '/student/my-tests',
              description: 'Performance scorecards & analytics',
            },
            {
              label: 'AI Diagnostic Lab',
              path: '/student/mock-test',
              icon: Sparkles,
              isActive: location.pathname === '/student/mock-test',
              description: 'Adaptive practice tests & evaluations',
            },
          ],
        },
      ];
    }

    return [];
  };

  const navSections = getNavSections();

  const getRoleDisplayName = () => {
    if (role === 'admin') return 'Institutional Admin';
    if (role === 'teacher') return 'Academic Faculty';
    if (role === 'student') return 'Verified Candidate';
    return 'Authenticated';
  };

  const getRoleBadgeColor = () => {
    if (role === 'admin') return 'text-[#35A6A0] bg-[#35A6A0]/15 border-[#35A6A0]/30';
    if (role === 'teacher') return 'text-[#4169C1] bg-[#4169C1]/15 border-[#4169C1]/30';
    return 'text-teal-300 bg-teal-500/15 border-teal-500/30';
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-[#233B67]/70 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        id="app-left-sidebar"
        aria-label="Application Sidebar Navigation"
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-[#233B67] border-r border-[#4169C1]/30 shadow-2xl transition-transform duration-300 ease-in-out w-64 xl:w-72 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="rg-layout-header h-[72px] min-h-[72px] max-h-[72px] px-4 sm:px-5 border-b border-[#4169C1]/30 flex items-center justify-between bg-[#233B67] shrink-0 box-border">
          <Link
            to={
              role === 'student'
                ? '/student/dashboard'
                : role === 'teacher'
                ? '/teacher/dashboard'
                : role === 'admin'
                ? '/admin/dashboard'
                : '/'
            }
            onClick={(e) => handleNavClick(e, '/')}
            className="flex items-center gap-3 group"
            title="Exam Mate – AI-Powered Intelligent Examination Platform"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#4169C1] to-[#35A6A0] flex items-center justify-center shadow-md shadow-[#233B67]/50 group-hover:scale-105 transition-transform flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-white stroke-[2]" />
            </div>

            <div className="min-w-0 flex-1">
              <span className="text-sm font-bold font-heading tracking-tight text-white block truncate leading-tight">
                Exam<span className="text-[#35A6A0]">Mate</span>
              </span>
              <span className="text-[10px] text-[#A7B4C7] block truncate leading-tight mt-0.5">
                GPREC Kurnool
              </span>
              <span className={`inline-block px-1.5 py-0.2 mt-0.5 rounded text-[9px] font-semibold border ${getRoleBadgeColor()}`}>
                {getRoleDisplayName()}
              </span>
            </div>
          </Link>

          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-[#4169C1]/30 transition-colors"
            aria-label="Close sidebar navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin">
          {navSections.map((section) => (
            <div key={section.category} className="space-y-1.5">
              <div className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-[#35A6A0]">
                {section.category}
              </div>

              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = item.isActive;

                  return (
                    <Link
                      key={item.label}
                      to={item.path}
                      onClick={(e) => handleNavClick(e, item.path)}
                      className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                        active
                          ? 'text-white bg-[#4169C1]/30 border border-[#4169C1]/60 shadow-sm font-bold'
                          : 'text-[#A7B4C7] hover:text-white hover:bg-[#4169C1]/20 border border-transparent'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 flex-shrink-0 transition-colors stroke-[2] ${
                          active
                            ? 'text-[#35A6A0]'
                            : 'text-[#A7B4C7] group-hover:text-white'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="block truncate leading-tight">
                          {item.label}
                        </span>
                      </div>
                      {active && (
                        <div className="w-1.5 h-4 rounded-full bg-[#35A6A0] flex-shrink-0" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3.5 border-t border-[#4169C1]/30 bg-[#233B67] shrink-0">
          <div className="p-3 rounded-xl bg-[#4169C1]/20 border border-[#4169C1]/40 text-center">
            <p className="text-[11px] font-semibold text-white tracking-tight leading-snug">
              G. Pulla Reddy Eng. College
            </p>
            <p className="text-[10px] text-[#A7B4C7] mt-0.5">
              Project Lead: <span className="text-[#35A6A0] font-medium">Bharath</span>
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
