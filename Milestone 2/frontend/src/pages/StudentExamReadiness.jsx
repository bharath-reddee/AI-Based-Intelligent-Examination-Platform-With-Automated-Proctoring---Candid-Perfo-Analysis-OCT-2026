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
  ShieldCheck,
  Camera,
  VideoOff,
  CheckCircle2,
  Clock,
  Award,
  HelpCircle,
  Maximize2,
  FileText,
  AlertTriangle,
  ArrowLeft,
  Loader2,
} from 'lucide-react';

const StudentExamReadiness = () => {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);

  const [cameraStream, setCameraStream] = useState(null);
  const [cameraStatus, setCameraStatus] = useState('pending');
  const [cameraErrorMsg, setCameraErrorMsg] = useState('');
  
  const [faceDetectionStatus, setFaceDetectionStatus] = useState('idle');
  const [faceCheckPassed, setFaceCheckPassed] = useState(false);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [warningModal, setWarningModal] = useState({ isOpen: false, title: '', message: '' });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const activeStreamsRef = useRef(new Set());
  const mediaRequestIdRef = useRef(0);
  const faceIntervalRef = useRef(null);
  const isMountedRef = useRef(true);

  const stopActiveStreamTracks = useCallback((disposeDetector = true) => {
    if (faceIntervalRef.current) {
      clearInterval(faceIntervalRef.current);
      faceIntervalRef.current = null;
    }

    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
            track.enabled = false;
          } catch (e) {}
        });
      } catch (e) {}
      streamRef.current = null;
    }

    if (activeStreamsRef.current) {
      activeStreamsRef.current.forEach((st) => {
        try {
          if (st && st.getTracks) {
            st.getTracks().forEach((track) => {
              try {
                track.stop();
                track.enabled = false;
              } catch (e) {}
            });
          }
        } catch (e) {}
      });
      activeStreamsRef.current.clear();
    }

    const video = videoRef.current;
    if (video) {
      try {
        if (video.srcObject && video.srcObject.getTracks) {
          video.srcObject.getTracks().forEach((track) => {
            try {
              track.stop();
              track.enabled = false;
            } catch (e) {}
          });
        }
        video.srcObject = null;
      } catch (e) {}
    }

    if (disposeDetector) {
      try {
        disposeFaceDetector();
      } catch (e) {}
    }
  }, []);

  const requestMediaAccess = useCallback(async () => {
    const currentRequestId = ++mediaRequestIdRef.current;

    stopActiveStreamTracks(false);
    if (!isMountedRef.current) return;

    setCameraStatus('pending');
    setCameraErrorMsg('');
    setFaceDetectionStatus('idle');
    setFaceCheckPassed(false);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (isMountedRef.current && currentRequestId === mediaRequestIdRef.current) {
        setCameraStatus('error');
        setCameraErrorMsg('Your browser does not support webcam media access. Please access via modern HTTPS browser.');
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      if (!isMountedRef.current || currentRequestId !== mediaRequestIdRef.current) {
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
            track.enabled = false;
          } catch (e) {}
        });
        return;
      }

      streamRef.current = stream;
      activeStreamsRef.current.add(stream);
      setCameraStream(stream);
      setCameraStatus('granted');

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          if (video && isMountedRef.current) {
            video.play().catch(() => {});
          }
        };
      }

      startFaceDetection();
    } catch (err) {
      if (!isMountedRef.current || currentRequestId !== mediaRequestIdRef.current) return;
      console.warn('Camera request error:', err);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraStatus('denied');
        setCameraErrorMsg('Camera access was declined. Please allow camera permissions in your browser bar.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraStatus('error');
        setCameraErrorMsg('No video capture hardware was identified on this machine.');
      } else {
        setCameraStatus('error');
        setCameraErrorMsg(`Camera access failed: ${err.message || 'Unknown error'}`);
      }
    }
  }, [stopActiveStreamTracks]);

  const startFaceDetection = useCallback(async () => {
    if (!isMountedRef.current) return;
    setFaceDetectionStatus('initializing');

    try {
      const initialized = await initFaceDetector();
      if (!initialized) {
        if (isMountedRef.current) setFaceDetectionStatus('error');
        return;
      }

      if (!isMountedRef.current) return;
      setFaceDetectionStatus('scanning');

      if (faceIntervalRef.current) clearInterval(faceIntervalRef.current);

      faceIntervalRef.current = setInterval(async () => {
        const video = videoRef.current;
        if (!video || !isMountedRef.current || video.readyState < 2) return;

        try {
          const result = await detectFaceAndOrientation(video);
          if (isMountedRef.current) {
            if (result && result.faceCount === 1) {
              setFaceCheckPassed(true);
              setFaceDetectionStatus('success');
            } else if (result && result.faceCount > 1) {
              setFaceCheckPassed(false);
              setFaceDetectionStatus('multiple_faces');
            } else {
              setFaceCheckPassed(false);
              setFaceDetectionStatus('no_face');
            }
          }
        } catch (e) {
          console.warn('Face detection pass exception:', e);
        }
      }, 800);
    } catch (e) {
      if (isMountedRef.current) setFaceDetectionStatus('error');
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    apiClient
      .get(`/exams/student/${examId}/instructions`)
      .then((res) => {
        if (!isMountedRef.current) return;
        setExam(res.data);
        setLoading(false);

        if (res.data.ai_proctoring_enabled) {
          requestMediaAccess();
        } else {
          setCameraStatus('not_required');
          setFaceCheckPassed(true);
        }
      })
      .catch((err) => {
        if (!isMountedRef.current) return;
        setError(formatApiError(err));
        setLoading(false);
      });

    return () => {
      isMountedRef.current = false;
      stopActiveStreamTracks(true);
    };
  }, [examId, requestMediaAccess, stopActiveStreamTracks]);

  const handleStartExam = async () => {
    if (!rulesAccepted) {
      setWarningModal({
        isOpen: true,
        title: 'Policy Acknowledgment Required',
        message: 'Please review and accept the examination rules and academic integrity declaration before proceeding.',
      });
      return;
    }

    if (exam?.ai_proctoring_enabled && (!faceCheckPassed || cameraStatus !== 'granted')) {
      setWarningModal({
        isOpen: true,
        title: 'Biometric Verification Incomplete',
        message: 'Your webcam stream and face detection must be verified before beginning this proctored examination.',
      });
      return;
    }

    setStarting(true);

    try {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen().catch(() => {});
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen().catch(() => {});
      }
    } catch (e) {}

    stopActiveStreamTracks(false);
    navigate(`/student/exams/${examId}/attempt`);
  };

  const handleBackToTests = () => {
    stopActiveStreamTracks(true);
    navigate('/student/tests');
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center space-y-4">
        <Loader2 className="w-10 h-10 text-[#4169C1] animate-spin mx-auto" />
        <p className="text-sm font-semibold text-[#202B40]">Configuring assessment parameters...</p>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6 stroke-[2]" />
        </div>
        <h2 className="text-xl font-bold text-[#202B40] font-heading">Assessment Access Notice</h2>
        <p className="text-xs text-[#718096] leading-relaxed">{error || 'This examination could not be loaded.'}</p>
        <button
          onClick={handleBackToTests}
          className="mt-4 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#4169C1] hover:bg-[#233B67] transition-all cursor-pointer shadow-xs"
        >
          Return to My Tests
        </button>
      </div>
    );
  }

  const isReadyToStart =
    rulesAccepted &&
    (!exam.ai_proctoring_enabled || (cameraStatus === 'granted' && faceCheckPassed));

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-6 text-left">
      
      {/* Top Header & Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleBackToTests}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#718096] hover:text-[#202B40] bg-white border border-[#E2E8F0] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Assessments</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#4169C1]/10 text-[#4169C1] border border-[#4169C1]/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Pre-Flight Integrity Gate</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Assessment Details & Instructions */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] space-y-5 bg-white shadow-sm">
            <div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#4169C1]/10 text-[#4169C1] border border-[#4169C1]/20">
                {exam.subject}
              </span>
              <h1 className="text-2xl font-bold text-[#202B40] tracking-tight mt-2 font-heading">{exam.title}</h1>
              {exam.topic && (
                <p className="text-xs text-[#35A6A0] font-semibold mt-0.5">Topic Syllabus: {exam.topic}</p>
              )}
              {exam.description && (
                <p className="text-xs text-[#718096] mt-2 leading-relaxed">{exam.description}</p>
              )}
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#E2E8F0]">
              <div className="bg-[#EDF2FA] p-3 rounded-2xl border border-[#E2E8F0]">
                <div className="text-[11px] text-[#718096] flex items-center gap-1 font-medium">
                  <Clock className="w-3 h-3 text-[#4169C1]" /> Allocated Time
                </div>
                <div className="text-sm font-bold text-[#202B40] mt-0.5">{exam.duration_minutes} Mins</div>
              </div>
              <div className="bg-[#EDF2FA] p-3 rounded-2xl border border-[#E2E8F0]">
                <div className="text-[11px] text-[#718096] flex items-center gap-1 font-medium">
                  <Award className="w-3 h-3 text-[#299D70]" /> Total Weight
                </div>
                <div className="text-sm font-bold text-[#202B40] mt-0.5">{exam.total_marks} Marks</div>
              </div>
              <div className="bg-[#EDF2FA] p-3 rounded-2xl border border-[#E2E8F0]">
                <div className="text-[11px] text-[#718096] flex items-center gap-1 font-medium">
                  <HelpCircle className="w-3 h-3 text-[#4169C1]" /> Questions
                </div>
                <div className="text-sm font-bold text-[#202B40] mt-0.5">{exam.number_of_questions} Items</div>
              </div>
              <div className="bg-[#EDF2FA] p-3 rounded-2xl border border-[#E2E8F0]">
                <div className="text-[11px] text-[#718096] flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3 h-3 text-[#35A6A0]" /> Surveillance
                </div>
                <div className="text-sm font-bold text-[#202B40] mt-0.5">
                  {exam.ai_proctoring_enabled ? 'Vision Active' : 'Standard'}
                </div>
              </div>
            </div>

            {/* Candidate Rules */}
            <div className="space-y-3 pt-3 border-t border-[#E2E8F0]">
              <h3 className="text-sm font-bold text-[#202B40] flex items-center gap-2 font-heading">
                <FileText className="w-4 h-4 text-[#4169C1]" />
                <span>Candidate Protocol & Guidelines</span>
              </h3>
              <div className="bg-[#EDF2FA]/70 p-4 rounded-2xl border border-[#E2E8F0] text-xs text-[#202B40] space-y-2 leading-relaxed">
                <p>
                  {exam.instructions ||
                    '1. The assessment countdown begins immediately upon entering the attempt screen. Do not reload or exit the window.'}
                </p>
                <div className="pt-1 space-y-1.5 text-[#718096]">
                  <div className="flex items-start gap-2">
                    <span className="text-[#4169C1] font-bold">•</span>
                    <span>
                      <strong className="text-[#202B40]">Enforced Fullscreen:</strong> Launching the test automatically places your viewport into exclusive fullscreen mode.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#4169C1] font-bold">•</span>
                    <span>
                      <strong className="text-[#202B40]">Window & Tab Limits:</strong> A maximum of{' '}
                      <strong className="text-[#4169C1]">{exam.max_tab_switches || 3} window focus events</strong> is allowed before automatic submission is enforced.
                    </span>
                  </div>
                  {exam.ai_proctoring_enabled && (
                    <div className="flex items-start gap-2">
                      <span className="text-[#35A6A0] font-bold">•</span>
                      <span>
                        <strong className="text-[#202B40]">Biometric Head Orientation:</strong> Keep your head centered and eyes oriented towards the screen throughout the session.
                      </span>
                    </div>
                  )}
                  {exam.negative_marking_enabled && (
                    <div className="flex items-start gap-2">
                      <span className="text-[#D95C65] font-bold">•</span>
                      <span>
                        <strong className="text-[#202B40]">Penalty Scoring:</strong> Erroneous selections deduct{' '}
                        <strong className="text-[#D95C65]">{exam.negative_marking_score || 0.25} points</strong> per question.
                      </span>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <span className="text-[#299D70] font-bold">•</span>
                    <span>
                      <strong className="text-[#202B40]">Continuous Cloud Save:</strong> Every response choice is synced to the database ledger in real time.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Camera & Hardware Verification */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-[#E2E8F0] space-y-5 bg-white shadow-sm">
            <h3 className="text-base font-bold text-[#202B40] flex items-center justify-between font-heading">
              <span>Hardware & Sensor Verification</span>
              {exam.ai_proctoring_enabled ? (
                <span className="text-xs font-semibold text-[#4169C1] bg-[#4169C1]/10 px-2.5 py-0.5 rounded-full border border-[#4169C1]/20">
                  Proctored Session
                </span>
              ) : (
                <span className="text-xs font-semibold text-[#299D70] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Standard Session
                </span>
              )}
            </h3>

            {exam.ai_proctoring_enabled ? (
              <div className="space-y-4">
                <div className="relative aspect-video rounded-2xl bg-[#202B40] border border-[#E2E8F0] overflow-hidden flex items-center justify-center group shadow-inner">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover -scale-x-100"
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {cameraStatus === 'pending' && (
                    <div className="absolute inset-0 bg-[#202B40]/80 flex flex-col items-center justify-center p-4 text-center space-y-2">
                      <div className="w-8 h-8 border-3 border-white/20 border-t-[#4169C1] rounded-full animate-spin"></div>
                      <p className="text-xs text-white">Initializing video capture pipeline...</p>
                      <p className="text-[11px] text-[#A7B4C7]">Please grant browser permissions when prompted</p>
                    </div>
                  )}

                  {(cameraStatus === 'denied' || cameraStatus === 'error') && (
                    <div className="absolute inset-0 bg-[#202B40]/90 flex flex-col items-center justify-center p-6 text-center space-y-3">
                      <VideoOff className="w-10 h-10 text-red-400" />
                      <p className="text-xs text-red-300 font-semibold">{cameraErrorMsg}</p>
                      <button
                        onClick={requestMediaAccess}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#4169C1] hover:bg-[#233B67] transition-colors cursor-pointer"
                      >
                        Reattempt Sensor Init
                      </button>
                    </div>
                  )}

                  {cameraStatus === 'granted' && (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#202B40]/75 backdrop-blur-md border border-white/20 text-[11px] font-semibold text-white">
                      {faceCheckPassed ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-[#299D70] animate-pulse"></span>
                          <span className="text-emerald-300">Biometrics Verified</span>
                        </>
                      ) : faceDetectionStatus === 'initializing' || faceDetectionStatus === 'scanning' ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-[#D69B35] animate-pulse"></span>
                          <span className="text-[#D69B35]">Scanning for Face...</span>
                        </>
                      ) : (
                        <>
                          <span className="w-2 h-2 rounded-full bg-[#D69B35] animate-pulse"></span>
                          <span className="text-[#D69B35]">Position Face in Frame</span>
                        </>
                      )}
                    </div>
                  )}

                  {cameraStatus === 'granted' && !faceCheckPassed && (
                    <div className="absolute bottom-3 inset-x-3 bg-[#202B40]/80 backdrop-blur-md px-3 py-2 rounded-xl text-center border border-[#D69B35]/30 text-[#D69B35] text-xs font-medium">
                      Ensure your face is centered and adequately illuminated to complete verification
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#EDF2FA] border border-[#E2E8F0]">
                    <span className="text-[#718096] flex items-center gap-2 font-medium">
                      <Camera className="w-4 h-4 text-[#4169C1]" /> Webcam Stream
                    </span>
                    <span
                      className={`font-semibold ${
                        cameraStatus === 'granted'
                          ? 'text-[#299D70]'
                          : cameraStatus === 'pending'
                          ? 'text-[#4169C1]'
                          : 'text-[#D95C65]'
                      }`}
                    >
                      {cameraStatus === 'granted'
                        ? '✓ Stream Active'
                        : cameraStatus === 'pending'
                        ? 'Awaiting Sensor...'
                        : cameraStatus === 'denied'
                        ? 'Access Denied'
                        : 'Unavailable'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#EDF2FA] border border-[#E2E8F0]">
                    <span className="text-[#718096] flex items-center gap-2 font-medium">
                      <ShieldCheck className="w-4 h-4 text-[#35A6A0]" /> MediaPipe Vision Sensor
                    </span>
                    <span
                      className={`font-semibold ${
                        faceCheckPassed
                          ? 'text-[#299D70]'
                          : cameraStatus === 'error' || cameraStatus === 'denied' || faceDetectionStatus === 'error'
                          ? 'text-[#D95C65]'
                          : 'text-[#4169C1]'
                      }`}
                    >
                      {cameraStatus !== 'granted'
                        ? 'Waiting for Camera'
                        : faceCheckPassed
                        ? '✓ Centered & Calibrated'
                        : faceDetectionStatus === 'initializing'
                        ? 'Loading MediaPipe Model...'
                        : faceDetectionStatus === 'scanning'
                        ? 'Calibrating Landmark Pose...'
                        : '⚠ Landmark Lost'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[#EDF2FA] border border-[#E2E8F0] space-y-2 text-xs text-[#718096]">
                <div className="flex items-center gap-2 text-[#299D70] font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Surveillance Sensor Not Required</span>
                </div>
                <p>
                  This test is designated as a standard assessment. You may proceed directly without webcam authorization.
                </p>
              </div>
            )}

            <div className="pt-4 border-t border-[#E2E8F0] space-y-3">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rulesAccepted}
                  onChange={(e) => setRulesAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-[#E2E8F0] bg-white text-[#4169C1] focus:ring-[#4169C1] cursor-pointer accent-[#4169C1]"
                />
                <span className="text-xs text-[#718096] group-hover:text-[#202B40] leading-relaxed">
                  I certify that I have read the guidelines and agree to uphold academic honesty. I understand that window switching or absence will be flagged as an infraction.
                </span>
              </label>

              <button
                onClick={handleStartExam}
                disabled={!isReadyToStart}
                className="w-full py-3.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#233B67] to-[#4169C1] hover:from-[#1b2f53] hover:to-[#3558a8] disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-[#4169C1]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Maximize2 className="w-4 h-4" />
                <span>
                  {starting
                    ? 'Entering Fullscreen & Initiating Attempt...'
                    : exam.ai_proctoring_enabled && cameraStatus !== 'granted'
                    ? 'Webcam Authorization Required'
                    : exam.ai_proctoring_enabled && !faceCheckPassed
                    ? 'Position Face in View to Enable'
                    : !rulesAccepted
                    ? 'Acknowledge Guidelines to Continue'
                    : 'Launch Examination Session'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={warningModal.isOpen}
        onClose={() => setWarningModal({ isOpen: false, title: '', message: '' })}
        type="warning"
        title={warningModal.title}
        message={warningModal.message}
        confirmText="Understood"
        onConfirm={() => setWarningModal({ isOpen: false, title: '', message: '' })}
      />
    </div>
  );
};

export default StudentExamReadiness;
