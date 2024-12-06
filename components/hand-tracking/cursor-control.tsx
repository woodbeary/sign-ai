'use client';

import React from 'react';
import { useEffect, useRef } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const CURSOR_STYLES = {
  default: '🖐️',
  click: '👊',
  rightClick: '👌',
  highlight: '🤟'
} as const;

// Helper function to calculate distance between points
const getDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

// Function to simulate mouse events
const simulateMouseEvent = (type: string, x: number, y: number) => {
  const element = document.elementFromPoint(x, y);
  if (!element) return;

  try {
    // Create and dispatch events
    ['mousedown', 'mouseup', type].forEach(eventType => {
      const event = new MouseEvent(eventType, {
        view: window,
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        button: type === 'contextmenu' ? 2 : 0,
        buttons: type === 'contextmenu' ? 2 : 1,
      });
      element.dispatchEvent(event);
    });

    // Handle clickable elements
    if (element instanceof HTMLElement) {
      // Focus the element first
      element.focus();

      // Check if it's a clickable element
      if (
        element instanceof HTMLButtonElement ||
        element instanceof HTMLAnchorElement ||
        element.getAttribute('role') === 'button'
      ) {
        (element as HTMLElement & { click: () => void }).click();
      }
    }
  } catch (error) {
    console.error('Click simulation error:', error);
  }
};

export function CursorControl() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const lastPositionRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const lastGestureRef = useRef<keyof typeof CURSOR_STYLES>('default');
  const isRightHandRef = useRef(true);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Create cursor element
    const cursor = document.createElement('div');
    cursor.textContent = CURSOR_STYLES.default;
    cursor.style.position = 'fixed';
    cursor.style.pointerEvents = 'none';
    cursor.style.zIndex = '9999';
    cursor.style.fontSize = '24px';
    cursor.style.transition = 'transform 0.1s ease';
    cursor.style.left = '0';
    cursor.style.top = '0';
    cursor.style.transform = `translate(${lastPositionRef.current.x}px, ${lastPositionRef.current.y}px)`;
    document.body.appendChild(cursor);
    cursorRef.current = cursor;

    // Setup hand tracking
    async function setupHandTracking() {
      try {
        // Get camera stream
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user"
          }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Initialize MediaPipe
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        
        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });

        // Start detection loop
        function detectHands() {
          if (videoRef.current && cursorRef.current) {
            const results = handLandmarker.detectForVideo(videoRef.current, performance.now());
            
            if (results.landmarks && results.landmarks.length > 0) {
              const landmarks = results.landmarks[0];
              
              // Position calculation
              const palmCenter = landmarks[0];
              const x = (1 - palmCenter.x) * window.innerWidth;
              const y = palmCenter.y * window.innerHeight;
              const angleOffset = isRightHandRef.current ? -0.3 : 0.3;
              const adjustedX = x + angleOffset * window.innerWidth;

              // Update cursor position
              lastPositionRef.current.x = lastPositionRef.current.x * 0.3 + adjustedX * 0.7;
              lastPositionRef.current.y = lastPositionRef.current.y * 0.3 + y * 0.7;
              cursorRef.current.style.transform = `translate(${lastPositionRef.current.x}px, ${lastPositionRef.current.y}px)`;

              // Detect gestures
              // Fist detection - check if all fingers are curled
              const isFist = landmarks.slice(5).every((point, i) => {
                const tipIndex = Math.floor(i / 4) * 4 + 8; // Get finger tip (8, 12, 16, 20)
                const midIndex = Math.floor(i / 4) * 4 + 7; // Get middle joint (7, 11, 15, 19)
                const baseIndex = Math.floor(i / 4) * 4 + 5; // Get base (5, 9, 13, 17)
                
                return landmarks[tipIndex].y > landmarks[midIndex].y && 
                       landmarks[midIndex].y > landmarks[baseIndex].y;
              });

              // OK sign - thumb and index touching
              const isOK = getDistance(landmarks[4], landmarks[8]) < 0.05;

              // ILY sign - index and pinky up, middle and ring down
              const isILY = landmarks[8].y < landmarks[5].y && // index up
                           landmarks[20].y < landmarks[17].y && // pinky up
                           landmarks[12].y > landmarks[9].y && // middle down
                           landmarks[16].y > landmarks[13].y; // ring down

              // Handle gestures
              let currentGesture: keyof typeof CURSOR_STYLES = 'default';
              if (isFist) currentGesture = 'click';
              else if (isOK) currentGesture = 'rightClick';
              else if (isILY) currentGesture = 'highlight';

              if (currentGesture !== lastGestureRef.current) {
                cursorRef.current.textContent = CURSOR_STYLES[currentGesture];

                // Clear any pending click timeout
                if (clickTimeoutRef.current) {
                  clearTimeout(clickTimeoutRef.current);
                  clickTimeoutRef.current = null;
                }

                // Handle click actions immediately for better responsiveness
                if (currentGesture === 'click') {
                  simulateMouseEvent('click', lastPositionRef.current.x, lastPositionRef.current.y);
                } else if (currentGesture === 'rightClick') {
                  simulateMouseEvent('contextmenu', lastPositionRef.current.x, lastPositionRef.current.y);
                }
                // Note: highlight action can be added here later

                lastGestureRef.current = currentGesture;
              }

              // Handle scrolling with open palm near edges
              if (currentGesture === 'default') {
                const scrollThreshold = 0.15;
                const scrollSpeed = 15;
                if (y / window.innerHeight < scrollThreshold) {
                  window.scrollBy(0, -scrollSpeed);
                } else if (y / window.innerHeight > (1 - scrollThreshold)) {
                  window.scrollBy(0, scrollSpeed);
                }
              }
            }
          }
          requestAnimationFrame(detectHands);
        }

        detectHands();
      } catch (error) {
        console.error('Setup error:', error);
      }
    }

    setupHandTracking();

    // Cleanup
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
      if (cursorRef.current && document.body.contains(cursorRef.current)) {
        document.body.removeChild(cursorRef.current);
      }
    };
  }, []);

  return (
    <video
      ref={videoRef}
      style={{ display: 'none' }}
      autoPlay
      playsInline
      muted
    />
  );
} 