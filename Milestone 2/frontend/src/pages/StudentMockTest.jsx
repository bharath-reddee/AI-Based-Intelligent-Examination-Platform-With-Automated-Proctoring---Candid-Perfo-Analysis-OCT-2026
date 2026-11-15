import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import apiClient, { formatApiError, API_BASE_URL } from "../api/axios";
import {
  Sparkles,
  BookOpen,
  Clock,
  Award,
  Play,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertCircle,
  RotateCcw,
  Trash2,
  Eye,
  Flag,
  Check,
  Camera,
  Upload,
  X,
  Shield,
  FileText,
  RefreshCw,
  AlertTriangle,
  HelpCircle,
  Plus,
  Minus,
  Timer,
  CheckSquare,
  Square,
  Layers,
  CheckCircle2,
} from "lucide-react";
import Modal from "../components/Modal";
import MathFormula from "../components/MathFormula";
import PracticeGenerationLoader from "../components/PracticeGenerationLoader";

const PRESET_TOPICS = {
  "Computer Science & Engineering": [
    "Algorithms & Data Structures",
    "Operating Systems & Memory Management",
    "Computer Networks & Network Security",
    "Database Management Systems & Normalization",
    "Object-Oriented Design & Principles",
  ],
  "Artificial Intelligence & Machine Learning": [
    "Supervised & Unsupervised Learning",
    "Deep Neural Networks & Backpropagation",
    "Natural Language Processing & Transformers",
    "Model Evaluation: Bias-Variance & Metrics",
    "Reinforcement Learning Basics",
  ],
  "Physics & Engineering Thermodynamics": [
    "Reversible Adiabatic & Isothermal Processes",
    "First & Second Laws of Thermodynamics",
    "Carnot Engine & Entropy Calculations",
    "Fluid Dynamics & Bernoulli's Principle",
    "Electromagnetism & Maxwell's Equations",
  ],
  "Mathematics & Discrete Structures": [
    "Probability Theory & Bayes' Rule",
    "Linear Algebra: Eigenvalues & Vector Spaces",
    "Calculus: Integration & Optimization",
    "Graph Theory & Combinatorics",
    "Differential Equations",
  ],
  "Software Engineering & Cloud Architecture": [
    "Distributed Systems & Consensus Protocols",
    "RESTful API Design & Microservices",
    "Containerization & Kubernetes Basics",
    "Authentication: JWT & OAuth 2.0 Protocols",
    "Database Indexing & Query Optimization",
  ],
};

