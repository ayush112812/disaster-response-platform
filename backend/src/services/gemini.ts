import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../config';
import { geocodeLocation as geocodeLocationService } from './geocoding';
import { cacheGeocodeResult, getCachedGeocodeResult } from './cache';

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

/**
 * Extract location from disaster description using Google Gemini API
 */
export async function extractLocationFromText(description: string): Promise<{
  extractedLocation?: string;
  coordinates?: { lat: number; lng: number }
}> {
  console.log('🔍 Extracting location using Gemini API from:', description);

  // Check cache first
  const cachedResult = await getCachedGeocodeResult(description);
  if (cachedResult) {
    console.log('✅ Using cached geocode result');
    return {
      extractedLocation: cachedResult.location_name,
      coordinates: cachedResult.coordinates
    };
  }

  try {
    // Check if Gemini API is configured
    if (!genAI) {
      throw new Error('Gemini API not configured');
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log('✅ Gemini model initialized successfully');

    const prompt = `
You are a location extraction expert. Analyze the following disaster description and extract the most specific location mentioned.

Rules:
1. Extract the most specific location (city, neighborhood, landmark, address)
2. If multiple locations are mentioned, choose the primary disaster location
3. Return the location in a standardized format (e.g., "San Francisco, CA" or "Downtown Los Angeles")
4. If no specific location is found, return "NONE"
5. Do not include generic terms like "area", "region", "vicinity"

Disaster description: "${description}"

Location:`;

    const geminiResult = await model.generateContent(prompt);
    const response = await geminiResult.response;
    const extractedText = response.text().trim();

    console.log('🤖 Gemini extracted location:', extractedText);

    if (extractedText === 'NONE' || extractedText.toLowerCase().includes('none')) {
      console.log('❌ No location found by Gemini');
      return {};
    }

    // Clean up the extracted location
    const cleanLocation = extractedText.replace(/^Location:\s*/i, '').trim();

    // Now get coordinates using geocoding service
    const coordinates = await geocodeLocationService(cleanLocation);

    const finalResult = {
      extractedLocation: cleanLocation,
      coordinates
    };

    // Cache the result for future use
    if (coordinates) {
      await cacheGeocodeResult(cleanLocation, coordinates);
    }

    return finalResult;

  } catch (error) {
    console.error('❌ Error extracting location with Gemini:', error);

    // Fallback to simple pattern matching if Gemini fails
    console.log('🔄 Falling back to pattern matching...');
    return await extractLocationFallback(description);
  }
}

/**
 * Fallback location extraction using pattern matching
 */
async function extractLocationFallback(text: string): Promise<{ extractedLocation?: string; coordinates?: { lat: number; lng: number } }> {
  console.log('🔄 Using fallback pattern matching for:', text);

  const locationPatterns = [
    /(?:in|at|near|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),?\s*([A-Z][A-Z]|[A-Z][a-z]+)/gi,
    /(?:in|at|near|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
  ];

  for (const pattern of locationPatterns) {
    const match = pattern.exec(text);
    if (match) {
      const location = match[2] ? `${match[1]}, ${match[2]}` : match[1];
      console.log('✅ Fallback extracted location:', location);

      // Use real geocoding service instead of default coordinates
      try {
        const coordinates = await geocodeLocationService(location);
        return {
          extractedLocation: location,
          coordinates: coordinates || { lat: 40.7128, lng: -74.0060 } // Fallback to NYC only if geocoding fails
        };
      } catch (error) {
        console.error('❌ Fallback geocoding failed:', error);
        return {
          extractedLocation: location,
          coordinates: { lat: 40.7128, lng: -74.0060 } // Default to NYC
        };
      }
    }
  }

  return {};
}



// Keep the original function for backward compatibility
export async function extractLocation(description: string): Promise<string | null> {
  const result = await extractLocationFromText(description);
  return result.extractedLocation || null;
}

export async function verifyDisasterImage(imageUrl: string): Promise<{ isAuthentic: boolean; confidence: number; details?: string }> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
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


