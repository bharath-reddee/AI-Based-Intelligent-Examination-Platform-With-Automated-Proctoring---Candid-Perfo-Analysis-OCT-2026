import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient, { formatApiError } from '../api/axios';
import {
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  HelpCircle,
  Mail,
  Save,
  Sparkles,
  TrendingDown,
  TrendingUp,
  User,
  XCircle,
  AlertCircle,
  BarChart2,
  Building,
  Hash,
  Check,
  AlertTriangle
} from 'lucide-react';

const TeacherMockTestResult = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  
  const [evalForms, setEvalForms] = useState({});

  
  const [questionFilter, setQuestionFilter] = useState('all');

  const fetchAttemptDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get(`/teachers/mock-tests/${attemptId}`);
      setData(res.data);

      
      const initialForms = {};
      (res.data.questions || []).forEach((q) => {
        if (q.question_type !== 'mcq') {
          initialForms[q.question_id] = {
            awarded_marks: q.awarded_marks !== undefined && q.awarded_marks !== null ? q.awarded_marks : '',
            feedback: q.teacher_feedback || '',
            saving: false,
            successMsg: '',
            errorMsg: '',
          };
        }
      });
      setEvalForms(initialForms);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttemptDetail();
  }, [attemptId]);

  const handleEvaluationSubmit = async (questionId, maxMarks) => {
    const form = evalForms[questionId] || {};
    const marksNum = parseFloat(form.awarded_marks);

    if (isNaN(marksNum)) {
      setEvalForms((prev) => ({
        ...prev,
        [questionId]: { ...prev[questionId], errorMsg: 'Please enter a valid numeric mark.' },
      }));
      return;
    }

    if (marksNum < 0 || marksNum > maxMarks) {
      setEvalForms((prev) => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          errorMsg: `Marks must be between 0 and maximum ${maxMarks} marks.`,
        },
      }));
      return;
    }

    setEvalForms((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], saving: true, errorMsg: '', successMsg: '' },
    }));

    try {
      const res = await apiClient.post(`/teachers/mock-tests/${attemptId}/evaluate-answer`, {
        question_id: questionId,
        awarded_marks: marksNum,
        feedback: form.feedback || '',
      });

      
      setData(res.data);
      setEvalForms((prev) => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          saving: false,
          successMsg: 'Evaluation saved successfully! Attempt score updated.',
          errorMsg: '',
        },
      }));

      
      setTimeout(() => {
        setEvalForms((prev) => ({
          ...prev,
          [questionId]: { ...prev[questionId], successMsg: '' },
        }));
      }, 4000);
    } catch (err) {
      setEvalForms((prev) => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          saving: false,
          errorMsg: formatApiError(err),
        },
      }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-[#E2E8F0] border-t-[#233B67] rounded-full animate-spin"></div>
        <p className="text-sm text-[#718096] font-medium">Loading comprehensive candidate assessment results...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4">
        <button
          onClick={() => navigate('/teacher/dashboard')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#4169C1] hover:text-[#06B6D4] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Faculty Dashboard</span>
        </button>
        <div className="p-8 rounded-3xl bg-red-500/10 border border-red-500/20 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-[#D95C65] mx-auto" />
          <h2 className="text-xl font-bold text-white">Assessment Result Error</h2>
          <p className="text-sm text-[#718096] max-w-md mx-auto">{error || 'Attempt result could not be retrieved.'}</p>
          <button
            onClick={() => fetchAttemptDetail()}
            className="px-5 py-2.5 rounded-xl bg-[#E2E8F0] hover:bg-[#CBD5E1] text-xs font-semibold text-white transition-all shadow-md"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  const {
    student_name,
    student_email,
    roll_number,
    institute,
    class_year,
    exam_title,
    subject,
    duration_minutes,
    duration_used_seconds,
    score,
    total_marks,
    percentage,
    passed,
    evaluation_status,
    submit_time,
    total_questions,
    questions_answered,
    questions_unanswered,
    correct_count,
    incorrect_count,
    pending_subjective_count,
    questions = [],
    history = [],
    analytics = {},
  } = data;

  const isPendingSubj = evaluation_status === 'pending_evaluation' || pending_subjective_count > 0;

  
  const filteredQuestions = questions.filter((q) => {
    if (questionFilter === 'mcq') return q.question_type === 'mcq';
    if (questionFilter === 'subjective') return q.question_type !== 'mcq';
    if (questionFilter === 'pending') return q.evaluation_status === 'pending_evaluation';
    return true;
  });

  
  const formatTimeUsed = (sec) => {
    if (!sec && sec !== 0) return 'N/A';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 space-y-8">
      
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/teacher/dashboard')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-[#718096] bg-[#E2E8F0]/80 hover:bg-[#CBD5E1]/80 border border-[#CBD5E1]/60 shadow-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4 text-[#4169C1]" />
          <span>Back to Faculty Dashboard</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#718096]">Attempt ID:</span>
          <span className="font-mono text-xs font-bold text-[#06B6D4] bg-[#2563EB]/10 px-2.5 py-1 rounded-md border border-[#DCE5F0]">
            #{attemptId}
          </span>
        </div>
      </div>

      
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#4169C1]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#233B67] to-[#4169C1] flex items-center justify-center text-white text-2xl font-bold shadow-sm shadow-[#233B67]/20 flex-shrink-0">
              {student_name ? student_name[0] : 'S'}
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EDF2FA] text-[#4169C1] text-xs font-semibold uppercase tracking-wider mb-1 border border-[#4169C1]/30">
                <Award className="w-3.5 h-3.5" />
                <span>Candidate Practice Assessment Result</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#202B40] tracking-tight">{student_name}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#718096] mt-1">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-[#718096]" />
                  {student_email}
                </span>
                {roll_number && roll_number !== 'N/A' && (
                  <>
                    <span className="text-[#718096]/50">•</span>
                    <span className="font-mono text-[#4169C1] font-semibold">Roll: {roll_number}</span>
                  </>
                )}
                {institute && institute !== 'N/A' && (
                  <>
                    <span className="text-[#718096]/50">•</span>
                    <span>{institute}</span>
                  </>
                )}
                {class_year && class_year !== 'N/A' && (
                  <>
                    <span className="text-[#718096]/50">•</span>
                    <span>{class_year}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#F5F7FC] p-4 rounded-2xl border border-[#E2E8F0]">
            <div>
              <div className="text-[11px] text-[#718096] flex items-center gap-1">
                <BookOpen className="w-3 h-3 text-[#718096]" /> Assessment Title
              </div>
              <div className="text-xs font-semibold text-[#202B40] truncate max-w-[150px]" title={exam_title}>
                {exam_title}
              </div>
              <span className="inline-block mt-0.5 px-2 py-0.2 rounded text-[10px] font-medium bg-[#EDF2FA] text-[#4169C1]">
                {subject}
              </span>
            </div>

            <div>
              <div className="text-[11px] text-[#718096] flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#718096]" /> Duration & Time Used
              </div>
              <div className="text-xs font-semibold text-[#202B40]">
                {formatTimeUsed(duration_used_seconds)} / {duration_minutes}m
              </div>
              <div className="text-[10px] text-[#718096] mt-0.5">Authoritative Server Clock</div>
            </div>

            <div>
              <div className="text-[11px] text-[#718096] flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#718096]" /> Completion Date
              </div>
              <div className="text-xs font-semibold text-[#202B40]">
                {submit_time
                  ? new Date(submit_time).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'In Progress'}
              </div>
              <div className="mt-1">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    isPendingSubj
                      ? 'bg-[#D69B35]/10 text-[#D69B35] border border-[#D69B35]/30'
                      : 'bg-[#299D70]/10 text-[#299D70] border border-[#299D70]/30'
                  }`}
                >
                  {isPendingSubj ? 'Subjective Review' : 'Evaluated & Finalized'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#718096]">Total Score Obtained</span>
            <div className="w-8 h-8 rounded-lg bg-[#EDF2FA] text-[#4169C1] flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#202B40] mt-3">
            {score} <span className="text-lg text-[#718096] font-normal">/ {total_marks} Marks</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs font-bold text-[#4169C1]">{percentage}%</span>
            <span
              className={`inline-flex items-center px-2 py-0.2 rounded text-[10px] font-semibold ${
                passed ? 'bg-[#299D70]/10 text-[#299D70]' : 'bg-[#D69B35]/10 text-[#D69B35]'
              }`}
            >
              {passed ? 'PASSED' : 'NEEDS PRACTICE'}
            </span>
          </div>
        </div>

        
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#718096]">Questions Answered</span>
            <div className="w-8 h-8 rounded-lg bg-[#EDF2FA] text-[#4169C1] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#202B40] mt-3">
            {questions_answered} <span className="text-lg text-[#718096] font-normal">/ {total_questions} Questions</span>
          </div>
          <div className="text-[11px] text-[#718096] mt-2">
            {questions_unanswered > 0 ? `${questions_unanswered} Unanswered` : '100% Completion Rate'}
          </div>
        </div>

        
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#718096]">MCQ Objective Accuracy</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-[#299D70] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#202B40] mt-3">
            {correct_count} <span className="text-lg text-[#718096] font-normal">Correct</span>
          </div>
          <div className="text-[11px] text-[#718096] mt-2">
            <span className="text-[#299D70] font-semibold">✓ {correct_count} correct</span> •{' '}
            <span className="text-[#D95C65] font-semibold">✗ {incorrect_count} incorrect</span>
          </div>
        </div>

        
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#718096]">Subjective Evaluation</span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                pending_subjective_count > 0 ? 'bg-[#D69B35]/10 text-[#D69B35]' : 'bg-[#299D70]/10 text-[#299D70]'
              }`}
            >
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#202B40] mt-3">
            {pending_subjective_count > 0 ? `${pending_subjective_count} Pending Review` : 'All Questions Evaluated'}
          </div>
          <div className="text-[11px] text-[#718096] mt-2">
            {pending_subjective_count > 0
              ? 'Award marks & feedback below to complete grading'
              : 'Instructor feedback saved and calculated in final marks'}
          </div>
        </div>
      </div>

      
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EDF2FA] text-[#4169C1] text-xs font-semibold uppercase tracking-wider mb-1 border border-[#4169C1]/30">
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Student Performance Analytics</span>
            </div>
            <h2 className="text-xl font-bold text-[#202B40] tracking-tight">Longitudinal Mastery & Progress Tracking</h2>
            <p className="text-xs text-[#718096]">
              Cross-assessment score trajectory, topic-level mastery, and historical attempt comparison.
            </p>
          </div>
        </div>

        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-[#F5F7FC] p-3.5 rounded-2xl border border-[#E2E8F0]">
            <div className="text-[10px] text-[#718096] uppercase font-semibold">Total Attempts</div>
            <div className="text-lg font-bold text-[#202B40] mt-1">{analytics.total_attempts_count || 1}</div>
            <div className="text-[10px] text-[#718096]">Practice tests taken</div>
          </div>

          <div className="bg-[#F5F7FC] p-3.5 rounded-2xl border border-[#E2E8F0]">
            <div className="text-[10px] text-[#718096] uppercase font-semibold">Average Score</div>
            <div className="text-lg font-bold text-[#202B40] mt-1">{analytics.average_score}</div>
            <div className="text-[10px] text-[#4169C1] font-semibold">{analytics.average_percentage}% avg</div>
          </div>

          <div className="bg-[#F5F7FC] p-3.5 rounded-2xl border border-[#E2E8F0]">
            <div className="text-[10px] text-[#718096] uppercase font-semibold">Highest Score</div>
            <div className="text-lg font-bold text-[#299D70] mt-1">{analytics.highest_percentage}%</div>
            <div className="text-[10px] text-[#718096]">{analytics.highest_score} Marks peak</div>
          </div>

          <div className="bg-[#F5F7FC] p-3.5 rounded-2xl border border-[#E2E8F0]">
            <div className="text-[10px] text-[#718096] uppercase font-semibold">Lowest Score</div>
            <div className="text-lg font-bold text-[#718096] mt-1">{analytics.lowest_percentage}%</div>
            <div className="text-[10px] text-[#718096]">{analytics.lowest_score} Marks baseline</div>
          </div>

          <div className="bg-[#F5F7FC] p-3.5 rounded-2xl border border-[#E2E8F0]">
            <div className="text-[10px] text-[#718096] uppercase font-semibold">Progress Trend</div>
            <div className="text-lg font-bold text-[#202B40] mt-1 flex items-center gap-1.5">
              {analytics.has_trend ? (
                analytics.improvement_percentage >= 0 ? (
                  <>
                    <TrendingUp className="w-4 h-4 text-[#299D70]" />
                    <span className="text-[#299D70]">+{analytics.improvement_percentage}%</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-4 h-4 text-[#D95C65]" />
                    <span className="text-[#D95C65]">{analytics.improvement_percentage}%</span>
                  </>
                )
              ) : (
                <span className="text-[#718096] text-xs font-medium">Initial Baseline</span>
              )}
            </div>
            <div className="text-[10px] text-[#718096]">
              {analytics.has_trend ? `${analytics.trend} trajectory` : '1st attempt recorded'}
            </div>
          </div>

          <div className="bg-[#F5F7FC] p-3.5 rounded-2xl border border-[#E2E8F0]">
            <div className="text-[10px] text-[#718096] uppercase font-semibold">Objective Accuracy</div>
            <div className="text-lg font-bold text-[#202B40] mt-1">{analytics.accuracy_rate}%</div>
            <div className="text-[10px] text-[#718096]">{analytics.completion_rate}% completion</div>
          </div>
        </div>

        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 bg-[#F5F7FC] p-5 rounded-2xl border border-[#E2E8F0] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#202B40]">Score Progression Curve Across Attempts</h3>
                <p className="text-[11px] text-[#718096]">Visual trendline tracking percentage score evolution over time</p>
              </div>
              <span className="text-[11px] text-[#718096] bg-[#E2E8F0] px-2.5 py-1 rounded-lg">
                {history.length} Data Points
              </span>
            </div>

            {history.length >= 2 ? (
              <div className="py-4">
                
                <div className="h-44 w-full">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 500 140" preserveAspectRatio="none">
                    
                    <line x1="0" y1="20" x2="500" y2="20" stroke="#E2E8F0" strokeDasharray="3 3" strokeWidth="0.8" />
                    <line x1="0" y1="60" x2="500" y2="60" stroke="#E2E8F0" strokeDasharray="3 3" strokeWidth="0.8" />
                    <line x1="0" y1="100" x2="500" y2="100" stroke="#E2E8F0" strokeDasharray="3 3" strokeWidth="0.8" />

                    
                    <defs>
                      <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4169C1" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#4169C1" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    
                    {(() => {
                      const points = history.map((item, idx) => {
                        const x = history.length === 1 ? 250 : 30 + (idx / (history.length - 1)) * 440;
                        const y = 120 - (item.percentage / 100) * 100;
                        return { x, y, item };
                      });

                      const pathD = points.reduce((acc, p, idx) => {
                        return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
                      }, '');

                      const areaD = `${pathD} L ${points[points.length - 1].x} 125 L ${points[0].x} 125 Z`;

                      return (
                        <>
                          <path d={areaD} fill="url(#curveGradient)" />
                          <path d={pathD} fill="none" stroke="#4169C1" strokeWidth="2.5" strokeLinecap="round" />

                          {points.map((p, idx) => (
                            <g key={idx}>
                              <circle
                                cx={p.x}
                                cy={p.y}
                                r={p.item.is_current ? '6' : '4.5'}
                                className={p.item.is_current ? 'fill-[#4169C1] stroke-white stroke-2' : 'fill-white stroke-[#4169C1] stroke-2'}
                              />
                              <text
                                x={p.x}
                                y={p.y - 10}
                                textAnchor="middle"
                                className="text-[10px] fill-[#94A3B8] font-bold"
                              >
                                {p.item.percentage}%
                              </text>
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                </div>
                <div className="flex justify-between text-[10px] text-[#718096] mt-2 px-6">
                  <span>Earliest Practice Attempt</span>
                  <span>Latest Attempt</span>
                </div>
              </div>
            ) : (
              <div className="py-8 px-4 text-center rounded-xl bg-[#F5F7FC] border border-[#E2E8F0] space-y-2">
                <div className="w-10 h-10 rounded-full bg-[#EDF2FA] text-[#4169C1] flex items-center justify-center mx-auto mb-2">
                  <BarChart2 className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-[#718096]">Single Practice Attempt Recorded</p>
                <p className="text-[11px] text-[#718096] max-w-md mx-auto">
                  Candidate has completed 1 practice attempt. Additional practice attempts will automatically populate longitudinal learning progression curves and comparative analytics.
                </p>
              </div>
            )}
          </div>

          
          <div className="bg-[#F5F7FC] p-5 rounded-2xl border border-[#E2E8F0] space-y-4">
            <h3 className="text-sm font-bold text-[#202B40]">Subject-Wise Mastery Breakdown</h3>
            <p className="text-[11px] text-[#718096]">Average accuracy and score performance grouped by topic</p>

            <div className="space-y-3.5 pt-1">
              {(analytics.subject_breakdown || []).length > 0 ? (
                analytics.subject_breakdown.map((subj, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-[#202B40] truncate max-w-[170px]" title={subj.subject}>
                        {subj.subject}
                      </span>
                      <span className="font-semibold text-[#4169C1]">{subj.average_percentage}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          subj.average_percentage >= 70
                            ? 'bg-emerald-500'
                            : subj.average_percentage >= 40
                            ? 'bg-[#2563EB]'
                            : 'bg-[#D69B35]'
                        }`}
                        style={{ width: `${Math.min(100, subj.average_percentage)}%` }}
                      ></div>
                    </div>
                    <div className="text-[10px] text-[#718096] flex justify-between">
                      <span>{subj.attempts_count} attempt(s)</span>
                      <span>Avg: {subj.average_score} Marks</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-[#718096] text-center py-6">No subject analytics available yet.</div>
              )}
            </div>
          </div>
        </div>

        
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-bold text-[#202B40]">Candidate Practice History Comparison</h3>
          <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0]/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F7FC] text-[#718096] border-b border-[#E2E8F0] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Attempt</th>
                  <th className="py-2.5 px-4">Assessment Title</th>
                  <th className="py-2.5 px-4">Subject</th>
                  <th className="py-2.5 px-4">Score & Total</th>
                  <th className="py-2.5 px-4">Percentage</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]/50">
                {history.map((att) => (
                  <tr
                    key={att.attempt_id}
                    className={`transition-colors ${
                      att.is_current ? 'bg-[#EDF2FA] font-semibold text-[#202B40]' : 'hover:bg-[#F5F7FC]'
                    }`}
                  >
                    <td className="py-3 px-4 font-mono text-[#4169C1] font-semibold">
                      #{att.attempt_id} {att.is_current && <span className="text-[10px] ml-1 bg-[#2563EB]/10 text-[#06B6D4] px-1.5 py-0.5 rounded">Current</span>}
                    </td>
                    <td className="py-3 px-4 text-[#202B40]">{att.title}</td>
                    <td className="py-3 px-4 text-[#718096]">{att.subject}</td>
                    <td className="py-3 px-4 font-medium text-[#202B40]">
                      {att.score} / {att.total_marks} Marks
                    </td>
                    <td className="py-3 px-4 text-[#4169C1] font-bold">{att.percentage}%</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          att.evaluation_status === 'pending_evaluation'
                            ? 'bg-[#D69B35]/10 text-[#D69B35] border border-[#D69B35]/30'
                            : 'bg-[#299D70]/10 text-[#299D70] border border-[#299D70]/30'
                        }`}
                      >
                        {att.evaluation_status === 'pending_evaluation' ? 'Subjective Review' : 'Evaluated'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {!att.is_current && (
                        <button
                          onClick={() => navigate(`/teacher/mock-tests/${att.attempt_id}`)}
                          className="text-xs text-[#4169C1] hover:text-[#06B6D4] font-semibold underline"
                        >
                          View Attempt
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0]/80 pb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EDF2FA] text-[#4169C1] text-xs font-semibold uppercase tracking-wider mb-1 border border-[#4169C1]/30">
              <FileText className="w-3.5 h-3.5" />
              <span>Comprehensive Question Breakdown</span>
            </div>
            <h2 className="text-xl font-bold text-[#202B40] tracking-tight">Question-By-Question Evaluation</h2>
            <p className="text-xs text-[#718096]">
              Inspect objective MCQ selections, correct answers, and grade pending subjective submissions.
            </p>
          </div>

          
          <div className="flex flex-wrap items-center gap-1.5 bg-[#F1F5FB]/60 p-1.5 rounded-2xl border border-[#E2E8F0]">
            <button
              onClick={() => setQuestionFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                questionFilter === 'all'
                  ? 'bg-[#233B67] text-white shadow-sm shadow-[#233B67]/20'
                  : 'text-[#718096] hover:text-[#202B40]'
              }`}
            >
              All Questions ({questions.length})
            </button>
            <button
              onClick={() => setQuestionFilter('mcq')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                questionFilter === 'mcq'
                  ? 'bg-[#233B67] text-white shadow-sm shadow-[#233B67]/20'
                  : 'text-[#718096] hover:text-[#202B40]'
              }`}
            >
              MCQs ({questions.filter((q) => q.question_type === 'mcq').length})
            </button>
            <button
              onClick={() => setQuestionFilter('subjective')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                questionFilter === 'subjective'
                  ? 'bg-[#233B67] text-white shadow-sm shadow-[#233B67]/20'
                  : 'text-[#718096] hover:text-[#202B40]'
              }`}
            >
              Subjective ({questions.filter((q) => q.question_type !== 'mcq').length})
            </button>
            <button
              onClick={() => setQuestionFilter('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                questionFilter === 'pending'
                  ? 'bg-[#D69B35] text-white shadow-sm shadow-[#D69B35]/20'
                  : 'text-[#D69B35] hover:text-[#202B40]'
              }`}
            >
              Needs Review ({pending_subjective_count})
            </button>
          </div>
        </div>

        
        <div className="space-y-6">
          {filteredQuestions.map((q, qIndex) => {
            const isMcq = q.question_type === 'mcq';
            const isAnswered = q.user_answer && q.user_answer.trim().length > 0;
            const evalForm = evalForms[q.question_id] || { awarded_marks: '', feedback: '' };

            return (
              <div
                key={q.question_id}
                className={`p-6 rounded-3xl border transition-all ${
                  isMcq
                    ? q.is_correct
                      ? 'bg-[#F5F7FC] border-[#E2E8F0]'
                      : 'bg-[#F5F7FC] border-[#E2E8F0]'
                    : q.evaluation_status === 'pending_evaluation'
                    ? 'bg-[#FFFDF5] border-[#D69B35]/40 shadow-sm'
                    : 'bg-[#F5F7FC] border-[#E2E8F0]'
                }`}
              >
                
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-[#E2E8F0] text-[#4169C1] text-xs font-bold flex items-center justify-center">
                      Q{qIndex + 1}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#718096]">
                      {isMcq ? 'Multiple Choice Question (MCQ)' : 'Subjective / Conceptual Question'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-[#718096] bg-[#E2E8F0]/80 px-2.5 py-1 rounded-lg">
                      {q.max_marks} Marks Max
                    </span>

                    
                    {isMcq ? (
                      q.is_correct ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#299D70]/10 text-[#299D70] border border-[#299D70]/30">
                          <Check className="w-3.5 h-3.5" />
                          <span>Correct (+{q.awarded_marks} Marks)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-[#D95C65] border border-red-500/20">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Incorrect (0 / {q.max_marks} Marks)</span>
                        </span>
                      )
                    ) : q.evaluation_status === 'pending_evaluation' ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#D69B35]/10 text-[#D69B35] border border-[#D69B35]/30 animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Pending Teacher Evaluation</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#299D70]/10 text-[#299D70] border border-[#299D70]/30">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Evaluated (+{q.awarded_marks} / {q.max_marks} Marks)</span>
                      </span>
                    )}
                  </div>
                </div>

                
                <div className="text-base font-semibold text-[#202B40] mb-5 leading-relaxed">
                  {q.question_text}
                </div>

                
                {isMcq && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(q.options || []).map((opt, optIdx) => {
                        const isStudentChoice = q.user_answer && q.user_answer.trim().toLowerCase() === opt.trim().toLowerCase();
                        const isCorrectOption = q.correct_answer && q.correct_answer.trim().toLowerCase() === opt.trim().toLowerCase();

                        let optStyles = 'bg-white border-[#E2E8F0] text-[#718096]';
                        if (isCorrectOption) {
                          optStyles = 'bg-[#299D70]/10 border-[#299D70]/40 text-[#299D70] font-semibold';
                        } else if (isStudentChoice && !isCorrectOption) {
                          optStyles = 'bg-[#D95C65]/10 border-[#D95C65]/40 text-[#D95C65] font-semibold';
                        }

                        return (
                          <div
                            key={optIdx}
                            className={`p-3.5 rounded-2xl border flex items-start justify-between gap-3 ${optStyles}`}
                          >
                            <div className="flex items-start gap-2.5">
                              <span className="w-5 h-5 rounded-md bg-[#E2E8F0]/80 text-[11px] font-bold text-[#718096] flex items-center justify-center flex-shrink-0 mt-0.5">
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span className="text-xs leading-relaxed">{opt}</span>
                            </div>

                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              {isCorrectOption && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#299D70] bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                  <Check className="w-3 h-3" /> Correct Answer
                                </span>
                              )}
                              {isStudentChoice && (
                                <span
                                  className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                                    isCorrectOption
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                      : 'bg-red-500/20 text-red-300 border-red-500/30'
                                  }`}
                                >
                                  Candidate Selection
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <div className="p-3.5 rounded-2xl bg-[#2563EB]/10 border border-[#DCE5F0] text-xs text-[#06B6D4]/90 flex items-start gap-2.5">
                        <Sparkles className="w-4 h-4 text-[#4169C1] flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-[#4169C1]">Answer Explanation: </span>
                          <span>{q.explanation}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                
                {!isMcq && (
                  <div className="space-y-5 pt-1">
                    
                    <div className="space-y-1.5">
                      <div className="text-xs font-semibold text-[#718096] flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#4169C1]" />
                        <span>Candidate Submitted Answer:</span>
                      </div>
                      <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] text-sm text-[#202B40] leading-relaxed font-sans whitespace-pre-wrap">
                        {isAnswered ? q.user_answer : <span className="text-[#718096] italic">No answer provided by candidate.</span>}
                      </div>
                    </div>

                    
                    {(q.correct_answer || q.explanation) && (
                      <div className="p-4 rounded-2xl bg-[#EDF2FA] border border-[#E2E8F0] space-y-1.5">
                        <div className="text-xs font-semibold text-[#4169C1] flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Reference Model Solution / Rubric:</span>
                        </div>
                        <div className="text-xs text-[#718096] leading-relaxed">
                          {q.correct_answer || q.explanation}
                        </div>
                      </div>
                    )}

                    
                    <div className="p-5 rounded-2xl bg-[#EDF2FA] border border-[#E2E8F0] space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-[#4169C1]" />
                          <h4 className="text-sm font-bold text-[#202B40]">Teacher Evaluation & Scoring</h4>
                        </div>
                        <span className="text-xs text-[#06B6D4] font-medium">
                          Question Weight: {q.max_marks} Marks
                        </span>
                      </div>

                      {evalForm.errorMsg && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[#D95C65] text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          <span>{evalForm.errorMsg}</span>
                        </div>
                      )}

                      {evalForm.successMsg && (
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[#299D70] text-xs flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                          <span>{evalForm.successMsg}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-start">
                        
                        <div>
                          <label className="block text-xs font-semibold text-[#718096] mb-1.5">
                            Awarded Marks (0 - {q.max_marks})
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max={q.max_marks}
                            value={evalForm.awarded_marks}
                            onChange={(e) =>
                              setEvalForms((prev) => ({
                                ...prev,
                                [q.question_id]: {
                                  ...prev[q.question_id],
                                  awarded_marks: e.target.value,
                                },
                              }))
                            }
                            placeholder={`e.g. ${q.max_marks}`}
                            className="w-full bg-white border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#202B40] focus:outline-none focus:border-[#4169C1] focus:ring-1 focus:ring-[#4169C1]/20"
                          />
                        </div>

                        
                        <div className="sm:col-span-3">
                          <label className="block text-xs font-semibold text-[#718096] mb-1.5">
                            Instructor Comments & Feedback
                          </label>
                          <textarea
                            rows="2"
                            value={evalForm.feedback}
                            onChange={(e) =>
                              setEvalForms((prev) => ({
                                ...prev,
                                [q.question_id]: {
                                  ...prev[q.question_id],
                                  feedback: e.target.value,
                                },
                              }))
                            }
                            placeholder="Provide constructive feedback explaining score justification, strengths, or improvements..."
                            className="w-full bg-white border border-[#E2E8F0] rounded-xl p-3 text-xs text-[#202B40] placeholder-[#718096]/60 focus:outline-none focus:border-[#4169C1] focus:ring-1 focus:ring-[#4169C1]/20"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#DCE5F0]">
                        <span className="text-[11px] text-[#718096]">
                          {q.evaluated_at
                            ? `Last evaluated: ${new Date(q.evaluated_at).toLocaleString()}`
                            : 'Awaiting instructor evaluation'}
                        </span>

                        <button
                          onClick={() => handleEvaluationSubmit(q.question_id, q.max_marks)}
                          disabled={evalForm.saving}
                          className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#233B67] hover:bg-[#1C2F52] shadow-sm shadow-[#233B67]/20 transition-all flex items-center gap-2 disabled:opacity-60"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{evalForm.saving ? 'Saving Evaluation...' : 'Save Evaluation'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TeacherMockTestResult;

