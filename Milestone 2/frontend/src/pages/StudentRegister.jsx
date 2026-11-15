import React, { useState } from "react";
import { Link } from "react-router-dom";
import apiClient, { formatApiError } from "../api/axios";
import {
  User,
  Mail,
  Building,
  Hash,
  Calendar,
  Eye,
  EyeOff,
  GraduationCap,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Award,
} from "lucide-react";

const StudentRegister = () => {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    institute: "",
    roll_number: "",
    class_year: "",
    password: "",
    confirm_password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [submitted, setSubmitted] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (formData.password !== formData.confirm_password) {
      setError("Password confirmation does not match the entered password.");
      return;
    }
    if (formData.password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post("/auth/student/register", {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim().toLowerCase(),
        institute: formData.institute.trim(),
        roll_number: formData.roll_number.trim(),
        class_year: formData.class_year.trim(),
        password: formData.password,
        confirm_password: formData.confirm_password,
      });

      setSubmitted({
        email: formData.email.trim().toLowerCase(),
        name: `${formData.first_name.trim()} ${formData.last_name.trim()}`,
        institute: formData.institute.trim(),
        roll_number: formData.roll_number.trim(),
        message: response.data.message,
      });
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="relative min-h-[calc(100vh-4.5rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden bg-[#F5F7FC]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full ambient-glow-blue opacity-50 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full ambient-glow-teal opacity-50 blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-[480px] login-glass-card rounded-[24px] p-8 sm:p-10 shadow-xl text-center space-y-6 animate-fadeIn">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#233B67] to-[#4169C1] flex items-center justify-center shadow-md">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-[#202B40] tracking-wide font-heading">
              Exam<span className="text-[#35A6A0]">Mate</span> Portal
            </span>
          </div>

          <div className="mx-auto w-20 h-20 rounded-full bg-[#EDF2FA] border border-[#E2E8F0] flex items-center justify-center shadow-md">
            <CheckCircle2 className="w-10 h-10 text-[#299D70] animate-pulse" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#202B40] tracking-tight font-heading">
              Application Under Review
            </h1>
            <p className="text-sm text-[#718096] leading-relaxed">
              Your candidate registration has been recorded and submitted to GPREC administration for verification.
            </p>
          </div>

          {/* Details Pill Box */}
          <div className="p-4 rounded-2xl bg-[#EDF2FA] border border-[#E2E8F0] text-left space-y-2.5">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-[#E2E8F0]">
              <span className="text-[#718096] font-medium">Status</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#D69B35]/10 border border-[#D69B35]/30 text-[#D69B35] font-semibold text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D69B35] animate-ping" />
                Pending Administrator Approval
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#718096] font-medium">Examinee</span>
              <span className="text-[#202B40] font-semibold">
                {submitted.name}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#718096] font-medium">
                Registered Email
              </span>
              <span className="text-[#4169C1] font-mono font-medium">
                {submitted.email}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#718096] font-medium">College</span>
              <span className="text-[#202B40]">{submitted.institute}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#718096] font-medium">Roll Number</span>
              <span className="text-[#202B40] font-mono">
                {submitted.roll_number}
              </span>
            </div>
          </div>

          <p className="text-xs text-[#718096] leading-relaxed">
            Once authorized by institutional leadership, you will be able to log in to access scheduled tests, practice simulations, and grade reports.
          </p>

          <div className="pt-2 space-y-3">
            <Link
              to="/login?role=student"
              className="w-full py-3.5 px-6 rounded-xl font-semibold text-white bg-gradient-to-r from-[#233B67] to-[#4169C1] hover:from-[#1b2f53] hover:to-[#3558a8] active:scale-[0.99] shadow-md shadow-[#4169C1]/20 border border-[#E2E8F0] transition-all duration-200 flex items-center justify-center space-x-2 text-sm cursor-pointer"
            >
              <span>Proceed to Candidate Login</span>
            </Link>
            <Link
              to="/"
              className="block text-xs text-[#718096] hover:text-[#202B40] transition-colors"
            >
              Return to Platform Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-4.5rem)] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 overflow-hidden bg-[#F5F7FC]">
      {/* Background Lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full ambient-glow-navy animate-ambient-slow" />
        <div className="absolute top-1/4 -right-28 w-[32rem] h-[32rem] rounded-full ambient-glow-blue animate-ambient-reverse" />
        <div className="absolute -bottom-24 left-1/3 w-[28rem] h-[28rem] rounded-full ambient-glow-teal" />
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Side Presentation */}
        <div className="lg:col-span-6 xl:col-span-6 space-y-6 lg:pr-4 text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#4169C1]/10 border border-[#4169C1]/20 text-[#233B67] text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-[#35A6A0]" />
            <span>G. Pulla Reddy Engineering College Candidate Registration</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#202B40] tracking-tight leading-tight font-heading">
            Enroll for Intelligent <br className="hidden sm:inline" />
            <span className="gradient-text">Proctored Assessments.</span>
          </h1>

          <p className="text-base sm:text-lg text-[#718096] leading-relaxed font-normal max-w-xl">
            Register your student profile on Exam Mate to undertake official examinations, complete diagnostic practice tests, and receive automated performance evaluations.
          </p>

          <div className="space-y-3.5 pt-2 max-w-xl">
            <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-[#4169C1]/10 border border-[#4169C1]/20 text-[#4169C1] flex items-center justify-center shrink-0 mt-0.5">
                <GraduationCap className="w-4 h-4 stroke-[2]" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#202B40]">
                  Verified Student Identity
                </h4>
                <p className="text-xs text-[#718096] leading-relaxed mt-0.5">
                  Linked roll number and departmental enrollment for authentic grade recording.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-[#35A6A0]/10 border border-[#35A6A0]/20 text-[#35A6A0] flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4 stroke-[2]" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#202B40]">
                  Autonomous AI Practice Arena
                </h4>
                <p className="text-xs text-[#718096] leading-relaxed mt-0.5">
                  Synthesize personalized practice questions with detailed feedback on every answer.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-[#299D70]/10 border border-[#299D70]/20 text-[#299D70] flex items-center justify-center shrink-0 mt-0.5">
                <Award className="w-4 h-4 stroke-[2]" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#202B40]">
                  Holistic Performance Analytics
                </h4>
                <p className="text-xs text-[#718096] leading-relaxed mt-0.5">
                  Pinpoint subject strengths and concept-level gaps with visual competency breakdown.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Registration Form */}
        <div className="lg:col-span-6 xl:col-span-6 flex justify-center lg:justify-end">
          <div className="w-full max-w-[520px] login-glass-card rounded-[24px] p-7 sm:p-9 shadow-xl transition-all duration-300">
            <div className="mb-6 space-y-1 text-left">
              <div className="flex items-center gap-3 mb-2">
                <div className="inline-flex p-2.5 rounded-xl bg-[#4169C1]/10 border border-[#4169C1]/20 text-[#4169C1]">
                  <GraduationCap className="w-6 h-6 stroke-[2]" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#35A6A0] block">
                    Candidate Enrollment
                  </span>
                  <h2 className="text-2xl font-bold text-[#202B40] tracking-tight font-heading">
                    Create Student Account
                  </h2>
                </div>
              </div>
              <p className="text-xs text-[#718096] font-normal pt-1">
                Enter your institutional academic credentials to register for examination access.
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
              onSubmit={handleSubmit}
              noValidate
              className="space-y-4 text-left"
              autoComplete="off"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="student-first-name"
                    className="block text-xs font-semibold text-[#202B40] mb-1.5"
                  >
                    First Name
                  </label>
                  <div className="relative">
                    <input
                      id="student-first-name"
                      type="text"
                      name="first_name"
                      autoComplete="given-name"
                      required
                      value={formData.first_name}
                      onChange={handleChange}
                      placeholder="Gova"
                      className="w-full pl-4 pr-11 py-3 rounded-xl login-glass-input text-[#202B40] text-sm placeholder:text-[#94A3B8]"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-[#718096]">
                      <User className="w-4 h-4 stroke-[1.75]" />
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="student-last-name"
                    className="block text-xs font-semibold text-[#202B40] mb-1.5"
                  >
                    Last Name
                  </label>
                  <div className="relative">
                    <input
                      id="student-last-name"
                      type="text"
                      name="last_name"
                      autoComplete="family-name"
                      required
                      value={formData.last_name}
                      onChange={handleChange}
                      placeholder="Bava"
                      className="w-full pl-4 pr-11 py-3 rounded-xl login-glass-input text-[#202B40] text-sm placeholder:text-[#94A3B8]"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-[#718096]">
                      <User className="w-4 h-4 stroke-[1.75]" />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="student-email"
                  className="block text-xs font-semibold text-[#202B40] mb-1.5"
                >
                  Institutional Email
                </label>
                <div className="relative">
                  <input
                    id="student-email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="gova@gprec.ac.in"
                    className="w-full pl-4 pr-11 py-3 rounded-xl login-glass-input text-[#202B40] text-sm placeholder:text-[#94A3B8]"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-[#718096]">
                    <Mail className="w-4 h-4 stroke-[1.75]" />
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="student-institute"
                  className="block text-xs font-semibold text-[#202B40] mb-1.5"
                >
                  Institute / College Name
                </label>
                <div className="relative">
                  <input
                    id="student-institute"
                    type="text"
                    name="institute"
                    autoComplete="organization"
                    required
                    value={formData.institute}
                    onChange={handleChange}
                    placeholder="G. Pulla Reddy Engineering College"
                    className="w-full pl-4 pr-11 py-3 rounded-xl login-glass-input text-[#202B40] text-sm placeholder:text-[#94A3B8]"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-[#718096]">
                    <Building className="w-4 h-4 stroke-[1.75]" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="student-roll-number"
                    className="block text-xs font-semibold text-[#202B40] mb-1.5"
                  >
                    Roll Number
                  </label>
                  <div className="relative">
                    <input
                      id="student-roll-number"
                      type="text"
                      name="roll_number"
                      autoComplete="off"
                      required
                      value={formData.roll_number}
                      onChange={handleChange}
                      placeholder="249XA33186"
                      className="w-full pl-4 pr-11 py-3 rounded-xl login-glass-input text-[#202B40] text-sm placeholder:text-[#94A3B8]"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-[#718096]">
                      <Hash className="w-4 h-4 stroke-[1.75]" />
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="student-class-year"
                    className="block text-xs font-semibold text-[#202B40] mb-1.5"
                  >
                    Department / Year
                  </label>
                  <div className="relative">
                    <input
                      id="student-class-year"
                      type="text"
                      name="class_year"
                      autoComplete="off"
                      required
                      value={formData.class_year}
                      onChange={handleChange}
                      placeholder="CSE"
                      className="w-full pl-4 pr-11 py-3 rounded-xl login-glass-input text-[#202B40] text-sm placeholder:text-[#94A3B8]"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-[#718096]">
                      <Calendar className="w-4 h-4 stroke-[1.75]" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="student-password"
                    className="block text-xs font-semibold text-[#202B40] mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="student-password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      autoComplete="new-password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="w-full pl-4 pr-11 py-3 rounded-xl login-glass-input text-[#202B40] text-sm placeholder:text-[#94A3B8]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#718096] hover:text-[#202B40] transition-colors focus:outline-none"
                    >
                      {showPassword ? (
                        <Eye className="w-4 h-4 stroke-[1.75]" />
                      ) : (
                        <EyeOff className="w-4 h-4 stroke-[1.75]" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="student-confirm-password"
                    className="block text-xs font-semibold text-[#202B40] mb-1.5"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="student-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirm_password"
                      autoComplete="new-password"
                      required
                      value={formData.confirm_password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="w-full pl-4 pr-11 py-3 rounded-xl login-glass-input text-[#202B40] text-sm placeholder:text-[#94A3B8]"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      aria-label={
                        showConfirmPassword
                          ? "Hide confirm password"
                          : "Show confirm password"
                      }
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#718096] hover:text-[#202B40] transition-colors focus:outline-none"
                    >
                      {showConfirmPassword ? (
                        <Eye className="w-4 h-4 stroke-[1.75]" />
                      ) : (
                        <EyeOff className="w-4 h-4 stroke-[1.75]" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-[#718096]">
                Password must be a minimum of 6 characters.
              </p>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-xl font-semibold text-white bg-gradient-to-r from-[#233B67] to-[#4169C1] hover:from-[#1b2f53] hover:to-[#3558a8] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 shadow-md shadow-[#4169C1]/20 border border-[#E2E8F0] transition-all duration-200 flex items-center justify-center space-x-2 text-sm cursor-pointer"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Submitting Application...</span>
                  </div>
                ) : (
                  <span>Submit Candidate Registration</span>
                )}
              </button>
            </form>

            <div className="text-center pt-5 mt-5 border-t border-[#E2E8F0] text-xs text-[#718096]">
              <p>
                Already have a verified account?{" "}
                <Link
                  to="/login?role=student"
                  className="text-[#4169C1] hover:text-[#233B67] font-semibold underline underline-offset-4 decoration-[#4169C1]/40 hover:decoration-[#233B67] transition-all"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentRegister;
