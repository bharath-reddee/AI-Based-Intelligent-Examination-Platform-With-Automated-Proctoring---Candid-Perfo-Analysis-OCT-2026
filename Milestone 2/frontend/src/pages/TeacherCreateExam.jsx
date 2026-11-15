import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient, { formatApiError } from '../api/axios';
import Modal from '../components/Modal';
import GeneratingLoader from '../components/GeneratingLoader';
import {
  FileText,
  Sliders,
  HelpCircle,
  Users,
  Plus,
  Trash2,
  Edit2,
  Save,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Shield,
  Shuffle,
  MinusCircle,
  CheckSquare,
  Square,
  BarChart2,
  Lock,
  Unlock,
  RefreshCw,
  Search,
  Check,
  X,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';

const toLocalDatetimeInput = (isoString) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const toUtcIsoString = (val) => {
  if (!val || !String(val).trim()) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
};

const TeacherCreateExam = () => {
  const { examId } = useParams();
  const navigate = useNavigate();

  
  const [activeTab, setActiveTab] = useState('details');

  
  const [uiModal, setUiModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    confirmText: 'OK',
    cancelText: null,
    onConfirm: null,
    loading: false,
  });

  const showAlert = (message, title = 'Notice', type = 'warning') => {
    setUiModal({
      isOpen: true,
      title,
      message,
      type,
      confirmText: 'OK',
      cancelText: null,
      onConfirm: () => setUiModal((prev) => ({ ...prev, isOpen: false })),
      loading: false,
    });
  };

  const showConfirm = ({ title, message, type = 'confirm', confirmText = 'Confirm', cancelText = 'Cancel', onConfirm }) => {
    setUiModal({
      isOpen: true,
      title,
      message,
      type,
      confirmText,
      cancelText,
      onConfirm,
      loading: false,
    });
  };

  
  const [currentExamId, setCurrentExamId] = useState(examId ? parseInt(examId) : null);
  const [examData, setExamData] = useState({
    title: '',
    subject: '',
    topic: '',
    description: '',
    instructions: '1. Read all questions thoroughly before answering.\n2. Answers are autosaved continuously.\n3. Do not minimize or switch browser tabs.\n4. Complete and submit before the countdown timer expires.',
    difficulty: 'Medium',
    duration_minutes: 60,
    total_marks: 100,
    passing_marks: 40,
    number_of_questions: 10,
    max_tab_switches: 3,
    status: 'draft',
    ai_proctoring_enabled: true,
    negative_marking_enabled: false,
    negative_marking_score: 0.25,
    shuffle_questions: false,
    shuffle_options: false,
    start_time: '',
    end_time: '',
    is_published: false,
  });

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(Boolean(examId));
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [questionForm, setQuestionForm] = useState({
    question_text: '',
    question_type: 'mcq', 
    difficulty: 'Medium',
    options: ['', '', '', ''],
    correct_answer: '',
    explanation: '',
    marks: 2,
    negative_marks: 0.0,
    min_words: null,
    max_words: null,
  });

  
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiForm, setAiForm] = useState({
    subject: '',
    topic: '',
    difficulty: 'Medium',
    mcq_count: 5,
    multi_select_count: 2,
    short_answer_count: 2,
    long_answer_count: 1,
    instructions: '',
  });
  const [aiGeneratedList, setAiGeneratedList] = useState([]);
  const [aiSelectedIndices, setAiSelectedIndices] = useState(new Set());
  const [aiReviewStep, setAiReviewStep] = useState(false);
  const [aiAdding, setAiAdding] = useState(false);
  const [aiRequestedTotal, setAiRequestedTotal] = useState(0);

  
  const [assignedStudents, setAssignedStudents] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentEmails, setSelectedStudentEmails] = useState(new Set());
  const [assignmentLoading, setAssignmentLoading] = useState(false);

  
  useEffect(() => {
    if (examId) {
      setInitialLoading(true);
      apiClient.get(`/exams/teacher/${examId}`)
        .then((res) => {
          const d = res.data;
          setCurrentExamId(d.id);
          setExamData({
            title: d.title || '',
            subject: d.subject || '',
            topic: d.topic || '',
            description: d.description || '',
            instructions: d.instructions || '',
            difficulty: d.difficulty || 'Medium',
            duration_minutes: d.duration_minutes || 60,
            total_marks: d.total_marks || 100,
            passing_marks: d.passing_marks || 40,
            number_of_questions: d.number_of_questions || 10,
            max_tab_switches: d.max_tab_switches !== undefined ? d.max_tab_switches : 3,
            status: d.status || (d.is_published ? 'published' : 'draft'),
            ai_proctoring_enabled: d.ai_proctoring_enabled !== undefined ? d.ai_proctoring_enabled : true,
            negative_marking_enabled: Boolean(d.negative_marking_enabled),
            negative_marking_score: d.negative_marking_score || 0.25,
            shuffle_questions: Boolean(d.shuffle_questions),
            shuffle_options: Boolean(d.shuffle_options),
            start_time: toLocalDatetimeInput(d.start_time),
            end_time: toLocalDatetimeInput(d.end_time),
            is_published: Boolean(d.is_published),
          });
          setQuestions(d.questions || []);
          setInitialLoading(false);
        })
        .catch((err) => {
          setError(formatApiError(err));
          setInitialLoading(false);
        });
    }
  }, [examId]);

  const fetchAssignments = async () => {
    if (!currentExamId) return;
    setAssignmentLoading(true);
    try {
      const res = await apiClient.get(`/exams/teacher/${currentExamId}/assignments`);
      setAssignedStudents(res.data?.assigned_students || []);
      setAvailableStudents(res.data?.available_students || []);
      setSelectedStudentEmails(new Set());
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setAssignmentLoading(false);
    }
  };

  
  useEffect(() => {
    if (activeTab === 'students' && currentExamId) {
      fetchAssignments();
    }
  }, [activeTab, currentExamId]);

  
  const handleExamDataChange = (field, value) => {
    setExamData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  
  const handleSaveDetails = async (advanceToQuestions = false) => {
    setError('');
    setSuccess('');

    if (!examData.title.trim()) {
      setError('Examination title is required.');
      return;
    }
    if (!examData.subject.trim()) {
      setError('Subject is required.');
      return;
    }

    
    if (examData.start_time && examData.end_time) {
      const s = new Date(examData.start_time);
      const e = new Date(examData.end_time);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && s >= e) {
        setError('Opening date/time must be strictly before closing date/time.');
        return;
      }
    }

    
    const totalMarks = parseInt(examData.total_marks) || 100;
    const passingMarks = parseInt(examData.passing_marks) || 40;
    if (passingMarks > totalMarks) {
      setError('Passing marks cannot exceed total marks.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: examData.title.trim(),
        subject: examData.subject.trim(),
        topic: examData.topic.trim() || null,
        description: examData.description.trim() || null,
        instructions: examData.instructions.trim() || null,
        difficulty: examData.difficulty,
        duration_minutes: parseInt(examData.duration_minutes) || 60,
        total_marks: totalMarks,
        passing_marks: passingMarks,
        number_of_questions: questions.length || parseInt(examData.number_of_questions) || 10,
        max_tab_switches: parseInt(examData.max_tab_switches) || 3,
        status: examData.status || 'draft',
        ai_proctoring_enabled: Boolean(examData.ai_proctoring_enabled),
        negative_marking_enabled: Boolean(examData.negative_marking_enabled),
        negative_marking_score: parseFloat(examData.negative_marking_score) || 0.25,
        shuffle_questions: Boolean(examData.shuffle_questions),
        shuffle_options: Boolean(examData.shuffle_options),
        start_time: toUtcIsoString(examData.start_time),
        end_time: toUtcIsoString(examData.end_time),
        is_published: examData.status === 'published',
      };

      let res;
      if (currentExamId) {
        res = await apiClient.put(`/exams/teacher/${currentExamId}`, payload);
      } else {
        res = await apiClient.post('/exams/', payload);
      }

      const saved = res.data;
      setCurrentExamId(saved.id);
      setSuccess('Examination details and rules saved successfully.');

      if (advanceToQuestions) {
        setActiveTab('questions');
      }
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  
  const handlePublishExam = async () => {
    if (!currentExamId) {
      setError('Please save examination details first.');
      return;
    }
    if (questions.length === 0) {
      setError('Cannot publish an examination with 0 questions. Please add questions first.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await apiClient.post(`/exams/teacher/${currentExamId}/publish`);
      setExamData((prev) => ({ ...prev, status: 'published', is_published: true }));
      setSuccess('Examination published successfully! It is now accessible to assigned candidates.');
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  
  const handleCloseExam = () => {
    showConfirm({
      title: 'Close Examination?',
      message: 'Are you sure you want to close this examination? Candidates will no longer be able to start attempts.',
      type: 'warning',
      confirmText: 'Yes, Close Exam',
      onConfirm: async () => {
        setUiModal((prev) => ({ ...prev, loading: true }));
        setLoading(true);
        try {
          await apiClient.post(`/exams/teacher/${currentExamId}/close`);
          setExamData((prev) => ({ ...prev, status: 'closed', is_published: false }));
          setSuccess('Examination closed.');
          setUiModal((prev) => ({ ...prev, isOpen: false, loading: false }));
        } catch (err) {
          setError(formatApiError(err));
          setUiModal((prev) => ({ ...prev, isOpen: false, loading: false }));
        } finally {
          setLoading(false);
        }
      },
    });
  };

  
  const handleReopenExam = async () => {
    setLoading(true);
    try {
      await apiClient.post(`/exams/teacher/${currentExamId}/reopen`);
      setExamData((prev) => ({ ...prev, status: 'published', is_published: true }));
      setSuccess('Examination reopened successfully.');
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  
  const openAddQuestionModal = () => {
    setEditingQuestionId(null);
    setQuestionForm({
      question_text: '',
      question_type: 'mcq',
      difficulty: examData.difficulty || 'Medium',
      options: ['', '', '', ''],
      correct_answer: '',
      explanation: '',
      marks: 2,
      negative_marks: examData.negative_marking_enabled ? examData.negative_marking_score : 0.0,
      min_words: null,
      max_words: null,
    });
    setShowQuestionModal(true);
  };

  const openEditQuestionModal = (q) => {
    setEditingQuestionId(q.id);
    let opts = q.options;
    if (!opts || !Array.isArray(opts)) {
      opts = ['', '', '', ''];
    }
    setQuestionForm({
      question_text: q.question_text || '',
      question_type: q.question_type || 'mcq',
      difficulty: q.difficulty || examData.difficulty || 'Medium',
      options: opts,
      correct_answer: q.correct_answer || '',
      explanation: q.explanation || '',
      marks: q.marks || 1,
      negative_marks: q.negative_marks || 0.0,
      min_words: q.min_words,
      max_words: q.max_words,
    });
    setShowQuestionModal(true);
  };

  const handleSaveQuestion = async () => {
    if (!currentExamId) {
      setError('Please save examination details first.');
      return;
    }
    if (!questionForm.question_text.trim()) {
      showAlert('Question statement is required.', 'Incomplete Question');
      return;
    }

    const qType = questionForm.question_type;
    if (qType === 'mcq') {
      const validOpts = questionForm.options.filter((o) => o.trim() !== '');
      if (validOpts.length < 2) {
        showAlert('Multiple Choice question requires at least 2 non-empty options.', 'Options Required');
        return;
      }
      if (!questionForm.correct_answer.trim()) {
        showAlert('Please specify the correct answer option.', 'Answer Required');
        return;
      }
    } else if (qType === 'multi_select') {
      const validOpts = questionForm.options.filter((o) => o.trim() !== '');
      if (validOpts.length < 2) {
        showAlert('Multi-Select question requires at least 2 non-empty options.', 'Options Required');
        return;
      }
      if (!questionForm.correct_answer.trim()) {
        showAlert('Please specify at least one correct option.', 'Answer Required');
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        question_text: questionForm.question_text.trim(),
        question_type: questionForm.question_type,
        difficulty: questionForm.difficulty,
        options: ['mcq', 'multi_select'].includes(qType) ? questionForm.options.filter((o) => o.trim() !== '') : null,
        correct_answer: questionForm.correct_answer.trim(),
        explanation: questionForm.explanation.trim() || null,
        marks: parseInt(questionForm.marks) || 1,
        negative_marks: parseFloat(questionForm.negative_marks) || 0.0,
        min_words: questionForm.min_words ? parseInt(questionForm.min_words) : null,
        max_words: questionForm.max_words ? parseInt(questionForm.max_words) : null,
      };

      if (editingQuestionId) {
        await apiClient.put(`/exams/teacher/${currentExamId}/questions/${editingQuestionId}`, payload);
      } else {
        await apiClient.post(`/exams/teacher/${currentExamId}/questions`, payload);
      }

      
      const refreshed = await apiClient.get(`/exams/teacher/${currentExamId}`);
      setQuestions(refreshed.data.questions || []);
      setExamData((prev) => ({
        ...prev,
        total_marks: refreshed.data.total_marks,
        number_of_questions: refreshed.data.number_of_questions,
      }));

      setShowQuestionModal(false);
      setSuccess('Question saved successfully.');
    } catch (err) {
      showAlert(formatApiError(err), 'Save Question Failed', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = (qId) => {
    showConfirm({
      title: 'Remove Question?',
      message: 'Are you sure you want to remove this question from the examination?',
      type: 'danger',
      confirmText: 'Yes, Remove',
      onConfirm: async () => {
        setUiModal((prev) => ({ ...prev, loading: true }));
        try {
          await apiClient.delete(`/exams/teacher/${currentExamId}/questions/${qId}`);
          const refreshed = await apiClient.get(`/exams/teacher/${currentExamId}`);
          setQuestions(refreshed.data.questions || []);
          setExamData((prev) => ({
            ...prev,
            total_marks: refreshed.data.total_marks,
            number_of_questions: refreshed.data.number_of_questions,
          }));
          setSuccess('Question removed.');
          setUiModal((prev) => ({ ...prev, isOpen: false, loading: false }));
        } catch (err) {
          setError(formatApiError(err));
          setUiModal((prev) => ({ ...prev, isOpen: false, loading: false }));
        }
      },
    });
  };

  
  const handleAiCountChange = (field, val) => {
    if (val === '') {
      setAiForm((prev) => ({ ...prev, [field]: '' }));
      return;
    }
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 0) {
      setAiForm((prev) => ({ ...prev, [field]: 0 }));
    } else {
      setAiForm((prev) => ({ ...prev, [field]: Math.min(60, num) }));
    }
  };

  const totalAiQuestions =
    (parseInt(aiForm.mcq_count, 10) || 0) +
    (parseInt(aiForm.multi_select_count, 10) || 0) +
    (parseInt(aiForm.short_answer_count, 10) || 0) +
    (parseInt(aiForm.long_answer_count, 10) || 0);

  const openAiGenerationModal = () => {
    if (!currentExamId) {
      showAlert('Please save examination details and rules first before generating questions with AI.', 'Save Details First');
      return;
    }
    setAiForm((prev) => ({
      subject: examData.subject || prev.subject || '',
      topic: examData.topic || prev.topic || '',
      difficulty: examData.difficulty || prev.difficulty || 'Medium',
      mcq_count: prev.mcq_count !== undefined && prev.mcq_count !== '' ? prev.mcq_count : 5,
      multi_select_count: prev.multi_select_count !== undefined && prev.multi_select_count !== '' ? prev.multi_select_count : 2,
      short_answer_count: prev.short_answer_count !== undefined && prev.short_answer_count !== '' ? prev.short_answer_count : 2,
      long_answer_count: prev.long_answer_count !== undefined && prev.long_answer_count !== '' ? prev.long_answer_count : 1,
      instructions: prev.instructions || '',
    }));
    setAiGeneratedList([]);
    setAiSelectedIndices(new Set());
    setAiReviewStep(false);
    setShowAiModal(true);
  };

  const handleRunAiGeneration = async () => {
    if (aiGenerating) return; 
    if (!aiForm.subject.trim() || !aiForm.topic.trim()) {
      showAlert('Subject and Topic are required for AI generation.', 'Input Required');
      return;
    }
    const mcq = parseInt(aiForm.mcq_count, 10) || 0;
    const multi = parseInt(aiForm.multi_select_count, 10) || 0;
    const short = parseInt(aiForm.short_answer_count, 10) || 0;
    const long = parseInt(aiForm.long_answer_count, 10) || 0;
    const total = mcq + multi + short + long;

    if (mcq < 0 || multi < 0 || short < 0 || long < 0) {
      showAlert('Question counts cannot be negative.', 'Invalid Count');
      return;
    }
    if (total <= 0) {
      showAlert('Please specify at least 1 question to generate across any category.', 'Count Required');
      return;
    }
    if (total > 60) {
      showAlert('A maximum of 60 questions can be generated in a single batch.', 'Limit Exceeded');
      return;
    }

    setAiRequestedTotal(total);
    setAiGenerating(true);
    try {
      const res = await apiClient.post(
        '/exams/teacher/ai-generate-questions',
        {
          subject: aiForm.subject.trim(),
          topic: aiForm.topic.trim(),
          difficulty: aiForm.difficulty,
          mcq_count: mcq,
          multi_select_count: multi,
          short_answer_count: short,
          long_answer_count: long,
          instructions: aiForm.instructions.trim() || null,
        },
        { timeout: 120000 }
      );

      const list = res.data || [];
      if (!list || list.length === 0) {
        throw new Error('No questions could be generated. Please refine your parameters and try again.');
      }
      setAiGeneratedList(list);
      
      setAiSelectedIndices(new Set(list.map((_, i) => i)));
      setAiReviewStep(true);
    } catch (err) {
      const rawMsg = formatApiError(err);
      if (
        rawMsg.includes('11001') ||
        rawMsg.toLowerCase().includes('getaddrinfo') ||
        rawMsg.toLowerCase().includes('nameresolutionerror') ||
        rawMsg.toLowerCase().includes('connection refused')
      ) {
        showAlert(
          'Unable to connect to the AI provider. Please check your network connection and try again.',
          'AI Connection Failed',
          'danger'
        );
      } else {
        showAlert(rawMsg, 'AI Question Generation Failed', 'danger');
      }
    } finally {
      setAiGenerating(false);
    }
  };

  const toggleAiSelect = (idx) => {
    const updated = new Set(aiSelectedIndices);
    if (updated.has(idx)) {
      updated.delete(idx);
    } else {
      updated.add(idx);
    }
    setAiSelectedIndices(updated);
  };

  const toggleSelectAllAi = () => {
    if (aiSelectedIndices.size === aiGeneratedList.length) {
      setAiSelectedIndices(new Set());
    } else {
      setAiSelectedIndices(new Set(aiGeneratedList.map((_, i) => i)));
    }
  };

  const handleAddSelectedAiQuestions = async () => {
    if (!currentExamId) {
      showAlert('Please save the examination details and rules first before adding questions.', 'Exam ID Required');
      return;
    }

    if (aiSelectedIndices.size === 0) {
      showAlert('Please select at least one question to add.', 'No Questions Selected');
      return;
    }

    const selectedQuestions = aiGeneratedList.filter((_, idx) => aiSelectedIndices.has(idx));

    setAiAdding(true);
    try {
      await apiClient.post(`/exams/teacher/${currentExamId}/batch-questions`, {
        questions: selectedQuestions,
      });

      
      const refreshed = await apiClient.get(`/exams/teacher/${currentExamId}`);
      setQuestions(refreshed.data.questions || []);
      setExamData((prev) => ({
        ...prev,
        total_marks: refreshed.data.total_marks,
        number_of_questions: refreshed.data.number_of_questions,
      }));

      setShowAiModal(false);
      setSuccess(`Successfully added ${selectedQuestions.length} AI-generated questions to the examination.`);
    } catch (err) {
      showAlert(formatApiError(err), 'Batch Add Failed', 'danger');
    } finally {
      setAiAdding(false);
    }
  };

  
  const toggleSelectStudent = (email) => {
    const updated = new Set(selectedStudentEmails);
    if (updated.has(email)) {
      updated.delete(email);
    } else {
      updated.add(email);
    }
    setSelectedStudentEmails(updated);
  };

  const toggleSelectAllAvailable = (filteredList) => {
    if (filteredList.every((st) => selectedStudentEmails.has(st.email))) {
      const updated = new Set(selectedStudentEmails);
      filteredList.forEach((st) => updated.delete(st.email));
      setSelectedStudentEmails(updated);
    } else {
      const updated = new Set(selectedStudentEmails);
      filteredList.forEach((st) => updated.add(st.email));
      setSelectedStudentEmails(updated);
    }
  };

  const handleAssignSelectedStudents = async () => {
    if (selectedStudentEmails.size === 0) {
      showAlert('Please select at least one candidate to assign.', 'No Candidates Selected');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post(`/exams/teacher/${currentExamId}/assignments`, {
        student_emails: Array.from(selectedStudentEmails),
      });
      await fetchAssignments();
      setSuccess(`Assigned ${selectedStudentEmails.size} candidate(s) to this examination.`);
      setSelectedStudentEmails(new Set());
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleUnassignStudent = async (studentEmail, hasStarted) => {
    if (hasStarted) {
      showAlert('This student has already initiated an examination attempt. Under platform regulations, started attempts cannot be unassigned.', 'Cannot Unassign Candidate');
      return;
    }
    showConfirm({
      title: 'Unassign Candidate?',
      message: `Are you sure you want to unassign ${studentEmail} from this examination?`,
      type: 'warning',
      confirmText: 'Yes, Unassign',
      onConfirm: async () => {
        setUiModal((prev) => ({ ...prev, loading: true }));
        try {
          await apiClient.delete(`/exams/teacher/${currentExamId}/assignments/${encodeURIComponent(studentEmail)}`);
          await fetchAssignments();
          setSuccess(`Unassigned ${studentEmail}.`);
          setUiModal((prev) => ({ ...prev, isOpen: false, loading: false }));
        } catch (err) {
          setError(formatApiError(err));
          setUiModal((prev) => ({ ...prev, isOpen: false, loading: false }));
        }
      },
    });
  };

  if (initialLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-12 h-12 border-4 border-[#E2E8F0] border-t-[#233B67] rounded-full animate-spin"></div>
        <p className="text-sm text-[#718096]">Loading examination workspace...</p>
      </div>
    );
  }

  const rawStatus = (examData.status || (examData.is_published ? 'published' : 'draft')).toLowerCase();
  const isPublished = rawStatus === 'published';
  const isClosed = rawStatus === 'closed';
  const isDraft = rawStatus === 'draft';

  const filteredAvailableStudents = availableStudents.filter((st) => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase().trim();
    const nameMatch = st.name && st.name.toLowerCase().includes(q);
    const emailMatch = st.email && st.email.toLowerCase().includes(q);
    const rollMatch = st.roll_number && st.roll_number.toLowerCase().includes(q);
    const classMatch = st.class_year && st.class_year.toLowerCase().includes(q);
    return nameMatch || emailMatch || rollMatch || classMatch;
  });

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 space-y-8">
      
      <div className="bg-white shadow-sm p-6 rounded-3xl border border-[#E2E8F0] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/teacher/tests')}
            className="p-2.5 rounded-xl bg-[#EDF2FA] border border-[#E2E8F0] text-[#718096] hover:text-[#202B40] transition-colors"
            title="Back to Tests"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  isPublished
                    ? 'bg-[#299D70]/10 text-[#299D70] border-[#299D70]/30'
                    : isDraft
                    ? 'bg-[#D69B35]/10 text-[#4169C1] border-[#D69B35]/30'
                    : 'bg-[#CBD5E1]/50 text-[#202B40] border-[#E2E8F0]'
                }`}
              >
                {isPublished ? 'Published' : isDraft ? 'Draft' : 'Closed'}
              </span>
              <span className="text-xs text-[#718096]">
                {currentExamId ? `ID: #${currentExamId}` : 'New Examination Draft'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">
              {examData.title || 'Untitled Assessment'}
            </h1>
          </div>
        </div>

        
        <div className="flex flex-wrap items-center gap-2.5">
          {currentExamId && (
            <button
              onClick={() => navigate(`/teacher/exams/${currentExamId}/results`)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#4169C1] bg-[#233B67]/10 hover:bg-[#233B67]/10 border border-[#4169C1]/30 transition-all flex items-center gap-1.5"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Results</span>
            </button>
          )}

          {isDraft && (
            <button
              onClick={handlePublishExam}
              disabled={loading || questions.length === 0}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#299D70] hover:bg-[#20835C] shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Publish Exam</span>
            </button>
          )}

          {isPublished && (
            <button
              onClick={handleCloseExam}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#D69B35] bg-[#D69B35]/15 hover:bg-[#D69B35]/25 border border-[#D69B35]/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Close Test</span>
            </button>
          )}

          {isClosed && (
            <button
              onClick={handleReopenExam}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#4169C1] bg-[#233B67] hover:bg-[#233B67] transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reopen Exam</span>
            </button>
          )}

          <button
            onClick={() => handleSaveDetails(false)}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#233B67] hover:bg-[#233B67] shadow-lg shadow-[#233B67]/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Draft</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#D95C65]/10 border border-[#D95C65]/30 text-[#D95C65] text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-xs font-bold text-[#D95C65] hover:text-[#202B40]">
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-[#299D70]/10 border border-[#299D70]/30 text-[#299D70] text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess('')} className="text-xs font-bold text-[#299D70] hover:text-[#202B40]">
            Dismiss
          </button>
        </div>
      )}

      
      <div className="flex items-center border-b border-[#E2E8F0] gap-2">
        <button
          onClick={() => setActiveTab('details')}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'details'
              ? 'border-[#4169C1]/30 text-white bg-[#233B67]/10 rounded-t-xl'
              : 'border-transparent text-[#718096] hover:text-[#202B40] hover:bg-[#EDF2FA]/40 rounded-t-xl'
          }`}
        >
          <Sliders className="w-4 h-4 text-[#4169C1]" />
          <span>1. Details & Rules</span>
        </button>

        <button
          onClick={() => {
            if (!currentExamId) {
              showAlert('Please save examination details first before accessing the questions section.', 'Save Details First');
              return;
            }
            setActiveTab('questions');
          }}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'questions'
              ? 'border-[#4169C1]/30 text-white bg-[#233B67]/10 rounded-t-xl'
              : 'border-transparent text-[#718096] hover:text-[#202B40] hover:bg-[#EDF2FA]/40 rounded-t-xl'
          }`}
        >
          <HelpCircle className="w-4 h-4 text-[#4169C1]" />
          <span>2. Questions ({questions.length})</span>
        </button>

        <button
          onClick={() => {
            if (!currentExamId) {
              showAlert('Please save examination details first before assigning candidates.', 'Save Details First');
              return;
            }
            setActiveTab('students');
          }}
          className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'students'
              ? 'border-[#4169C1]/30 text-white bg-[#233B67]/10 rounded-t-xl'
              : 'border-transparent text-[#718096] hover:text-[#202B40] hover:bg-[#EDF2FA]/40 rounded-t-xl'
          }`}
        >
          <Users className="w-4 h-4 text-[#4169C1]" />
          <span>3. Assign Students ({assignedStudents.length})</span>
        </button>
      </div>

      
      {activeTab === 'details' && (
        <div className="space-y-6">
          
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] shadow-sm space-y-6">
            <h2 className="text-base font-bold text-[#202B40] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#4169C1]" />
              <span>Examination Core Information</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-[#202B40]">
                  Examination Title <span className="text-[#4169C1]">*</span>
                </label>
                <input
                  type="text"
                  value={examData.title}
                  onChange={(e) => handleExamDataChange('title', e.target.value)}
                  placeholder="e.g. Midterm Examination: Machine Learning & Intelligent Agents"
                  className="w-full bg-[#F5F7FC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-[#202B40] placeholder-[#718096]/60 focus:outline-none focus:border-[#4169C1] focus:bg-white focus:ring-2 focus:ring-[#4169C1]/20 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#202B40]">
                  Subject / Discipline <span className="text-[#4169C1]">*</span>
                </label>
                <input
                  type="text"
                  value={examData.subject}
                  onChange={(e) => handleExamDataChange('subject', e.target.value)}
                  placeholder="e.g. Computer Science & AI"
                  className="w-full bg-[#F5F7FC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-[#202B40] placeholder-[#718096]/60 focus:outline-none focus:border-[#4169C1] focus:bg-white focus:ring-2 focus:ring-[#4169C1]/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#202B40]">
                  Topic / Sub-Discipline
                </label>
                <input
                  type="text"
                  value={examData.topic}
                  onChange={(e) => handleExamDataChange('topic', e.target.value)}
                  placeholder="e.g. Neural Networks & Gradient Optimization"
                  className="w-full bg-[#F5F7FC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-[#202B40] placeholder-[#718096]/60 focus:outline-none focus:border-[#4169C1] focus:bg-white focus:ring-2 focus:ring-[#4169C1]/20"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-[#202B40]">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={examData.description}
                  onChange={(e) => handleExamDataChange('description', e.target.value)}
                  placeholder="Summary of assessment syllabus and learning outcomes..."
                  className="w-full bg-[#F5F7FC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-[#202B40] placeholder-[#718096]/60 focus:outline-none focus:border-[#4169C1] focus:bg-white focus:ring-2 focus:ring-[#4169C1]/20"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-[#202B40]">
                  Candidate Instructions
                </label>
                <textarea
                  rows={3}
                  value={examData.instructions}
                  onChange={(e) => handleExamDataChange('instructions', e.target.value)}
                  placeholder="Guidelines for students during the examination..."
                  className="w-full bg-[#F5F7FC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-[#202B40] placeholder-[#718096]/60 focus:outline-none focus:border-[#4169C1] focus:bg-white focus:ring-2 focus:ring-[#4169C1]/20 font-mono transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#202B40]">Difficulty Level</label>
                <select
                  value={examData.difficulty}
                  onChange={(e) => handleExamDataChange('difficulty', e.target.value)}
                  className="w-full bg-[#F5F7FC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-[#202B40] focus:outline-none focus:border-[#4169C1] focus:bg-white focus:ring-2 focus:ring-[#4169C1]/20 transition-all"
                >
                  <option value="Easy">Easy (Foundational)</option>
                  <option value="Medium">Medium (Standard Academic)</option>
                  <option value="Hard">Hard (Advanced / Analytical)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#202B40]">Duration (Minutes)</label>
                <input
                  type="number"
                  min="5"
                  max="480"
                  value={examData.duration_minutes}
                  onChange={(e) => handleExamDataChange('duration_minutes', e.target.value)}
                  className="w-full bg-[#F5F7FC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-[#202B40] focus:outline-none focus:border-[#4169C1] focus:bg-white focus:ring-2 focus:ring-[#4169C1]/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#202B40]">Total Marks</label>
                <input
                  type="number"
                  min="1"
                  value={examData.total_marks}
                  onChange={(e) => handleExamDataChange('total_marks', e.target.value)}
                  className="w-full bg-[#F5F7FC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-[#202B40] focus:outline-none focus:border-[#4169C1] focus:bg-white focus:ring-2 focus:ring-[#4169C1]/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#202B40]">Passing Marks</label>
                <input
                  type="number"
                  min="1"
                  value={examData.passing_marks}
                  onChange={(e) => handleExamDataChange('passing_marks', e.target.value)}
                  className="w-full bg-[#F5F7FC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-[#202B40] focus:outline-none focus:border-[#4169C1] focus:bg-white focus:ring-2 focus:ring-[#4169C1]/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#202B40]">Opening Date & Time (Optional)</label>
                <input
                  type="datetime-local"
                  value={examData.start_time}
                  onChange={(e) => handleExamDataChange('start_time', e.target.value)}
                  className="w-full bg-[#F5F7FC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-[#202B40] focus:outline-none focus:border-[#4169C1] focus:bg-white focus:ring-2 focus:ring-[#4169C1]/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#202B40]">Closing Date & Time (Optional)</label>
                <input
                  type="datetime-local"
                  value={examData.end_time}
                  onChange={(e) => handleExamDataChange('end_time', e.target.value)}
                  className="w-full bg-[#F5F7FC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-xs sm:text-sm text-[#202B40] focus:outline-none focus:border-[#4169C1] focus:bg-white focus:ring-2 focus:ring-[#4169C1]/20"
                />
              </div>
            </div>
          </div>

          
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] shadow-sm space-y-6">
            <h2 className="text-base font-bold text-[#202B40] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#4169C1]" />
              <span>Proctoring & Assessment Rules</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="bg-[#F5F7FC] p-5 rounded-2xl border border-[#E2E8F0] flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-sm font-bold text-[#202B40] flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#4169C1]" />
                    <span>AI Webcam Proctoring</span>
                  </div>
                  <p className="text-xs text-[#718096]">
                    Require camera verification before start. Displays live video, tracks face presence, and flags absence incidents.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={examData.ai_proctoring_enabled}
                    onChange={(e) => handleExamDataChange('ai_proctoring_enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#E2E8F0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#94A3B8] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#233B67]"></div>
                </label>
              </div>

              
              <div className="bg-[#F5F7FC] p-5 rounded-2xl border border-[#E2E8F0] space-y-2">
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#4169C1]" />
                  <span>Maximum Allowed Tab Switches</span>
                </div>
                <p className="text-xs text-[#718096]">
                  Candidate attempt will be flagged and warned when tab switches reach this threshold.
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={examData.max_tab_switches}
                    onChange={(e) => handleExamDataChange('max_tab_switches', e.target.value)}
                    className="w-24 bg-white border border-[#E2E8F0] rounded-xl px-3 py-1.5 text-xs text-[#202B40] focus:outline-none focus:border-[#4169C1] focus:ring-1 focus:ring-[#4169C1]/20"
                  />
                  <span className="text-xs text-[#718096]">Switches before severe flag</span>
                </div>
              </div>

              
              <div className="bg-[#F5F7FC] p-5 rounded-2xl border border-[#E2E8F0] space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <MinusCircle className="w-4 h-4 text-[#D95C65]" />
                      <span>Negative Marking</span>
                    </div>
                    <p className="text-xs text-[#718096]">
                      Deduct configured marks for incorrect objective responses during automated evaluation.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                    <input
                      type="checkbox"
                      checked={examData.negative_marking_enabled}
                      onChange={(e) => handleExamDataChange('negative_marking_enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#E2E8F0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#94A3B8] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#233B67]"></div>
                  </label>
                </div>

                {examData.negative_marking_enabled && (
                  <div className="flex items-center gap-3 pt-2 border-t border-[#E2E8F0]">
                    <span className="text-xs text-[#718096]">Default negative mark penalty:</span>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      value={examData.negative_marking_score}
                      onChange={(e) => handleExamDataChange('negative_marking_score', e.target.value)}
                      className="w-24 bg-[#F5F7FC] border border-[#E2E8F0] rounded-xl px-3 py-1.5 text-xs text-[#202B40] focus:outline-none focus:border-[#4169C1] focus:bg-white focus:ring-2 focus:ring-[#4169C1]/20"
                    />
                    <span className="text-xs text-[#718096]">Marks per wrong MCQ</span>
                  </div>
                )}
              </div>

              
              <div className="bg-[#F5F7FC] p-5 rounded-2xl border border-[#E2E8F0] space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <Shuffle className="w-4 h-4 text-[#299D70]" />
                      <span>Shuffle Questions</span>
                    </div>
                    <p className="text-xs text-[#718096]">
                      Randomizes question order per student attempt and preserves that order across refreshes.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                    <input
                      type="checkbox"
                      checked={examData.shuffle_questions}
                      onChange={(e) => handleExamDataChange('shuffle_questions', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#E2E8F0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#94A3B8] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#233B67]"></div>
                  </label>
                </div>

                <div className="flex items-start justify-between gap-4 pt-3 border-t border-[#E2E8F0]">
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-[#202B40]">Shuffle Answer Options</div>
                    <p className="text-xs text-[#718096]">
                      Randomizes MCQ options per student while safely preserving correct answer mappings.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                    <input
                      type="checkbox"
                      checked={examData.shuffle_options}
                      onChange={(e) => handleExamDataChange('shuffle_options', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#E2E8F0] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#94A3B8] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#233B67]"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => handleSaveDetails(true)}
              disabled={loading}
              className="px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold text-white bg-[#233B67] hover:bg-[#1C2F52] shadow-sm shadow-[#233B67]/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <span>Save Draft & Continue to Questions</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      
      {activeTab === 'questions' && (
        <div className="space-y-6">
          
          <div className="bg-white p-6 rounded-3xl border border-[#E2E8F0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-[#202B40]">Question Bank</h2>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#EDF2FA] text-[#233B67] border border-[#E2E8F0]">
                  {questions.length} Items Saved
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#EDF2FA] text-[#4169C1] border border-[#E2E8F0]">
                  {examData.total_marks} Total Marks
                </span>
              </div>
              <p className="text-xs text-[#718096] mt-1">
                Author assessment items manually or use AI generation to quickly draft comprehensive question sets.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={openAiGenerationModal}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#4169C1] bg-[#EDF2FA] hover:bg-[#4169C1]/10 border border-[#4169C1]/30 transition-all flex items-center gap-2 shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-[#4169C1]" />
                <span>Generate with AI</span>
              </button>
              <button
                onClick={openAddQuestionModal}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#233B67] hover:bg-[#1C2F52] shadow-sm shadow-[#233B67]/20 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Question</span>
              </button>
            </div>
          </div>

          
          {questions.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-3xl bg-white border border-[#E2E8F0] shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#EDF2FA] text-[#4169C1] flex items-center justify-center mx-auto mb-2">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#202B40]">No questions added yet</h3>
              <p className="text-xs text-[#718096] max-w-md mx-auto">
                Begin populating this examination paper by manually creating questions or generating a structured question set with AI.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={openAiGenerationModal}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#4169C1] bg-[#EDF2FA] hover:bg-[#4169C1]/10 border border-[#4169C1]/30 transition-all inline-flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-[#4169C1]" />
                  <span>Generate with AI</span>
                </button>
                <button
                  onClick={openAddQuestionModal}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#233B67] hover:bg-[#1C2F52] shadow-sm shadow-[#233B67]/20 transition-all inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Manually</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div
                  key={q.id || idx}
                  className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4 hover:border-[#4169C1]/40 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-[#EDF2FA] text-[#233B67] text-xs font-bold flex items-center justify-center font-mono">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-[#4169C1] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#EDF2FA] border border-[#4169C1]/30">
                        {q.question_type.replace('_', ' ')}
                      </span>
                      <span className="text-xs font-medium text-[#718096] px-2.5 py-0.5 rounded-full bg-[#F5F7FC] border border-[#E2E8F0]">
                        {q.difficulty || 'Medium'}
                      </span>
                      <span className="text-xs font-bold text-[#299D70]">
                        {q.marks} {q.marks === 1 ? 'Mark' : 'Marks'}
                      </span>
                      {q.negative_marks > 0 && (
                        <span className="text-xs font-semibold text-[#D95C65]">
                          (-{q.negative_marks})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditQuestionModal(q)}
                        className="p-1.5 rounded-lg text-[#718096] hover:text-[#202B40] hover:bg-[#EDF2FA] transition-colors"
                        title="Edit question"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="p-1.5 rounded-lg text-[#D95C65] hover:text-[#D95C65] hover:bg-[#D95C65]/10 transition-colors"
                        title="Delete question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm font-semibold text-[#202B40] leading-relaxed">
                    {q.question_text}
                  </p>

                  
                  {['mcq', 'multi_select'].includes(q.question_type) && q.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt, optIdx) => {
                        const isCorrect = q.correct_answer && q.correct_answer.toLowerCase().includes(opt.toLowerCase());
                        return (
                          <div
                            key={optIdx}
                            className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                              isCorrect
                                ? 'bg-[#299D70]/10 border-[#299D70]/40 text-[#299D70] font-semibold'
                                : 'bg-[#F5F7FC] border-[#E2E8F0] text-[#718096]'
                            }`}
                          >
                            <span className="w-5 h-5 rounded-md bg-[#EDF2FA] flex items-center justify-center font-bold text-[11px] text-[#718096]">
                              {chr(optIdx)}
                            </span>
                            <span className="flex-1">{opt}</span>
                            {isCorrect && <Check className="w-3.5 h-3.5 text-[#299D70] flex-shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  
                  {['short_answer', 'long_answer'].includes(q.question_type) && (
                    <div className="p-3.5 rounded-xl bg-[#EDF2FA] border border-[#E2E8F0] text-xs space-y-1">
                      <span className="text-[11px] font-bold text-[#4169C1] uppercase tracking-wider block">
                        Model Answer / Key Points:
                      </span>
                      <p className="text-[#202B40] leading-relaxed font-mono">
                        {q.correct_answer || 'Standard academic evaluation criteria.'}
                      </p>
                    </div>
                  )}

                  {q.explanation && (
                    <div className="text-xs text-[#718096] italic">
                      <strong className="text-[#202B40] not-italic">Explanation:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          
          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setActiveTab('details')}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-[#718096] bg-[#EDF2FA] border border-[#E2E8F0] hover:text-[#202B40]"
            >
              Back to Details
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#233B67] hover:bg-[#1C2F52] shadow-sm shadow-[#233B67]/20 flex items-center gap-2"
            >
              <span>Continue to Assign Students</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      
      {activeTab === 'students' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <div className="bg-white p-6 rounded-3xl border border-[#E2E8F0] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#202B40] flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#4169C1]" />
                    <span>Eligible Approved Students</span>
                  </h3>
                  <p className="text-xs text-[#718096]">Select candidates to grant examination access</p>
                </div>
                <button
                  onClick={handleAssignSelectedStudents}
                  disabled={loading || selectedStudentEmails.size === 0}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#233B67] hover:bg-[#1C2F52] shadow-sm shadow-[#233B67]/20 transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Assign Selected ({selectedStudentEmails.size})</span>
                </button>
              </div>

              
              <div className="relative">
                <Search className="w-4 h-4 text-[#718096] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Filter available students by name, email, roll no..."
                  className="w-full bg-[#F5F7FC] border border-[#E2E8F0] rounded-xl pl-9 pr-3.5 py-2 text-xs text-[#202B40] placeholder-[#718096]/60 focus:outline-none focus:border-[#4169C1] focus:bg-white"
                />
              </div>

              
              <div className="flex items-center justify-between text-xs text-[#718096] px-2 pt-1 border-b border-[#E2E8F0] pb-2">
                <button
                  onClick={() => toggleSelectAllAvailable(filteredAvailableStudents)}
                  className="inline-flex items-center gap-2 font-medium hover:text-[#202B40]"
                >
                  {filteredAvailableStudents.length > 0 &&
                  filteredAvailableStudents.every((st) => selectedStudentEmails.has(st.email)) ? (
                    <CheckSquare className="w-4 h-4 text-[#4169C1]" />
                  ) : (
                    <Square className="w-4 h-4 text-[#718096]/60" />
                  )}
                  <span>Select All ({filteredAvailableStudents.length})</span>
                </button>
                <span>{selectedStudentEmails.size} checked</span>
              </div>

              
              {assignmentLoading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-2">
                  <div className="w-8 h-8 border-3 border-[#E2E8F0] border-t-[#233B67] rounded-full animate-spin"></div>
                  <p className="text-xs text-[#718096]">Loading student directory...</p>
                </div>
              ) : filteredAvailableStudents.length === 0 ? (
                <div className="text-center py-12 text-[#718096] text-xs">
                  {studentSearch ? 'No matching available candidates found.' : 'All eligible students have already been assigned.'}
                </div>
              ) : (
                <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
                  {filteredAvailableStudents.map((st) => {
                    const isChecked = selectedStudentEmails.has(st.email);
                    return (
                      <div
                        key={st.email}
                        onClick={() => toggleSelectStudent(st.email)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-3 ${
                          isChecked
                            ? 'bg-[#EDF2FA] border-[#4169C1]/40 text-[#202B40] shadow-sm'
                            : 'bg-[#F5F7FC] border-[#E2E8F0] text-[#718096] hover:bg-[#EDF2FA]/70'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-[#4169C1] flex-shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-[#718096]/60 flex-shrink-0" />
                          )}
                          <div>
                            <div className="font-semibold text-[#202B40] leading-tight">{st.name}</div>
                            <div className="text-[11px] text-[#718096] mt-0.5">{st.email}</div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[11px] font-mono text-[#4169C1] bg-[#EDF2FA] px-2 py-0.5 rounded-md">
                            {st.roll_number || 'N/A'}
                          </span>
                          <div className="text-[10px] text-[#718096] mt-0.5">{st.class_year || ''}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            
            <div className="bg-white p-6 rounded-3xl border border-[#E2E8F0] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#202B40] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#299D70]" />
                    <span>Currently Assigned Candidates</span>
                  </h3>
                  <p className="text-xs text-[#718096]">
                    Candidates authorized to view and sit for this examination
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#299D70]/10 text-[#299D70] border border-[#299D70]/30">
                  {assignedStudents.length} Assigned
                </span>
              </div>

              {assignedStudents.length === 0 ? (
                <div className="text-center py-16 text-[#718096] text-xs rounded-2xl bg-[#F5F7FC] border border-[#E2E8F0] space-y-2">
                  <Users className="w-8 h-8 text-[#718096]/50 mx-auto" />
                  <p className="font-semibold text-[#202B40]">No candidates assigned yet.</p>
                  <p className="text-[11px] text-[#718096]">Select candidates from the left panel and click "Assign Selected".</p>
                </div>
              ) : (
                <div className="max-h-[440px] overflow-y-auto space-y-2 pr-1">
                  {assignedStudents.map((st) => (
                    <div
                      key={st.student_email}
                      className="p-3.5 rounded-xl bg-[#F5F7FC] border border-[#E2E8F0] text-xs flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-semibold text-[#202B40] leading-tight flex items-center gap-2">
                          <span>{st.student_name}</span>
                          {st.has_started && (
                            <span className="text-[10px] bg-[#EDF2FA] text-[#4169C1] border border-[#4169C1]/30 px-2 py-0.5 rounded-full font-semibold">
                              Attempt Started
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#718096] mt-0.5 flex items-center gap-2">
                          <span>{st.student_email}</span>
                          <span>•</span>
                          <span className="font-mono">{st.roll_number}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleUnassignStudent(st.student_email, st.has_started)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                          st.has_started
                            ? 'text-[#718096]/50 border-[#E2E8F0] cursor-not-allowed'
                            : 'text-[#D95C65] hover:text-[#202B40] hover:bg-[#D95C65] bg-[#D95C65]/10 border border-[#D95C65]/30'
                        }`}
                        title={st.has_started ? 'Attempt already initiated; removal prohibited' : 'Unassign candidate'}
                      >
                        Unassign
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#202B40]/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] w-full max-w-2xl space-y-5 my-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <h3 className="text-lg font-bold text-[#202B40] flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#4169C1]" />
                <span>{editingQuestionId ? 'Edit Question' : 'Add New Question'}</span>
              </h3>
              <button
                onClick={() => setShowQuestionModal(false)}
                className="text-[#718096] hover:text-[#202B40] hover:bg-[#EDF2FA] p-1.5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[#202B40]">Question Type</label>
                  <select
                    value={questionForm.question_type}
                    onChange={(e) => setQuestionForm({ ...questionForm, question_type: e.target.value })}
                    className="w-full bg-[#F5F7FC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-[#202B40] focus:outline-none focus:border-[#4169C1] focus:bg-white"
                  >
                    <option value="mcq">Multiple Choice (Single)</option>
                    <option value="multi_select">Multi-Select (Multiple)</option>
                    <option value="short_answer">Short Answer</option>
                    <option value="long_answer">Long Answer / Descriptive</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#202B40]">Marks</label>
                  <input
                    type="number"
                    min="1"
                    value={questionForm.marks}
                    onChange={(e) => setQuestionForm({ ...questionForm, marks: e.target.value })}
                    className="w-full bg-[#F5F7FC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-[#202B40] focus:outline-none focus:border-[#4169C1] focus:bg-white focus:ring-2 focus:ring-[#4169C1]/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#202B40]">Difficulty</label>
                  <select
                    value={questionForm.difficulty}
                    onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value })}
                    className="w-full bg-[#F5F7FC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-[#202B40] focus:outline-none focus:border-[#4169C1] focus:bg-white focus:ring-2 focus:ring-[#4169C1]/20"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              {examData.negative_marking_enabled && (
                <div className="space-y-1">
                  <label className="font-semibold text-[#D95C65]">Negative Marks Penalty (if wrong)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    value={questionForm.negative_marks}
                    onChange={(e) => setQuestionForm({ ...questionForm, negative_marks: e.target.value })}
                    className="w-full bg-[#F5F7FC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-[#202B40] focus:outline-none focus:border-[#4169C1] focus:bg-white focus:ring-2 focus:ring-[#4169C1]/20"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="font-semibold text-[#202B40]">Question Statement <span className="text-[#4169C1]">*</span></label>
                <textarea
                  rows={3}
                  value={questionForm.question_text}
                  onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                  placeholder="Enter the complete question statement..."
                  className="w-full bg-[#F5F7FC] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-[#202B40] placeholder-[#718096]/60 focus:outline-none focus:border-[#4169C1] focus:bg-white"
                />
              </div>

              
              {['mcq', 'multi_select'].includes(questionForm.question_type) && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-[#202B40]">
                      Options & Correct Answer Selection
                    </label>
                    <button
                      type="button"
                      onClick={() => setQuestionForm({ ...questionForm, options: [...questionForm.options, ''] })}
                      className="text-xs text-[#4169C1] hover:text-[#233B67] font-semibold"
                    >
                      + Add Option
                    </button>
                  </div>

                  <div className="space-y-2">
                    {questionForm.options.map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-[#E2E8F0] flex items-center justify-center font-bold text-xs text-[#718096] flex-shrink-0">
                          {chr(optIdx)}
                        </span>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const updated = [...questionForm.options];
                            updated[optIdx] = e.target.value;
                            setQuestionForm({ ...questionForm, options: updated });
                          }}
                          placeholder={`Option ${chr(optIdx)} text...`}
                          className="flex-1 bg-[#F5F7FC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-[#202B40] placeholder-[#718096]/60 focus:outline-none focus:border-[#4169C1] focus:bg-white focus:ring-2 focus:ring-[#4169C1]/20"
                        />
                        {questionForm.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = questionForm.options.filter((_, i) => i !== optIdx);
                              setQuestionForm({ ...questionForm, options: updated });
                            }}
                            className="p-1.5 text-[#D95C65] hover:text-[#D95C65]"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1 pt-1">
                    <label className="font-semibold text-[#299D70]">
                      {questionForm.question_type === 'mcq'
                        ? 'Correct Answer Option (Text or Option Letter)'
                        : 'Correct Options (Separate with comma, e.g. A, C or exact option texts)'}
                    </label>
                    <input
                      type="text"
                      value={questionForm.correct_answer}
                      onChange={(e) => setQuestionForm({ ...questionForm, correct_answer: e.target.value })}
                      placeholder={questionForm.question_type === 'mcq' ? 'e.g. Option A or exact text' : 'e.g. Option A, Option B'}
                      className="w-full bg-[#F5F7FC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-[#202B40] placeholder-[#718096]/60 focus:outline-none focus:border-[#4169C1] focus:bg-white font-semibold"
                    />
                  </div>
                </div>
              )}

              
              {['short_answer', 'long_answer'].includes(questionForm.question_type) && (
                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <label className="font-semibold text-[#202B40]">
                      Model Answer / Evaluation Criteria <span className="text-[#4169C1]">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={questionForm.correct_answer}
                      onChange={(e) => setQuestionForm({ ...questionForm, correct_answer: e.target.value })}
                      placeholder="Comprehensive model answer and key scoring points for evaluation..."
                      className="w-full bg-[#F5F7FC] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-[#202B40] placeholder-[#718096]/60 focus:outline-none focus:border-[#4169C1] focus:bg-white font-mono"
                    />
                  </div>

                  {questionForm.question_type === 'long_answer' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[#718096]">Min Word Count (Optional)</label>
                        <input
                          type="number"
                          value={questionForm.min_words || ''}
                          onChange={(e) => setQuestionForm({ ...questionForm, min_words: e.target.value })}
                          className="w-full bg-[#F5F7FC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-[#202B40] focus:outline-none focus:border-[#4169C1] focus:bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[#718096]">Max Word Count (Optional)</label>
                        <input
                          type="number"
                          value={questionForm.max_words || ''}
                          onChange={(e) => setQuestionForm({ ...questionForm, max_words: e.target.value })}
                          className="w-full bg-[#F5F7FC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <label className="font-semibold text-[#718096]">Explanation (Shown after exam release)</label>
                <textarea
                  rows={2}
                  value={questionForm.explanation}
                  onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                  placeholder="Pedagogical rationale or feedback explanation..."
                  className="w-full bg-[#F5F7FC] border border-[#E2E8F0] rounded-xl px-3.5 py-2 text-[#202B40] placeholder-[#718096]/60 focus:outline-none focus:border-[#4169C1] focus:bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setShowQuestionModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#718096] bg-[#EDF2FA] border border-[#E2E8F0] hover:text-[#202B40]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveQuestion}
                disabled={loading}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#233B67] hover:bg-[#1C2F52] shadow-sm shadow-[#233B67]/20 disabled:opacity-50"
              >
                {editingQuestionId ? 'Update Question' : 'Add to Examination'}
              </button>
            </div>
          </div>
        </div>
      )}

      
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#202B40]/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] w-full max-w-3xl space-y-5 my-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <h3 className="text-lg font-bold text-[#202B40] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#4169C1]" />
                <span>AI Question Generator</span>
              </h3>
              <button
                onClick={() => {
                  if (!aiGenerating) setShowAiModal(false);
                }}
                disabled={aiGenerating}
                className="text-[#718096] hover:text-[#202B40] hover:bg-[#EDF2FA] p-1.5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title={aiGenerating ? 'AI generation in progress...' : 'Close modal'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {aiGenerating ? (
              
              <div className="py-10 sm:py-14 flex flex-col items-center justify-center min-h-[380px] animate-fade-in">
                <GeneratingLoader
                  title="Generating questions with AI"
                  subtitle="Preparing questions based on your selected subject, topic, and difficulty."
                  ariaLabel="Generating questions with AI"
                />
              </div>
            ) : !aiReviewStep ? (
              
              <div className="space-y-4 text-xs">
                <p className="text-[#718096]">
                  Configure question distribution and pedagogical instructions. The AI will generate candidate questions for your review before insertion.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-semibold text-[#202B40]">Subject</label>
                    <input
                      type="text"
                      value={aiForm.subject}
                      onChange={(e) => setAiForm({ ...aiForm, subject: e.target.value })}
                      className="w-full bg-[#F5F7FC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-[#202B40] focus:outline-none focus:border-[#4169C1] focus:bg-white focus:ring-2 focus:ring-[#4169C1]/20"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-[#202B40]">Topic / Domain</label>
                    <input
                      type="text"
                      value={aiForm.topic}
                      onChange={(e) => setAiForm({ ...aiForm, topic: e.target.value })}
                      className="w-full bg-[#F5F7FC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-[#202B40] focus:outline-none focus:border-[#4169C1] focus:bg-white focus:ring-2 focus:ring-[#4169C1]/20"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-[#202B40]">Difficulty</label>
                    <select
                      value={aiForm.difficulty}
                      onChange={(e) => setAiForm({ ...aiForm, difficulty: e.target.value })}
                      className="w-full bg-[#F5F7FC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-[#202B40] focus:outline-none focus:border-[#4169C1] focus:bg-white focus:ring-2 focus:ring-[#4169C1]/20"
                    >
                      <option value="Easy">Easy (Foundational)</option>
                      <option value="Medium">Medium (Standard)</option>
                      <option value="Hard">Hard (Advanced / Critical Thinking)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-[#202B40]">Multiple Choice Questions (MCQ)</label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={aiForm.mcq_count}
                      onChange={(e) => handleAiCountChange('mcq_count', e.target.value)}
                      className="w-full bg-[#F5F7FC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-[#202B40] focus:outline-none focus:border-[#4169C1] focus:bg-white focus:ring-2 focus:ring-[#4169C1]/20"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-[#202B40]">Multi-Select Questions</label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={aiForm.multi_select_count}
                      onChange={(e) => handleAiCountChange('multi_select_count', e.target.value)}
                      className="w-full bg-[#F5F7FC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-[#202B40] focus:outline-none focus:border-[#4169C1] focus:bg-white focus:ring-2 focus:ring-[#4169C1]/20"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-[#202B40]">Short-Answer Questions</label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={aiForm.short_answer_count}
                      onChange={(e) => handleAiCountChange('short_answer_count', e.target.value)}
                      className="w-full bg-[#F5F7FC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-[#202B40] focus:outline-none focus:border-[#4169C1] focus:bg-white focus:ring-2 focus:ring-[#4169C1]/20"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-[#202B40]">Long-Answer / Descriptive</label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={aiForm.long_answer_count}
                      onChange={(e) => handleAiCountChange('long_answer_count', e.target.value)}
                      className="w-full bg-[#F5F7FC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-[#202B40] focus:outline-none focus:border-[#4169C1] focus:bg-white focus:ring-2 focus:ring-[#4169C1]/20"
                    />
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <label className="font-semibold text-[#202B40]">Additional Instructions (Optional)</label>
                  <textarea
                    rows={2}
                    value={aiForm.instructions}
                    onChange={(e) => setAiForm({ ...aiForm, instructions: e.target.value })}
                    placeholder="e.g. Emphasize algorithmic complexity and dynamic programming..."
                    className="w-full bg-[#F5F7FC] border border-[#E2E8F0] rounded-xl px-3.5 py-2 text-[#202B40] placeholder-[#718096]/60 focus:outline-none focus:border-[#4169C1] focus:bg-white focus:ring-2 focus:ring-[#4169C1]/20"
                  />
                </div>

                <div className="p-3 rounded-xl bg-[#EDF2FA] border border-[#E2E8F0] text-xs text-[#233B67] flex items-center justify-between">
                  <span>Total questions to generate:</span>
                  <strong className="text-[#202B40] text-sm">
                    {totalAiQuestions} {totalAiQuestions === 1 ? 'Question' : 'Questions'}
                  </strong>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
                  <button
                    type="button"
                    onClick={() => setShowAiModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[#718096] bg-[#EDF2FA] border border-[#E2E8F0] hover:text-[#202B40]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRunAiGeneration}
                    disabled={aiGenerating}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#233B67] hover:bg-[#1C2F52] shadow-sm shadow-[#233B67]/20 flex items-center gap-2 disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Question Set</span>
                  </button>
                </div>
              </div>
            ) : (
              
              <div className="space-y-4 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#F5F7FC] p-3 rounded-xl border border-[#E2E8F0] gap-2">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={toggleSelectAllAi}
                      className="inline-flex items-center gap-1.5 font-bold text-[#4169C1] hover:text-[#233B67]"
                    >
                      {aiSelectedIndices.size === aiGeneratedList.length ? (
                        <CheckSquare className="w-4 h-4 text-[#4169C1]" />
                      ) : (
                        <Square className="w-4 h-4 text-[#718096]/60" />
                      )}
                      <span>
                        {aiSelectedIndices.size === aiGeneratedList.length ? 'Deselect All' : 'Select All'}
                      </span>
                    </button>
                    <span className="text-[#718096]">
                      ({aiSelectedIndices.size} of {aiGeneratedList.length} Selected)
                    </span>
                  </div>

                  <button
                    onClick={() => setAiReviewStep(false)}
                    className="text-xs text-[#718096] hover:text-[#202B40] underline font-semibold text-left sm:text-right"
                  >
                    Back to Generator Settings
                  </button>
                </div>

                {aiGeneratedList.length < aiRequestedTotal && (
                  <div className="p-3 rounded-xl bg-[#D69B35]/10 border border-[#D69B35]/30 text-xs text-[#D69B35] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-[#D69B35] flex-shrink-0" />
                    <span>
                      AI generated {aiGeneratedList.length} of {aiRequestedTotal} requested questions due to model output limits. You can review and select from the generated items below.
                    </span>
                  </div>
                )}

                <div className="max-h-[420px] overflow-y-auto space-y-3 pr-1">
                  {aiGeneratedList.map((q, idx) => {
                    const isChecked = aiSelectedIndices.has(idx);
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleAiSelect(idx)}
                        className={`p-4 rounded-2xl border text-xs cursor-pointer transition-all space-y-2.5 ${
                          isChecked
                            ? 'bg-[#EDF2FA] border-[#4169C1]/40 shadow-sm'
                            : 'bg-[#F5F7FC] border-[#E2E8F0] opacity-70 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-[#4169C1] flex-shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-[#718096]/60 flex-shrink-0" />
                            )}
                            <span className="font-semibold text-[#4169C1] uppercase tracking-wider text-[10px] px-2.5 py-0.5 rounded-full bg-white border border-[#4169C1]/30">
                              {q.question_type.replace('_', ' ')}
                            </span>
                            <span className="text-[#718096] text-[10px]">{q.difficulty}</span>
                            <span className="text-[#299D70] font-bold">{q.marks} Marks</span>
                          </div>
                        </div>

                        <p className="text-[#202B40] font-medium pl-6 leading-relaxed">
                          {q.question_text}
                        </p>

                        {q.options && (
                          <div className="grid grid-cols-2 gap-1.5 pl-6 pt-1">
                            {q.options.map((opt, optIdx) => (
                              <div
                                key={optIdx}
                                className="p-2 rounded-lg bg-white border border-[#E2E8F0] text-[11px] text-[#718096] truncate"
                              >
                                <strong>{chr(optIdx)}.</strong> {opt}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="pl-6 pt-1 text-[11px] text-[#718096] font-mono">
                          <strong className="text-[#299D70] font-sans not-italic">Answer Key:</strong> {q.correct_answer}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0]">
                  <span className="text-xs text-[#718096]">
                    Only checked items will be inserted into your examination paper.
                  </span>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowAiModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-[#718096] bg-[#EDF2FA] border border-[#E2E8F0] hover:text-[#202B40]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddSelectedAiQuestions}
                      disabled={aiAdding || aiSelectedIndices.size === 0}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#233B67] hover:bg-[#233B67] shadow-md shadow-[#233B67]/20 flex items-center gap-2 disabled:opacity-50"
                    >
                      {aiAdding ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving Selected Questions...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Add {aiSelectedIndices.size} Selected Questions</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      
      <Modal
        isOpen={uiModal.isOpen}
        onClose={() => setUiModal((prev) => ({ ...prev, isOpen: false }))}
        type={uiModal.type}
        title={uiModal.title}
        message={uiModal.message}
        confirmText={uiModal.confirmText}
        cancelText={uiModal.cancelText}
        loading={uiModal.loading}
        onConfirm={uiModal.onConfirm}
      />
    </div>
  );
};

function chr(index) {
  return String.fromCharCode(65 + index);
}

export default TeacherCreateExam;

