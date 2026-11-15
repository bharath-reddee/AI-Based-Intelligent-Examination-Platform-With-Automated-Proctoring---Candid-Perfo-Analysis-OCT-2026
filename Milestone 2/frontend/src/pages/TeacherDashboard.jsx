import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient, { formatApiError } from '../api/axios';
import Modal from '../components/Modal';
import {
  Mail,
  Users,
  FileText,
  Sparkles,
  AlertTriangle,
  Plus,
  AlertCircle,
  CheckCircle,
  Eye,
  Trash2,
  RefreshCw,
  Award,
  CheckCircle2,
  Search,
  Filter,
  ShieldAlert,
  ShieldCheck,
  X,
  ExternalLink,
  ChevronRight,
  BarChart3,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';

const TeacherDashboard = () => {
  const { user, consumePreloadedData } = useAuth();
  const navigate = useNavigate();

  
  const preloaded = typeof consumePreloadedData === 'function' ? consumePreloadedData('teacher') : null;

  const [data, setData] = useState(() => preloaded?.summary || null);
  const [teacherExams, setTeacherExams] = useState(() => preloaded?.teacherExams || []);
  const [students, setStudents] = useState(() => preloaded?.students || []);
  const [mockActivity, setMockActivity] = useState(() => preloaded?.mockActivity || []);
  const [loading, setLoading] = useState(() => !preloaded);
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'confirm',
    confirmText: 'OK',
    cancelText: null,
    onConfirm: null,
    loading: false,
  });
  const [mockLoading, setMockLoading] = useState(() => !preloaded);
  const [mockError, setMockError] = useState('');
  const [refreshingMock, setRefreshingMock] = useState(false);
  const [error, setError] = useState('');

  
  const [studentSearch, setStudentSearch] = useState('');
  const [examSearch, setExamSearch] = useState('');
  const [examStatusFilter, setExamStatusFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  
  const [showProctoringModal, setShowProctoringModal] = useState(false);
  const [proctoringIncidents, setProctoringIncidents] = useState([]);
  const [loadingIncidents, setLoadingIncidents] = useState(false);

  const formatProctoringEventType = (type) => {
    if (!type) return 'Proctoring Flag';
    const mapping = {
      face_not_detected: 'Face Not Detected',
      head_turned_left: 'Head Turned Left',
      head_turned_right: 'Head Turned Right',
    };
    return mapping[type] || type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const fetchDashboardData = () => {
    setLoading(true);
    Promise.all([
      apiClient.get('/teachers/dashboard-summary'),
      apiClient.get('/exams/teacher/my-exams'),
      apiClient.get('/teachers/students'),
      apiClient.get('/teachers/mock-tests'),
    ])
      .then(([summaryRes, examsRes, studentsRes, mockRes]) => {
        setData(summaryRes.data);
        setTeacherExams(examsRes.data || []);
        setStudents(studentsRes.data || []);
        setMockActivity(mockRes.data?.attempts || []);
        setLoading(false);
        setMockLoading(false);
      })
      .catch((err) => {
        setError(formatApiError(err));
        setLoading(false);
        setMockLoading(false);
      });
  };

  useEffect(() => {
    
    if (preloaded) return;
    fetchDashboardData();
  }, []);

  const handleOpenProctoringModal = async () => {
    setShowProctoringModal(true);
    setLoadingIncidents(true);
    try {
      const res = await apiClient.get('/teachers/proctoring-incidents');
      setProctoringIncidents(res.data || []);
    } catch (err) {
      console.error('Failed to load proctoring incidents:', err);
    } finally {
      setLoadingIncidents(false);
    }
  };

  const handleReviewIncident = async (incidentId) => {
    try {
      await apiClient.post(`/teachers/proctoring-incidents/${incidentId}/review`, {
        review_status: 'reviewed',
        notes: 'Verified by supervising instructor',
      });
      setProctoringIncidents((prev) =>
        prev.map((inc) => (inc.id === incidentId ? { ...inc, review_status: 'reviewed' } : inc))
      );
    } catch (err) {
      setActionModal({
        isOpen: true,
        title: 'Review Incident Failed',
        message: formatApiError(err),
        type: 'danger',
        confirmText: 'Dismiss',
      });
    }
  };

  const handleTogglePublish = async (examId) => {
    try {
      await apiClient.post(`/exams/teacher/${examId}/publish`);
      
      const [examsRes, summaryRes] = await Promise.all([
        apiClient.get('/exams/teacher/my-exams'),
        apiClient.get('/teachers/dashboard-summary')
      ]);
      setTeacherExams(examsRes.data || []);
      setData(summaryRes.data);
    } catch (err) {
      setActionModal({
        isOpen: true,
        title: 'Publish Operation Failed',
        message: formatApiError(err),
        type: 'danger',
        confirmText: 'Dismiss',
      });
    }
  };

  const handleDeleteExam = (examId) => {
    setActionModal({
      isOpen: true,
      title: 'Delete Examination?',
      message: 'Are you sure you want to delete this examination? All candidate attempts and questions will be permanently deleted. This operation cannot be undone.',
      type: 'danger',
      confirmText: 'Yes, Delete Permanently',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setActionModal((prev) => ({ ...prev, loading: true }));
        try {
          await apiClient.delete(`/exams/teacher/${examId}`);
          setTeacherExams((prev) => prev.filter((e) => e.id !== examId));
          const summaryRes = await apiClient.get('/teachers/dashboard-summary');
          setData(summaryRes.data);
          setActionModal({ isOpen: false });
        } catch (err) {
          setActionModal({
            isOpen: true,
            title: 'Delete Examination Failed',
            message: formatApiError(err),
            type: 'danger',
            confirmText: 'Dismiss',
          });
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-12 h-12 border-4 border-[#E2E8F0] border-t-[#233B67] rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-[#94A3B8]">Loading faculty examination console...</p>
      </div>
    );
  }

  const profile = data?.teacher || user;
  const metrics = data?.metrics || {
    total_approved_students: 0,
    total_exams: 0,
    draft_exams: 0,
    published_exams: 0,
    closed_exams: 0,
    total_submissions: 0,
    questions_bank_count: 0,
    proctoring_alerts_flagged: 0,
  };

  const filteredExams = teacherExams.filter((exam) => {
    if (examStatusFilter !== 'all') {
      const examStatus = exam.status || (exam.is_published ? 'published' : 'draft');
      if (examStatus !== examStatusFilter) return false;
    }
    if (examSearch.trim()) {
      const q = examSearch.toLowerCase().trim();
      const matchTitle = exam.title && exam.title.toLowerCase().includes(q);
      const matchSubject = exam.subject && exam.subject.toLowerCase().includes(q);
      return matchTitle || matchSubject;
    }
    return true;
  });

  const filteredStudents = students.filter((st) => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase().trim();
    return (
      (st.name && st.name.toLowerCase().includes(q)) ||
      (st.email && st.email.toLowerCase().includes(q)) ||
      (st.roll_number && st.roll_number.toLowerCase().includes(q)) ||
      (st.class_year && st.class_year.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-10 px-4 space-y-8 animate-pulse">
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] shadow-sm relative overflow-hidden h-36 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-[#EDF2FA]"></div>
            <div className="space-y-2">
              <div className="w-32 h-4 rounded-full bg-[#EDF2FA]"></div>
              <div className="w-52 h-6 rounded-lg bg-[#EDF2FA]"></div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-28 h-10 rounded-xl bg-[#EDF2FA] hidden sm:block"></div>
            <div className="w-28 h-10 rounded-xl bg-[#EDF2FA] hidden sm:block"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm h-28 space-y-3">
              <div className="w-24 h-3 rounded-full bg-[#EDF2FA]"></div>
              <div className="w-16 h-7 rounded-lg bg-[#EDF2FA]"></div>
            </div>
          ))}
        </div>

        <div className="bg-white p-6 rounded-3xl border border-[#E2E8F0] shadow-sm h-80 space-y-4">
          <div className="w-48 h-6 rounded-lg bg-[#EDF2FA]"></div>
          <div className="w-full h-48 rounded-2xl bg-[#EDF2FA]/60"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 space-y-8">
      {/* Faculty Hero Overview */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-[#233B67] flex items-center justify-center text-white text-2xl font-bold shadow-sm">
              {profile?.first_name ? profile.first_name[0] : 'T'}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#202B40] tracking-tight">
                Professor {profile?.first_name || 'Govind'} {profile?.last_name || 'Bhavya'}
              </h1>
              <p className="text-xs sm:text-sm text-[#718096] mt-0.5 font-medium">
                Department of {profile?.department || 'CSE'} • {profile?.institute || 'G. Pulla Reddy Engineering College'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/teacher/tests')}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#718096] hover:text-[#202B40] bg-[#EDF2FA] hover:bg-[#E2E8F0] border border-[#E2E8F0] transition-all flex items-center gap-2 shadow-sm"
            >
              <FileText className="w-4 h-4 text-[#4169C1]" />
              <span>Assessments Repository</span>
            </button>

            <button
              onClick={() => navigate('/teacher/students')}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#718096] hover:text-[#202B40] bg-[#EDF2FA] hover:bg-[#E2E8F0] border border-[#E2E8F0] transition-all flex items-center gap-2 shadow-sm"
            >
              <Users className="w-4 h-4 text-[#4169C1]" />
              <span>Candidates Directory</span>
            </button>

            <button
              onClick={() => navigate('/teacher/exams/create')}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#233B67] hover:bg-[#1a2c4e] shadow-sm transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Test</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#D95C65]/10 border border-[#D95C65]/30 text-[#D95C65] text-sm flex items-center gap-2 font-medium">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div
          onClick={() => navigate('/teacher/students')}
          className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm cursor-pointer hover:border-[#4169C1]/40 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#718096] group-hover:text-[#202B40]">Approved Candidates</span>
            <div className="w-8 h-8 rounded-lg bg-[#4169C1]/10 text-[#4169C1] flex items-center justify-center border border-[#4169C1]/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#202B40] mt-3">
            {metrics.total_approved_students ?? metrics.total_students_enrolled ?? 0} Students
          </div>
          <div className="text-xs text-[#4169C1] mt-1 flex items-center gap-1 font-medium">
            <span>View authorized candidates</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        <div
          onClick={() => navigate('/teacher/tests')}
          className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm cursor-pointer hover:border-[#4169C1]/40 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#718096] group-hover:text-[#202B40]">Total Examinations</span>
            <div className="w-8 h-8 rounded-lg bg-[#4169C1]/10 text-[#4169C1] flex items-center justify-center border border-[#4169C1]/20">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#202B40] mt-3">
            {metrics.total_exams ?? teacherExams.length} Papers
          </div>
          <div className="text-xs text-[#718096] mt-1 flex items-center gap-2 font-medium">
            <span className="text-[#299D70]">{metrics.published_exams ?? 0} Published</span>
            <span>•</span>
            <span className="text-[#4169C1]">{metrics.draft_exams ?? 0} Drafts</span>
            <span>•</span>
            <span className="text-[#718096]">{metrics.closed_exams ?? 0} Closed</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#718096]">Assessment Submissions</span>
            <div className="w-8 h-8 rounded-lg bg-[#299D70]/10 text-[#299D70] flex items-center justify-center border border-[#299D70]/20">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#202B40] mt-3">
            {metrics.total_submissions ?? 0} Submissions
          </div>
          <div className="text-xs text-[#299D70] mt-1 font-medium">
            Evaluated by automated AI grading
          </div>
        </div>

        <div
          onClick={handleOpenProctoringModal}
          className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm cursor-pointer hover:border-[#D69B35]/40 hover:shadow-md transition-all group relative"
          title="Click to inspect active proctoring telemetry and security alerts"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#718096] group-hover:text-[#202B40]">Proctoring Telemetry</span>
            <div className="w-8 h-8 rounded-lg bg-[#D69B35]/10 text-[#D69B35] flex items-center justify-center border border-[#D69B35]/20 group-hover:bg-[#D69B35]/20 transition-colors">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#202B40] mt-3 flex items-center justify-between">
            <span>{metrics.proctoring_alerts_flagged ?? 0} Incidents</span>
            <ChevronRight className="w-4 h-4 text-[#718096] group-hover:text-[#4169C1] group-hover:translate-x-0.5 transition-all" />
          </div>
          <div className="text-xs text-[#718096] mt-1 font-medium">
            Real-time face presence & tab surveillance active
          </div>
        </div>
      </div>

      {/* Examinations Ledger Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#4169C1]/10 text-[#4169C1] text-xs font-semibold uppercase tracking-wider mb-1 border border-[#4169C1]/20">
              <Layers className="w-3.5 h-3.5" />
              <span>Assessment Catalog</span>
            </div>
            <h2 className="text-lg font-bold text-[#202B40]">Course Examination Papers</h2>
            <p className="text-xs text-[#718096]">
              Draft, publish, assign candidates, and inspect institutional evaluation logs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/teacher/tests')}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#718096] hover:text-[#202B40] bg-[#EDF2FA] hover:bg-[#E2E8F0] border border-[#E2E8F0] transition-all flex items-center gap-1.5"
            >
              <span>View All Tests</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#4169C1]" />
            </button>
            <button
              onClick={() => navigate('/teacher/exams/create')}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#233B67] hover:bg-[#1a2c4e] shadow-sm transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Test</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#718096] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={examSearch}
              onChange={(e) => setExamSearch(e.target.value)}
              placeholder="Search examinations by title or subject..."
              className="w-full bg-[#EDF2FA]/70 border border-[#E2E8F0] rounded-xl pl-9 pr-3.5 py-2 text-xs text-[#202B40] placeholder-[#94A3B8] focus:outline-none focus:border-[#4169C1] focus:ring-1 focus:ring-[#4169C1]/20 font-medium"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#718096] flex items-center gap-1 font-medium">
              <Filter className="w-3.5 h-3.5 text-[#718096]" /> Filter:
            </span>
            <select
              value={examStatusFilter}
              onChange={(e) => setExamStatusFilter(e.target.value)}
              className="bg-[#EDF2FA]/70 border border-[#E2E8F0] rounded-xl px-3 py-1.5 text-xs text-[#202B40] focus:outline-none focus:border-[#4169C1] font-medium"
            >
              <option value="all">All Examinations ({teacherExams.length})</option>
              <option value="draft">Drafts ({teacherExams.filter((e) => (e.status || (e.is_published ? 'published' : 'draft')) === 'draft').length})</option>
              <option value="published">Published ({teacherExams.filter((e) => (e.status || (e.is_published ? 'published' : 'draft')) === 'published').length})</option>
              <option value="closed">Closed ({teacherExams.filter((e) => (e.status || (e.is_published ? 'published' : 'draft')) === 'closed').length})</option>
            </select>
          </div>
        </div>

        {filteredExams.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl bg-[#EDF2FA]/40 border border-[#E2E8F0] text-[#718096] text-sm space-y-2">
            <p className="font-semibold text-[#202B40]">No examinations match your current selection.</p>
            <p className="text-xs text-[#718096]">Click &quot;Create Test&quot; to formulate a new assessment paper with questions and candidate assignments.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-xs font-semibold text-[#718096] uppercase tracking-wider">
                  <th className="py-3 px-4">Title & Subject</th>
                  <th className="py-3 px-4">Duration & Marks</th>
                  <th className="py-3 px-4">Questions</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Submissions</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredExams.map((exam) => {
                  const examStatus = exam.status || (exam.is_published ? 'published' : 'draft');
                  return (
                    <tr key={exam.id} className="hover:bg-[#EDF2FA]/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#202B40]">{exam.title}</div>
                        <div className="text-xs text-[#4169C1] mt-0.5 font-medium">{exam.subject} {exam.difficulty ? `• ${exam.difficulty}` : ''}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#718096] font-medium">
                        {exam.duration_minutes} mins • <strong className="text-[#202B40] font-bold">{exam.total_marks} Marks</strong>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#718096] font-medium">
                        {exam.number_of_questions || exam.question_count || 0} Questions
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                            examStatus === 'published'
                              ? 'bg-[#299D70]/15 text-[#299D70] border border-[#299D70]/30'
                              : examStatus === 'closed'
                              ? 'bg-[#EDF2FA] text-[#718096] border border-[#E2E8F0]'
                              : 'bg-[#D69B35]/15 text-[#D69B35] border border-[#D69B35]/30'
                          }`}
                        >
                          {examStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-[#718096] font-semibold">
                        {exam.submission_count ?? 0} Candidates
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => navigate(`/teacher/exams/${exam.id}/edit`)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-[#4169C1] hover:text-[#233B67] bg-[#4169C1]/10 hover:bg-[#4169C1]/20 border border-[#4169C1]/20 transition-all"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => navigate(`/teacher/exams/${exam.id}/results`)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-[#233B67] hover:text-[#1a2c4e] bg-[#233B67]/10 hover:bg-[#233B67]/20 border border-[#233B67]/20 transition-all"
                        >
                          Results
                        </button>
                        <button
                          onClick={() => handleTogglePublish(exam.id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-[#718096] hover:text-[#202B40] bg-[#EDF2FA] hover:bg-[#E2E8F0] border border-[#E2E8F0] transition-all"
                        >
                          {examStatus === 'published' ? 'Close' : 'Publish'}
                        </button>
                        <button
                          onClick={() => handleDeleteExam(exam.id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-[#D95C65] hover:text-[#b53d46] bg-[#D95C65]/10 hover:bg-[#D95C65]/20 border border-[#D95C65]/30 transition-all"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Authorized Candidates Directory Card */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#4169C1]/10 text-[#4169C1] text-xs font-semibold uppercase tracking-wider mb-1 border border-[#4169C1]/20">
              <Users className="w-3.5 h-3.5" />
              <span>Enrolled Candidates</span>
            </div>
            <h2 className="text-lg font-bold text-[#202B40]">Authorized Candidates Ledger</h2>
            <p className="text-xs text-[#718096]">
              Students authorized under your institution for assessment participation and surveillance logging.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/teacher/students')}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#718096] hover:text-[#202B40] bg-[#EDF2FA] hover:bg-[#E2E8F0] border border-[#E2E8F0] transition-all flex items-center gap-1.5"
            >
              <span>Full Students Directory</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#4169C1]" />
            </button>
          </div>
        </div>

        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-[#718096] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            placeholder="Search candidates by name, email, roll number, or class..."
            className="w-full bg-[#EDF2FA]/70 border border-[#E2E8F0] rounded-xl pl-9 pr-3.5 py-2 text-xs text-[#202B40] placeholder-[#94A3B8] focus:outline-none focus:border-[#4169C1] focus:ring-1 focus:ring-[#4169C1]/20 font-medium"
          />
        </div>

        {filteredStudents.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-2xl bg-[#EDF2FA]/40 border border-[#E2E8F0] text-[#718096] text-sm">
            {studentSearch ? 'No candidates matched your search query.' : 'No authorized candidates found in your institution.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-xs font-semibold text-[#718096] uppercase tracking-wider">
                  <th className="py-3 px-4">Candidate Name</th>
                  <th className="py-3 px-4">Institutional Email</th>
                  <th className="py-3 px-4">Roll Number</th>
                  <th className="py-3 px-4">Class / Year</th>
                  <th className="py-3 px-4">Institution</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredStudents.slice(0, 8).map((st) => (
                  <tr key={st.email} className="hover:bg-[#EDF2FA]/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-[#202B40]">{st.name}</td>
                    <td className="py-3 px-4 text-xs text-[#718096] font-medium">{st.email}</td>
                    <td className="py-3 px-4 text-xs font-mono text-[#202B40] font-semibold">{st.roll_number || '249XA33186'}</td>
                    <td className="py-3 px-4 text-xs text-[#718096] font-medium">{st.class_year || 'CSE - 3rd Year'}</td>
                    <td className="py-3 px-4 text-xs text-[#718096] truncate max-w-[160px]">{st.institute || 'G. Pulla Reddy Engineering College'}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#299D70]/15 text-[#299D70] border border-[#299D70]/30">
                        <CheckCircle2 className="w-3 h-3 text-[#299D70]" />
                        <span>Authorized</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Proctoring Surveillance Audit Modal */}
      {showProctoringModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#202B40]/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-[#E2E8F0] rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#D69B35]/15 text-[#D69B35] flex items-center justify-center border border-[#D69B35]/30">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#202B40]">Proctoring Surveillance Incidents</h3>
                  <p className="text-xs text-[#718096]">
                    Real-time candidate telemetry, window focus loss, and proctoring surveillance events
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowProctoringModal(false)}
                className="p-2 rounded-xl text-[#718096] hover:text-[#202B40] hover:bg-[#EDF2FA] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingIncidents ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-3 border-[#D69B35]/20 border-t-[#D69B35] rounded-full animate-spin"></div>
                <p className="text-xs text-[#718096]">Loading proctoring event telemetry...</p>
              </div>
            ) : proctoringIncidents.length === 0 ? (
              <div className="py-12 px-6 text-center rounded-2xl bg-[#EDF2FA]/40 border border-[#E2E8F0] space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#299D70]/15 text-[#299D70] flex items-center justify-center mx-auto border border-[#299D70]/30">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-[#202B40]">0 Incidents Flagged — All Clear</h4>
                <p className="text-xs text-[#718096] max-w-md mx-auto">
                  Automated AI proctoring active with no suspicious activity detected in candidate sessions. Browser focus loss, tab switching, and camera checks are actively monitored.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {proctoringIncidents.map((inc) => (
                  <div
                    key={inc.id}
                    className="p-4 rounded-2xl bg-[#EDF2FA]/60 border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#202B40]">{inc.student_name}</span>
                        <span className="text-[10px] font-mono text-[#718096]">Roll: {inc.roll_number || '249XA33186'}</span>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            inc.severity === 'high'
                              ? 'bg-[#D95C65]/15 text-[#D95C65] border border-[#D95C65]/30'
                              : 'bg-[#D69B35]/15 text-[#D69B35] border border-[#D69B35]/30'
                          }`}
                        >
                          {inc.severity} Severity
                        </span>
                      </div>
                      <div className="text-xs text-[#202B40] font-medium">
                        Event: <span className="text-[#4169C1] font-semibold">{formatProctoringEventType(inc.event_type)}</span> • {inc.details || 'Surveillance alert'}
                      </div>
                      <div className="text-[10px] text-[#718096] font-mono">
                        {inc.created_at ? new Date(inc.created_at).toLocaleString() : 'Recent'} • Exam: {inc.exam_title}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span
                        className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold ${
                          inc.review_status === 'reviewed'
                            ? 'bg-[#299D70]/15 text-[#299D70] border border-[#299D70]/30'
                            : 'bg-[#D69B35]/15 text-[#D69B35] border border-[#D69B35]/30'
                        }`}
                      >
                        {inc.review_status === 'reviewed' ? 'Reviewed' : 'Flagged'}
                      </span>
                      {inc.review_status !== 'reviewed' && (
                        <button
                          onClick={() => handleReviewIncident(inc.id)}
                          className="px-3 py-1 rounded-lg text-xs font-semibold text-[#202B40] bg-white hover:bg-[#EDF2FA] transition-colors border border-[#E2E8F0]"
                        >
                          Mark Reviewed
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowProctoringModal(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-[#718096] hover:text-[#202B40] bg-[#EDF2FA] hover:bg-[#E2E8F0] transition-colors border border-[#E2E8F0]"
              >
                Close Audit Panel
              </button>
            </div>
          </div>
        </div>
      )}

      
      <Modal
        isOpen={actionModal.isOpen}
        onClose={() => setActionModal({ isOpen: false })}
        type={actionModal.type}
        title={actionModal.title}
        message={actionModal.message}
        confirmText={actionModal.confirmText}
        cancelText={actionModal.cancelText}
        loading={actionModal.loading}
        onConfirm={actionModal.onConfirm}
      />
    </div>
  );
};

export default TeacherDashboard;

