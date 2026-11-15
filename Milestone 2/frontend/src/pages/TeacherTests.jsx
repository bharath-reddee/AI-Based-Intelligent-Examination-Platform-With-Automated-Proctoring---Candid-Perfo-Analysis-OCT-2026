import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient, { formatApiError } from '../api/axios';
import Modal from '../components/Modal';
import {
  FileText,
  Search,
  Plus,
  Clock,
  Award,
  Users,
  Shield,
  Calendar,
  MoreVertical,
  CheckCircle,
  Eye,
  Trash2,
  Lock,
  Unlock,
  AlertCircle,
  BarChart2,
  CheckCircle2,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';

const TeacherTests = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'confirm',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: null,
    loading: false,
  });

  const fetchExams = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const res = await apiClient.get('/exams/teacher/my-exams');
      setExams(res.data || []);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.action-menu-container')) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const handlePublish = async (examId) => {
    setError('');
    try {
      await apiClient.post(`/exams/teacher/${examId}/publish`);
      setSuccess('Examination published successfully! It is now accessible to assigned candidates.');
      fetchExams(true);
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  const handleClose = (examId) => {
    setActionModal({
      isOpen: true,
      title: 'Close Examination?',
      message: 'Are you sure you want to close this examination? Candidates will no longer be able to start new attempts, but existing submissions will remain accessible.',
      type: 'warning',
      confirmText: 'Yes, Close Exam',
      cancelText: 'Keep Open',
      onConfirm: async () => {
        setActionModal((prev) => ({ ...prev, loading: true }));
        try {
          await apiClient.post(`/exams/teacher/${examId}/close`);
          setSuccess('Examination closed. Submissions are preserved.');
          fetchExams(true);
          setActionModal({ isOpen: false });
        } catch (err) {
          setError(formatApiError(err));
          setActionModal({ isOpen: false });
        }
      },
    });
  };

  const handleReopen = async (examId) => {
    setError('');
    try {
      await apiClient.post(`/exams/teacher/${examId}/reopen`);
      setSuccess('Examination reopened successfully for assigned candidates.');
      fetchExams(true);
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  const handleDelete = (examId, title) => {
    setActionModal({
      isOpen: true,
      title: 'Delete Examination?',
      message: `Are you sure you want to delete "${title}"? All associated questions and candidate attempts will be removed permanently. This operation cannot be undone.`,
      type: 'danger',
      confirmText: 'Yes, Delete Permanently',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setActionModal((prev) => ({ ...prev, loading: true }));
        try {
          await apiClient.delete(`/exams/teacher/${examId}`);
          setSuccess('Examination deleted successfully.');
          setExams((prev) => prev.filter((e) => e.id !== examId));
          setActionModal({ isOpen: false });
        } catch (err) {
          setError(formatApiError(err));
          setActionModal({ isOpen: false });
        }
      },
    });
  };

  const filteredExams = exams.filter((exam) => {
    const st = (exam.status || (exam.is_published ? 'published' : 'draft')).toLowerCase();

    if (statusFilter === 'drafts' && st !== 'draft') return false;
    if (statusFilter === 'published' && st !== 'published') return false;
    if (statusFilter === 'closed' && st !== 'closed') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = exam.title && exam.title.toLowerCase().includes(q);
      const matchSubject = exam.subject && exam.subject.toLowerCase().includes(q);
      const matchTopic = exam.topic && exam.topic.toLowerCase().includes(q);
      const matchDesc = exam.description && exam.description.toLowerCase().includes(q);
      return matchTitle || matchSubject || matchTopic || matchDesc;
    }

    return true;
  });

  const draftCount = exams.filter((e) => (e.status || (e.is_published ? 'published' : 'draft')).toLowerCase() === 'draft').length;
  const publishedCount = exams.filter((e) => (e.status || (e.is_published ? 'published' : 'draft')).toLowerCase() === 'published').length;
  const closedCount = exams.filter((e) => (e.status || '').toLowerCase() === 'closed').length;

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 space-y-8">
      
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#4169C1]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#233B67] to-[#4169C1] flex items-center justify-center text-white text-2xl font-bold shadow-sm shadow-[#233B67]/20">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EDF2FA] text-[#4169C1] text-xs font-semibold uppercase tracking-wider mb-1 border border-[#4169C1]/30">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Examination Repository</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#202B40] tracking-tight">
                Faculty Tests & Assessments
              </h1>
              <p className="text-xs sm:text-sm text-[#718096] mt-0.5">
                Manage your draft examinations, publish papers for assigned candidates, and review automated grading telemetry.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchExams(true)}
              disabled={refreshing}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#718096] bg-[#EDF2FA] hover:text-[#202B40] hover:bg-[#E2E8F0] border border-[#E2E8F0] shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#4169C1] ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh List'}</span>
            </button>
            <button
              onClick={() => navigate('/teacher/exams/create')}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#233B67] hover:bg-[#1C2F52] shadow-sm shadow-[#233B67]/20 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Test</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#D95C65]/10 border border-[#D95C65]/30 text-[#D95C65] text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchExams(true)}
            className="text-xs font-bold text-[#D95C65] underline hover:text-[#202B40]"
          >
            Retry
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-[#299D70]/10 border border-[#299D70]/30 text-[#299D70] text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
          <button
            onClick={() => setSuccess('')}
            className="text-xs font-bold text-[#299D70] hover:text-[#202B40]"
          >
            Dismiss
          </button>
        </div>
      )}

      
      <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-[#233B67] text-white shadow-sm shadow-[#233B67]/20'
                : 'text-[#718096] hover:text-[#202B40] bg-[#F5F7FC] hover:bg-[#EDF2FA] border border-[#E2E8F0]'
            }`}
          >
            All Tests ({exams.length})
          </button>
          <button
            onClick={() => setStatusFilter('drafts')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              statusFilter === 'drafts'
                ? 'bg-[#D69B35] text-white shadow-sm shadow-[#D69B35]/20'
                : 'text-[#718096] hover:text-[#202B40] bg-[#F5F7FC] hover:bg-[#EDF2FA] border border-[#E2E8F0]'
            }`}
          >
            Drafts ({draftCount})
          </button>
          <button
            onClick={() => setStatusFilter('published')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              statusFilter === 'published'
                ? 'bg-[#299D70] text-white shadow-sm shadow-[#299D70]/20'
                : 'text-[#718096] hover:text-[#202B40] bg-[#F5F7FC] hover:bg-[#EDF2FA] border border-[#E2E8F0]'
            }`}
          >
            Published ({publishedCount})
          </button>
          <button
            onClick={() => setStatusFilter('closed')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              statusFilter === 'closed'
                ? 'bg-[#718096] text-white shadow-sm'
                : 'text-[#718096] hover:text-[#202B40] bg-[#F5F7FC] hover:bg-[#EDF2FA] border border-[#E2E8F0]'
            }`}
          >
            Closed ({closedCount})
          </button>
        </div>

        
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search exams by title, subject, topic..."
            className="w-full bg-[#F5F7FC] border border-[#E2E8F0] rounded-xl pl-9 pr-3.5 py-2 text-xs text-[#202B40] placeholder-[#718096]/60 focus:outline-none focus:border-[#4169C1] focus:bg-white"
          />
        </div>
      </div>

      
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#E2E8F0] border-t-[#233B67] rounded-full animate-spin"></div>
          <p className="text-xs text-[#718096]">Loading examinations...</p>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#EDF2FA] text-[#4169C1] flex items-center justify-center mx-auto mb-2">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#202B40]">
            {searchQuery || statusFilter !== 'all' ? 'No examinations matching filter' : 'No examinations created yet'}
          </h3>
          <p className="text-xs text-[#718096] max-w-md mx-auto">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search query or switching to another filter tab.'
              : 'Click "Create New Test" to build your first examination paper.'}
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate('/teacher/exams/create')}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#233B67] hover:bg-[#1C2F52] shadow-sm shadow-[#233B67]/20 transition-all inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Test</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map((exam) => {
            const rawStatus = (exam.status || (exam.is_published ? 'published' : 'draft')).toLowerCase();
            const isDraft = rawStatus === 'draft';
            const isPublished = rawStatus === 'published';
            const isClosed = rawStatus === 'closed';

            return (
              <div
                key={exam.id}
                className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm hover:border-[#4169C1]/40 hover:shadow-md transition-all flex flex-col justify-between space-y-5 relative group"
              >
                <div>
                  
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-semibold text-[#4169C1] uppercase tracking-wider bg-[#EDF2FA] border border-[#4169C1]/30 px-2.5 py-0.5 rounded-full truncate max-w-[170px]">
                      {exam.subject}
                    </span>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          isPublished
                            ? 'bg-[#299D70]/10 text-[#299D70] border-[#299D70]/30'
                            : isDraft
                            ? 'bg-[#D69B35]/10 text-[#D69B35] border-[#D69B35]/30'
                            : 'bg-[#EDF2FA] text-[#718096] border-[#E2E8F0]'
                        }`}
                      >
                        {isPublished ? 'Published' : isDraft ? 'Draft' : 'Closed'}
                      </span>

                      
                      <div className="relative action-menu-container">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === exam.id ? null : exam.id);
                          }}
                          className="p-1 rounded-lg hover:bg-[#EDF2FA] text-[#718096] hover:text-[#202B40] transition-colors"
                          title="Examination Actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeMenuId === exam.id && (
                          <div className="absolute right-0 top-7 w-44 bg-white border border-[#E2E8F0] rounded-xl shadow-xl py-1.5 z-30 space-y-0.5">
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                navigate(`/teacher/exams/${exam.id}/edit`);
                              }}
                              className="w-full text-left px-3.5 py-1.5 text-xs text-[#202B40] hover:bg-[#EDF2FA] flex items-center gap-2 font-medium"
                            >
                              <FileText className="w-3.5 h-3.5 text-[#4169C1]" />
                              <span>Edit Examination</span>
                            </button>

                            {isDraft && (
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  handlePublish(exam.id);
                                }}
                                className="w-full text-left px-3.5 py-1.5 text-xs text-[#299D70] hover:bg-[#299D70]/10 flex items-center gap-2 font-medium"
                              >
                                <Unlock className="w-3.5 h-3.5 text-[#299D70]" />
                                <span>Publish Exam</span>
                              </button>
                            )}

                            {isPublished && (
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  handleClose(exam.id);
                                }}
                                className="w-full text-left px-3.5 py-1.5 text-xs text-[#D69B35] hover:bg-[#D69B35]/10 flex items-center gap-2 font-medium"
                              >
                                <Lock className="w-3.5 h-3.5 text-[#4169C1]" />
                                <span>Close Test</span>
                              </button>
                            )}

                            {isClosed && (
                              <button
                                onClick={() => {
                                  setActiveMenuId(null);
                                  handleReopen(exam.id);
                                }}
                                className="w-full text-left px-3.5 py-1.5 text-xs text-[#4169C1] hover:bg-[#EDF2FA] flex items-center gap-2 font-medium"
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-[#4169C1]" />
                                <span>Reopen Test</span>
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                navigate(`/teacher/exams/${exam.id}/results`);
                              }}
                              className="w-full text-left px-3.5 py-1.5 text-xs text-[#202B40] hover:bg-[#EDF2FA] flex items-center gap-2 font-medium"
                            >
                              <BarChart2 className="w-3.5 h-3.5 text-[#4169C1]" />
                              <span>View Results</span>
                            </button>

                            <div className="border-t border-[#E2E8F0] my-1"></div>

                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                handleDelete(exam.id, exam.title);
                              }}
                              className="w-full text-left px-3.5 py-1.5 text-xs text-[#D95C65] hover:bg-[#D95C65]/10 flex items-center gap-2 font-medium"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                              <span>Delete Examination</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  
                  <h3
                    onClick={() => navigate(`/teacher/exams/${exam.id}/edit`)}
                    className="text-base font-bold text-[#202B40] mt-3 hover:text-[#4169C1] cursor-pointer transition-colors leading-snug"
                  >
                    {exam.title}
                  </h3>
                  {exam.topic && (
                    <p className="text-xs text-[#4169C1] font-medium mt-0.5">
                      Topic: {exam.topic}
                    </p>
                  )}
                  {exam.description && (
                    <p className="text-xs text-[#718096] mt-1 line-clamp-2">
                      {exam.description}
                    </p>
                  )}

                  
                  <div className="flex flex-wrap items-center gap-2 mt-4 text-[11px] text-[#718096] font-medium">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F5F7FC] border border-[#E2E8F0]">
                      <Clock className="w-3 h-3 text-[#4169C1]" />
                      <span>{exam.duration_minutes} Mins</span>
                    </span>

                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F5F7FC] border border-[#E2E8F0]">
                      <Award className="w-3 h-3 text-[#4169C1]" />
                      <span>{exam.total_marks} Marks</span>
                    </span>

                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F5F7FC] border border-[#E2E8F0]">
                      <FileText className="w-3 h-3 text-[#299D70]" />
                      <span>{exam.number_of_questions} Qs</span>
                    </span>

                    {exam.ai_proctoring_enabled && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#EDF2FA] text-[#4169C1] border border-[#4169C1]/30">
                        <Shield className="w-3 h-3 text-[#4169C1]" />
                        <span>AI Proctoring</span>
                      </span>
                    )}
                  </div>

                  
                  <div className="mt-4 pt-4 border-t border-[#E2E8F0]/80 space-y-2">
                    <div className="flex items-center justify-between text-xs text-[#718096]">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#4169C1]" />
                        <span>Assigned Candidates:</span>
                      </span>
                      <strong className="text-[#202B40] font-semibold">{exam.assigned_students_count || 0}</strong>
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#718096]">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-[#299D70]" />
                        <span>Submissions Received:</span>
                      </span>
                      <strong className="text-[#202B40] font-semibold">
                        {exam.submissions_count || 0}
                        {exam.assigned_students_count > 0 && (
                          <span className="text-[#718096] text-[11px] ml-1 font-normal">
                            ({exam.submission_rate_percent || 0}%)
                          </span>
                        )}
                      </strong>
                    </div>

                    {exam.end_time && (
                      <div className="flex items-center justify-between text-[11px] text-[#718096] pt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Closes:
                        </span>
                        <span className="text-[#718096] font-mono">
                          {new Date(exam.end_time).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                
                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/teacher/exams/${exam.id}/edit`)}
                    className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold text-white bg-[#233B67] hover:bg-[#1C2F52] transition-all text-center shadow-sm shadow-[#233B67]/20 flex items-center justify-center gap-1"
                  >
                    <span>{isDraft ? 'Continue Draft' : 'Manage Exam'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => navigate(`/teacher/exams/${exam.id}/results`)}
                    className="py-2 px-3 rounded-xl text-xs font-semibold text-[#4169C1] bg-[#EDF2FA] hover:bg-[#4169C1]/10 border border-[#4169C1]/30 transition-all text-center flex items-center gap-1"
                    title="View candidate submissions and results"
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                    <span>Results</span>
                  </button>
                </div>
              </div>
            );
          })}
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

export default TeacherTests;

