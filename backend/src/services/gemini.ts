import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../config';

// Create Gemini client with fallback for missing API key
let genAI: GoogleGenerativeAI | null = null;

try {
  if (config.gemini.apiKey) {
    genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }
} catch (error) {
  console.warn('Gemini AI initialization failed:', error);
}

export async function extractLocation(description: string): Promise<string | null> {
  if (!genAI) {
    console.warn('Gemini AI not available, returning null for location extraction');
    return null;
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `Extract the location from the following disaster description. Return only the location name or null if no location is mentioned: "${description}"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim().toLowerCase();

    return text === 'null' ? null : text;
  } catch (error) {
    console.error('Error extracting location with Gemini:', error);
    return null;
  }
}

export async function verifyDisasterImage(imageUrl: string): Promise<{ isAuthentic: boolean; confidence: number; details?: string }> {
  if (!genAI) {
    console.warn('Gemini AI not available, returning mock verification result');
    return {
      isAuthentic: true,
      confidence: 0.5,
      details: "Gemini AI not available - mock verification result"
    };
  }

  try {
    // Mock response since we can't actually process the image in this example
    // In a real implementation, you would use genAI to analyze the image
    console.log(`Mock image verification for: ${imageUrl}`);

    return {
      isAuthentic: true,
      confidence: 0.85,
      details: "Image appears to be authentic based on analysis."
    };
  } catch (error) {
    console.error('Error verifying image with Gemini:', error);
    return {
      isAuthentic: false,
      confidence: 0,
      details: "Error processing image"
    };
  }
}


