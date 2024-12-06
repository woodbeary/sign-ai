import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || '');

export async function POST(req: Request) {
  try {
    const { image, targetLetter } = await req.json();

    // Remove data URL prefix to get base64
    const base64Image = image.split(',')[1];

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are an expert in American Sign Language (ASL). 
    I will show you an image of someone making a hand sign.
    The target letter they are trying to sign is: "${targetLetter}"
    
    Please analyze if they are correctly signing this letter in ASL.
    
    Respond with a JSON object containing:
    - matches: boolean (true if the sign matches the letter, false if not)
    - confidence: number (0-100 indicating how confident you are in this assessment)
    - feedback: string (brief feedback about what's correct or what needs adjustment)
    
    Focus only on the hand position and shape, ignore background, clothing, etc.
    
    IMPORTANT: Respond ONLY with the JSON object, no other text.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Image
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();
    
    try {
      // Try to parse the entire response as JSON first
      const analysis = JSON.parse(text);
      return NextResponse.json(analysis);
    } catch {
      // If that fails, try to find and parse a JSON object within the text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {
        matches: false,
        confidence: 0,
        feedback: "Failed to analyze response"
      };
      return NextResponse.json(analysis);
    }
  } catch (error) {
    console.error('Error checking sign:', error);
    return NextResponse.json(
      { 
        matches: false,
        confidence: 0,
        feedback: error instanceof Error ? error.message : 'Failed to check sign'
      },
      { status: 500 }
    );
  }
} 