import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient, { formatApiError } from '../api/axios';
import {
  User,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  LockKeyhole,
} from 'lucide-react';

const AdminLogin = () => {
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
      localStorage.removeItem('remembered_admin_email');
      localStorage.removeItem('remembered_email');
      sessionStorage.removeItem('login_form_data');
    } catch {}
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError('Please provide administrator email credentials and security passkey.');
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post('/auth/admin/login', {
        email: cleanEmail.toLowerCase(),
        password: password,
      });

      const { access_token, role: authRole, user: authUser, message } = response.data;

      apiClient.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

      let preloadedBundle = null;
      try {
        const [summaryRes, usersRes] = await Promise.all([
          apiClient.get('/admins/dashboard-summary'),
          apiClient.get('/admins/users'),
        ]);
        preloadedBundle = {
          role: 'admin',
          data: {
            summary: summaryRes.data,
            usersList: usersRes.data,
          },
        };
      } catch (fetchErr) {
        console.warn('Admin dashboard pre-fetch fallback:', fetchErr);
      }

      login(access_token, authRole, authUser, preloadedBundle);
      setSuccess(message || 'Administrative credentials authenticated.');
      navigate('/admin/dashboard');
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

      <div className="relative z-10 w-full max-w-[460px] login-glass-card rounded-[24px] p-8 sm:p-10 shadow-xl transition-all duration-300">
        
        <div className="mb-6 space-y-2 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#233B67] to-[#4169C1] flex items-center justify-center mx-auto text-white shadow-md shadow-[#233B67]/20">
            <ShieldCheck className="w-6 h-6 stroke-[2]" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#35A6A0] block">
            G. Pulla Reddy Engineering College
          </span>
          <h1 className="text-2xl font-bold text-[#202B40] tracking-tight font-heading">
            Institutional Administration
          </h1>
          <p className="text-xs text-[#718096] font-normal leading-relaxed">
            Enter administrative credentials to access platform governance, user validation queues, and system telemetry.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5 animate-fadeIn"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
            <div className="leading-relaxed text-left flex-1">{error}</div>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 animate-fadeIn"
          >
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        <form
          key="admin-form"
          onSubmit={handleSubmit}
          noValidate
          className="space-y-4 text-left"
          autoComplete="off"
        >
          <div>
            <label
              htmlFor="admin-email"
              className="block text-xs font-semibold text-[#202B40] mb-1.5"
            >
              Administrative Email
            </label>
            <div className="relative">
              <input
                id="admin-email"
                type="email"
                name="admin_email"
                autoComplete="off"
                required
                disabled={loading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@gprec.ac.in"
                className="w-full pl-4 pr-11 py-3.5 rounded-xl login-glass-input text-[#202B40] text-sm placeholder:text-[#94A3B8] disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-[#718096]">
                <User className="w-4 h-4 stroke-[1.75]" />
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="block text-xs font-semibold text-[#202B40] mb-1.5"
            >
              Security Passkey
            </label>
            <div className="relative">
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                name="admin_password"
                autoComplete="new-password"
                required
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter administrator passkey"
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
              <span>Retain administrator session</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-xl font-semibold text-white bg-gradient-to-r from-[#233B67] to-[#4169C1] hover:from-[#1b2f53] hover:to-[#3558a8] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 shadow-md shadow-[#4169C1]/20 border border-[#E2E8F0] transition-all duration-200 flex items-center justify-center space-x-2 text-sm cursor-pointer"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Validating Passkey...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <LockKeyhole className="w-4 h-4 stroke-[2]" />
                <span>Access Governance Console</span>
              </div>
            )}
          </button>
        </form>

        <div className="text-center pt-5 mt-5 border-t border-[#E2E8F0] text-xs text-[#718096]">
          <Link
            to="/login"
            className="text-[#4169C1] hover:text-[#233B67] font-semibold underline underline-offset-4 decoration-[#4169C1]/40 hover:decoration-[#233B67] transition-all"
          >
            Return to Standard Candidate & Faculty Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
