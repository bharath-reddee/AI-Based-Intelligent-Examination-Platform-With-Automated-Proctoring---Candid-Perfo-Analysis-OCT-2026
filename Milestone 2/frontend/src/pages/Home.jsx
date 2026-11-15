import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  GraduationCap,
  Users,
  Cpu,
  CheckCircle2,
  ArrowRight,
  Eye,
  Sparkles,
  ChartNoAxesCombined,
  LockKeyhole,
  Check,
} from 'lucide-react';

const Home = () => {
  return (
    <div className="min-h-screen bg-[#F5F7FC]">

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Subtle ambient lighting */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full ambient-glow-navy animate-ambient-slow" />
          <div className="absolute top-1/2 -left-24 w-80 h-80 rounded-full ambient-glow-teal animate-ambient-reverse" />
          <div className="absolute bottom-0 right-1/3 w-72 h-72 rounded-full ambient-glow-blue" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-24 text-center">
          {/* Institutional Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#4169C1]/10 border border-[#4169C1]/25 text-[#233B67] text-xs font-semibold mb-6 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-[#35A6A0]" />
            <span>G. Pulla Reddy Engineering College, Kurnool</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold text-[#202B40] tracking-tight leading-tight max-w-4xl mx-auto mb-6 font-heading">
            Next-Generation Assessments.{' '}
            <span className="gradient-text">Autonomous Proctoring.</span>{' '}
            Actionable Intelligence.
          </h1>

          <p className="text-base sm:text-lg text-[#718096] max-w-2xl mx-auto leading-relaxed mb-8">
            Experience an institutional examination environment engineered with real-time biometric vision surveillance, adaptive AI question generation, and concept-level performance diagnosis.
          </p>

          {/* Core Feature Highlights */}
          <div className="flex flex-wrap justify-center gap-2.5 mb-10">
            {[
              { icon: Eye, label: 'Vision Proctoring', color: 'text-[#4169C1] bg-[#4169C1]/10 border-[#4169C1]/20' },
              { icon: Sparkles, label: 'AI Question Engine', color: 'text-[#35A6A0] bg-[#35A6A0]/10 border-[#35A6A0]/20' },
              { icon: ChartNoAxesCombined, label: 'Diagnostic Analytics', color: 'text-[#299D70] bg-[#299D70]/10 border-[#299D70]/20' },
              { icon: LockKeyhole, label: 'Encrypted Delivery', color: 'text-[#233B67] bg-[#233B67]/10 border-[#233B67]/20' },
            ].map(({ icon: Icon, label, color }) => (
              <span key={label} className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border ${color} shadow-xs`}>
                <Icon className="w-3.5 h-3.5" />
                {label}
              </span>
            ))}
          </div>

          {/* Action Portals */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/student/register"
              className="px-6 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-[#233B67] to-[#4169C1] hover:from-[#1b2f53] hover:to-[#3558a8] shadow-lg shadow-[#4169C1]/25 transition-all hover:scale-[1.02] flex items-center space-x-2"
            >
              <GraduationCap className="w-5 h-5" />
              <span>Candidate Registration</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>

            <Link
              to="/teacher/register"
              className="px-6 py-3.5 rounded-xl font-semibold text-[#202B40] bg-white hover:bg-[#EDF2FA] border border-[#E2E8F0] transition-all hover:scale-[1.02] flex items-center space-x-2 shadow-sm"
            >
              <Users className="w-5 h-5 text-[#4169C1]" />
              <span>Faculty Onboarding</span>
            </Link>

            <Link
              to="/login"
              className="px-6 py-3.5 rounded-xl font-semibold text-[#718096] hover:text-[#202B40] bg-transparent hover:bg-white border border-[#E2E8F0] transition-all"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* Structured Functional Highlights */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#202B40] mb-3 font-heading">Institutional Architecture</h2>
          <p className="text-[#718096] max-w-xl mx-auto text-sm leading-relaxed">
            Engineered to maintain uncompromising academic integrity through transparent automated supervision.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Candidate Card */}
          <div className="glass-card rounded-2xl p-7 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#4169C1]/10 border border-[#4169C1]/20 flex items-center justify-center text-[#4169C1] mb-5">
                <GraduationCap className="w-6 h-6 stroke-[2]" />
              </div>
              <h3 className="text-base font-bold text-[#202B40] mb-2 font-heading">Candidate Assessment Suite</h3>
              <p className="text-sm text-[#718096] leading-relaxed mb-4">
                Undertake formal examinations under non-intrusive MediaPipe biometric tracking, answer dynamic objective and descriptive questions, and receive granular analytical breakdowns.
              </p>
              <ul className="space-y-2 mb-6">
                {[
                  'Local client-side MediaPipe vision monitoring',
                  'Timed multi-format questions (MCQ, select, subjective)',
                  'Concept-wise performance diagnosis and scoring',
                  'Autonomous AI practice simulation modules',
                ].map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-xs text-[#202B40]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#35A6A0] mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Link
              to="/student/register"
              className="text-xs font-semibold text-[#4169C1] hover:text-[#233B67] inline-flex items-center gap-1 pt-2 border-t border-[#E2E8F0]"
            >
              <span>Enroll as Candidate</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Faculty Card */}
          <div className="glass-card rounded-2xl p-7 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#35A6A0]/10 border border-[#35A6A0]/20 flex items-center justify-center text-[#35A6A0] mb-5">
                <Users className="w-6 h-6 stroke-[2]" />
              </div>
              <h3 className="text-base font-bold text-[#202B40] mb-2 font-heading">Instructional Authoring Desk</h3>
              <p className="text-sm text-[#718096] leading-relaxed mb-4">
                Curate rich test papers through integrated LLM generation, set strict examination windows, and audit flagged proctoring infraction logs with high-resolution timelines.
              </p>
              <ul className="space-y-2 mb-6">
                {[
                  'Dual LLM question synthesis with schema validation',
                  'Scheduled time windows and candidate cohort assignment',
                  'Real-time proctoring infraction timeline and audit logs',
                  'Student gradebooks and automated rubric marking',
                ].map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-xs text-[#202B40]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#35A6A0] mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Link
              to="/teacher/register"
              className="text-xs font-semibold text-[#35A6A0] hover:text-[#233B67] inline-flex items-center gap-1 pt-2 border-t border-[#E2E8F0]"
            >
              <span>Request Faculty Access</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Admin Card */}
          <div className="glass-card rounded-2xl p-7 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#233B67]/10 border border-[#233B67]/20 flex items-center justify-center text-[#233B67] mb-5">
                <ShieldCheck className="w-6 h-6 stroke-[2]" />
              </div>
              <h3 className="text-base font-bold text-[#202B40] mb-2 font-heading">Governance & Access Authority</h3>
              <p className="text-sm text-[#718096] leading-relaxed mb-4">
                Supervise verified institutional identities, grant departmental role permissions, and maintain platform infrastructure availability with multi-tier rate limiting.
              </p>
              <ul className="space-y-2 mb-6">
                {[
                  'Mandatory administrative approval verification gate',
                  'Granular role-based credential authorization',
                  'Institution-wide proctoring incident telemetry',
                  'Health metrics and persistent database monitoring',
                ].map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-xs text-[#202B40]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#35A6A0] mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Link
              to="/admin/login"
              className="text-xs font-semibold text-[#233B67] hover:text-[#4169C1] inline-flex items-center gap-1 pt-2 border-t border-[#E2E8F0]"
            >
              <span>Admin Gateway</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Technology Stack Showcase */}
        <div className="mt-12 p-6 rounded-2xl bg-white border border-[#E2E8F0] text-center shadow-xs">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Cpu className="w-4 h-4 text-[#4169C1]" />
            <span className="text-xs uppercase tracking-wider font-bold text-[#233B67]">Core Engineering Framework</span>
          </div>
          <div className="flex flex-wrap justify-center gap-2.5">
            {[
              'OpenAI GPT-4o Engine',
              'Google Gemini 1.5 Failover',
              'MediaPipe Vision WASM',
              'FastAPI Asynchronous Gateway',
              'Neon PostgreSQL 18',
              'React 18 & Tailwind CSS',
            ].map((tech) => (
              <span key={tech} className="px-3.5 py-1.5 rounded-lg bg-[#EDF2FA] border border-[#E2E8F0] text-xs font-medium text-[#202B40]">
                {tech}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-[#718096] mt-4">
            Designed for G. Pulla Reddy Engineering College • Project Lead: Bharath
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;
