import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient, { formatApiError } from '../api/axios';
import {
  User,
  Eye,
  EyeOff,
  GraduationCap,
  Users,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  LockKeyhole,
} from 'lucide-react';

const Login = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const roleFromUrl = searchParams.get('role');
  const activeTab = roleFromUrl && ['student', 'teacher'].includes(roleFromUrl)
    ? roleFromUrl
    : 'student';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    try {
      localStorage.removeItem('remembered_email');
      localStorage.removeItem('remembered_admin_email');
      sessionStorage.removeItem('login_form_data');
    } catch {}
  }, []);

  useEffect(() => {
    setPassword('');
    setShowPassword(false);
    setError('');
    setSuccess('');
    setLoading(false);
  }, [activeTab]);

  const handleTabChange = (role) => {
    setSearchParams({ role });
    setPassword('');
    setShowPassword(false);
    setError('');
    setSuccess('');
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError('Please provide both your institutional email and password.');
      return;
    }

    setLoading(true);

    try {
      const endpoint = activeTab === 'teacher' ? '/auth/teacher/login' : '/auth/student/login';

      const response = await apiClient.post(endpoint, {
        email: cleanEmail.toLowerCase(),
        password: password,
      });

      const { access_token, role: authRole, user: authUser, message } = response.data;

      apiClient.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

      let preloadedBundle = null;
      if (authRole === 'student') {
        try {
          const [summaryRes, examsRes, mockRes] = await Promise.all([
            apiClient.get('/students/dashboard-summary'),
            apiClient.get('/exams/student/available'),
            apiClient.get('/mocks/history'),
          ]);
          preloadedBundle = {
            role: 'student',
            data: {
              summary: summaryRes.data,
              availableExams: examsRes.data || [],
              mockHistory: mockRes.data || [],
            },
          };
        } catch (fetchErr) {
          console.warn('Student dashboard pre-fetch fallback:', fetchErr);
        }
      } else if (authRole === 'teacher') {
        try {
          const [summaryRes, examsRes, studentsRes, mockRes] = await Promise.all([
            apiClient.get('/teachers/dashboard-summary'),
            apiClient.get('/exams/teacher/my-exams'),
            apiClient.get('/teachers/students'),
            apiClient.get('/teachers/mock-tests'),
          ]);
          preloadedBundle = {
            role: 'teacher',
            data: {
              summary: summaryRes.data,
              teacherExams: examsRes.data || [],
              students: studentsRes.data || [],
              mockActivity: mockRes.data?.attempts || [],
            },
          };
        } catch (fetchErr) {
          console.warn('Teacher dashboard pre-fetch fallback:', fetchErr);
        }
      }

      login(access_token, authRole, authUser, preloadedBundle);
      setSuccess(message || 'Authentication successful. Redirecting...');

      if (authRole === 'student') {
        navigate('/student/dashboard');
      } else if (authRole === 'teacher') {
        navigate('/teacher/dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4.5rem)] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 overflow-hidden bg-[#F5F7FC]">
      
      {/* Ambient background glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full ambient-glow-navy animate-ambient-slow" />
        <div className="absolute top-1/4 -right-28 w-[32rem] h-[32rem] rounded-full ambient-glow-blue animate-ambient-reverse" />
        <div className="absolute -bottom-24 left-1/3 w-[28rem] h-[28rem] rounded-full ambient-glow-teal" />
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        
        {/* Left Information Showcase */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-6 lg:pr-6 text-left">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#4169C1]/10 border border-[#4169C1]/20 text-[#233B67] text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-[#35A6A0]" />
            <span>G. Pulla Reddy Engineering College Examination Portal</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#202B40] tracking-tight leading-tight font-heading">
            Authenticate & Proceed <br className="hidden sm:inline" />
            <span className="gradient-text">to Your Workspace.</span>
          </h1>

          <p className="text-base sm:text-lg text-[#718096] leading-relaxed font-normal max-w-xl">
            Welcome to Exam Mate. Access your official academic examinations, review proctored assessment logs, and track granular performance analytics.
          </p>

          <div className="space-y-3.5 pt-2 max-w-xl">
            <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-[#4169C1]/10 border border-[#4169C1]/20 text-[#4169C1] flex items-center justify-center shrink-0 mt-0.5">
                <LockKeyhole className="w-4 h-4 stroke-[2]" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#202B40]">Protected Authentication</h4>
                <p className="text-xs text-[#718096] leading-relaxed mt-0.5">
                  Multi-factor token security with progressive rate limiting and identity validation.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-[#35A6A0]/10 border border-[#35A6A0]/20 text-[#35A6A0] flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4 stroke-[2]" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#202B40]">Automated Integrity Surveillance</h4>
                <p className="text-xs text-[#718096] leading-relaxed mt-0.5">
                  Client-side MediaPipe vision monitoring guarantees equal examination conditions.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-[#299D70]/10 border border-[#299D70]/20 text-[#299D70] flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4 stroke-[2]" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#202B40]">Diagnostic Concept Feedback</h4>
                <p className="text-xs text-[#718096] leading-relaxed mt-0.5">
                  Detailed rubrics, correct rationales, and strength/weakness mapping for every test.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Authentication Card */}
        <div className="lg:col-span-5 xl:col-span-5 flex justify-center lg:justify-end">
          <div className="w-full max-w-[440px] login-glass-card rounded-[24px] p-7 sm:p-9 shadow-xl transition-all duration-300">
            
            <div className="mb-6 space-y-1 text-left">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#35A6A0] block">
                Exam Mate Security Access
              </span>
              <h2 className="text-2xl font-bold text-[#202B40] font-heading">
                Sign In to Your Account
              </h2>
              <p className="text-xs text-[#718096] font-normal pt-0.5">
                Select your academic role to proceed to your examination dashboard.
              </p>
            </div>

            {/* Role Tab Selector */}
            <div
              role="tablist"
              aria-label="User Portal Role Selection"
              className="grid grid-cols-2 gap-1 p-1 mb-6 rounded-2xl bg-[#EDF2FA] border border-[#E2E8F0]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'student'}
                onClick={() => handleTabChange('student')}
                className={`py-2 px-2 text-xs font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 focus:outline-none cursor-pointer ${
                  activeTab === 'student'
                    ? 'bg-gradient-to-r from-[#233B67] to-[#4169C1] text-white shadow-md shadow-[#233B67]/20 border border-[#4169C1]/30 font-bold'
                    : 'text-[#718096] hover:text-[#202B40] hover:bg-white/60'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>Candidate</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'teacher'}
                onClick={() => handleTabChange('teacher')}
                className={`py-2 px-2 text-xs font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 focus:outline-none cursor-pointer ${
                  activeTab === 'teacher'
                    ? 'bg-gradient-to-r from-[#233B67] to-[#4169C1] text-white shadow-md shadow-[#233B67]/20 border border-[#4169C1]/30 font-bold'
                    : 'text-[#718096] hover:text-[#202B40] hover:bg-white/60'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Faculty</span>
              </button>
            </div>

            {/* Error Notification */}
            {error && (
              <div
                role="alert"
                className={`mb-5 p-3.5 rounded-2xl text-xs flex flex-col gap-2 animate-fadeIn ${
                  error.toLowerCase().includes('waiting for administrator approval') || error.toLowerCase().includes('pending')
                    ? 'bg-[#D69B35]/10 border border-[#D69B35]/30 text-[#D69B35]'
                    : error.includes('switch to the')
                    ? 'bg-[#EDF2FA] border border-[#4169C1]/30 text-[#202B40]'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <AlertCircle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                    error.toLowerCase().includes('waiting for administrator approval') || error.toLowerCase().includes('pending')
                      ? 'text-[#D69B35]'
                      : error.includes('switch to the')
                      ? 'text-[#4169C1]'
                      : 'text-red-600'
                  }`} />
                  <div className="leading-relaxed flex-1 text-left">
                    {error.toLowerCase().includes('waiting for administrator approval') && (
                      <span className="font-semibold block mb-0.5 text-[#D69B35]">Verification Pending</span>
                    )}
                    {error.toLowerCase().includes('rejected') && (
                      <span className="font-semibold block mb-0.5 text-red-900">Access Disallowed</span>
                    )}
                    {error.includes('switch to the') && (
                      <span className="font-semibold block mb-0.5 text-[#233B67]">Role Alignment Notice</span>
                    )}
                    {error}
                  </div>
                </div>

                {error.includes('switch to the Teacher login tab') && (
                  <button
                    type="button"
                    onClick={() => handleTabChange('teacher')}
                    className="self-start mt-1 px-3 py-1.5 rounded-xl bg-[#4169C1] hover:bg-[#233B67] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Switch to Faculty Login</span>
                  </button>
                )}

                {error.includes('switch to the Student login tab') && (
                  <button
                    type="button"
                    onClick={() => handleTabChange('student')}
                    className="self-start mt-1 px-3 py-1.5 rounded-xl bg-[#4169C1] hover:bg-[#233B67] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Switch to Candidate Login</span>
                  </button>
                )}
              </div>
            )}

            {/* Success Notification */}
            {success && (
              <div
                role="status"
                className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 animate-fadeIn"
              >
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                <span>{success}</span>
              </div>
            )}

            {/* Form */}
            <form
              key={activeTab}
              onSubmit={handleSubmit}
              noValidate
              className="space-y-4 text-left"
              autoComplete="off"
            >
              <div>
                <label
                  htmlFor={`${activeTab}-email`}
                  className="block text-xs font-semibold text-[#202B40] mb-1.5"
                >
                  Institutional Email Address
                </label>
                <div className="relative">
                  <input
                    key={`${activeTab}-email`}
                    id={`${activeTab}-email`}
                    type="email"
                    name={`${activeTab}_email`}
                    autoComplete="off"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={
                      activeTab === 'student'
                        ? 'gova@gprec.ac.in'
                        : 'govind@gprec.ac.in'
                    }
                    disabled={loading}
                    className="w-full pl-4 pr-11 py-3.5 rounded-xl login-glass-input text-[#202B40] text-sm placeholder:text-[#94A3B8] disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-[#718096]">
                    <User className="w-4 h-4 stroke-[1.75]" />
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor={`${activeTab}-password`}
                  className="block text-xs font-semibold text-[#202B40] mb-1.5"
                >
                  Account Password
                </label>
                <div className="relative">
                  <input
                    key={`${activeTab}-password`}
                    id={`${activeTab}-password`}
                    type={showPassword ? 'text' : 'password'}
                    name={`${activeTab}_password`}
                    autoComplete="new-password"
                    required
                    disabled={loading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter confidential password"
                    className="w-full pl-4 pr-11 py-3.5 rounded-xl login-glass-input text-[#202B40] text-sm placeholder:text-[#94A3B8] disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#718096] hover:text-[#202B40] transition-colors focus:outline-none disabled:opacity-50"
                  >
                    {showPassword ? (
                      <Eye className="w-4 h-4 stroke-[1.75]" />
                    ) : (
                      <EyeOff className="w-4 h-4 stroke-[1.75]" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 pb-1">
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-[#718096] select-none hover:text-[#202B40] transition-colors">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    disabled={loading}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border border-[#E2E8F0] bg-white text-[#4169C1] focus:ring-1 focus:ring-[#4169C1] cursor-pointer accent-[#4169C1] disabled:opacity-50"
                  />
                  <span>Retain session on this device</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-xl font-semibold text-white bg-gradient-to-r from-[#233B67] to-[#4169C1] hover:from-[#1c3055] hover:to-[#3558a7] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 shadow-md shadow-[#4169C1]/20 border border-[#E2E8F0] transition-all duration-200 flex items-center justify-center space-x-2 text-sm cursor-pointer"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying Credentials...</span>
                  </div>
                ) : (
                  <span>Sign In as {activeTab === 'student' ? 'Candidate' : 'Faculty'}</span>
                )}
              </button>
            </form>

            <div className="text-center pt-5 mt-5 border-t border-[#E2E8F0] text-xs text-[#718096]">
              {activeTab === 'student' ? (
                <p>
                  New examinee at GPREC?{' '}
                  <Link
                    to="/student/register"
                    className="text-[#4169C1] hover:text-[#233B67] font-semibold underline underline-offset-4 decoration-[#4169C1]/40 hover:decoration-[#233B67] transition-all"
                  >
                    Register as Candidate
                  </Link>
                </p>
              ) : (
                <p>
                  New faculty member at GPREC?{' '}
                  <Link
                    to="/teacher/register"
                    className="text-[#4169C1] hover:text-[#233B67] font-semibold underline underline-offset-4 decoration-[#4169C1]/40 hover:decoration-[#233B67] transition-all"
                  >
                    Register for Faculty Access
                  </Link>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
