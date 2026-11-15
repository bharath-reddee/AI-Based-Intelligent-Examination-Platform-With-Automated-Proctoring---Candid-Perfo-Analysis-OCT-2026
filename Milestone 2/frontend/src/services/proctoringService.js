import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';

let landmarkerInstance = null;
let isInitializing = false;
let initPromise = null;
let lastVideoTimestamp = -1;
let fallbackCanvas = null;

export async function initFaceDetector() {
  if (landmarkerInstance) {
    return landmarkerInstance;
  }
  if (isInitializing && initPromise) {
    return initPromise;
  }

  isInitializing = true;
  initPromise = (async () => {
    try {
      
      const wasmPath = `${window.location.origin}/wasm`;
      const vision = await FilesetResolver.forVisionTasks(wasmPath);

      
      const modelPath = `${window.location.origin}/models/face_landmarker.task`;

      const options = {
        baseOptions: {
          modelAssetPath: modelPath,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 4, 
        minFaceDetectionConfidence: 0.35, 
        minFacePresenceConfidence: 0.35,
        minTrackingConfidence: 0.35,
        outputFacialTransformationMatrixes: true,
      };

      try {
        landmarkerInstance = await FaceLandmarker.createFromOptions(vision, options);
      } catch (gpuErr) {
        console.warn('MediaPipe GPU delegate initialization failed, falling back to CPU delegate:', gpuErr);
        options.baseOptions.delegate = 'CPU';
        landmarkerInstance = await FaceLandmarker.createFromOptions(vision, options);
      }

      return landmarkerInstance;
    } catch (err) {
      console.warn('MediaPipe FaceLandmarker failed to initialize, will use calibrated canvas fallback:', err);
      landmarkerInstance = null;
      throw err;
    } finally {
      isInitializing = false;
    }
  })();

  return initPromise;
}

export function isDetectorReady() {
  return Boolean(landmarkerInstance);
}

export function detectFaceAndOrientation(videoElement, timestampMs = performance.now()) {
  if (
    !videoElement ||
    videoElement.readyState < 2 ||
    videoElement.videoWidth === 0 ||
    videoElement.videoHeight === 0 ||
    videoElement.paused ||
    videoElement.ended
  ) {
    return {
      faceDetected: false,
      faceCount: 0,
      orientation: 'none',
      yawAngle: 0,
      symmetryRatio: 0.5,
      engine: 'none',
      error: 'Video not ready',
    };
  }

  
  let currentTimestamp = timestampMs;
  if (currentTimestamp <= lastVideoTimestamp) {
    currentTimestamp = lastVideoTimestamp + 1;
  }
  lastVideoTimestamp = currentTimestamp;

  
  if (landmarkerInstance) {
    try {
      const results = landmarkerInstance.detectForVideo(videoElement, currentTimestamp);

      if (!results || !results.faceLandmarks || results.faceLandmarks.length === 0) {
        return {
          faceDetected: false,
          faceCount: 0,
          orientation: 'none',
          yawAngle: 0,
          symmetryRatio: 0.5,
          engine: 'mediapipe',
          error: null,
        };
      }

      const faceCount = results.faceLandmarks.length;

      
      if (faceCount > 1) {
        return {
          faceDetected: true,
          faceCount,
          orientation: 'multiple_faces',
          yawAngle: 0,
          symmetryRatio: 0.5,
          engine: 'mediapipe',
          error: null,
        };
      }

      
      const landmarks = results.faceLandmarks[0];

      
      
      
      
      
      
      const nose = landmarks[1];
      const leftEye = landmarks[33]; 
      const rightEye = landmarks[263]; 
      const leftTemple = landmarks[234];
      const rightTemple = landmarks[454];

      
      const eyeSpan = Math.abs(rightEye.x - leftEye.x);
      const templeSpan = Math.abs(rightTemple.x - leftTemple.x);

      
      
      let eyeSymmetryRatio = 0.5;
      if (eyeSpan > 0.01) {
        eyeSymmetryRatio = (nose.x - leftEye.x) / eyeSpan;
      }

      
      let templeSymmetryRatio = 0.5;
      if (templeSpan > 0.02) {
        templeSymmetryRatio = (nose.x - leftTemple.x) / templeSpan;
      }

      
      const symmetryRatio = 0.6 * eyeSymmetryRatio + 0.4 * templeSymmetryRatio;

      
      const dz = (rightTemple.z || 0) - (leftTemple.z || 0);
      const dx = templeSpan > 0.01 ? templeSpan : 0.1;
      const yawAngle = Math.atan2(dz, dx) * (180 / Math.PI);

      
      
      let orientation = 'forward';
      if (symmetryRatio > 0.70 || yawAngle > 28) {
        orientation = 'head_turned_left';
      } else if (symmetryRatio < 0.30 || yawAngle < -28) {
        orientation = 'head_turned_right';
      }

      return {
        faceDetected: true,
        faceCount: 1,
        orientation,
        yawAngle: Math.round(yawAngle * 10) / 10,
        symmetryRatio: Math.round(symmetryRatio * 100) / 100,
        engine: 'mediapipe',
        error: null,
      };
    } catch (detectErr) {
      console.warn('MediaPipe detection frame error, falling back to canvas analysis:', detectErr);
    }
  }

  
  if (isInitializing) {
    return {
      faceDetected: false,
      faceCount: 0,
      orientation: 'none',
      yawAngle: 0,
      symmetryRatio: 0.5,
      engine: 'initializing',
      error: 'Detector initializing',
    };
  }

  
  return analyzeCanvasFallback(videoElement);
}

function analyzeCanvasFallback(video) {
  try {
    if (!fallbackCanvas) {
      fallbackCanvas = document.createElement('canvas');
    }
    const width = 160;
    const height = 120;
    fallbackCanvas.width = width;
    fallbackCanvas.height = height;

    const ctx = fallbackCanvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, width, height);

    const frame = ctx.getImageData(0, 0, width, height);
    const data = frame.data;

    let skinPixels = 0;
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;
    let sumX = 0;
    let sumY = 0;
    let sumLuma = 0;
    let sumLumaSq = 0;

    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        
        const yVal = 0.299 * r + 0.587 * g + 0.114 * b;
        const cb = -0.168736 * r - 0.331264 * g + 0.5 * b + 128;
        const cr = 0.5 * r - 0.418688 * g - 0.081312 * b + 128;

        const isSkinYCbCr = cb >= 75 && cb <= 135 && cr >= 130 && cr <= 178 && yVal > 30 && yVal < 245;
        const isSkinRgb = r > 60 && g > 35 && b > 20 && Math.max(r, g, b) - Math.min(r, g, b) > 10 && r > b;

        if (isSkinYCbCr || isSkinRgb) {
          skinPixels++;
          sumX += x;
          sumY += y;
          sumLuma += yVal;
          sumLumaSq += yVal * yVal;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const totalSampled = (width * height) / 4;
    const skinRatio = skinPixels / totalSampled;
    const bboxWidth = maxX - minX;
    const bboxHeight = maxY - minY;

    
    
    
    if (
      skinRatio < 0.035 ||
      skinRatio > 0.75 ||
      bboxWidth < 15 ||
      bboxHeight < 15 ||
      minX >= maxX ||
      minY >= maxY
    ) {
      return {
        faceDetected: false,
        faceCount: 0,
        orientation: 'none',
        yawAngle: 0,
        symmetryRatio: 0.5,
        engine: 'canvas_fallback',
        error: null,
      };
    }

    const aspectRatio = bboxHeight / bboxWidth;
    if (aspectRatio < 0.55 || aspectRatio > 2.5) {
      return {
        faceDetected: false,
        faceCount: 0,
        orientation: 'none',
        yawAngle: 0,
        symmetryRatio: 0.5,
        engine: 'canvas_fallback',
        error: null,
      };
    }

    
    const meanLuma = sumLuma / skinPixels;
    const varianceLuma = (sumLumaSq / skinPixels) - (meanLuma * meanLuma);
    if (varianceLuma < 12) {
      return {
        faceDetected: false,
        faceCount: 0,
        orientation: 'none',
        yawAngle: 0,
        symmetryRatio: 0.5,
        engine: 'canvas_fallback',
        error: null,
      };
    }

    
    const centroidX = sumX / skinPixels;
    const horizontalRatio = bboxWidth > 0 ? (centroidX - minX) / bboxWidth : 0.5;

    let orientation = 'forward';
    if (horizontalRatio > 0.68) {
      orientation = 'head_turned_left';
    } else if (horizontalRatio < 0.32) {
      orientation = 'head_turned_right';
    }

    return {
      faceDetected: true,
      faceCount: 1,
      orientation,
      yawAngle: Math.round((horizontalRatio - 0.5) * 60),
      symmetryRatio: Math.round(horizontalRatio * 100) / 100,
      engine: 'canvas_fallback',
      error: null,
    };
  } catch (err) {
    return {
      faceDetected: false,
      faceCount: 0,
      orientation: 'none',
      yawAngle: 0,
      symmetryRatio: 0.5,
      engine: 'canvas_fallback',
      error: err.message,
    };
  }
}

export function disposeFaceDetector() {
  if (landmarkerInstance) {
    try {
      landmarkerInstance.close();
    } catch (e) {
      console.warn('Error closing FaceLandmarker:', e);
    }
    landmarkerInstance = null;
  }
  isInitializing = false;
  initPromise = null;
  fallbackCanvas = null;
  lastVideoTimestamp = -1;
}
