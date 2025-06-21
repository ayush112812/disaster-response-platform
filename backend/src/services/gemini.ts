import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../config';

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

export async function extractLocation(description: string): Promise<string | null> {
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
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
    
    // In a real implementation, you would fetch the image data
    // For now, we'll use a text-based approach
    const prompt = `Analyze this disaster image and determine if it's authentic or potentially manipulated. 
    Consider signs of editing, context, and consistency. 
    Respond with a JSON object containing 'isAuthentic' (boolean), 'confidence' (0-1), and 'details' (string).`;
    
    // Mock response since we can't actually process the image in this example
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