const StudentMockTest = () => {
  const navigate = useNavigate();

  
  const [mode, setMode] = useState("config");

  
  const [subject, setSubject] = useState("");
  const [subjectError, setSubjectError] = useState("");
  const [topic, setTopic] = useState("Algorithms & Data Structures");
  const [difficulty, setDifficulty] = useState("Medium");
  const [mcqCount, setMcqCount] = useState(3);
  const [multiSelectCount, setMultiSelectCount] = useState(1);
  const [shortAnswerCount, setShortAnswerCount] = useState(1);
  const [longAnswerCount, setLongAnswerCount] = useState(0);
  const [isTimed, setIsTimed] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [topicSuggestions, setTopicSuggestions] = useState(
    PRESET_TOPICS["Computer Science & Engineering"] || []
  );

  
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [configError, setConfigError] = useState("");
  const [generating, setGenerating] = useState(false);

  
  const [practiceHistory, setPracticeHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [deleteAttemptTarget, setDeleteAttemptTarget] = useState(null);
  const [deletingAttempt, setDeletingAttempt] = useState(false);

  
  const [activeTest, setActiveTest] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [uploadedPhotos, setUploadedPhotos] = useState({});
  const [flaggedQuestions, setFlaggedQuestions] = useState([]);
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  
  const [resultData, setResultData] = useState(null);
  const [resultFilter, setResultFilter] = useState("all");

  const timerRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  
  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    setHistoryError("");
    try {
      const res = await apiClient.get("/mocks/history");
      setPracticeHistory(res.data || []);
    } catch (err) {
      setHistoryError(formatApiError(err));
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
    
    const searchParams = new URLSearchParams(window.location.search);
    const paramAttemptId = searchParams.get('attempt_id');
    if (paramAttemptId) {
      handleViewResult(paramAttemptId);
    }

    
    apiClient
      .get("/mocks/topics")
      .then((res) => {
        if (res.data?.categories) {
          const currentSubj = subject || "Computer Science & Engineering";
          if (res.data.categories[currentSubj]) {
            setTopicSuggestions(res.data.categories[currentSubj]);
          }
        }
      })
      .catch(() => {});
  }, [fetchHistory]);

  
  const handleSubjectChange = (val) => {
    setSubject(val);
    if (subjectError) setSubjectError("");
    if (configError) setConfigError("");

    const trimmed = val.trim();
    const matchedKey = Object.keys(PRESET_TOPICS).find(
      (k) => k.toLowerCase() === trimmed.toLowerCase()
    );
    if (matchedKey) {
      setTopicSuggestions(PRESET_TOPICS[matchedKey]);
    }
  };

  const handleSubjectBlur = () => {
    if (!subject.trim()) {
      setSubjectError("Subject name is required.");
    } else {
      setSubjectError("");
    }
  };

  
  const totalQuestions =
    mcqCount + multiSelectCount + shortAnswerCount + longAnswerCount;

  
  useEffect(() => {
    if (mode !== "taking" || !activeTest?.is_timed || remainingSeconds === null)
      return;

    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleFinalSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [mode, activeTest?.is_timed, remainingSeconds]);

  
  const handleAnswerChange = (qId, val) => {
    setAnswers((prev) => ({ ...prev, [qId]: val }));
  };

  
  const handleMultiSelectToggle = (qId, optionText) => {
    const current = answers[qId];
    let selectedList = [];
    if (Array.isArray(current)) {
      selectedList = [...current];
    } else if (typeof current === "string" && current.trim().startsWith("[")) {
      try {
        selectedList = JSON.parse(current);
      } catch {
        selectedList = current ? [current] : [];
      }
    } else if (current) {
      selectedList = [current];
    }

    if (selectedList.includes(optionText)) {
      selectedList = selectedList.filter((item) => item !== optionText);
    } else {
      selectedList.push(optionText);
    }

    const jsonVal = JSON.stringify(selectedList);
    handleAnswerChange(qId, jsonVal);
  };

  
  const handleToggleFlag = (qId) => {
    const isCurrentlyFlagged = flaggedQuestions.includes(qId);
    let nextFlags;
    if (isCurrentlyFlagged) {
      nextFlags = flaggedQuestions.filter((id) => id !== qId);
    } else {
      nextFlags = [...flaggedQuestions, qId];
    }
    setFlaggedQuestions(nextFlags);
  };

  
  const handlePhotoUpload = async (e, qId) => {
    const file = e.target.files?.[0];
    if (!file || !activeTest?.attempt_id) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB. Please upload a smaller photo.");
      return;
    }

    const formData = new FormData();
    formData.append("photo", file);
    formData.append("question_id", qId);

    setUploadingPhoto(true);
    try {
      const res = await apiClient.post(
        `/mocks/attempts/${activeTest.attempt_id}/upload-photo`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      if (res.data?.image_url) {
        setUploadedPhotos((prev) => ({
          ...prev,
          [qId]: res.data.image_url,
        }));
      }
    } catch (err) {
      alert(formatApiError(err));
    } finally {
      setUploadingPhoto(false);
      if (e.target) e.target.value = "";
    }
  };

  
  const handleRemovePhoto = (qId) => {
    setUploadedPhotos((prev) => {
      const updated = { ...prev };
      delete updated[qId];
      return updated;
    });
  };

  
  const handleGenerateAndStart = async (e) => {
    e.preventDefault();
    setConfigError("");
    setSubjectError("");

    const activeSubject = subject.trim();

    if (!activeSubject) {
      setSubjectError("Please enter a subject name.");
      setConfigError("Please enter a subject name.");
      return;
    }
    if (!topic.trim()) {
      setConfigError("Please enter or select a topic.");
      return;
    }
    if (totalQuestions <= 0) {
      setConfigError(
        "Please allocate at least 1 question across the question types."
      );
      return;
    }
    if (totalQuestions > 30) {
      setConfigError(
        "Maximum 30 questions permitted per practice test. Please adjust counts."
      );
      return;
    }

    setGenerating(true);
    try {
      const payload = {
        subject: activeSubject,
        topic: topic.trim(),
        difficulty,
        mcq_count: mcqCount,
        multi_select_count: multiSelectCount,
        short_answer_count: shortAnswerCount,
        long_answer_count: longAnswerCount,
        is_timed: isTimed,
        duration_minutes: isTimed ? parseInt(durationMinutes, 10) : 0,
      };

      const res = await apiClient.post("/mocks/generate", payload);
      const testData = res.data;

      setActiveTest(testData);
      setCurrentIndex(0);
      setAnswers(testData.saved_answers || {});
      setUploadedPhotos(testData.saved_images || {});
      setFlaggedQuestions(testData.flagged_questions || []);

      if (testData.is_timed && testData.remaining_seconds !== null) {
        setRemainingSeconds(testData.remaining_seconds);
      } else {
        setRemainingSeconds(null);
      }

      setMode("taking");
    } catch (err) {
      setConfigError(formatApiError(err));
    } finally {
      setGenerating(false);
    }
  };

  
  const handleFinalSubmit = async () => {
    if (!activeTest?.attempt_id || submitting) return;
    setSubmitting(true);
    setConfigError("");

    try {
      const payloadAnswers = (activeTest.questions || []).map((q) => {
        const isSubjective =
          q.question_type === "short_answer" ||
          q.question_type === "long_answer";
        return {
          question_id: q.id,
          answer_text: answers[q.id] || "",
          image_url: isSubjective ? (uploadedPhotos[q.id] || null) : null,
        };
      });

      const res = await apiClient.post(
        `/mocks/attempts/${activeTest.attempt_id}/submit`,
        {
          answers: payloadAnswers,
        }
      );

      setResultData(res.data);
      setShowSubmitConfirm(false);
      setMode("result");
      fetchHistory();
    } catch (err) {
      alert(`Submission error: ${formatApiError(err)}`);
    } finally {
      setSubmitting(false);
    }
  };

  
  const handleViewResult = async (attemptId) => {
    try {
      const res = await apiClient.get(`/mocks/attempts/${attemptId}/result`);
      setResultData(res.data);
      setMode("result");
    } catch (err) {
      alert(`Unable to load result: ${formatApiError(err)}`);
    }
  };

  
  const handleRetake = async (attemptId) => {
    try {
      const res = await apiClient.post(`/mocks/attempts/${attemptId}/retake`);
      const newAttemptId = res.data.new_attempt_id;
      
      const attemptRes = await apiClient.get(
        `/mocks/attempts/${newAttemptId}`
      );
      const testData = attemptRes.data;

      setActiveTest(testData);
      setCurrentIndex(0);
      setAnswers({});
      setUploadedPhotos({});
      setFlaggedQuestions([]);

      if (testData.is_timed && testData.remaining_seconds !== null) {
        setRemainingSeconds(testData.remaining_seconds);
      } else {
        setRemainingSeconds(null);
      }

      setMode("taking");
    } catch (err) {
      alert(`Unable to retake practice test: ${formatApiError(err)}`);
    }
  };

  
  const handleDeleteAttempt = async () => {
    if (!deleteAttemptTarget) return;
    setDeletingAttempt(true);
    try {
      await apiClient.delete(
        `/mocks/attempts/${deleteAttemptTarget.attempt_id}`
      );
      setPracticeHistory((prev) =>
        prev.filter((p) => p.attempt_id !== deleteAttemptTarget.attempt_id)
      );
      setDeleteAttemptTarget(null);
    } catch (err) {
      alert(`Delete failed: ${formatApiError(err)}`);
    } finally {
      setDeletingAttempt(false);
    }
  };

  
  
  
  if (mode === "result" && resultData) {
    const questionResults = resultData.question_results || [];

    const filteredQuestions = questionResults.filter((q) => {
      if (resultFilter === "correct") return q.is_correct === true;
      if (resultFilter === "incorrect") return q.is_correct === false;
      if (resultFilter === "written")
        return (
          q.question_type === "short_answer" ||
          q.question_type === "long_answer"
        );
      return true;
    });

    const isPending =
      resultData.has_pending_written ||
      resultData.status === "pending_evaluation";

    const minutesSpent = resultData.time_spent_seconds
      ? Math.floor(resultData.time_spent_seconds / 60)
      : null;
    const secondsSpent = resultData.time_spent_seconds
      ? resultData.time_spent_seconds % 60
      : null;

    return (
      <div className="max-w-6xl mx-auto py-10 px-4 space-y-8">
        {/* Performance Scorecard Summary Hero */}
        <div className="bg-white p-6 sm:p-10 rounded-3xl border border-[#E2E8F0] text-center space-y-6 shadow-sm relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-[#233B67] text-white flex items-center justify-center mx-auto shadow-sm">
            <Award className="w-8 h-8" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#4169C1]/10 border border-[#4169C1]/20 text-[#4169C1] text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Diagnostic Practice Result</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#202B40] tracking-tight">
              {resultData.title || "Practice Assessment Result"}
            </h1>
            <p className="text-xs sm:text-sm text-[#718096] mt-1 font-medium">
              Subject:{" "}
              <strong className="text-[#202B40]">{resultData.subject}</strong>{" "}
              • Topic:{" "}
              <strong className="text-[#202B40]">{resultData.topic}</strong>{" "}
              • Difficulty:{" "}
              <span className="font-semibold text-[#4169C1]">
                {resultData.difficulty}
              </span>
            </p>
          </div>

          {/* Metric KPI Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div className="bg-[#EDF2FA]/70 p-4 rounded-2xl border border-[#E2E8F0] text-left">
              <div className="text-[11px] font-semibold text-[#718096]">
                Earned Score
              </div>
              <div className="text-2xl font-extrabold text-[#202B40] mt-1">
                {resultData.score}{" "}
                <span className="text-sm font-normal text-[#718096]">
                  / {resultData.total_marks}
                </span>
              </div>
              <div className="text-[10px] text-[#718096] mt-0.5">
                Total marks achievable
              </div>
            </div>

            <div className="bg-[#EDF2FA]/70 p-4 rounded-2xl border border-[#E2E8F0] text-left">
              <div className="text-[11px] font-semibold text-[#718096]">
                Percentage
              </div>
              <div className="text-2xl font-extrabold text-[#4169C1] mt-1">
                {resultData.percentage}%
              </div>
              <div className="text-[10px] text-[#718096] mt-0.5">
                Overall proficiency
              </div>
            </div>

            <div className="bg-[#EDF2FA]/70 p-4 rounded-2xl border border-[#E2E8F0] text-left">
              <div className="text-[11px] font-semibold text-[#718096]">
                Accuracy Breakdown
              </div>
              <div className="text-2xl font-extrabold text-[#299D70] mt-1">
                {resultData.correct_count}{" "}
                <span className="text-sm font-normal text-[#718096]">
                  / {resultData.total_questions}
                </span>
              </div>
              <div className="text-[10px] text-[#718096] mt-0.5">
                {resultData.incorrect_count} Incorrect •{" "}
                {resultData.unanswered_count} Skipped
              </div>
            </div>

            <div className="bg-[#EDF2FA]/70 p-4 rounded-2xl border border-[#E2E8F0] text-left">
              <div className="text-[11px] font-semibold text-[#718096]">
                Evaluation Status
              </div>
              <div
                className={`text-base font-extrabold mt-1 truncate ${
                  isPending
                    ? "text-[#D69B35]"
                    : resultData.passed
                    ? "text-[#299D70]"
                    : "text-[#4169C1]"
                }`}
              >
                {isPending
                  ? "Provisional"
                  : resultData.passed
                  ? "Passed ✓"
                  : "Completed"}
              </div>
              <div className="text-[10px] text-[#718096] mt-0.5">
                {isPending
                  ? `${resultData.pending_evaluation_count} written under review`
                  : "All questions scored"}
              </div>
            </div>
          </div>

          {/* Subheader Meta Information */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs text-[#718096] border-t border-[#E2E8F0] font-medium">
            <div>
              Objective Score:{" "}
              <strong className="text-[#202B40]">
                {resultData.objective_marks} / {resultData.objective_max_marks}{" "}
                marks
              </strong>
            </div>
            <div>
              Written Answers:{" "}
              <strong className="text-[#202B40]">
                {resultData.written_marks} / {resultData.written_max_marks} marks
              </strong>
            </div>
            {minutesSpent !== null && (
              <div>
                Time Spent:{" "}
                <strong className="text-[#202B40]">
                  {minutesSpent}m {secondsSpent}s
                </strong>
              </div>
            )}
            <div>
              Mode:{" "}
              <strong className="text-[#202B40]">
                {resultData.is_timed ? "Timed Practice" : "Untimed Practice"}
              </strong>
            </div>
          </div>
        </div>

        {/* Detailed Question Review List */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#202B40]">
                Question Breakdown & Accepted Solutions
              </h2>
              <p className="text-xs text-[#718096]">
                Inspect your submitted responses, accepted criteria, and detailed explanatory rationales.
              </p>
            </div>

            {/* Filter Toggle Buttons */}
            <div className="flex items-center gap-1.5 bg-[#EDF2FA] p-1 rounded-xl border border-[#E2E8F0]">
              <button
                onClick={() => setResultFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  resultFilter === "all"
                    ? "bg-[#233B67] text-white shadow-sm"
                    : "text-[#718096] hover:text-[#202B40]"
                }`}
              >
                All ({questionResults.length})
              </button>
              <button
                onClick={() => setResultFilter("correct")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  resultFilter === "correct"
                    ? "bg-[#299D70] text-white shadow-sm"
                    : "text-[#718096] hover:text-[#299D70]"
                }`}
              >
                Correct ({resultData.correct_count})
              </button>
              <button
                onClick={() => setResultFilter("incorrect")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  resultFilter === "incorrect"
                    ? "bg-[#D95C65] text-white shadow-sm"
                    : "text-[#718096] hover:text-[#D95C65]"
                }`}
              >
                Incorrect ({resultData.incorrect_count})
              </button>
              <button
                onClick={() => setResultFilter("written")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  resultFilter === "written"
                    ? "bg-[#4169C1] text-white shadow-sm"
                    : "text-[#718096] hover:text-[#4169C1]"
                }`}
              >
                Written (
                {
                  questionResults.filter(
                    (q) =>
                      q.question_type === "short_answer" ||
                      q.question_type === "long_answer"
                  ).length
                }
                )
              </button>
            </div>
          </div>

          {filteredQuestions.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl text-center text-sm text-[#718096] border border-[#E2E8F0] shadow-sm">
              No questions found matching this filter criteria.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQuestions.map((q, idx) => {
                const isSubjective =
                  q.question_type === "short_answer" ||
                  q.question_type === "long_answer";
                const isPendingReview = isSubjective && q.is_correct === null;

                return (
                  <div
                    key={q.question_id || idx}
                    className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#4169C1]">
                          Question #{idx + 1}
                        </span>
                        <span className="text-[11px] text-[#718096] capitalize px-2 py-0.5 rounded-md bg-[#EDF2FA] border border-[#E2E8F0] font-medium">
                          {q.question_type?.replace("_", " ")}
                        </span>
                      </div>

                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isPendingReview
                            ? "bg-[#D69B35]/15 text-[#D69B35] border border-[#D69B35]/30"
                            : q.is_correct
                            ? "bg-[#299D70]/15 text-[#299D70] border border-[#299D70]/30"
                            : "bg-[#D95C65]/15 text-[#D95C65] border border-[#D95C65]/30"
                        }`}
                      >
                        {isPendingReview
                          ? `Pending Review (${q.awarded_marks} / ${q.max_marks} Marks)`
                          : q.is_correct
                          ? `Correct (+${q.awarded_marks} / ${q.max_marks} Marks)`
                          : `Incorrect (${q.awarded_marks} / ${q.max_marks} Marks)`}
                      </span>
                    </div>

                    <div className="text-sm font-semibold text-[#202B40] leading-relaxed">
                      <MathFormula text={q.question_text} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                      <div className="bg-[#EDF2FA]/60 p-4 rounded-xl border border-[#E2E8F0] space-y-2">
                        <div className="text-[#718096] font-bold uppercase tracking-wider text-[10px]">
                          Your Submitted Answer
                        </div>
                        <div className="text-[#202B40] font-medium">
                          {q.user_answer ? (
                            <MathFormula text={q.user_answer} />
                          ) : (
                            <span className="text-[#718096] italic">
                              (No answer recorded)
                            </span>
                          )}
                        </div>

                        {q.user_image_url && (
                          <div className="mt-3 pt-3 border-t border-[#E2E8F0]">
                            <span className="text-[10px] text-[#4169C1] font-semibold block mb-1">
                              Uploaded Handwriting / Diagram:
                            </span>
                            <a
                              href={
                                q.user_image_url.startsWith("http")
                                  ? q.user_image_url
                                  : `${API_BASE_URL}${q.user_image_url}`
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="inline-block"
                            >
                              <img
                                src={
                                  q.user_image_url.startsWith("http")
                                    ? q.user_image_url
                                    : `${API_BASE_URL}${q.user_image_url}`
                                }
                                alt="Student handwriting submission"
                                className="max-h-36 rounded-lg border border-[#E2E8F0] hover:scale-105 transition-transform"
                              />
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="bg-[#299D70]/10 p-4 rounded-xl border border-[#299D70]/20 space-y-2">
                        <div className="text-[#299D70] font-bold uppercase tracking-wider text-[10px]">
                          Accepted Answer / Criteria
                        </div>
                        <div className="text-[#202B40] font-medium">
                          <MathFormula
                            text={q.correct_answer || "Not available"}
                          />
                        </div>
                      </div>
                    </div>

                    {(q.explanation || q.feedback) && (
                      <div className="bg-[#EDF2FA] p-4 rounded-xl border border-[#E2E8F0] text-xs text-[#202B40] space-y-1">
                        <span className="font-bold text-[#4169C1] block">
                          Evaluation Rationale:
                        </span>
                        <div className="leading-relaxed">
                          <MathFormula text={q.explanation || q.feedback} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <button
            onClick={() => handleRetake(resultData.attempt_id)}
            className="px-6 py-3 rounded-2xl text-xs font-bold text-white bg-[#233B67] hover:bg-[#1a2c4e] shadow-sm transition-all flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retake Practice</span>
          </button>

          <button
            onClick={() => {
              setMode("config");
              setActiveTest(null);
              setResultData(null);
              fetchHistory();
            }}
            className="px-6 py-3 rounded-2xl text-xs font-bold text-[#202B40] bg-white hover:bg-[#EDF2FA] border border-[#E2E8F0] transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Practice Test</span>
          </button>

          <button
            onClick={() => navigate("/student/results")}
            className="px-6 py-3 rounded-2xl text-xs font-bold text-[#4169C1] bg-[#4169C1]/10 hover:bg-[#4169C1]/20 border border-[#4169C1]/30 transition-all flex items-center gap-2"
          >
            <Award className="w-4 h-4" />
            <span>View All Results</span>
          </button>
        </div>
      </div>
    );
  }

  
  
  
  if (mode === "taking" && activeTest) {
    const questions = activeTest.questions || [];
    const currentQ = questions[currentIndex] || {};
    const qId = currentQ.id;

    const answeredCount = questions.filter((q) => {
      const val = answers[q.id];
      const isSubjective =
        q.question_type === "short_answer" ||
        q.question_type === "long_answer";
      const hasImg = isSubjective && !!uploadedPhotos[q.id];
      if (hasImg) return true;
      if (Array.isArray(val)) return val.length > 0;
      return typeof val === "string" && val.trim().length > 0;
    }).length;

    const unansweredCount = questions.length - answeredCount;
    const flaggedCount = flaggedQuestions.length;
    const progressPercent = Math.round(
      (answeredCount / (questions.length || 1)) * 100
    );

    const isCurrentFlagged = flaggedQuestions.includes(qId);
    const currentVal = answers[qId];

    
    const minutes =
      remainingSeconds !== null ? Math.floor(remainingSeconds / 60) : 0;
    const seconds = remainingSeconds !== null ? remainingSeconds % 60 : 0;
    const isLowTime =
      remainingSeconds !== null && remainingSeconds < 120; 

    return (
      <div className="max-w-7xl mx-auto py-6 px-4 space-y-6">
        {/* Top Active Session Banner */}
        <div className="bg-white px-6 py-4 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#233B67] flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#202B40] leading-tight">
                {activeTest.title || "Practice Test"}
              </div>
              <div className="text-[11px] text-[#718096] mt-0.5 font-medium">
                {activeTest.subject} • {activeTest.difficulty} Difficulty
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {activeTest.is_timed && remainingSeconds !== null && (
              <div
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold border transition-colors ${
                  isLowTime
                    ? "bg-[#D95C65]/15 border-[#D95C65]/40 text-[#D95C65] animate-pulse"
                    : "bg-[#EDF2FA] border-[#E2E8F0] text-[#233B67]"
                }`}
              >
                <Clock className="w-4 h-4 text-[#4169C1]" />
                <span>
                  {String(minutes).padStart(2, "0")}:
                  {String(seconds).padStart(2, "0")}
                </span>
              </div>
            )}

            <button
              onClick={() => setShowSubmitConfirm(true)}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#233B67] hover:bg-[#1a2c4e] shadow-sm transition-all flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Practice</span>
            </button>
          </div>
        </div>

        {/* Practice Assessment Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#718096]">
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                  <span className="text-[11px] font-semibold text-[#718096] bg-[#EDF2FA] px-2.5 py-0.5 rounded-full border border-[#E2E8F0] capitalize">
                    {currentQ.question_type?.replace("_", " ")}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-[#299D70] bg-[#299D70]/10 px-3 py-1 rounded-full border border-[#299D70]/30">
                    {currentQ.marks} Marks
                  </span>

                  <button
                    onClick={() => handleToggleFlag(qId)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                      isCurrentFlagged
                        ? "bg-[#D69B35]/15 border-[#D69B35]/30 text-[#D69B35] shadow-sm"
                        : "bg-[#EDF2FA] border-[#E2E8F0] text-[#718096] hover:text-[#202B40]"
                    }`}
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>{isCurrentFlagged ? "Flagged" : "Flag"}</span>
                  </button>
                </div>
              </div>

              <div className="text-base sm:text-lg font-semibold text-[#202B40] leading-relaxed">
                <MathFormula text={currentQ.question_text || ""} />
              </div>

              <div className="pt-2">
                {(currentQ.question_type === "mcq" ||
                  currentQ.question_type === "mcq_single") && (
                  <div className="space-y-3">
                    {(currentQ.options || []).map((opt, optIdx) => {
                      const isSelected = currentVal === opt;
                      const letter = String.fromCharCode(65 + optIdx);

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleAnswerChange(qId, opt)}
                          className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                            isSelected
                              ? "bg-[#4169C1]/10 border-[#4169C1] text-[#202B40] shadow-sm ring-1 ring-[#4169C1]/20"
                              : "bg-[#EDF2FA]/50 border-[#E2E8F0] text-[#202B40] hover:border-[#4169C1]/40 hover:bg-[#EDF2FA]"
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                              isSelected
                                ? "border-[#4169C1] bg-[#4169C1] text-white"
                                : "border-[#CBD5E1] bg-white text-[#718096]"
                            }`}
                          >
                            {letter}
                          </div>
                          <div className="text-sm font-medium leading-relaxed pt-0.5">
                            <MathFormula text={opt} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {(currentQ.question_type === "multi_select" ||
                  currentQ.question_type === "mcq_multi") && (
                  <div className="space-y-3">
                    <p className="text-xs text-[#4169C1] mb-2 font-semibold">
                      Select all correct options that apply:
                    </p>
                    {(currentQ.options || []).map((opt, optIdx) => {
                      let selectedList = [];
                      if (Array.isArray(currentVal)) {
                        selectedList = currentVal;
                      } else if (
                        typeof currentVal === "string" &&
                        currentVal.trim().startsWith("[")
                      ) {
                        try {
                          selectedList = JSON.parse(currentVal);
                        } catch {
                          selectedList = currentVal ? [currentVal] : [];
                        }
                      } else if (currentVal) {
                        selectedList = [currentVal];
                      }

                      const isSelected = selectedList.includes(opt);
                      const letter = String.fromCharCode(65 + optIdx);

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleMultiSelectToggle(qId, opt)}
                          className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                            isSelected
                              ? "bg-[#4169C1]/10 border-[#4169C1] text-[#202B40] shadow-sm ring-1 ring-[#4169C1]/20"
                              : "bg-[#EDF2FA]/50 border-[#E2E8F0] text-[#202B40] hover:border-[#4169C1]/40 hover:bg-[#EDF2FA]"
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-lg border flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                              isSelected
                                ? "border-[#4169C1] bg-[#4169C1] text-white"
                                : "border-[#CBD5E1] bg-white text-[#718096]"
                            }`}
                          >
                            {isSelected ? (
                              <Check className="w-4 h-4 text-white" />
                            ) : (
                              letter
                            )}
                          </div>
                          <div className="text-sm font-medium leading-relaxed pt-0.5">
                            <MathFormula text={opt} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {currentQ.question_type === "short_answer" && (
                  <div className="space-y-2">
                    <textarea
                      rows="4"
                      value={currentVal || ""}
                      onChange={(e) => handleAnswerChange(qId, e.target.value)}
                      placeholder="Type your concise technical answer here..."
                      className="w-full p-4 rounded-2xl bg-[#EDF2FA]/60 border border-[#E2E8F0] text-sm text-[#202B40] focus:outline-none focus:border-[#4169C1] focus:ring-1 focus:ring-[#4169C1] placeholder-[#94A3B8] resize-none"
                    />
                    <div className="text-[11px] text-[#718096] text-right font-medium">
                      {(currentVal || "").length} characters
                    </div>
                  </div>
                )}

                {currentQ.question_type === "long_answer" && (
                  <div className="space-y-2">
                    <textarea
                      rows="7"
                      value={currentVal || ""}
                      onChange={(e) => handleAnswerChange(qId, e.target.value)}
                      placeholder="Provide a comprehensive academic explanation, derivations, and structural reasoning..."
                      className="w-full p-4 rounded-2xl bg-[#EDF2FA]/60 border border-[#E2E8F0] text-sm text-[#202B40] focus:outline-none focus:border-[#4169C1] focus:ring-1 focus:ring-[#4169C1] placeholder-[#94A3B8] resize-none"
                    />
                    <div className="flex items-center justify-between text-[11px] text-[#718096] font-medium">
                      <span>
                        Words:{" "}
                        {
                          (currentVal || "")
                            .trim()
                            .split(/\s+/)
                            .filter(Boolean).length
                        }
                      </span>
                      <span>{(currentVal || "").length} characters</span>
                    </div>
                  </div>
                )}

                {(currentQ.question_type === "short_answer" ||
                  currentQ.question_type === "long_answer") && (
                  <div className="mt-6 pt-5 border-t border-[#E2E8F0]">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-[#4169C1]" />
                        <span className="text-xs font-bold text-[#718096]">
                          Attach Handwriting or Diagram Photo (Optional)
                        </span>
                      </div>
                      {uploadingPhoto && (
                        <span className="text-xs text-[#4169C1] animate-pulse font-medium">
                          Uploading photo...
                        </span>
                      )}
                    </div>

                    {uploadedPhotos[qId] ? (
                      <div className="flex items-center gap-4 bg-[#EDF2FA] p-3 rounded-2xl border border-[#E2E8F0]">
                        <img
                          src={
                            uploadedPhotos[qId].startsWith("http")
                              ? uploadedPhotos[qId]
                              : `${API_BASE_URL}${uploadedPhotos[qId]}`
                          }
                          alt="Uploaded answer diagram"
                          className="w-16 h-16 object-cover rounded-xl border border-[#E2E8F0]"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-semibold text-[#299D70] flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Photo Attached
                          </span>
                          <p className="text-[11px] text-[#718096] truncate">
                            Stored securely on server
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#202B40] bg-white hover:bg-[#E2E8F0] border border-[#E2E8F0]"
                          >
                            Replace
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(qId)}
                            className="p-1.5 rounded-xl text-[#D95C65] hover:bg-[#D95C65]/10 transition-colors"
                            title="Remove photo"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingPhoto}
                          className="flex-1 py-2.5 px-4 rounded-xl border border-dashed border-[#CBD5E1] hover:border-[#4169C1] bg-[#EDF2FA]/50 hover:bg-[#EDF2FA] text-xs font-semibold text-[#718096] flex items-center justify-center gap-2 transition-colors"
                        >
                          <Upload className="w-3.5 h-3.5 text-[#4169C1]" />
                          <span>Upload File (JPG, PNG, WebP)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          disabled={uploadingPhoto}
                          className="py-2.5 px-4 rounded-xl border border-[#E2E8F0] bg-[#EDF2FA] hover:bg-[#E2E8F0] text-xs font-semibold text-[#718096] flex items-center justify-center gap-2 transition-colors"
                        >
                          <Camera className="w-3.5 h-3.5 text-[#4169C1]" />
                          <span>Take Photo</span>
                        </button>
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      className="hidden"
                      onChange={(e) => handlePhotoUpload(e, qId)}
                    />
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => handlePhotoUpload(e, qId)}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentIndex((prev) => Math.max(0, prev - 1))
                  }
                  disabled={currentIndex === 0}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-[#718096] bg-[#EDF2FA] hover:bg-[#E2E8F0] border border-[#E2E8F0] disabled:opacity-30 transition-all flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                {currentIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentIndex((prev) =>
                        Math.min(questions.length - 1, prev + 1)
                      )
                    }
                    className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#4169C1] hover:bg-[#3558a7] shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSubmitConfirm(true)}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#233B67] hover:bg-[#1a2c4e] shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <Send className="w-4 h-4" />
                    <span>Finish & Submit</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-[#E2E8F0] shadow-sm space-y-5 sticky top-24">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-[#202B40] mb-2">
                  <span>Overall Progress</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#EDF2FA] overflow-hidden">
                  <div
                    className="h-full bg-[#4169C1] transition-all duration-300 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#718096] mt-2 font-medium">
                  <span>
                    Answered: <strong className="text-[#202B40]">{answeredCount}</strong>
                  </span>
                  <span>
                    Remaining:{" "}
                    <strong className="text-[#202B40]">{unansweredCount}</strong>
                  </span>
                  <span>
                    Flagged:{" "}
                    <strong className="text-[#D69B35]">{flaggedCount}</strong>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] text-[#718096] border-t border-b border-[#E2E8F0] py-3 font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-[#299D70] flex-shrink-0" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md border border-[#CBD5E1] bg-[#EDF2FA] flex-shrink-0" />
                  <span>Unanswered</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md border-2 border-[#4169C1] bg-[#4169C1]/10 flex-shrink-0" />
                  <span>Current</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-[#D69B35]/20 border border-[#D69B35] flex-shrink-0" />
                  <span>Flagged</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-[#718096] uppercase tracking-wider block mb-3">
                  Question Navigation
                </span>
                <div className="grid grid-cols-5 gap-2.5">
                  {questions.map((q, idx) => {
                    const isSubjective =
                      q.question_type === "short_answer" ||
                      q.question_type === "long_answer";
                    const isAns = Boolean(
                      (Array.isArray(answers[q.id])
                        ? answers[q.id].length > 0
                        : answers[q.id] && String(answers[q.id]).trim().length > 0) ||
                      (isSubjective && uploadedPhotos[q.id])
                    );
                    const isFlag = flaggedQuestions.includes(q.id);
                    const isCur = currentIndex === idx;

                    return (
                      <button
                        key={q.id || idx}
                        type="button"
                        onClick={() => setCurrentIndex(idx)}
                        className={`relative h-10 rounded-xl font-bold text-xs transition-all flex items-center justify-center ${
                          isCur
                            ? "border-2 border-[#4169C1] bg-[#4169C1] text-white shadow-sm scale-105"
                            : isAns
                            ? "bg-[#299D70]/15 border border-[#299D70]/30 text-[#299D70]"
                            : "bg-[#EDF2FA] border border-[#E2E8F0] text-[#718096] hover:text-[#202B40] hover:border-[#4169C1]/40"
                        }`}
                      >
                        {idx + 1}
                        {isFlag && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#D69B35]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        
        <Modal
          isOpen={showSubmitConfirm}
          onClose={() => setShowSubmitConfirm(false)}
          type="confirm"
          title="Submit Practice Test?"
          message={
            unansweredCount > 0
              ? `You have ${unansweredCount} unanswered question${
                  unansweredCount > 1 ? "s" : ""
                } and ${flaggedCount} flagged for review. Are you ready to submit your answers for evaluation?`
              : `All ${questions.length} questions answered! Are you ready to submit and view your detailed diagnostic score report?`
          }
          confirmText={submitting ? "Grading..." : "Submit Practice"}
          cancelText="Keep Working"
          loading={submitting}
          onConfirm={handleFinalSubmit}
        />
      </div>
    );
  }

  
  
  

  
  if (generating) {
    return (
      <div className="flex-1 min-h-[calc(100vh-var(--rg-header-height,72px))] flex flex-col items-center justify-center p-4 sm:p-8">
        <PracticeGenerationLoader />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 sm:py-10 px-4 space-y-8">
      {/* Header Overview Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-[#233B67] flex items-center justify-center text-white text-2xl font-bold shadow-sm flex-shrink-0">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#4169C1]/10 border border-[#4169C1]/20 text-[#4169C1] text-xs font-bold uppercase tracking-wider mb-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Personalized Adaptive Learning</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#202B40] tracking-tight">
                AI Diagnostic Mock Arena
              </h1>
              <p className="text-xs sm:text-sm text-[#718096] mt-1 max-w-2xl leading-relaxed font-medium">
                Synthesize custom assessment papers across curriculum subjects. Refine technical proficiency and reinforce comprehension through guided feedback rationales.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={fetchHistory}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#718096] hover:text-[#202B40] bg-[#EDF2FA] hover:bg-[#E2E8F0] border border-[#E2E8F0] transition-all flex items-center gap-2"
              title="Refresh practice history"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loadingHistory ? "animate-spin" : ""}`}
              />
              <span>Refresh Ledger</span>
            </button>
          </div>
        </div>
      </div>

      {configError && (
        <div className="p-4 rounded-2xl bg-[#D95C65]/10 border border-[#D95C65]/30 text-[#D95C65] text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm font-medium">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#D95C65]" />
            <span>{configError}</span>
          </div>
          <button
            type="button"
            onClick={handleGenerateAndStart}
            className="px-4 py-2 rounded-xl bg-[#D95C65] hover:bg-[#c44f57] text-white text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry Generation</span>
          </button>
        </div>
      )}

      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        
        
        <div className="lg:col-span-7">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] space-y-6 shadow-sm relative">
            <div className="border-b border-[#E2E8F0] pb-4">
              <h2 className="text-xl font-bold text-[#202B40] tracking-tight flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#4169C1]" />
                <span>Configure Practice Assessment</span>
              </h2>
              <p className="text-xs text-[#718096] mt-0.5">
                Specify academic parameters and let the AI generate a rigorous, structured examination paper.
              </p>
            </div>

            <form onSubmit={handleGenerateAndStart} className="space-y-6">
              {/* Subject Input */}
              <div className="space-y-2">
                <label
                  htmlFor="practice-subject-input"
                  className="text-xs font-bold text-[#718096] uppercase tracking-wider block"
                >
                  Course Subject
                </label>
                <div className="relative">
                  <input
                    id="practice-subject-input"
                    type="text"
                    name="subject"
                    value={subject}
                    onChange={(e) => handleSubjectChange(e.target.value)}
                    onBlur={handleSubjectBlur}
                    placeholder="e.g. Computer Science & Engineering"
                    disabled={generating}
                    aria-invalid={!!subjectError}
                    aria-describedby={subjectError ? "subject-error-msg" : undefined}
                    className={`w-full px-4 py-3 rounded-2xl bg-[#EDF2FA]/70 border text-xs text-[#202B40] placeholder-[#94A3B8] focus:outline-none transition-colors ${
                      subjectError
                        ? "border-[#D95C65] focus:border-[#D95C65] focus:ring-1 focus:ring-[#D95C65]/30"
                        : "border-[#E2E8F0] focus:border-[#4169C1] focus:ring-1 focus:ring-[#4169C1]/30 hover:border-[#CBD5E1]"
                    } disabled:opacity-60 disabled:cursor-not-allowed font-medium`}
                  />
                </div>
                {subjectError && (
                  <div
                    id="subject-error-msg"
                    role="alert"
                    className="flex items-center gap-1.5 text-xs text-[#D95C65] font-semibold animate-fadeIn pt-0.5"
                  >
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{subjectError}</span>
                  </div>
                )}
              </div>

              {/* Topic Input & Chips */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#718096] uppercase tracking-wider">
                    Topic / Concept Focus
                  </label>
                  <span className="text-[11px] text-[#4169C1] font-semibold">
                    Select chip to autofill
                  </span>
                </div>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Algorithms & Data Structures"
                  className="w-full px-4 py-3 rounded-2xl bg-[#EDF2FA]/70 border border-[#E2E8F0] text-xs text-[#202B40] placeholder-[#94A3B8] focus:outline-none focus:border-[#4169C1] focus:ring-1 focus:ring-[#4169C1]/30 transition-colors font-medium"
                  required
                />

                {topicSuggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {topicSuggestions.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTopic(t)}
                        className={`text-[11px] px-3 py-1 rounded-xl transition-all border ${
                          topic === t
                            ? "bg-[#4169C1]/10 border-[#4169C1] text-[#4169C1] font-bold"
                            : "bg-[#EDF2FA] border-[#E2E8F0] text-[#718096] hover:text-[#202B40] hover:border-[#4169C1]/30 font-medium"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Difficulty Level */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#718096] uppercase tracking-wider block">
                  Target Cognitive Difficulty
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {["Easy", "Medium", "Hard"].map((lvl) => {
                    const isSelected = difficulty === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setDifficulty(lvl)}
                        className={`py-3 px-4 rounded-2xl text-xs font-bold transition-all border text-center ${
                          isSelected
                            ? lvl === "Easy"
                              ? "bg-[#299D70]/15 border-[#299D70] text-[#299D70] shadow-sm"
                              : lvl === "Medium"
                              ? "bg-[#4169C1]/15 border-[#4169C1] text-[#4169C1] shadow-sm"
                              : "bg-[#D95C65]/15 border-[#D95C65] text-[#D95C65] shadow-sm"
                            : "bg-[#EDF2FA] border-[#E2E8F0] text-[#718096] hover:text-[#202B40] hover:border-[#CBD5E1]"
                        }`}
                      >
                        {lvl}
                      </button>
                    );
                  })}
                </div>
              </div>

              
              {/* Question Composition Stepper Matrix */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#718096] uppercase tracking-wider">
                    Question Allocation Matrix
                  </label>
                  <span className="text-xs font-extrabold text-[#4169C1] px-3 py-1 rounded-full bg-[#4169C1]/10 border border-[#4169C1]/20">
                    Total: {totalQuestions} Questions
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-[#EDF2FA]/60 p-3.5 rounded-2xl border border-[#E2E8F0] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#202B40]">
                        Multiple Choice
                      </div>
                      <div className="text-[10px] text-[#718096]">
                        Single option response
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setMcqCount((prev) => Math.max(0, prev - 1))
                        }
                        className="w-7 h-7 rounded-lg bg-white hover:bg-[#E2E8F0] border border-[#E2E8F0] flex items-center justify-center text-[#718096] transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-[#202B40]">
                        {mcqCount}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setMcqCount((prev) => Math.min(20, prev + 1))
                        }
                        className="w-7 h-7 rounded-lg bg-white hover:bg-[#E2E8F0] border border-[#E2E8F0] flex items-center justify-center text-[#718096] transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#EDF2FA]/60 p-3.5 rounded-2xl border border-[#E2E8F0] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#202B40]">
                        Multi-Select
                      </div>
                      <div className="text-[10px] text-[#718096]">
                        Multiple choice options
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setMultiSelectCount((prev) => Math.max(0, prev - 1))
                        }
                        className="w-7 h-7 rounded-lg bg-white hover:bg-[#E2E8F0] border border-[#E2E8F0] flex items-center justify-center text-[#718096] transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-[#202B40]">
                        {multiSelectCount}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setMultiSelectCount((prev) =>
                            Math.min(10, prev + 1)
                          )
                        }
                        className="w-7 h-7 rounded-lg bg-white hover:bg-[#E2E8F0] border border-[#E2E8F0] flex items-center justify-center text-[#718096] transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#EDF2FA]/60 p-3.5 rounded-2xl border border-[#E2E8F0] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#202B40]">
                        Short Answer
                      </div>
                      <div className="text-[10px] text-[#718096]">
                        Concise technical concept
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setShortAnswerCount((prev) => Math.max(0, prev - 1))
                        }
                        className="w-7 h-7 rounded-lg bg-white hover:bg-[#E2E8F0] border border-[#E2E8F0] flex items-center justify-center text-[#718096] transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-[#202B40]">
                        {shortAnswerCount}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setShortAnswerCount((prev) =>
                            Math.min(10, prev + 1)
                          )
                        }
                        className="w-7 h-7 rounded-lg bg-white hover:bg-[#E2E8F0] border border-[#E2E8F0] flex items-center justify-center text-[#718096] transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#EDF2FA]/60 p-3.5 rounded-2xl border border-[#E2E8F0] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#202B40]">
                        Long Answer
                      </div>
                      <div className="text-[10px] text-[#718096]">
                        Detailed comprehensive response
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setLongAnswerCount((prev) => Math.max(0, prev - 1))
                        }
                        className="w-7 h-7 rounded-lg bg-white hover:bg-[#E2E8F0] border border-[#E2E8F0] flex items-center justify-center text-[#718096] transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-[#202B40]">
                        {longAnswerCount}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setLongAnswerCount((prev) => Math.min(5, prev + 1))
                        }
                        className="w-7 h-7 rounded-lg bg-white hover:bg-[#E2E8F0] border border-[#E2E8F0] flex items-center justify-center text-[#718096] transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timed Session Switch & Duration Selector */}
              <div className="bg-[#EDF2FA]/60 p-4 rounded-2xl border border-[#E2E8F0] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#202B40] block">
                      Enforce Timed Assessment Session
                    </span>
                    <span className="text-[11px] text-[#718096]">
                      {isTimed
                        ? "Countdown timer active with server-authoritative submission"
                        : "Untimed practice mode without expiry countdown"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsTimed(!isTimed)}
                    className={`w-12 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                      isTimed ? "bg-[#4169C1]" : "bg-[#CBD5E1]"
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                        isTimed ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {isTimed && (
                  <div className="pt-2 border-t border-[#E2E8F0] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#718096] font-medium">Session Duration</span>
                      <span className="text-[#4169C1] font-bold font-mono">
                        {durationMinutes} Minutes
                      </span>
                    </div>

                    <div className="flex gap-2">
                      {[10, 15, 30, 45, 60].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => setDurationMinutes(mins)}
                          className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                            durationMinutes === mins
                              ? "bg-[#4169C1] text-white border-[#4169C1]"
                              : "bg-white text-[#718096] border-[#E2E8F0] hover:text-[#202B40]"
                          }`}
                        >
                          {mins}m
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Synthesize CTA Action */}
              <button
                type="submit"
                disabled={generating || totalQuestions <= 0}
                className="w-full py-4 rounded-2xl text-sm font-bold text-white bg-[#233B67] hover:bg-[#1a2c4e] shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Synthesizing Assessment Questions...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Generate & Begin Diagnostic Assessment</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        
        
        
        {/* Right Column: Historical Attempts Ledger */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-[#E2E8F0] shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-[#4169C1]" />
                <h2 className="text-lg font-bold text-[#202B40]">Practice Assessment History</h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EDF2FA] border border-[#E2E8F0] text-[#4169C1]">
                {practiceHistory.length} Attempts
              </span>
            </div>

            {loadingHistory ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-3 border-[#E2E8F0] border-t-[#4169C1] rounded-full animate-spin" />
                <p className="text-xs text-[#718096]">
                  Loading practice assessment records...
                </p>
              </div>
            ) : historyError ? (
              <div className="p-4 rounded-2xl bg-[#D95C65]/10 border border-[#D95C65]/20 text-[#D95C65] text-xs text-center space-y-2 font-medium">
                <p>{historyError}</p>
                <button
                  onClick={fetchHistory}
                  className="font-bold underline text-[#202B40]"
                >
                  Retry Retrieval
                </button>
              </div>
            ) : practiceHistory.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-2xl bg-[#EDF2FA]/50 border border-[#E2E8F0] space-y-2">
                <Sparkles className="w-8 h-8 text-[#4169C1] mx-auto" />
                <p className="text-sm font-semibold text-[#202B40]">
                  No Diagnostic Records Enrolled
                </p>
                <p className="text-xs text-[#718096] max-w-xs mx-auto">
                  Configure your course parameters on the left to initialize your first AI-evaluated assessment paper.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[750px] overflow-y-auto pr-1 scrollbar-thin">
                {practiceHistory.map((item) => {
                  const isPending =
                    item.has_pending_written ||
                    item.status === "pending_evaluation";

                  return (
                    <div
                      key={item.attempt_id}
                      className="bg-[#EDF2FA]/60 p-4 rounded-2xl border border-[#E2E8F0] hover:border-[#4169C1]/30 hover:bg-[#EDF2FA] transition-all space-y-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-xs font-bold text-[#202B40] truncate">
                            {item.title}
                          </h3>
                          <div className="text-[11px] text-[#718096] truncate mt-0.5 font-medium">
                            {item.subject} • {item.topic}
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 border ${
                            isPending
                              ? "bg-[#D69B35]/15 text-[#D69B35] border border-[#D69B35]/30"
                              : item.passed
                              ? "bg-[#299D70]/15 text-[#299D70] border border-[#299D70]/30"
                              : "bg-[#4169C1]/10 text-[#4169C1] border border-[#4169C1]/20"
                          }`}
                        >
                          {isPending
                            ? "Provisional"
                            : `${item.percentage}%`}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-[#718096] pt-1 border-t border-[#E2E8F0]">
                        <div>
                          Score:{" "}
                          <strong className="text-[#202B40]">
                            {item.score} / {item.total_marks}
                          </strong>{" "}
                          ({item.total_questions} Qs)
                        </div>
                        <div className="text-[10px] text-[#718096]">
                          {item.date}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleViewResult(item.attempt_id)}
                          className="px-3 py-1.5 rounded-xl text-[11px] font-semibold text-[#4169C1] bg-[#4169C1]/10 hover:bg-[#4169C1]/20 border border-[#4169C1]/20 transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Result</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRetake(item.attempt_id)}
                          className="px-3 py-1.5 rounded-xl text-[11px] font-semibold text-[#202B40] bg-white hover:bg-[#EDF2FA] border border-[#E2E8F0] transition-colors flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3 text-[#4169C1]" />
                          <span>Retake</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteAttemptTarget(item)}
                          className="p-1.5 rounded-xl text-[#64748B] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete practice attempt"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      
      <Modal
        isOpen={Boolean(deleteAttemptTarget)}
        onClose={() => setDeleteAttemptTarget(null)}
        type="confirm"
        title="Delete Practice Attempt?"
        message={`Are you sure you want to delete "${
          deleteAttemptTarget?.title || "this practice test"
        }"? This action cannot be undone.`}
        confirmText={deletingAttempt ? "Deleting..." : "Delete Practice"}
        cancelText="Cancel"
        loading={deletingAttempt}
        onConfirm={handleDeleteAttempt}
      />
    </div>
  );
};

export default StudentMockTest;

