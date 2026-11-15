import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient, { formatApiError } from '../api/axios';
import Modal from '../components/Modal';
import {
  Building,
  Hash,
  Calendar,
  Mail,
  ShieldCheck,
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  ClipboardList,
  Sparkles,
} from 'lucide-react';

const StudentDashboard = () => {
  const { user, consumePreloadedData } = useAuth();
  const navigate = useNavigate();

  const preloaded = typeof consumePreloadedData === 'function' ? consumePreloadedData('student') : null;

  const [data, setData] = useState(() => preloaded?.summary || null);
  const [availableExams, setAvailableExams] = useState(() => preloaded?.availableExams || []);
  const [mockHistory, setMockHistory] = useState(() => preloaded?.mockHistory || []);
  const [loading, setLoading] = useState(() => !preloaded);
  const [error, setError] = useState('');
  const [selectedScoreExam, setSelectedScoreExam] = useState(null);

  useEffect(() => {
    if (preloaded) return;

    Promise.all([
      apiClient.get('/students/dashboard-summary'),
      apiClient.get('/exams/student/available'),
      apiClient.get('/mocks/history'),
    ])
      .then(([summaryRes, examsRes, mockRes]) => {
        setData(summaryRes.data);
        setAvailableExams(examsRes.data || []);
        setMockHistory(mockRes.data || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(formatApiError(err));
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-10 px-4 space-y-8 animate-pulse">
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] h-36 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-[#4169C1]/10"></div>
            <div className="space-y-2">
              <div className="w-32 h-4 rounded-full bg-[#4169C1]/10"></div>
              <div className="w-48 h-6 rounded-lg bg-[#4169C1]/10"></div>
            </div>
          </div>
          <div className="w-36 h-10 rounded-2xl bg-[#4169C1]/10 hidden sm:block"></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-panel p-5 rounded-2xl border border-[#E2E8F0] h-28 space-y-3">
              <div className="w-24 h-3 rounded-full bg-[#4169C1]/10"></div>
              <div className="w-16 h-7 rounded-lg bg-[#4169C1]/10"></div>
            </div>
          ))}
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-[#E2E8F0] h-80 space-y-4">
          <div className="w-48 h-6 rounded-lg bg-[#4169C1]/10"></div>
          <div className="w-full h-48 rounded-2xl bg-[#EDF2FA]"></div>
        </div>
      </div>
    );
  }

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

  const profile = data?.student || user;
  const metrics = data?.metrics || {
    upcoming_exams: availableExams.filter(e => !isSubmittedExam(e)).length,
    completed_exams: availableExams.filter(e => isSubmittedExam(e)).length,
    average_score: 0.0,
    proctoring_trust_score: '100%',
  };

  return (
    <div className="max-w-7xl mx-auto py-8 sm:py-10 px-4 space-y-8 text-left">
      
      {/* Candidate Profile Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] shadow-sm relative overflow-hidden bg-white">
        <div className="absolute top-0 right-0 w-96 h-96 ambient-glow-blue rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#233B67] to-[#4169C1] flex items-center justify-center text-white text-2xl font-bold shadow-md shadow-[#4169C1]/20">
              {profile?.first_name ? profile.first_name[0] : 'C'}
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#4169C1]/10 text-[#4169C1] text-xs font-semibold uppercase tracking-wider mb-1">
                <span>Verified Examinee</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#202B40] tracking-tight font-heading">
                Greetings, {profile?.first_name} {profile?.last_name}!
              </h1>
              <p className="text-xs sm:text-sm text-[#718096] mt-0.5">
                Monitor your examination schedules, initiate diagnostic practice tests, and verify proctoring integrity.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#EDF2FA] p-3.5 rounded-2xl border border-[#E2E8F0]">
            <div>
              <div className="text-[11px] text-[#718096] flex items-center gap-1 font-medium">
                <Building className="w-3 h-3 text-[#4169C1]" /> College
              </div>
              <div className="text-xs font-semibold text-[#202B40] truncate max-w-[120px]" title={profile?.institute}>
                {profile?.institute || 'GPREC'}
              </div>
            </div>

            <div>
              <div className="text-[11px] text-[#718096] flex items-center gap-1 font-medium">
                <Hash className="w-3 h-3 text-[#4169C1]" /> Roll Number
              </div>
              <div className="text-xs font-semibold text-[#202B40]">
                {profile?.roll_number || '249XA33186'}
              </div>
            </div>

            <div>
              <div className="text-[11px] text-[#718096] flex items-center gap-1 font-medium">
                <Calendar className="w-3 h-3 text-[#4169C1]" /> Department
              </div>
              <div className="text-xs font-semibold text-[#202B40]">
                {profile?.class_year || 'CSE'}
              </div>
            </div>

            <div>
              <div className="text-[11px] text-[#718096] flex items-center gap-1 font-medium">
                <Mail className="w-3 h-3 text-[#4169C1]" /> Email
              </div>
              <div className="text-xs font-semibold text-[#202B40] truncate max-w-[130px]" title={profile?.email}>
                {profile?.email || 'gova@gprec.ac.in'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#718096]">Integrity Trust Index</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#299D70] border border-emerald-200 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#202B40] mt-3 font-heading">{metrics.proctoring_trust_score}</div>
          <div className="text-[11px] text-[#299D70] mt-1 font-medium">✓ Zero infractions detected</div>
        </div>

        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#718096]">Cumulative Average</span>
            <div className="w-8 h-8 rounded-lg bg-[#4169C1]/10 text-[#4169C1] border border-[#4169C1]/20 flex items-center justify-center">
              <Award className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#202B40] mt-3 font-heading">{metrics.average_score}%</div>
          <div className="text-[11px] text-[#4169C1] mt-1 font-medium">Auto-scored by rubric engine</div>
        </div>

        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#718096]">Assigned Assessments</span>
            <div className="w-8 h-8 rounded-lg bg-[#D69B35]/10 text-[#D69B35] border border-[#D69B35]/30 flex items-center justify-center">
              <Clock className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#202B40] mt-3 font-heading">{availableExams.length} Exams</div>
          <div className="text-[11px] text-[#718096] mt-1">Available for attempt</div>
        </div>

        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#718096]">Completed Records</span>
            <div className="w-8 h-8 rounded-lg bg-[#35A6A0]/10 text-[#35A6A0] border border-[#35A6A0]/20 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 stroke-[2]" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#202B40] mt-3 font-heading">
            {availableExams.filter(e => isSubmittedExam(e)).length} Submissions
          </div>
          <div className="text-[11px] text-[#718096] mt-1">Stored in academic registry</div>
        </div>
      </div>

      {/* Available Examinations Section */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#202B40] font-heading">Scheduled Institutional Assessments</h2>
            <p className="text-xs text-[#718096]">Active examination papers assigned by your faculty under biometric proctoring</p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate('/student/tests')}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#202B40] bg-[#EDF2FA] hover:bg-[#E2E8F0] border border-[#E2E8F0] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ClipboardList className="w-3.5 h-3.5 text-[#4169C1]" />
              <span>Assessment Records</span>
            </button>
            <button
              onClick={() => navigate('/student/mock-test')}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#233B67] to-[#4169C1] hover:from-[#1b2f53] hover:to-[#3558a8] shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Diagnostic Simulator</span>
            </button>
          </div>
        </div>

        {availableExams.length === 0 ? (
          <div className="text-center py-12 text-[#718096] text-sm bg-[#EDF2FA]/50 rounded-2xl border border-[#E2E8F0]">
            No assessments currently pending for your cohort. Check back shortly or start a diagnostic practice test.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-xs font-semibold text-[#718096] uppercase tracking-wider bg-[#EDF2FA]/40">
                  <th className="py-3 px-4">Examination Title</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Duration & Weightage</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {availableExams.map((exam) => {
                  const isCompleted = isSubmittedExam(exam);
                  const isInProgress = exam.attempt_status === 'in_progress';
                  return (
                    <tr key={exam.id} className="hover:bg-[#EDF2FA]/40 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-[#202B40]">
                        {exam.title}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#4169C1] font-semibold">
                        {exam.subject}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#718096]">
                        {exam.duration_minutes} mins • <strong className="text-[#202B40] font-semibold">{exam.total_marks} Marks</strong> ({exam.number_of_questions} Qs)
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isCompleted
                            ? 'bg-emerald-50 text-[#299D70] border border-emerald-200'
                            : isInProgress
                            ? 'bg-[#D69B35]/10 text-[#D69B35] border border-[#D69B35]/30'
                            : 'bg-[#4169C1]/10 text-[#4169C1] border border-[#4169C1]/20'
                        }`}>
                          {isCompleted ? 'Completed' : isInProgress ? 'In Progress' : 'Available'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {isCompleted ? (
                          <div className="inline-flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-xs text-[#299D70] font-semibold select-none">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Recorded</span>
                            </span>
                            {exam.score !== null && exam.score !== undefined && (
                              <button
                                onClick={() => setSelectedScoreExam(exam)}
                                className="text-[11px] text-[#4169C1] hover:underline font-semibold"
                              >
                                ({exam.score} / {exam.total_marks})
                              </button>
                            )}
                          </div>
                        ) : isInProgress ? (
                          <button
                            onClick={() => navigate(`/student/exams/${exam.id}/attempt`)}
                            className="text-xs text-[#4169C1] hover:text-[#233B67] font-semibold cursor-pointer"
                          >
                            Resume Session
                          </button>
                        ) : (
                          <button
                            onClick={() => navigate(`/student/exams/${exam.id}/readiness`)}
                            className="px-3 py-1.5 rounded-lg bg-[#4169C1] hover:bg-[#233B67] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                          >
                            Integrity Check & Begin
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Practice Diagnostic History */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#35A6A0]/10 text-[#35A6A0] text-xs font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Autonomous Practice</span>
            </div>
            <h2 className="text-lg font-bold text-[#202B40] font-heading">Diagnostic Learning History</h2>
            <p className="text-xs text-[#718096]">Past AI-synthesized practice attempts and automated feedback breakdowns</p>
          </div>
          <button
            onClick={() => navigate('/student/mock-test')}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#233B67] to-[#4169C1] hover:from-[#1b2f53] hover:to-[#3558a8] shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>New Practice Module</span>
          </button>
        </div>

        {mockHistory.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-2xl bg-[#EDF2FA]/50 border border-[#E2E8F0] space-y-2">
            <p className="text-sm font-semibold text-[#202B40]">
              No practice simulations completed yet.
            </p>
            <p className="text-xs text-[#718096]">
              Select &quot;New Practice Module&quot; to synthesize subject-specific assessment items and test your recall.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-xs font-semibold text-[#718096] uppercase tracking-wider bg-[#EDF2FA]/40">
                  <th className="py-3 px-4">Subject & Assessment</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">Percentage</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Attempt Timestamp</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {mockHistory.map((h) => {
                  const isPending = h.has_pending_subjective || h.status === 'pending_evaluation';
                  return (
                    <tr key={h.attempt_id} className="hover:bg-[#EDF2FA]/40 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-[#202B40]">
                        <div>{h.title || `Diagnostic: ${h.subject}`}</div>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#4169C1]/10 text-[#4169C1] border border-[#4169C1]/20">
                          {h.subject}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-[#202B40]">
                        {isPending ? 'Objective: ' : ''}{h.score} / {h.total_marks} Marks
                      </td>
                      <td className="py-3.5 px-4 text-xs font-bold text-[#4169C1]">
                        {h.percentage}%
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isPending
                            ? 'bg-[#D69B35]/10 text-[#D69B35] border border-[#D69B35]/30'
                            : h.passed
                            ? 'bg-emerald-50 text-[#299D70] border border-emerald-200'
                            : 'bg-[#EDF2FA] text-[#718096] border border-[#E2E8F0]'
                        }`}>
                          {isPending ? 'Evaluation Pending' : h.passed ? 'Satisfied ✓' : 'Completed'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-[#718096]">
                        {h.date}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => navigate('/student/mock-test')}
                          className="px-2.5 py-1 rounded-lg bg-[#4169C1]/10 text-[#4169C1] hover:bg-[#4169C1]/20 transition-colors text-xs font-semibold cursor-pointer"
                        >
                          Review Feedback
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

      {/* Examination Scorecard Modal */}
      <Modal
        isOpen={!!selectedScoreExam}
        onClose={() => setSelectedScoreExam(null)}
        type="success"
        title="Assessment Performance Summary"
        message={selectedScoreExam ? `Performance audit for "${selectedScoreExam.title}"` : ''}
        confirmText="Acknowledge"
        onConfirm={() => setSelectedScoreExam(null)}
      >
        {selectedScoreExam && (
          <div className="bg-[#EDF2FA] p-4 rounded-2xl border border-[#E2E8F0] grid grid-cols-2 gap-3 text-center my-2">
            <div>
              <div className="text-xs text-[#718096]">Earned Marks</div>
              <div className="text-xl font-bold text-[#202B40] mt-0.5">
                {selectedScoreExam.score} / {selectedScoreExam.total_marks}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#718096]">Percentage</div>
              <div className="text-xl font-bold text-[#4169C1] mt-0.5">
                {selectedScoreExam.total_marks > 0
                  ? Math.round((selectedScoreExam.score / selectedScoreExam.total_marks) * 100)
                  : 0}%
              </div>
            </div>
            <div>
              <div className="text-xs text-[#718096]">Evaluation Status</div>
              <div className="text-xs font-bold text-[#299D70] uppercase mt-1">
                {selectedScoreExam.attempt_status}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#718096]">Performance Result</div>
              <div className="text-xs font-bold text-[#4169C1] uppercase mt-1">
                {selectedScoreExam.passing_marks
                  ? selectedScoreExam.score >= selectedScoreExam.passing_marks
                    ? 'PASSED ✓'
                    : 'FAILED ✗'
                  : 'RECORDED'}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StudentDashboard;
