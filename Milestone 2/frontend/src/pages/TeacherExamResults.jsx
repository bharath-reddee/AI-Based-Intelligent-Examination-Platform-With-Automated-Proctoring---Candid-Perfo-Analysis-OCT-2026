import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient, { formatApiError } from '../api/axios';
import Modal from '../components/Modal';
import {
  BarChart2,
  Users,
  Award,
  CheckCircle,
  XCircle,
  AlertTriangle,
  AlertCircle,
  ArrowLeft,
  Clock,
  Shield,
  Eye,
  Edit3,
  Save,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  X,
  FileText
} from 'lucide-react';

const TeacherExamResults = () => {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  
  const [selectedAttemptId, setSelectedAttemptId] = useState(null);
  const [attemptDetail, setAttemptDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [gradeInput, setGradeInput] = useState({});
  const [feedbackModal, setFeedbackModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [feedbackInput, setFeedbackInput] = useState({});
  const [savingGradeId, setSavingGradeId] = useState(null);

  const formatProctoringEventType = (type) => {
    if (!type) return 'Proctoring Flag';
    const mapping = {
      face_not_detected: 'Face Not Detected',
      head_turned_left: 'Head Turned Left',
      head_turned_right: 'Head Turned Right',
    };
    return mapping[type] || type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const fetchResults = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const res = await apiClient.get(`/exams/teacher/${examId}/submissions`);
      setData(res.data);
      setSubmissions(res.data?.submissions || []);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [examId]);

  const handleOpenAttemptDetail = async (attId) => {
    setSelectedAttemptId(attId);
    setLoadingDetail(true);
    try {
      const res = await apiClient.get(`/exams/teacher/${examId}/submissions/${attId}`);
      setAttemptDetail(res.data);

      
      const initialGrades = {};
      const initialFeedback = {};
      res.data?.questions?.forEach((q) => {
        initialGrades[q.question_id] = q.awarded_marks;
        initialFeedback[q.question_id] = q.teacher_feedback || '';
      });
      setGradeInput(initialGrades);
      setFeedbackInput(initialFeedback);
    } catch (err) {
      setFeedbackModal({
        isOpen: true,
        title: 'Inspection Error',
        message: formatApiError(err),
        type: 'danger',
      });
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSaveEvaluation = async (qId) => {
    setSavingGradeId(qId);
    try {
      const res = await apiClient.post(`/exams/teacher/attempts/${selectedAttemptId}/evaluate-answer`, {
        question_id: qId,
        awarded_marks: parseFloat(gradeInput[qId]) || 0.0,
        feedback: (feedbackInput[qId] || '').trim(),
      });

      
      setAttemptDetail((prev) => ({
        ...prev,
        score: res.data.new_score,
      }));

      
      setSubmissions((prev) =>
        prev.map((s) => (s.attempt_id === selectedAttemptId ? { ...s, score: res.data.new_score } : s))
      );

      setFeedbackModal({
        isOpen: true,
        title: 'Evaluation Saved',
        message: 'Score and instructor feedback updated and persisted successfully!',
        type: 'success',
      });
    } catch (err) {
      setFeedbackModal({
        isOpen: true,
        title: 'Save Evaluation Failed',
        message: formatApiError(err),
        type: 'danger',
      });
    } finally {
      setSavingGradeId(null);
    }
  };

  const filteredSubmissions = submissions.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = s.student_name && s.student_name.toLowerCase().includes(q);
    const emailMatch = s.student_email && s.student_email.toLowerCase().includes(q);
    const rollMatch = s.roll_number && s.roll_number.toLowerCase().includes(q);
    return nameMatch || emailMatch || rollMatch;
  });

  const totalSubs = submissions.length;
  const passedSubs = submissions.filter((s) => s.passed === true).length;
  const passRate = totalSubs > 0 ? Math.round((passedSubs / totalSubs) * 100) : 0;
  const scores = submissions.map((s) => s.score).filter((s) => s !== null && s !== undefined);
  const avgScore = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0;

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-12 h-12 border-4 border-[#E2E8F0] border-t-[#233B67] rounded-full animate-spin"></div>
        <p className="text-sm text-[#718096]">Loading examination results & candidate submissions...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 space-y-8">
      
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#4169C1]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center space-x-4">
            <button
              onClick={() => navigate('/teacher/tests')}
              className="p-2.5 rounded-xl bg-[#EDF2FA] border border-[#E2E8F0] text-[#718096] hover:text-[#202B40] hover:bg-[#E2E8F0] transition-colors flex-shrink-0"
              title="Back to Tests"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EDF2FA] text-[#4169C1] text-xs font-semibold uppercase tracking-wider mb-1 border border-[#4169C1]/30">
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Candidate Performance Analysis</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#202B40] tracking-tight">
                {data?.title || 'Examination Results'}
              </h1>
              <p className="text-xs sm:text-sm text-[#718096] mt-0.5">
                {data?.subject} • Total Marks: {data?.total_marks} • Passing Threshold: {data?.passing_marks}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchResults(true)}
              disabled={refreshing}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#718096] bg-[#EDF2FA] hover:text-[#202B40] hover:bg-[#E2E8F0] border border-[#E2E8F0] shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#4169C1] ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh Results'}</span>
            </button>
            <button
              onClick={() => navigate(`/teacher/exams/${examId}/edit`)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#233B67] hover:bg-[#1C2F52] shadow-sm shadow-[#233B67]/20 transition-all flex items-center gap-2"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Edit Exam Paper</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#D95C65]/10 border border-[#D95C65]/30 text-[#D95C65] text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#718096]">Total Submissions</span>
            <div className="w-8 h-8 rounded-lg bg-[#EDF2FA] text-[#4169C1] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#202B40] mt-3">{totalSubs} Completed</div>
          <div className="text-[11px] text-[#718096] mt-1">From assigned candidate roster</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#718096]">Average Candidate Score</span>
            <div className="w-8 h-8 rounded-lg bg-[#EDF2FA] text-[#4169C1] flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#202B40] mt-3">{avgScore} / {data?.total_marks}</div>
          <div className="text-[11px] text-[#718096] mt-1">Mean evaluated performance</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#718096]">Examination Pass Rate</span>
            <div className="w-8 h-8 rounded-lg bg-[#299D70]/10 text-[#299D70] flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#202B40] mt-3">{passRate}%</div>
          <div className="text-[11px] text-[#299D70] mt-1">{passedSubs} candidate(s) passed</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#718096]">Proctoring Telemetry</span>
            <div className="w-8 h-8 rounded-lg bg-[#D69B35]/10 text-[#D69B35] flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#202B40] mt-3">
            {submissions.reduce((acc, curr) => acc + (curr.proctoring_alerts_count || 0), 0)} Flags
          </div>
          <div className="text-[11px] text-[#718096] mt-1">Tab switches & face absences</div>
        </div>
      </div>

      
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#202B40]">Candidate Assessment Submissions</h2>
            <p className="text-xs text-[#718096]">Inspect candidate response keys, proctoring violations, and override grades</p>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[#718096] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate name, email, roll no..."
              className="w-full bg-[#F5F7FC] border border-[#E2E8F0] rounded-xl pl-9 pr-3.5 py-2 text-xs text-[#202B40] placeholder-[#718096]/60 focus:outline-none focus:border-[#4169C1] focus:bg-white"
            />
          </div>
        </div>

        {filteredSubmissions.length === 0 ? (
          <div className="text-center py-16 text-[#718096] text-xs rounded-2xl bg-[#F5F7FC] border border-[#E2E8F0] space-y-2">
            <Users className="w-8 h-8 text-[#718096]/50 mx-auto" />
            <p>{searchQuery ? 'No submissions match your search query.' : 'No candidate submissions received yet.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-[11px] font-bold text-[#718096] uppercase tracking-wider bg-[#F5F7FC]">
                  <th className="py-3 px-4">Candidate</th>
                  <th className="py-3 px-4">Roll Number</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">Result</th>
                  <th className="py-3 px-4">Tab Switches</th>
                  <th className="py-3 px-4">Proctoring Flags</th>
                  <th className="py-3 px-4">Submitted At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]/60">
                {filteredSubmissions.map((sub) => (
                  <tr key={sub.attempt_id} className="hover:bg-[#F5F7FC] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#202B40] text-xs">{sub.student_name}</div>
                      <div className="text-[11px] text-[#718096]">{sub.student_email}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#4169C1] font-semibold">{sub.roll_number}</td>
                    <td className="py-3.5 px-4 font-semibold text-[#202B40]">
                      {sub.score !== null ? `${sub.score} / ${sub.total_marks}` : 'Evaluating...'}
                      {sub.percentage !== undefined && sub.score !== null && (
                        <span className="text-[10px] text-[#718096] block font-normal">({sub.percentage}%)</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {sub.passed === true && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#299D70]/10 text-[#299D70] border border-[#299D70]/30">
                          <CheckCircle className="w-3 h-3 text-[#299D70]" />
                          <span>Passed</span>
                        </span>
                      )}
                      {sub.passed === false && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#D95C65]/10 text-[#D95C65] border border-[#D95C65]/30">
                          <XCircle className="w-3 h-3 text-[#D95C65]" />
                          <span>Failed</span>
                        </span>
                      )}
                      {sub.passed === null && (
                        <span className="text-[#718096] text-[11px]">Pending</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <span className={sub.tab_switch_count >= 3 ? 'text-[#D95C65] font-bold' : 'text-[#718096]'}>
                        {sub.tab_switch_count}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {sub.proctoring_alerts_count > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D69B35]/10 text-[#D69B35] border border-[#D69B35]/30">
                          <AlertTriangle className="w-3 h-3 text-[#D69B35]" />
                          <span>{sub.proctoring_alerts_count} Flagged</span>
                        </span>
                      ) : (
                        <span className="text-[#299D70] text-[11px] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Clean
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-[#718096]">
                      {sub.submit_time ? new Date(sub.submit_time).toLocaleString() : 'In Progress'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenAttemptDetail(sub.attempt_id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#4169C1] bg-[#EDF2FA] hover:bg-[#4169C1]/10 border border-[#4169C1]/30 transition-all inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      
      {selectedAttemptId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#202B40]/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] w-full max-w-4xl space-y-6 my-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <div>
                <h3 className="text-lg font-bold text-[#202B40] flex items-center gap-2">
                  <Award className="w-5 h-5 text-[#4169C1]" />
                  <span>Attempt Inspection & Assessment Review</span>
                </h3>
                <p className="text-xs text-[#718096] mt-0.5">
                  Candidate: {attemptDetail?.student?.name} ({attemptDetail?.student?.email}) • Roll: {attemptDetail?.student?.roll_number}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedAttemptId(null);
                  setAttemptDetail(null);
                }}
                className="text-[#718096] hover:text-[#202B40] hover:bg-[#EDF2FA] p-1.5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-2">
                <div className="w-8 h-8 border-3 border-[#E2E8F0] border-t-[#233B67] rounded-full animate-spin"></div>
                <p className="text-xs text-[#718096]">Loading candidate attempt answers and telemetry...</p>
              </div>
            ) : (
              <div className="space-y-6 text-xs max-h-[550px] overflow-y-auto pr-2">
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-[#F5F7FC] border border-[#E2E8F0]">
                  <div>
                    <span className="text-[10px] text-[#718096] uppercase">Awarded Score</span>
                    <div className="text-lg font-bold text-[#202B40] mt-0.5">
                      {attemptDetail?.score} / {attemptDetail?.total_marks}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#718096] uppercase">Status</span>
                    <div className="text-xs font-bold text-[#299D70] capitalize mt-1">
                      {attemptDetail?.status}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#718096] uppercase">Tab Switches</span>
                    <div className="text-xs font-mono font-bold text-[#4169C1] mt-1">
                      {attemptDetail?.tab_switch_count || 0} Switches
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#718096] uppercase">Submitted</span>
                    <div className="text-[11px] text-[#718096] mt-1">
                      {attemptDetail?.submit_time ? new Date(attemptDetail.submit_time).toLocaleTimeString() : 'N/A'}
                    </div>
                  </div>
                </div>

                
                {attemptDetail?.proctoring_events && attemptDetail.proctoring_events.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-[#4169C1] uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-[#4169C1]" />
                      <span>Proctoring Telemetry Audit ({attemptDetail.proctoring_events.length} Incidents)</span>
                    </h4>
                    <div className="space-y-1.5">
                      {attemptDetail.proctoring_events.map((inc) => (
                        <div
                          key={inc.id}
                          className="p-2.5 rounded-xl bg-[#D69B35]/10 border border-[#D69B35]/30 text-xs flex items-center justify-between text-[#202B40]"
                        >
                          <div>
                            <strong className="text-[#202B40] font-semibold">{formatProctoringEventType(inc.event_type)}</strong>: {inc.details}
                          </div>
                          <span className="text-[10px] text-[#718096] font-mono flex-shrink-0 ml-2">
                            {new Date(inc.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-[#06B6D4] uppercase tracking-wider">
                    Candidate Responses & Question-Level Grading
                  </h4>

                  {attemptDetail?.questions?.map((q, idx) => (
                    <div
                      key={q.question_id}
                      className="p-5 rounded-2xl bg-[#F5F7FC] border border-[#E2E8F0] space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#202B40]">
                          Question {idx + 1} ({q.question_type.replace('_', ' ')} • Max {q.max_marks} Marks)
                        </span>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#718096]">Awarded:</span>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max={q.max_marks}
                            value={gradeInput[q.question_id] !== undefined ? gradeInput[q.question_id] : q.awarded_marks}
                            onChange={(e) => setGradeInput({ ...gradeInput, [q.question_id]: e.target.value })}
                            className="w-16 bg-white border border-[#E2E8F0] rounded-lg px-2 py-1 text-xs text-[#202B40] font-bold text-center focus:border-[#4169C1]"
                          />
                          <button
                            onClick={() => handleSaveEvaluation(q.question_id)}
                            disabled={savingGradeId === q.question_id}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-[#233B67] hover:bg-[#1C2F52] shadow-sm shadow-[#233B67]/20 transition-all flex items-center gap-1"
                          >
                            <Save className="w-3 h-3" />
                            <span>Save</span>
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-[#202B40] font-medium leading-relaxed">
                        {q.question_text}
                      </p>

                      
                      <div className="p-3 rounded-xl bg-white border border-[#E2E8F0] text-xs space-y-1">
                        <span className="text-[10px] text-[#718096] uppercase font-semibold">Candidate's Response:</span>
                        <p className="text-[#202B40] font-mono">
                          {q.student_answer || <span className="text-[#718096] italic">No answer submitted</span>}
                        </p>
                      </div>

                      {/* Model Answer Key */}
                      <div className="p-3 rounded-xl bg-[#299D70]/10 border border-[#299D70]/30 text-xs space-y-1">
                        <span className="text-[10px] text-[#299D70] uppercase font-semibold">Accepted Key / Model Answer:</span>
                        <p className="text-[#299D70] font-mono font-semibold">
                          {q.correct_answer || 'N/A'}
                        </p>
                      </div>

                      {/* Feedback Input */}
                      <div className="space-y-1">
                        <label className="text-[10px] text-[#718096] uppercase font-semibold">Evaluator Notes & Feedback:</label>
                        <input
                          type="text"
                          value={feedbackInput[q.question_id] || ''}
                          onChange={(e) => setFeedbackInput({ ...feedbackInput, [q.question_id]: e.target.value })}
                          placeholder="Optional constructive instructor feedback..."
                          className="w-full bg-white border border-[#E2E8F0] rounded-xl px-3 py-1.5 text-xs text-[#202B40] placeholder-[#718096]/60 focus:outline-none focus:border-[#4169C1]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Centered Feedback Modal */}
      <Modal
        isOpen={feedbackModal.isOpen}
        onClose={() => setFeedbackModal({ isOpen: false, title: '', message: '', type: 'info' })}
        type={feedbackModal.type}
        title={feedbackModal.title}
        message={feedbackModal.message}
        confirmText="Done"
        onConfirm={() => setFeedbackModal({ isOpen: false, title: '', message: '', type: 'info' })}
      />
    </div>
  );
};

export default TeacherExamResults;

