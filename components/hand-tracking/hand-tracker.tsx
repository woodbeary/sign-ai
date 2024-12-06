'use client';

import { useEffect, useRef, useState } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// Define the alphabet and corresponding signs
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function HandTracker() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [currentLetter, setCurrentLetter] = useState<string>('A');
  const [isCorrectPose, setIsCorrectPose] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState(false);
  const [feedback, setFeedback] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setHasPermission(true);
    } catch (err) {
      console.error('Failed to get camera permission:', err);
      setHasPermission(false);
    }
  };

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
    
    // Flip the image horizontally to match what the user sees
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    
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

    const drawHand = (landmarks: any[]) => {
      const ctx = canvasRef.current!.getContext('2d')!;
      const videoElement = videoRef.current!;
      
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

      // Make sure canvas matches video dimensions
      const videoElement = videoRef.current;
      canvasRef.current.width = videoElement.videoWidth;
      canvasRef.current.height = videoElement.videoHeight;

      const results = handLandmarker.detectForVideo(videoRef.current, performance.now());
      if (results.landmarks && results.landmarks.length > 0) {
        drawHand(results.landmarks[0]); // Draw the first detected hand
      } else {
        // Clear canvas if no hands detected
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }
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
    <div className="space-y-4">
      <Card className="p-4 text-center">
        <h2 className="text-2xl font-bold mb-2">Current Letter: {currentLetter}</h2>
        <p className={`text-lg ${isCorrectPose ? 'text-green-500' : feedback ? 'text-red-500' : 'text-yellow-500'}`}>
          {feedback || 'Make the sign and click "Check Sign"'}
        </p>
        {confidence > 0 && (
          <p className="text-sm text-gray-500 mt-1">
            Confidence: {confidence}%
          </p>
        )}
        <div className="flex justify-center gap-4 mt-4">
          <Button onClick={previousLetter}>Previous Letter</Button>
          <Button 
            onClick={checkSign} 
            disabled={isChecking}
            className={isChecking ? 'opacity-50' : ''}
          >
            {isChecking ? 'Checking...' : 'Check Sign'}
          </Button>
          <Button onClick={nextLetter}>Next Letter</Button>
        </div>
      </Card>

      <div className="relative w-full max-w-lg mx-auto">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full aspect-video bg-black rounded-lg"
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full"
        />
      </div>
    </div>
  );
} 