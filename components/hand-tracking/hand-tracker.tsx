'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useMediaQuery } from 'react-responsive';

// Define the alphabet and corresponding signs
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function HandTracker() {
  const isMobile = useMediaQuery({ maxWidth: 767 });
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [currentLetter, setCurrentLetter] = useState<string>('A');
  const [isCorrectPose, setIsCorrectPose] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState(false);
  const [feedback, setFeedback] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // Get available video devices
  useEffect(() => {
    async function getDevices() {
      try {
        // First request with no constraints to get permission
        await navigator.mediaDevices.getUserMedia({ video: true });
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setDevices(videoDevices);

        // Try to find built-in camera
        const defaultDevice = videoDevices.find(device => 
          device.label.toLowerCase().includes('built-in') || 
          device.label.toLowerCase().includes('facetime')
        );

        // Set default to built-in camera or first available
        if (defaultDevice) {
          setSelectedDeviceId(defaultDevice.deviceId);
        } else if (videoDevices.length > 0) {
          setSelectedDeviceId(videoDevices[0].deviceId);
        }
      } catch (err) {
        console.error('Error getting devices:', err);
      }
    }
    getDevices();
  }, []);

  const requestCameraPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
          width: { ideal: isMobile ? 720 : 1280 },
          height: { ideal: isMobile ? 1280 : 720 },
          facingMode: "user",
          aspectRatio: isMobile ? 9/16 : 16/9
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
        };
      }
      setHasPermission(true);
    } catch (err) {
      console.error('Failed to get camera permission:', err);
      setHasPermission(false);
    }
  }, [selectedDeviceId, isMobile]);

  // Switch camera when device changes
  useEffect(() => {
    if (selectedDeviceId && hasPermission) {
      requestCameraPermission();
    }
  }, [selectedDeviceId, hasPermission]);

  const nextLetter = () => {
    const currentIndex = ALPHABET.indexOf(currentLetter);
    const nextIndex = (currentIndex + 1) % ALPHABET.length;
    setCurrentLetter(ALPHABET[nextIndex]);
    setIsCorrectPose(false);
    setFeedback('');
    setConfidence(0);
  };

  const previousLetter = () => {
    const currentIndex = ALPHABET.indexOf(currentLetter);
    const prevIndex = (currentIndex - 1 + ALPHABET.length) % ALPHABET.length;
    setCurrentLetter(ALPHABET[prevIndex]);
    setIsCorrectPose(false);
    setFeedback('');
    setConfidence(0);
  };

  const captureFrame = () => {
    if (!videoRef.current) return null;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    ctx.drawImage(videoRef.current, 0, 0);
    return canvas.toDataURL('image/jpeg');
  };

  const checkSign = async () => {
    const frame = captureFrame();
    if (!frame) return;

    setIsChecking(true);
    try {
      const response = await fetch('/api/check-sign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: frame,
          targetLetter: currentLetter,
        }),
      });

      const result = await response.json();
      
      if (result.error) {
        setFeedback('Failed to check sign. Please try again.');
        setIsCorrectPose(false);
        setConfidence(0);
      } else {
        setIsCorrectPose(result.matches);
        setFeedback(result.feedback);
        setConfidence(result.confidence || 0);
      }
    } catch (error) {
      console.error('Error checking sign:', error);
      setFeedback('Failed to check sign. Please try again.');
      setIsCorrectPose(false);
      setConfidence(0);
    } finally {
      setIsChecking(false);
    }
  };

  // Add hand tracking after camera is working
  useEffect(() => {
    if (!hasPermission || !videoRef.current || !canvasRef.current) return;

    let handLandmarker: HandLandmarker;
    
    const setupHandTracking = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      
      handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 1
      });

      detectHands();
    };

    const drawHand = (landmarks: { x: number; y: number }[]) => {
      const ctx = canvasRef.current!.getContext('2d')!;
      
      // Clear previous drawings
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      
      // Set drawing styles based on correctness
      let color;
      if (!feedback) {
        color = '#FFFF00'; // Yellow when no feedback yet
      } else if (isCorrectPose) {
        color = '#00FF00'; // Green when correct
      } else {
        color = '#FF0000'; // Red when incorrect
      }
      
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;

      // Draw each landmark
      landmarks.forEach((landmark) => {
        // Scale coordinates to canvas size
        const x = landmark.x * ctx.canvas.width;
        const y = landmark.y * ctx.canvas.height;

        // Draw landmark point
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();
      });

      // Connect landmarks with lines to form hand skeleton
      const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4], // thumb
        [0, 5], [5, 6], [6, 7], [7, 8], // index finger
        [0, 9], [9, 10], [10, 11], [11, 12], // middle finger
        [0, 13], [13, 14], [14, 15], [15, 16], // ring finger
        [0, 17], [17, 18], [18, 19], [19, 20], // pinky
        [0, 5], [5, 9], [9, 13], [13, 17] // palm
      ];

      connections.forEach(([start, end]) => {
        const startPoint = landmarks[start];
        const endPoint = landmarks[end];

        ctx.beginPath();
        ctx.moveTo(startPoint.x * ctx.canvas.width, startPoint.y * ctx.canvas.height);
        ctx.lineTo(endPoint.x * ctx.canvas.width, endPoint.y * ctx.canvas.height);
        ctx.stroke();
      });
    };

    const detectHands = () => {
      if (!videoRef.current || !handLandmarker || !canvasRef.current) return;
      if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
        requestAnimationFrame(detectHands);
        return;
      }

      // Make sure canvas matches video dimensions
      if (canvasRef.current.width !== videoRef.current.videoWidth) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
      }

      try {
        const results = handLandmarker.detectForVideo(videoRef.current, performance.now());
        if (results.landmarks && results.landmarks.length > 0) {
          drawHand(results.landmarks[0]);
        } else {
          // Clear canvas if no hands detected
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
          }
        }
      } catch (error) {
        console.error('Hand detection error:', error);
      }
      
      requestAnimationFrame(detectHands);
    };

    setupHandTracking();
  }, [hasPermission, isCorrectPose, feedback]);

  useEffect(() => {
    if (hasPermission) {
      requestCameraPermission();
    }
  }, [hasPermission]);

  if (hasPermission === false) {
    return (
      <Card className="p-8 text-center">
        <p className="text-red-600 mb-4">Camera access was denied</p>
        <Button onClick={requestCameraPermission}>
          Try Again
        </Button>
      </Card>
    );
  }

  if (hasPermission === null) {
    return (
      <Card className="p-8 text-center">
        <h3 className="text-lg font-semibold mb-4">Camera Permission Required</h3>
        <Button onClick={requestCameraPermission}>
          Enable Camera
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4 w-full max-w-screen-lg mx-auto px-2 md:px-4">
      <Card className="p-3 md:p-4 text-center">
        {devices.length > 1 && (
          <div className="mb-4">
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="w-full max-w-xs p-2 rounded-md border border-gray-300 bg-background text-sm"
            >
              <option value="">Current Device Camera</option>
              {devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${devices.indexOf(device) + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}
        
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold mb-2">Current Letter: {currentLetter}</h2>
        <p className={`text-sm md:text-base lg:text-lg ${isCorrectPose ? 'text-green-500' : feedback ? 'text-red-500' : 'text-yellow-500'}`}>
          {feedback || 'Make the sign and click "Check Sign"'}
        </p>
        {confidence > 0 && (
          <p className="text-xs md:text-sm text-gray-500 mt-1">
            Confidence: {confidence}%
          </p>
        )}
        <div className="flex flex-wrap justify-center gap-2 md:gap-4 mt-3 md:mt-4">
          <Button 
            onClick={previousLetter}
            className="text-xs md:text-sm h-8 md:h-9"
          >
            Previous
          </Button>
          <Button 
            onClick={checkSign} 
            disabled={isChecking}
            className={`text-xs md:text-sm h-8 md:h-9 ${isChecking ? 'opacity-50' : ''}`}
          >
            {isChecking ? 'Checking...' : 'Check Sign'}
          </Button>
          <Button 
            onClick={nextLetter}
            className="text-xs md:text-sm h-8 md:h-9"
          >
            Next
          </Button>
        </div>
      </Card>

      <div className="relative w-full max-w-md mx-auto">
        <div className="relative w-full overflow-hidden rounded-lg" style={{ 
          maxHeight: '60vh',
          aspectRatio: isMobile ? '9/16' : '16/9'
        }}>
          <div className="transform scale-x-[-1]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover bg-black"
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
} 