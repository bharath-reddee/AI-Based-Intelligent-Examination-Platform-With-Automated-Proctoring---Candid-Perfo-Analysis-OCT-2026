import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient, { formatApiError } from '../api/axios';
import Modal from '../components/Modal';
import {
  FileQuestion,
  Clock,
  Award,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Sparkles,
  Search,
  Filter,
  Eye,
  Trash2,
  ShieldCheck,
  ClipboardList,
  UserCheck,
} from 'lucide-react';

const StudentMyTests = ({ defaultTab = 'assigned' }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('tab') || defaultTab;
  });

  const [exams, setExams] = useState([]);
  const [practiceHistory, setPracticeHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPractice, setLoadingPractice] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [selectedExamResult, setSelectedExamResult] = useState(null);
  const [deleteCandidateAttempt, setDeleteCandidateAttempt] = useState(null);
  const [deletingAttempt, setDeletingAttempt] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState(null);

  useEffect(() => {
    if (location.state?.submissionFeedback) {
      setSubmissionFeedback(location.state.submissionFeedback);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const isSubmittedExam = (exam) => {
    return Boolean(
      exam.is_submitted ||
      exam.attempt_status === 'submitted' ||
      exam.attempt_status === 'evaluated' ||
      exam.attempt_status === 'graded' ||
      exam.attempt_status === 'pending_evaluation' ||
      exam.attempt_status === 'completed'
    );
  };

  const fetchExams = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/exams/student/available');
      setExams(res.data || []);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchPracticeHistory = async () => {
    setLoadingPractice(true);
    try {
      const res = await apiClient.get('/mocks/history');
      setPracticeHistory(res.data || []);
    } catch (err) {
      console.warn('Practice history fetch failed:', err);
    } finally {
      setLoadingPractice(false);
    }
  };

  useEffect(() => {
    fetchExams();
    fetchPracticeHistory();
  }, []);

  const filteredExams = exams.filter((exam) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      exam.title?.toLowerCase().includes(q) ||
      exam.subject?.toLowerCase().includes(q) ||
      exam.topic?.toLowerCase().includes(q) ||
      exam.teacher_name?.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    const isCompleted = isSubmittedExam(exam);
    const isInProgress = !isCompleted && exam.attempt_status === 'in_progress';

    if (statusFilter === 'available') return !isCompleted && !isInProgress;
    if (statusFilter === 'in_progress') return isInProgress;
    if (statusFilter === 'completed') return isCompleted;
    return true;
  });

  const filteredPractice = practiceHistory.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.subject?.toLowerCase().includes(q) ||
      item.title?.toLowerCase().includes(q) ||
      item.topic?.toLowerCase().includes(q)
    );
  });

  const confirmDeletePractice = async () => {
    if (!deleteCandidateAttempt) return;
    setDeletingAttempt(true);
    try {
      await apiClient.delete(`/mocks/attempt/${deleteCandidateAttempt.attempt_id}`);
      setPracticeHistory((prev) =>
        prev.filter((p) => p.attempt_id !== deleteCandidateAttempt.attempt_id)
      );
      setDeleteCandidateAttempt(null);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setDeletingAttempt(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 sm:py-10 px-4 space-y-8 text-left">
      
      {/* Header Hub Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] shadow-sm relative overflow-hidden bg-white">
        <div className="absolute top-0 right-0 w-96 h-96 ambient-glow-blue rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#233B67] to-[#4169C1] flex items-center justify-center text-white text-2xl font-bold shadow-md shadow-[#4169C1]/20 flex-shrink-0">
              <ClipboardList className="w-7 h-7 stroke-[2]" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#4169C1]/10 text-[#4169C1] text-xs font-semibold uppercase tracking-wider mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Assessment Ledger</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#202B40] tracking-tight font-heading">
                Examinations & Evaluation History
              </h1>
              <p className="text-xs sm:text-sm text-[#718096] mt-0.5">
                Manage your institutional proctored exams and review autonomous AI practice diagnostics.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate('/student/mock-test')}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#233B67] to-[#4169C1] hover:from-[#1b2f53] hover:to-[#3558a8] shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Diagnostic Simulator</span>
            </button>
            <button
              onClick={() => {
                fetchExams();
                fetchPracticeHistory();
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#202B40] bg-[#EDF2FA] hover:bg-[#E2E8F0] border border-[#E2E8F0] transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Refresh Records</span>
            </button>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 pt-6 border-t border-[#E2E8F0] mt-6 relative z-10">
          <button
            id="tab-assigned-exams"
            onClick={() => setActiveTab('assigned')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'assigned'
                ? 'bg-[#4169C1] text-white shadow-sm'
                : 'bg-[#EDF2FA] text-[#718096] hover:text-[#202B40] border border-[#E2E8F0]'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Assigned Examinations</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ml-1 ${activeTab === 'assigned' ? 'bg-white/20 text-white' : 'bg-[#E2E8F0] text-[#202B40]'}`}>
              {exams.length}
            </span>
          </button>

          <button
            id="tab-practice-tests"
            onClick={() => setActiveTab('practice')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'practice'
                ? 'bg-[#4169C1] text-white shadow-sm'
                : 'bg-[#EDF2FA] text-[#718096] hover:text-[#202B40] border border-[#E2E8F0]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Practice Records</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ml-1 ${activeTab === 'practice' ? 'bg-white/20 text-white' : 'bg-[#E2E8F0] text-[#202B40]'}`}>
              {practiceHistory.length}
            </span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => {
              fetchExams();
              fetchPracticeHistory();
            }}
            className="text-xs font-bold text-red-700 underline hover:text-red-900 cursor-pointer"
          >
            Retry Request
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="glass-panel p-5 rounded-2xl border border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-4 bg-white">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 text-[#718096] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'assigned'
                ? 'Search exams by title, subject, faculty...'
                : 'Search practice records by subject, topic...'
            }
            className="w-full bg-[#EDF2FA] border border-[#E2E8F0] rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-[#202B40] placeholder-[#718096] focus:outline-none focus:border-[#4169C1]"
          />
        </div>

        {activeTab === 'assigned' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#718096] flex items-center gap-1 font-medium">
              <Filter className="w-3.5 h-3.5 text-[#4169C1]" /> Filter By:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#EDF2FA] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-[#202B40] focus:outline-none focus:border-[#4169C1] cursor-pointer"
            >
              <option value="all">All Tests ({exams.length})</option>
              <option value="available">
                Ready for Attempt ({exams.filter((e) => !isSubmittedExam(e) && e.attempt_status !== 'in_progress').length})
              </option>
              <option value="in_progress">
                Active In Progress ({exams.filter((e) => !isSubmittedExam(e) && e.attempt_status === 'in_progress').length})
              </option>
              <option value="completed">
                Completed Records ({exams.filter((e) => isSubmittedExam(e)).length})
              </option>
            </select>
          </div>
        )}
      </div>

      {/* Tab 1: Assigned Institutional Tests */}
      {activeTab === 'assigned' && (
        <>
          {loading ? (
            <div className="min-h-[35vh] flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-4 border-[#E2E8F0] border-t-[#4169C1] rounded-full animate-spin"></div>
              <p className="text-xs text-[#718096]">Loading assigned examinations...</p>
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-3xl glass-panel border border-[#E2E8F0] space-y-3 bg-white">
              <div className="w-14 h-14 rounded-full bg-[#EDF2FA] text-[#4169C1] flex items-center justify-center mx-auto mb-2 border border-[#E2E8F0]">
                <ClipboardList className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-[#202B40] font-heading">
                {searchQuery ? 'No matching assessments located' : 'No examinations assigned currently'}
              </h3>
              <p className="text-xs text-[#718096] max-w-md mx-auto">
                {searchQuery
                  ? `No tests matched "${searchQuery}". Please refine your search term or clear active filters.`
                  : 'Institutional examinations published by your faculty will be displayed here.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredExams.map((exam) => {
                const isCompleted = isSubmittedExam(exam);
                const isInProgress = !isCompleted && exam.attempt_status === 'in_progress';

                return (
                  <div
                    key={exam.id}
                    className="glass-card p-6 rounded-3xl border border-[#E2E8F0] hover:border-[#CBD5E1] transition-all flex flex-col justify-between space-y-5 bg-white"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#4169C1]/10 text-[#4169C1] border border-[#4169C1]/20">
                          {exam.subject}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isCompleted
                              ? 'bg-emerald-50 text-[#299D70] border border-emerald-200'
                              : isInProgress
                              ? 'bg-[#D69B35]/10 text-[#D69B35] border border-[#D69B35]/30'
                              : 'bg-[#EDF2FA] text-[#202B40] border border-[#E2E8F0]'
                          }`}
                        >
                          {isCompleted ? 'Completed' : isInProgress ? 'In Progress' : 'Available'}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-[#202B40] line-clamp-1 font-heading">{exam.title}</h3>
                        {exam.topic && (
                          <p className="text-xs text-[#35A6A0] font-medium mt-0.5">Topic: {exam.topic}</p>
                        )}
                        <p className="text-xs text-[#718096] mt-2 line-clamp-2 leading-relaxed">
                          {exam.description || 'Institutional examination session under biometric AI supervision.'}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E2E8F0] text-xs text-[#718096]">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#4169C1]" />
                          <span>{exam.duration_minutes} Mins</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-[#299D70]" />
                          <span className="text-[#202B40] font-semibold">{exam.total_marks} Marks</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <FileQuestion className="w-3.5 h-3.5 text-[#4169C1]" />
                          <span>{exam.number_of_questions} Items</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#35A6A0]" />
                          <span>{exam.ai_proctoring_enabled ? 'Surveillance Active' : 'Standard'}</span>
                        </div>
                      </div>

                      {(exam.start_time || exam.end_time) && (
                        <div className="text-[11px] text-[#718096] bg-[#EDF2FA] p-2.5 rounded-xl border border-[#E2E8F0] space-y-1">
                          {exam.start_time && (
                            <div>Opens: <span className="text-[#202B40] font-mono">{new Date(exam.start_time).toLocaleString()}</span></div>
                          )}
                          {exam.end_time && (
                            <div>Closes: <span className="text-[#202B40] font-mono">{new Date(exam.end_time).toLocaleString()}</span></div>
                          )}
                        </div>
                      )}

                      {exam.teacher_name && (
                        <div className="text-[11px] text-[#718096] flex items-center gap-1 pt-1 font-medium">
                          <UserCheck className="w-3 h-3 text-[#4169C1]" />
                          <span>Assigned by: <strong className="text-[#202B40]">{exam.teacher_name}</strong></span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      {isCompleted ? (
                        <div className="space-y-2">
                          <div className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-[#299D70] bg-emerald-50 border border-emerald-200 flex items-center justify-center gap-2 select-none">
                            <CheckCircle2 className="w-4 h-4 text-[#299D70]" />
                            <span>Submitted & Stored</span>
                          </div>
                          {exam.score !== null && exam.score !== undefined && (
                            <button
                              onClick={() => setSelectedExamResult(exam)}
                              className="w-full text-center text-[11px] text-[#4169C1] hover:text-[#233B67] transition-colors py-0.5 flex items-center justify-center gap-1.5 font-semibold cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Scorecard ({exam.score} / {exam.total_marks} Marks)</span>
                            </button>
                          )}
                        </div>
                      ) : isInProgress ? (
                        <button
                          onClick={() => navigate(`/student/exams/${exam.id}/attempt`)}
                          className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-[#D69B35] hover:bg-[#B88226] shadow-sm shadow-[#D69B35]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Resume Assessment</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate(`/student/exams/${exam.id}/readiness`)}
                          className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#233B67] to-[#4169C1] hover:from-[#1b2f53] hover:to-[#3558a8] shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Play className="w-4 h-4" />
                          <span>Verify Integrity & Attempt</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Tab 2: Autonomous Practice History */}
      {activeTab === 'practice' && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] space-y-6 shadow-sm bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#202B40] flex items-center gap-2 font-heading">
                <Sparkles className="w-5 h-5 text-[#35A6A0]" />
                <span>Autonomous Diagnostic Simulations</span>
              </h2>
              <p className="text-xs text-[#718096] mt-0.5">
                Practice attempts remain self-contained and do not impact formal curriculum grades.
              </p>
            </div>
            <button
              onClick={() => navigate('/student/mock-test')}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#233B67] to-[#4169C1] hover:from-[#1b2f53] hover:to-[#3558a8] shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Launch Practice Module</span>
            </button>
          </div>

          {loadingPractice ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-4 border-[#E2E8F0] border-t-[#4169C1] rounded-full animate-spin"></div>
              <p className="text-xs text-[#718096]">Loading diagnostic attempts...</p>
            </div>
          ) : filteredPractice.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-2xl bg-[#EDF2FA]/50 border border-[#E2E8F0] space-y-3">
              <Award className="w-12 h-12 text-[#4169C1] mx-auto opacity-60" />
              <h3 className="text-base font-semibold text-[#202B40]">No practice records found</h3>
              <p className="text-xs text-[#718096] max-w-sm mx-auto">
                {searchQuery
                  ? `No practice diagnostics matched "${searchQuery}".`
                  : 'Synthesize custom practice items with immediate automated evaluation, LaTeX rendering, and conceptual solutions.'}
              </p>
              <button
                onClick={() => navigate('/student/mock-test')}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#4169C1] hover:bg-[#233B67] transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Sparkles className="w-4 h-4" />
                <span>Open Diagnostic Studio</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-xs font-semibold text-[#718096] uppercase tracking-wider bg-[#EDF2FA]/40">
                    <th className="py-3 px-4">Subject & Assessment</th>
                    <th className="py-3 px-4">Complexity</th>
                    <th className="py-3 px-4">Score</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Recorded Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredPractice.map((h) => {
                    const isPending =
                      h.has_pending_subjective || h.status === 'pending_evaluation';

                    return (
                      <tr key={h.attempt_id} className="hover:bg-[#EDF2FA]/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[#202B40] line-clamp-1">
                            {h.title || `Diagnostic Test: ${h.subject}`}
                          </div>
                          <div className="text-[11px] text-[#4169C1] font-medium mt-0.5">
                            {h.subject} {h.topic ? `• ${h.topic}` : ''}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-xs">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              h.difficulty === 'Easy'
                                ? 'bg-emerald-50 text-[#299D70] border border-emerald-200'
                                : h.difficulty === 'Hard'
                                ? 'bg-red-50 text-red-600 border border-red-200'
                                : 'bg-[#4169C1]/10 text-[#4169C1] border border-[#4169C1]/20'
                            }`}
                          >
                            {h.difficulty || 'Medium'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-xs font-mono">
                          <span className="text-[#202B40] font-bold">{h.score}</span>
                          <span className="text-[#718096]"> / {h.total_marks}</span>
                          <span className="ml-2 text-[#4169C1] font-semibold">({h.percentage}%)</span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium ${
                              isPending
                                ? 'bg-[#D69B35]/10 text-[#D69B35] border border-[#D69B35]/30'
                                : h.passed
                                ? 'bg-emerald-50 text-[#299D70] border border-emerald-200'
                                : 'bg-[#EDF2FA] text-[#718096] border border-[#E2E8F0]'
                            }`}
                          >
                            {isPending ? 'Subjective Review Pending' : h.passed ? 'Satisfied ✓' : 'Completed'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-xs font-mono text-[#718096]">
                          {h.date}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              id={`view-result-practice-btn-${h.attempt_id}`}
                              onClick={() => navigate(`/student/mock-test?attempt_id=${h.attempt_id}`)}
                              className="px-2.5 py-1 rounded-lg bg-[#4169C1]/10 text-[#4169C1] hover:bg-[#4169C1]/20 transition-colors text-xs flex items-center gap-1 font-semibold cursor-pointer"
                              title="Review Evaluation Rubric"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Scorecard</span>
                            </button>
                            <button
                              id={`delete-practice-btn-${h.attempt_id}`}
                              onClick={() => setDeleteCandidateAttempt(h)}
                              className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors cursor-pointer"
                              title="Remove Practice History Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Official Examination Result Modal */}
      <Modal
        isOpen={!!selectedExamResult}
        onClose={() => setSelectedExamResult(null)}
        type="success"
        title="Examination Performance Breakdown"
        message={selectedExamResult ? `Official record for "${selectedExamResult.title}"` : ''}
        confirmText="Acknowledge"
        onConfirm={() => setSelectedExamResult(null)}
        maxWidth="max-w-md"
      >
        {selectedExamResult && (
          <div className="space-y-4 pt-1">
            <div className="bg-[#EDF2FA] p-4 rounded-2xl border border-[#E2E8F0] grid grid-cols-2 gap-3 text-center">
              <div>
                <div className="text-xs text-[#718096]">Total Score</div>
                <div className="text-xl font-bold text-[#202B40] mt-0.5">
                  {selectedExamResult.score} / {selectedExamResult.total_marks}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#718096]">Percentage</div>
                <div className="text-xl font-bold text-[#4169C1] mt-0.5">
                  {selectedExamResult.total_marks > 0
                    ? Math.round((selectedExamResult.score / selectedExamResult.total_marks) * 100)
                    : 0}%
                </div>
              </div>
              <div>
                <div className="text-xs text-[#718096]">Status</div>
                <div className="text-xs font-bold text-[#299D70] uppercase mt-1">
                  {selectedExamResult.attempt_status}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#718096]">Passing Standard</div>
                <div className="text-xs font-bold text-[#4169C1] uppercase mt-1">
                  {selectedExamResult.passing_marks
                    ? selectedExamResult.score >= selectedExamResult.passing_marks
                      ? 'PASSED ✓'
                      : 'FAILED ✗'
                    : 'RECORDED'}
                </div>
              </div>
            </div>

            <div className="text-[11px] text-[#718096] text-center">
              Official assessment attempt recorded and persisted in the GPREC academic ledger.
            </div>
          </div>
        )}
      </Modal>

      {/* Post-Submission Modal Notification */}
      <Modal
        isOpen={!!submissionFeedback}
        onClose={() => setSubmissionFeedback(null)}
        type="success"
        title="Assessment Submitted Successfully"
        message={`Your attempt for "${submissionFeedback?.examTitle || 'the examination'}" has been processed and logged.`}
        confirmText="Confirm"
        onConfirm={() => setSubmissionFeedback(null)}
        maxWidth="max-w-lg"
      >
        {submissionFeedback && (
          <div className="space-y-4 pt-1">
            <div className="bg-[#EDF2FA] p-4 rounded-2xl border border-[#E2E8F0] grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-xs text-[#718096]">Marks Recorded</div>
                <div className="text-lg font-bold text-[#202B40] mt-0.5">
                  {submissionFeedback.score} / {submissionFeedback.totalMarks}
                </div>
              </div>
              <div>
                <div className="text-xs text-[#718096]">Score Percentage</div>
                <div className="text-lg font-bold text-[#4169C1] mt-0.5">
                  {submissionFeedback.percentage ||
                    (submissionFeedback.totalMarks > 0
                      ? Math.round((submissionFeedback.score / submissionFeedback.totalMarks) * 100)
                      : 0)}%
                </div>
              </div>
              <div>
                <div className="text-xs text-[#718096]">Audit Status</div>
                <div className="text-xs font-bold text-[#299D70] uppercase mt-1">
                  {submissionFeedback.status || 'Graded'}
                </div>
              </div>
            </div>

            {submissionFeedback.hasPendingSubjective && (
              <div className="p-3 rounded-xl bg-[#D69B35]/10 border border-[#D69B35]/30 text-[#D69B35] text-xs flex items-start gap-2">
                <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#D69B35]" />
                <span>
                  Subjective answers are currently queued for evaluation. Your final marks will update upon rubric scoring completion.
                </span>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteCandidateAttempt}
        onClose={() => setDeleteCandidateAttempt(null)}
        type="confirm"
        title="Remove Practice Diagnostic Record?"
        message={`Confirm deletion of your personal practice attempt for "${
          deleteCandidateAttempt?.title || deleteCandidateAttempt?.subject || 'this simulation'
        }"? This action cannot be reverted.`}
        confirmText={deletingAttempt ? 'Deleting...' : 'Delete Record'}
        cancelText="Cancel"
        loading={deletingAttempt}
        onConfirm={confirmDeletePractice}
        maxWidth="max-w-md"
      />
    </div>
  );
};

export default StudentMyTests;
