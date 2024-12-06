'use client';

import { useEffect, useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Card } from '@/components/ui/card';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

interface HandAnalysisProps {
  imageData: string | null;
}

export function HandAnalysis({ imageData }: HandAnalysisProps) {
  const [analysis, setAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    async function analyzeImage() {
      if (!imageData) return;
      
      try {
        setIsAnalyzing(true);
        
        // Convert base64 to blob
        const base64Data = imageData.split(',')[1];
        const binaryData = atob(base64Data);
        const uint8Array = new Uint8Array(binaryData.length);
        for (let i = 0; i < binaryData.length; i++) {
          uint8Array[i] = binaryData.charCodeAt(i);
        }

        // Get the model
        const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });

        // Analyze the image
        const result = await model.generateContent([
          'Analyze this hand sign image and tell me what letter of the sign language alphabet it most closely resembles. Only respond with the letter and a confidence percentage.',
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Data
            }
          }
        ]);

        const aiResponse = await result.response;
        const text = aiResponse.text();
        setAnalysis(text);
      } catch (error) {
        console.error('Error analyzing image:', error);
        setAnalysis('Failed to analyze image');
      } finally {
        setIsAnalyzing(false);
      }
    }

    analyzeImage();
  }, [imageData]);

  if (!imageData) return null;

  return (
    <Card className="p-4 mt-4">
      <div className="text-center">
        {isAnalyzing ? (
          <p>Analyzing hand sign...</p>
        ) : (
          <p className="font-mono">{analysis}</p>
        )}
      </div>
    </Card>
  );
} 