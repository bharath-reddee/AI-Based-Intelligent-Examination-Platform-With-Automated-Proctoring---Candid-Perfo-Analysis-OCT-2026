import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient, { formatApiError } from '../api/axios';
import Modal from '../components/Modal';
import {
  initFaceDetector,
  detectFaceAndOrientation,
  disposeFaceDetector,
} from '../services/proctoringService';
import {
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Send,
  ShieldAlert,
  Video,
  VideoOff,
  Check,
  AlertCircle,
  RefreshCw,
  Eye,
  Bookmark,
  BookmarkCheck,
  Maximize,
  Users,
} from 'lucide-react';

const StudentExamAttempt = () => {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [examData, setExamData] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  
  const [answers, setAnswers] = useState({});
  const [flaggedQuestions, setFlaggedQuestions] = useState({});
  const [saveStatus, setSaveStatus] = useState('saved'); 

  
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);

  
  
  const [faceStatus, setFaceStatus] = useState('checking');
  const [headOrientation, setHeadOrientation] = useState('forward');
  const [cameraTechnicalError, setCameraTechnicalError] = useState(null);

  
  
  const [activeWarning, setActiveWarning] = useState(null);
  const [fullscreenError, setFullscreenError] = useState('');

  
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  
  const [webcamStream, setWebcamStream] = useState(null);
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaStreamsRef = useRef(new Set());
  const timerRef = useRef(null);
  const faceCheckIntervalRef = useRef(null);
  const autosaveTimeoutRef = useRef(null);

  
  const consecutiveAbsentChecksRef = useRef(0);
  const consecutivePresentChecksRef = useRef(0);
  const consecutiveTurnedChecksRef = useRef(0);
  const consecutiveMultipleChecksRef = useRef(0);
  const lastEventLogTimesRef = useRef({
    face_not_detected: 0,
    head_turned: 0,
    multiple_faces: 0,
    fullscreen: 0,
    tab: 0,
  });

  
  const isExamActiveRef = useRef(false);
  const isSubmittingRef = useRef(false);
  const isCleanedUpRef = useRef(false);
  const isFullscreenActiveRef = useRef(false);
  const visibilityHandlerRef = useRef(null);
  const fullscreenHandlerRef = useRef(null);

  
  const WARNING_PRIORITIES = {
    fullscreen: 100,
    tab_switch: 80,
    multiple_faces: 60,
    face_missing: 40,
    head_turned: 20,
  };

  
  const triggerWarning = useCallback((warningId, warningData) => {
    setActiveWarning((current) => {
      const newPriority = WARNING_PRIORITIES[warningId] || 10;
      const currentPriority = current ? (WARNING_PRIORITIES[current.id] || 0) : 0;

      
      if (current && currentPriority > newPriority) {
        return current;
      }

      return {
        id: warningId,
        priority: newPriority,
        title: warningData.title,
        message: warningData.message,
        type: warningData.type || 'warning',
        actionText: warningData.actionText || 'I Understand',
        onAction: warningData.onAction || null,
        preventClose: Boolean(warningData.preventClose),
        details: warningData.details || null,
      };
    });
  }, []);

  
  const clearWarning = useCallback((warningId) => {
    setActiveWarning((current) => {
      if (current && current.id === warningId) {
        return null;
      }
      return current;
    });
  }, []);

  
  const isFullscreenActive = useCallback(() => {
    if (typeof document === 'undefined') return false;
    return Boolean(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
  }, []);

  
  const requestBrowserFullscreen = useCallback(async () => {
    if (typeof document === 'undefined') return false;
    const el = document.documentElement;
    setFullscreenError('');

    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      } else if (el.mozRequestFullScreen) {
        await el.mozRequestFullScreen();
      } else if (el.msRequestFullscreen) {
        await el.msRequestFullscreen();
      }

      isFullscreenActiveRef.current = true;
      clearWarning('fullscreen');
      setFullscreenError('');
      return true;
    } catch (err) {
      console.warn('Browser rejected fullscreen request:', err);
      setFullscreenError(
        'Fullscreen request was rejected by your browser. Please click again or allow fullscreen permissions in your browser address bar.'
      );
      return false;
    }
  }, [clearWarning]);

  
  const cleanupAllResources = useCallback(() => {
    if (isCleanedUpRef.current) return;
    isCleanedUpRef.current = true;
    isExamActiveRef.current = false;

    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (faceCheckIntervalRef.current) {
      clearInterval(faceCheckIntervalRef.current);
      faceCheckIntervalRef.current = null;
    }
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }

    
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
      } catch (e) {
        console.warn('Error stopping primary mediaStreamRef:', e);
      }
      mediaStreamRef.current = null;
    }

    if (mediaStreamsRef.current) {
      mediaStreamsRef.current.forEach((stream) => {
        try {
          if (stream && stream.getTracks) {
            stream.getTracks().forEach((track) => {
              track.stop();
              track.enabled = false;
            });
          }
        } catch (e) {
          console.warn('Error stopping tracked media stream:', e);
        }
      });
      mediaStreamsRef.current.clear();
    }

    
    if (videoRef.current) {
      try {
        if (videoRef.current.srcObject && videoRef.current.srcObject.getTracks) {
          videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
        }
      } catch (e) {}
      videoRef.current.srcObject = null;
      try {
        videoRef.current.pause();
      } catch (e) {}
    }
    setWebcamStream(null);

    
    if (visibilityHandlerRef.current) {
      document.removeEventListener('visibilitychange', visibilityHandlerRef.current);
      visibilityHandlerRef.current = null;
    }

    if (fullscreenHandlerRef.current) {
      ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(
        (evt) => document.removeEventListener(evt, fullscreenHandlerRef.current)
      );
      fullscreenHandlerRef.current = null;
    }

    
    try {
      if (typeof document !== 'undefined' && (document.fullscreenElement || document.webkitFullscreenElement)) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen().catch(() => {});
        }
      }
    } catch (e) {
      console.warn('Error exiting fullscreen during cleanup:', e);
    }

    
    try {
      disposeFaceDetector();
    } catch (e) {
      console.warn('Error disposing face detector:', e);
    }

    
    setActiveWarning(null);
  }, []);

  
  useEffect(() => {
    return () => {
      cleanupAllResources();
    };
  }, [cleanupAllResources]);

  
  useEffect(() => {
    const handleBeforeUnload = () => {
      cleanupAllResources();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    window.addEventListener('examai:cleanup-camera', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      window.removeEventListener('examai:cleanup-camera', handleBeforeUnload);
    };
  }, [cleanupAllResources]);

  
  useEffect(() => {
    let isMounted = true;

    apiClient
      .post(`/exams/student/${examId}/start`)
      .then((res) => {
        if (!isMounted) return;
        const data = res.data;
        setExamData(data);
        setRemainingSeconds(data.remaining_seconds || 3600);
        setTabSwitchCount(data.tab_switch_count || 0);

        
        const initialAnswers = {};
        if (data.questions && Array.isArray(data.questions)) {
          data.questions.forEach((q) => {
            if (q.saved_answer) {
              if (q.question_type === 'multi_select') {
                try {
                  initialAnswers[q.id] = Array.isArray(q.saved_answer)
                    ? q.saved_answer
                    : JSON.parse(q.saved_answer);
                } catch {
                  initialAnswers[q.id] = q.saved_answer.split(',').map((s) => s.trim());
                }
              } else {
                initialAnswers[q.id] = q.saved_answer;
              }
            }
          });
        }
        setAnswers(initialAnswers);
        setLoading(false);
        isExamActiveRef.current = true;

        
        if (data.ai_proctoring_enabled) {
          startWebcamFeed();
        }

        
        const inFs = isFullscreenActive();
        isFullscreenActiveRef.current = inFs;
        if (!inFs) {
          triggerWarning('fullscreen', {
            title: 'Fullscreen Mode Required',
            message: 'Fullscreen mode has been exited. Return to fullscreen to continue your examination.',
            type: 'danger',
            actionText: 'Return to Fullscreen',
            onAction: requestBrowserFullscreen,
            preventClose: true,
          });
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(formatApiError(err));
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
    
  }, [examId]);

  
  const startWebcamFeed = async () => {
    try {
      
      initFaceDetector().catch((err) => {
        console.warn('MediaPipe initialization warning (canvas fallback active):', err);
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
        audio: false,
      });

      mediaStreamRef.current = stream;
      mediaStreamsRef.current.add(stream);
      setWebcamStream(stream);
      setCameraTechnicalError(null);
      setFaceStatus('checking');

      
      stream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          if (!isCleanedUpRef.current) {
            setCameraTechnicalError('Webcam stream was stopped or disconnected.');
            setFaceStatus('error');
          }
        };
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (camErr) {
      console.warn('Webcam feed could not be initiated:', camErr);
      
      setCameraTechnicalError('Webcam unavailable. Please grant camera permission in your browser.');
      setFaceStatus('error');
    }
  };

  
  useEffect(() => {
    if (videoRef.current && webcamStream) {
      videoRef.current.srcObject = webcamStream;
    }
  }, [webcamStream]);

  
  useEffect(() => {
    if (loading || !examData) return;

    const handleFullscreenChange = () => {
      const inFullscreen = isFullscreenActive();
      isFullscreenActiveRef.current = inFullscreen;

      if (inFullscreen) {
        
        setFullscreenError('');
        clearWarning('fullscreen');
      } else {
        
        if (isExamActiveRef.current && !isSubmittingRef.current && !isCleanedUpRef.current) {
          const now = Date.now();
          
          if (now - lastEventLogTimesRef.current.fullscreen > 4000) {
            lastEventLogTimesRef.current.fullscreen = now;

            if (examData?.attempt_id) {
              apiClient
                .post(`/exams/student/attempts/${examData.attempt_id}/proctoring-event`, {
                  event_type: 'Fullscreen Exited',
                  severity: 'high',
                  details: 'Candidate exited browser fullscreen mode during active examination.',
                })
                .then((res) => {
                  if (res.data?.tab_switch_count !== undefined) {
                    setTabSwitchCount(res.data.tab_switch_count);
                  }
                  if (res.data?.threshold_exceeded) {
                    handleAutoSubmit('Maximum Permitted Fullscreen/Tab Violations Exceeded');
                  }
                })
                .catch((err) => console.error('Fullscreen violation log error:', err));
            }
          }

          
          triggerWarning('fullscreen', {
            title: 'Fullscreen Mode Exited',
            message: 'Fullscreen mode has been exited. Return to fullscreen to continue your examination.',
            type: 'danger',
            actionText: 'Return to Fullscreen',
            onAction: requestBrowserFullscreen,
            preventClose: true,
          });
        }
      }
    };

    fullscreenHandlerRef.current = handleFullscreenChange;
    ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(
      (evt) => document.addEventListener(evt, handleFullscreenChange)
    );

    return () => {
      ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(
        (evt) => document.removeEventListener(evt, handleFullscreenChange)
      );
      fullscreenHandlerRef.current = null;
    };
  }, [loading, examData, isFullscreenActive, requestBrowserFullscreen, triggerWarning, clearWarning]);

  
  const runDetectionCheck = useCallback(() => {
    if (
      !videoRef.current ||
      !mediaStreamRef.current ||
      !examData?.ai_proctoring_enabled ||
      !isExamActiveRef.current ||
      isCleanedUpRef.current
    ) {
      return;
    }

    const video = videoRef.current;
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0 || video.paused || video.ended) {
      return;
    }

    const result = detectFaceAndOrientation(video);

    if (result.engine === 'initializing') {
      setFaceStatus('checking');
      return;
    }

    if (result.error && result.engine === 'none') {
      return;
    }

    const now = Date.now();

    
    if (!result.faceDetected) {
      consecutivePresentChecksRef.current = 0;
      consecutiveTurnedChecksRef.current = 0;
      consecutiveMultipleChecksRef.current = 0;
      consecutiveAbsentChecksRef.current += 1;

      
      if (consecutiveAbsentChecksRef.current >= 2) {
        setFaceStatus('not_detected');
        setHeadOrientation('none');
      }

      
      if (consecutiveAbsentChecksRef.current >= 4) {
        triggerWarning('face_missing', {
          title: 'Proctoring Warning',
          message: 'Your face is not clearly visible. Please look toward the camera and ensure your face is properly illuminated.',
          type: 'warning',
          actionText: 'I Understand',
          onAction: () => clearWarning('face_missing'),
          preventClose: false,
        });

        
        if (now - lastEventLogTimesRef.current.face_not_detected > 20000) {
          lastEventLogTimesRef.current.face_not_detected = now;
          if (examData?.attempt_id) {
            apiClient
              .post(`/exams/student/attempts/${examData.attempt_id}/proctoring-event`, {
                event_type: 'face_not_detected',
                severity: 'high',
                details: `Candidate face not detected in webcam feed for ${consecutiveAbsentChecksRef.current * 0.7} seconds.`,
              })
              .catch((err) => console.error('Proctoring incident log error:', err));
          }
        }
      }
    }

    
    else {
      consecutiveAbsentChecksRef.current = 0;

      
      if (result.faceCount > 1) {
        consecutivePresentChecksRef.current = 0;
        consecutiveTurnedChecksRef.current = 0;
        consecutiveMultipleChecksRef.current += 1;

        if (consecutiveMultipleChecksRef.current >= 3) {
          setFaceStatus('multiple_faces');
          setHeadOrientation('multiple_faces');

          triggerWarning('multiple_faces', {
            title: 'Multiple Faces Detected',
            message: 'Multiple faces have been detected in the camera preview. Only the candidate is permitted in the frame during the examination.',
            type: 'warning',
            actionText: 'I Understand',
            onAction: () => clearWarning('multiple_faces'),
            preventClose: false,
          });

          if (now - lastEventLogTimesRef.current.multiple_faces > 20000) {
            lastEventLogTimesRef.current.multiple_faces = now;
            if (examData?.attempt_id) {
              apiClient
                .post(`/exams/student/attempts/${examData.attempt_id}/proctoring-event`, {
                  event_type: 'multiple_faces_detected',
                  severity: 'high',
                  details: `Multiple faces (${result.faceCount}) detected in candidate webcam frame.`,
                })
                .catch((err) => console.error('Proctoring incident log error:', err));
            }
          }
        }
      }

      
      else {
        consecutiveMultipleChecksRef.current = 0;
        consecutivePresentChecksRef.current += 1;

        
        if (consecutivePresentChecksRef.current >= 2) {
          clearWarning('face_missing');
          clearWarning('multiple_faces');
        }

        
        if (result.orientation === 'head_turned_left' || result.orientation === 'head_turned_right') {
          consecutiveTurnedChecksRef.current += 1;

          
          if (consecutiveTurnedChecksRef.current >= 4) {
            setFaceStatus('looking_away');
            setHeadOrientation(result.orientation);

            triggerWarning('head_turned', {
              title: 'Proctoring Warning',
              message: 'Your face appears to be turned away from the screen. Please look toward the screen and keep your face visible during the examination.',
              type: 'warning',
              actionText: 'I Understand',
              onAction: () => clearWarning('head_turned'),
              preventClose: false,
            });

            if (now - lastEventLogTimesRef.current.head_turned > 20000) {
              lastEventLogTimesRef.current.head_turned = now;
              const sideText = result.orientation === 'head_turned_left' ? 'left' : 'right';
              if (examData?.attempt_id) {
                apiClient
                  .post(`/exams/student/attempts/${examData.attempt_id}/proctoring-event`, {
                    event_type: result.orientation,
                    severity: 'medium',
                    details: `Candidate face turned away from the screen (${sideText}) (Yaw: ${result.yawAngle}°).`,
                  })
                  .catch((err) => console.error('Proctoring incident log error:', err));
              }
            }
          }
        } else {
          
          consecutiveTurnedChecksRef.current = 0;
          setFaceStatus('detected');
          setHeadOrientation('forward');
          clearWarning('head_turned');
        }
      }
    }
  }, [examData?.ai_proctoring_enabled, examData?.attempt_id, triggerWarning, clearWarning]);

  
  useEffect(() => {
    if (loading || !examData?.ai_proctoring_enabled || !webcamStream) return;

    faceCheckIntervalRef.current = setInterval(() => {
      runDetectionCheck();
    }, 700);

    return () => {
      if (faceCheckIntervalRef.current) {
        clearInterval(faceCheckIntervalRef.current);
        faceCheckIntervalRef.current = null;
      }
    };
  }, [loading, examData?.ai_proctoring_enabled, webcamStream, runDetectionCheck]);

  
  const handleAutoSubmit = useCallback(
    (reason = '') => {
      if (isSubmittingRef.current) return;
      executeSubmission(reason);
    },
    
    [examData, answers]
  );

  
  useEffect(() => {
    if (loading || remainingSeconds <= 0) return;

    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit('Time Expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [loading, remainingSeconds, handleAutoSubmit]);

  
  useEffect(() => {
    if (loading || !examData) return;

    const handleVisibilityChange = () => {
      if (document.hidden && isExamActiveRef.current && !isCleanedUpRef.current) {
        const now = Date.now();
        if (now - lastEventLogTimesRef.current.tab > 3000) {
          lastEventLogTimesRef.current.tab = now;

          if (examData?.attempt_id) {
            apiClient
              .post(`/exams/student/attempts/${examData.attempt_id}/proctoring-event`, {
                event_type: 'Tab Switch / Focus Loss',
                severity: 'medium',
                details: 'Candidate switched browser tab or minimized window.',
              })
              .then((res) => {
                if (res.data?.tab_switch_count !== undefined) {
                  setTabSwitchCount(res.data.tab_switch_count);
                }
                if (res.data?.threshold_exceeded) {
                  handleAutoSubmit('Maximum Permitted Tab Switches Exceeded');
                }
              })
              .catch((err) => console.error('Proctoring tab log error:', err));
          }
        }

        
        triggerWarning('tab_switch', {
          title: 'Browser Tab Switch Detected',
          message: 'You navigated away from the examination window. This action has been recorded in your session proctoring log.',
          type: 'warning',
          actionText: 'I Understand — Return to Examination',
          onAction: () => clearWarning('tab_switch'),
          preventClose: false,
          details: (
            <div className="bg-[#EDF2FA] p-3 rounded-2xl border border-[#E2E8F0] text-xs text-[#202B40] font-semibold text-center mt-2">
              Recorded Departure Count: {tabSwitchCount + 1} / {examData?.max_tab_switches || 3} Permitted
            </div>
          ),
        });
      }
    };

    visibilityHandlerRef.current = handleVisibilityChange;
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      visibilityHandlerRef.current = null;
    };
  }, [loading, examData, tabSwitchCount, triggerWarning, clearWarning, handleAutoSubmit]);

  
  const saveAnswerToBackend = useCallback(
    (questionId, value) => {
      if (!examData?.attempt_id || isCleanedUpRef.current) return;
      setSaveStatus('saving');

      const answerPayload = Array.isArray(value) ? JSON.stringify(value) : value;

      apiClient
        .post(`/exams/student/attempts/${examData.attempt_id}/save-answer`, {
          question_id: questionId,
          answer_text: answerPayload || '',
        })
        .then(() => {
          setSaveStatus('saved');
        })
        .catch((err) => {
          console.error('Answer autosave failed:', err);
          setSaveStatus('error');
        });
    },
    [examData?.attempt_id]
  );

  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({
      ...(prev || {}),
      [questionId]: value,
    }));

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }
    autosaveTimeoutRef.current = setTimeout(() => {
      saveAnswerToBackend(questionId, value);
    }, 400);
  };

  const handleMultiSelectToggle = (questionId, option) => {
    setAnswers((prev) => {
      const currentList = Array.isArray(prev?.[questionId]) ? prev[questionId] : [];
      let updated;
      if (currentList.includes(option)) {
        updated = currentList.filter((o) => o !== option);
      } else {
        updated = [...currentList, option];
      }

      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
      autosaveTimeoutRef.current = setTimeout(() => {
        saveAnswerToBackend(questionId, updated);
      }, 400);

      return {
        ...(prev || {}),
        [questionId]: updated,
      };
    });
  };

  const toggleFlag = (questionId) => {
    if (!questionId) return;
    setFlaggedQuestions((prev) => ({
      ...(prev || {}),
      [questionId]: !(prev && prev[questionId]),
    }));
  };

  
  const executeSubmission = async (reason = '') => {
    if (!examData?.attempt_id || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    isExamActiveRef.current = false;
    setSubmitting(true);
    setSubmitError('');

    try {
      const payloadAnswers = Object.entries(answers || {}).map(([qId, val]) => ({
        question_id: parseInt(qId, 10),
        answer_text: Array.isArray(val) ? JSON.stringify(val) : val || '',
      }));

      
      const res = await apiClient.post(
        `/exams/student/attempts/${examData.attempt_id}/submit`,
        {
          answers: payloadAnswers,
        }
      );

      
      
      cleanupAllResources();
      setShowSubmitModal(false);

      
      try {
        navigate('/student/tests', {
          state: {
            submittedExamId: examData.id || examId,
            submissionSuccess: true,
            examTitle: examData?.title,
            score: res.data?.score,
            totalMarks: res.data?.total_marks,
            percentage: res.data?.percentage,
            status: res.data?.status,
            hasPendingSubjective: res.data?.has_pending_subjective,
            passed: res.data?.passed,
            reason: reason || 'Candidate Submitted',
          },
          replace: true,
        });
      } catch (navErr) {
        console.error('Navigation to /student/tests failed:', navErr);
        setSubmitError('Exam submitted successfully, but navigation failed. Click below to view My Tests.');
      }
    } catch (err) {
      console.error('Submission error:', err);
      isSubmittingRef.current = false;
      isExamActiveRef.current = true;
      setSubmitting(false);
      setSubmitError(formatApiError(err) || 'Failed to submit examination. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-12 h-12 border-4 border-[#E2E8F0] border-t-[#4169C1] rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-[#718096]">
          Initializing secure examination environment & assessment questions...
        </p>
      </div>
    );
  }

  if (error && !examData) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#D95C65]/10 text-[#D95C65] flex items-center justify-center mx-auto border border-[#D95C65]/30">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-[#202B40]">Examination Access Error</h2>
        <p className="text-sm text-[#718096]">{error}</p>
        <button
          onClick={() => {
            cleanupAllResources();
            navigate('/student/tests');
          }}
          className="px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#233B67] hover:bg-[#1a2c4e] transition-colors"
        >
          Return to Assessments
        </button>
      </div>
    );
  }

  const questions = examData?.questions || [];
  const currentQ = questions[currentIndex];
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  const answeredCount = questions.filter((q) => {
    const val = (answers || {})[q.id];
    if (Array.isArray(val)) return val.length > 0;
    return val && String(val).trim() !== '';
  }).length;

  const flaggedCount = Object.values(flaggedQuestions || {}).filter(Boolean).length;
  const unansweredCount = questions.length - answeredCount;

  if (!questions || questions.length === 0) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#D69B35]/10 text-[#D69B35] flex items-center justify-center mx-auto border border-[#D69B35]/30">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-[#202B40]">No Questions Found in Assessment</h2>
        <p className="text-sm text-[#718096]">
          This examination paper does not have questions enrolled yet. Please contact your course instructor or department coordinator.
        </p>
        <button
          onClick={() => {
            cleanupAllResources();
            navigate('/student/tests');
          }}
          className="px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#233B67] hover:bg-[#1a2c4e] transition-colors"
        >
          Return to Assessments
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 space-y-6">
      {/* Top Banner Navigation & Status Controls */}
      <div className="bg-white px-6 py-4 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-[#4169C1]/10 text-[#4169C1] border border-[#4169C1]/20">
            {examData?.subject}
          </span>
          <div>
            <h1 className="text-base font-bold text-[#202B40] leading-tight">{examData?.title}</h1>
            <div className="flex items-center gap-2 text-xs text-[#718096] mt-0.5 font-medium">
              <span>{questions.length} Total Questions</span>
              <span>•</span>
              <span>{examData?.total_marks} Marks</span>
            </div>
          </div>
        </div>

        {/* Action Controls & Timers */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Dynamic Autosave Status */}
          <div className="text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EDF2FA] border border-[#E2E8F0]">
            {saveStatus === 'saving' && (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-[#4169C1] animate-spin" />
                <span className="text-[#718096]">Autosaving...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <Check className="w-3.5 h-3.5 text-[#299D70]" />
                <span className="text-[#299D70]">Saved</span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-[#D95C65]" />
                <span className="text-[#D95C65]">Save Retry Pending</span>
              </>
            )}
          </div>

          {/* Fullscreen Recovery Pill */}
          {!isFullscreenActive() && (
            <button
              onClick={requestBrowserFullscreen}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#D95C65]/10 text-[#D95C65] border border-[#D95C65]/30 text-xs font-bold hover:bg-[#D95C65]/20 transition-colors animate-pulse"
              title="Return to fullscreen mode"
            >
              <Maximize className="w-3.5 h-3.5" />
              <span>Enter Fullscreen</span>
            </button>
          )}

          {/* Tab Switch Counter */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
              tabSwitchCount > 0
                ? 'bg-[#D69B35]/10 text-[#D69B35] border-[#D69B35]/30'
                : 'bg-[#EDF2FA] text-[#718096] border-[#E2E8F0]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-[#D69B35]" />
            <span>
              Tab Switches: <strong className="text-[#202B40]">{tabSwitchCount}</strong> / {examData?.max_tab_switches || 3}
            </span>
          </div>

          {/* Examination Countdown Clock */}
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-mono font-bold ${
              remainingSeconds < 300
                ? 'bg-[#D95C65]/15 text-[#D95C65] border-[#D95C65]/40 animate-pulse'
                : 'bg-[#EDF2FA] text-[#233B67] border-[#E2E8F0]'
            }`}
          >
            <Clock className="w-4 h-4 text-[#4169C1]" />
            <span>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>

          {/* Submit Action */}
          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#233B67] hover:bg-[#1d3156] shadow-sm transition-all flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Exam</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#D95C65]/10 border border-[#D95C65]/30 text-[#D95C65] text-sm font-medium">
          {error}
        </div>
      )}

      {/* Main Examination Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Active Question Workspace */}
        <div className="lg:col-span-8 bg-white p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] shadow-sm space-y-6">
          {/* Question Header & Meta Details */}
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#718096] uppercase tracking-wider">
                Question {currentIndex + 1} of {questions.length}
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#EDF2FA] border border-[#E2E8F0] text-[#718096] uppercase">
                {currentQ?.question_type?.replace('_', ' ')}
              </span>
              {currentQ?.difficulty && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#35A6A0]/10 text-[#35A6A0] border border-[#35A6A0]/20">
                  {currentQ.difficulty}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-[#299D70] bg-[#299D70]/10 border border-[#299D70]/30 px-3 py-1 rounded-full">
                {currentQ?.marks || 1} Marks
              </span>
              {examData?.negative_marking_enabled && (
                <span className="text-xs font-semibold text-[#D95C65] bg-[#D95C65]/10 border border-[#D95C65]/30 px-2 py-1 rounded-full">
                  -{examData.negative_marking_score || 0.25} on incorrect
                </span>
              )}
              {/* Flag for Review Toggle */}
              <button
                onClick={() => toggleFlag(currentQ?.id)}
                className={`p-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                  (flaggedQuestions || {})[currentQ?.id]
                    ? 'bg-[#D69B35]/15 text-[#D69B35] border-[#D69B35]/30'
                    : 'bg-[#EDF2FA] text-[#718096] border-[#E2E8F0] hover:text-[#202B40]'
                }`}
                title="Flag question for review later"
              >
                {(flaggedQuestions || {})[currentQ?.id] ? (
                  <BookmarkCheck className="w-4 h-4 text-[#D69B35]" />
                ) : (
                  <Bookmark className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {(flaggedQuestions || {})[currentQ?.id] ? 'Flagged' : 'Flag'}
                </span>
              </button>
            </div>
          </div>

          {/* Question Text Prompt */}
          <div className="text-base sm:text-lg font-semibold text-[#202B40] leading-relaxed">
            {currentQ?.question_text}
          </div>

          {/* Question Interaction Area */}
          <div className="pt-2">
            {/* Multiple Choice (Single Select) */}
            {currentQ?.question_type === 'mcq' && (
              <div className="space-y-3">
                {currentQ.options &&
                  currentQ.options.map((opt, optIdx) => {
                    const isSelected = answers[currentQ.id] === opt;
                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleAnswerChange(currentQ.id, opt)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-3.5 ${
                          isSelected
                            ? 'bg-[#4169C1]/10 border-[#4169C1] text-[#202B40] shadow-sm ring-1 ring-[#4169C1]/20'
                            : 'bg-[#EDF2FA]/50 border-[#E2E8F0] text-[#202B40] hover:border-[#4169C1]/40 hover:bg-[#EDF2FA]'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                            isSelected
                              ? 'border-[#4169C1] bg-[#4169C1] text-white'
                              : 'border-[#CBD5E1] bg-white text-[#718096]'
                          }`}
                        >
                          {String.fromCharCode(65 + optIdx)}
                        </div>
                        <span className="text-xs sm:text-sm leading-relaxed">{opt}</span>
                      </button>
                    );
                  })}
              </div>
            )}

            {/* Multiple Select Question */}
            {currentQ?.question_type === 'multi_select' && (
              <div className="space-y-3">
                <p className="text-xs text-[#4169C1] font-semibold mb-2">
                  Select all correct answer choices that apply:
                </p>
                {currentQ.options &&
                  currentQ.options.map((opt, optIdx) => {
                    const selectedList = Array.isArray(answers[currentQ.id])
                      ? answers[currentQ.id]
                      : [];
                    const isSelected = selectedList.includes(opt);
                    return (
                      <button
                        key={optIdx}
                        onClick={() => handleMultiSelectToggle(currentQ.id, opt)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-3.5 ${
                          isSelected
                            ? 'bg-[#4169C1]/10 border-[#4169C1] text-[#202B40] shadow-sm ring-1 ring-[#4169C1]/20'
                            : 'bg-[#EDF2FA]/50 border-[#E2E8F0] text-[#202B40] hover:border-[#4169C1]/40 hover:bg-[#EDF2FA]'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-lg border flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                            isSelected
                              ? 'border-[#4169C1] bg-[#4169C1] text-white'
                              : 'border-[#CBD5E1] bg-white text-[#718096]'
                          }`}
                        >
                          {isSelected ? '✓' : ''}
                        </div>
                        <span className="text-xs sm:text-sm leading-relaxed">{opt}</span>
                      </button>
                    );
                  })}
              </div>
            )}

            {/* True/False Question */}
            {currentQ?.question_type === 'true_false' && (
              <div className="grid grid-cols-2 gap-4">
                {['True', 'False'].map((val) => {
                  const isSelected = answers[currentQ.id] === val;
                  return (
                    <button
                      key={val}
                      onClick={() => handleAnswerChange(currentQ.id, val)}
                      className={`p-5 rounded-2xl border text-center transition-all font-bold text-sm ${
                        isSelected
                          ? 'bg-[#4169C1]/10 border-[#4169C1] text-[#202B40] shadow-sm ring-1 ring-[#4169C1]/20'
                          : 'bg-[#EDF2FA]/50 border-[#E2E8F0] text-[#718096] hover:border-[#4169C1]/40 hover:text-[#202B40] hover:bg-[#EDF2FA]'
                      }`}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Short & Long Descriptive Responses */}
            {(currentQ?.question_type === 'short_answer' ||
              currentQ?.question_type === 'long_answer') && (
              <div className="space-y-2">
                <textarea
                  rows={currentQ.question_type === 'long_answer' ? 7 : 4}
                  value={answers[currentQ.id] || ''}
                  onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                  placeholder={`Type your ${currentQ.question_type === 'long_answer' ? 'detailed' : 'concise'} response here...`}
                  className="w-full bg-[#EDF2FA]/60 border border-[#E2E8F0] rounded-2xl p-4 text-xs sm:text-sm text-[#202B40] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#4169C1] focus:ring-1 focus:ring-[#4169C1] leading-relaxed resize-y"
                />
                <div className="flex justify-between items-center text-[11px] text-[#718096] px-1 font-medium">
                  <span>Autosaved dynamically as you type</span>
                  <span>{(answers[currentQ.id] || '').length} characters</span>
                </div>
              </div>
            )}
          </div>

          {/* Stepper Navigation Footbar */}
          <div className="pt-6 border-t border-[#E2E8F0] flex items-center justify-between">
            <button
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-[#718096] hover:text-[#202B40] bg-[#EDF2FA] hover:bg-[#E2E8F0] border border-[#E2E8F0] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <span className="text-xs text-[#718096] font-semibold">
              {currentIndex + 1} of {questions.length}
            </span>

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#4169C1] hover:bg-[#3558a7] shadow-sm transition-all flex items-center gap-2"
              >
                <span>Next Question</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setShowSubmitModal(true)}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#233B67] hover:bg-[#1d3156] shadow-sm transition-all flex items-center gap-2"
              >
                <span>Review & Submit</span>
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Proctoring Camera & Question Grid Navigator */}
        <div className="lg:col-span-4 space-y-6">
          {/* Live AI Proctoring Camera Box */}
          {examData?.ai_proctoring_enabled && (
            <div className="bg-white p-5 rounded-3xl border border-[#E2E8F0] shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-[#202B40]">
                  <Video className="w-4 h-4 text-[#4169C1]" />
                  <span>AI Proctoring Camera</span>
                </div>

                {/* Status Indicator Pill */}
                {cameraTechnicalError ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D69B35]/15 text-[#D69B35] border border-[#D69B35]/30">
                    <VideoOff className="w-3 h-3" />
                    Camera Error
                  </span>
                ) : faceStatus === 'multiple_faces' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D95C65]/15 text-[#D95C65] border border-[#D95C65]/30 animate-pulse">
                    <Users className="w-3 h-3 text-[#D95C65]" />
                    Multiple Faces
                  </span>
                ) : faceStatus === 'looking_away' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D69B35]/15 text-[#D69B35] border border-[#D69B35]/30 animate-pulse">
                    <Eye className="w-3 h-3 text-[#D69B35]" />
                    Looking Away
                  </span>
                ) : faceStatus === 'detected' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#299D70]/15 text-[#299D70] border border-[#299D70]/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#299D70] animate-pulse"></span>
                    Face Detected
                  </span>
                ) : faceStatus === 'checking' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EDF2FA] text-[#718096] border border-[#E2E8F0]">
                    <RefreshCw className="w-3 h-3 animate-spin text-[#718096]" />
                    Scanning...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D69B35]/15 text-[#D69B35] border border-[#D69B35]/30 animate-pulse">
                    <AlertTriangle className="w-3 h-3 text-[#D69B35]" />
                    Face Not Detected
                  </span>
                )}
              </div>

              <div className="relative aspect-video rounded-2xl bg-[#1A2536] border border-[#E2E8F0] overflow-hidden flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover -scale-x-100"
                />

                {/* Focus Overlay Guidelines */}
                {faceStatus === 'not_detected' && !cameraTechnicalError && (
                  <div className="absolute inset-0 bg-[#D69B35]/20 border-2 border-[#D69B35]/60 rounded-2xl flex items-center justify-center pointer-events-none">
                    <span className="text-[11px] font-bold text-white bg-[#202B40]/80 px-2.5 py-1 rounded-lg backdrop-blur-sm">
                      Align Face in Center
                    </span>
                  </div>
                )}
                {faceStatus === 'multiple_faces' && !cameraTechnicalError && (
                  <div className="absolute inset-0 bg-[#D95C65]/20 border-2 border-[#D95C65]/60 rounded-2xl flex items-center justify-center pointer-events-none">
                    <span className="text-[11px] font-bold text-white bg-[#202B40]/80 px-2.5 py-1 rounded-lg backdrop-blur-sm">
                      Multiple Faces Detected
                    </span>
                  </div>
                )}
                {faceStatus === 'looking_away' && !cameraTechnicalError && (
                  <div className="absolute inset-0 bg-[#D69B35]/20 border-2 border-[#D69B35]/60 rounded-2xl flex items-center justify-center pointer-events-none">
                    <span className="text-[11px] font-bold text-white bg-[#202B40]/80 px-2.5 py-1 rounded-lg backdrop-blur-sm">
                      Please Look at Screen
                    </span>
                  </div>
                )}
              </div>

              {cameraTechnicalError ? (
                <p className="text-[11px] text-[#D69B35] text-center bg-[#D69B35]/10 p-2 rounded-xl border border-[#D69B35]/20 font-medium">
                  {cameraTechnicalError}
                </p>
              ) : faceStatus === 'multiple_faces' ? (
                <p className="text-[11px] text-[#D95C65] text-center font-semibold">
                  Multiple persons detected in camera frame
                </p>
              ) : faceStatus === 'looking_away' ? (
                <p className="text-[11px] text-[#D69B35] text-center font-semibold">
                  Significant head turn detected ({headOrientation === 'head_turned_left' ? 'Left' : 'Right'})
                </p>
              ) : faceStatus === 'not_detected' ? (
                <p className="text-[11px] text-[#D69B35] text-center font-semibold">
                  Face must remain clearly visible throughout the examination
                </p>
              ) : (
                <p className="text-[11px] text-[#718096] text-center font-medium">
                  Continuous face presence & viewport focus monitored
                </p>
              )}
            </div>
          )}

          {/* Question Navigator Ledger */}
          <div className="bg-white p-6 rounded-3xl border border-[#E2E8F0] shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-[#202B40]">Question Navigator</h3>
            <p className="text-[11px] text-[#718096]">Click any number to navigate directly.</p>

            <div className="grid grid-cols-5 gap-2 pt-2">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const isFlagged = Boolean((flaggedQuestions || {})[q.id]);
                const ans = (answers || {})[q.id];
                const isAnswered = Array.isArray(ans) ? ans.length > 0 : ans && String(ans).trim() !== '';

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-10 rounded-xl text-xs font-bold transition-all relative flex items-center justify-center ${
                      isCurrent
                        ? 'ring-2 ring-[#4169C1] bg-[#4169C1] text-white shadow-sm'
                        : isFlagged
                        ? 'bg-[#D69B35]/15 text-[#D69B35] border border-[#D69B35]/30'
                        : isAnswered
                        ? 'bg-[#299D70]/15 text-[#299D70] border border-[#299D70]/30'
                        : 'bg-[#EDF2FA] text-[#718096] border border-[#E2E8F0] hover:border-[#4169C1]/50 hover:text-[#202B40]'
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {isFlagged && (
                      <span className="w-2 h-2 rounded-full bg-[#D69B35] absolute top-1 right-1"></span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Answer Status Summary */}
            <div className="pt-4 border-t border-[#E2E8F0] space-y-2 text-xs text-[#718096]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-[#299D70]/20 border border-[#299D70]/40"></div>
                  <span>Answered</span>
                </div>
                <strong className="text-[#202B40] font-bold">{answeredCount}</strong>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-[#D69B35]/20 border border-[#D69B35]/40"></div>
                  <span>Flagged for Review</span>
                </div>
                <strong className="text-[#202B40] font-bold">{flaggedCount}</strong>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-[#EDF2FA] border border-[#E2E8F0]"></div>
                  <span>Unanswered</span>
                </div>
                <strong className="text-[#202B40] font-bold">{unansweredCount}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Proctoring Warning Notification Modal */}
      {activeWarning && (
        <Modal
          isOpen={true}
          onClose={activeWarning.preventClose ? undefined : () => setActiveWarning(null)}
          type={activeWarning.type || 'warning'}
          title={activeWarning.title}
          message={activeWarning.message}
          confirmText={activeWarning.actionText || 'I Understand'}
          onConfirm={activeWarning.onAction || (() => setActiveWarning(null))}
          showCloseButton={!activeWarning.preventClose}
        >
          {activeWarning.details}
          {fullscreenError && activeWarning.id === 'fullscreen' && (
            <p className="text-xs text-[#D95C65] bg-[#D95C65]/10 p-2.5 rounded-xl border border-[#D95C65]/20 text-center mt-3 font-semibold">
              {fullscreenError}
            </p>
          )}
        </Modal>
      )}

      {/* Submit Confirmation Dialog */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => !submitting && setShowSubmitModal(false)}
        type="confirm"
        title="Submit Examination?"
        message="Please verify your submission. Once finalized, answers and integrity records cannot be altered."
        confirmText={submitting ? 'Grading & Submitting...' : 'Yes, Submit Exam'}
        cancelText="Return to Exam"
        loading={submitting}
        confirmDisabled={submitting}
        onConfirm={() => executeSubmission()}
        maxWidth="max-w-lg"
      >
        <div className="bg-[#EDF2FA] p-4 rounded-2xl border border-[#E2E8F0] grid grid-cols-3 gap-3 text-center my-3">
          <div>
            <div className="text-xs text-[#718096] font-medium">Answered</div>
            <div className="text-xl font-bold text-[#299D70] mt-0.5">{answeredCount}</div>
          </div>
          <div>
            <div className="text-xs text-[#718096] font-medium">Unanswered</div>
            <div className="text-xl font-bold text-[#D95C65] mt-0.5">{unansweredCount}</div>
          </div>
          <div>
            <div className="text-xs text-[#718096] font-medium">Flagged</div>
            <div className="text-xl font-bold text-[#D69B35] mt-0.5">{flaggedCount}</div>
          </div>
        </div>

        {unansweredCount > 0 && (
          <p className="text-xs text-[#202B40] bg-[#D69B35]/10 p-3 rounded-xl border border-[#D69B35]/20 text-center font-medium">
            Notice: You have <strong>{unansweredCount} unanswered</strong> question{unansweredCount > 1 ? 's' : ''}. Are you sure you wish to submit now?
          </p>
        )}
      </Modal>

      {/* Submission Retry Dialog */}
      <Modal
        isOpen={!!submitError}
        onClose={() => setSubmitError('')}
        type="danger"
        title="Submission Encountered an Issue"
        message={submitError}
        confirmText="Retry Submission"
        cancelText="Cancel"
        onConfirm={() => {
          setSubmitError('');
          executeSubmission();
        }}
      />
    </div>
  );
};

export default StudentExamAttempt;

