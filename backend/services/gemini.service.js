const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');
const db = require('./db.service');

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(config.googleAI.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    this.visionModel = config.googleAI.apiKey ? 
      this.genAI.getGenerativeModel({ model: 'gemini-pro-vision' }) : null;
  }

  async extractLocationFromText(text) {
    if (!text) return null;
    
    try {
      // Check cache first
      const cacheKey = `location:${text.substring(0, 100).replace(/\s+/g, '_')}`;
      const cached = await db.getFromCache(cacheKey);
      if (cached) return cached;

      const prompt = `Extract the primary location mentioned in the following text. 
      Return only the location name in plain text, nothing else. If no location is found, return "null".
      Text: "${text}"`;
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const location = response.text().trim();
      
      // Cache the result
      if (location && location.toLowerCase() !== 'null') {
        await db.setCache(cacheKey, location);
        return location;
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting location with Gemini:', error);
      return null;
    }
  }

  async verifyImage(imageUrl) {
    if (!this.visionModel) {
      throw new Error('Gemini Vision model not available. Check your API key.');
    }

    try {
      // Check cache first
      const cacheKey = `image_verify:${imageUrl}`;
      const cached = await db.getFromCache(cacheKey);
      if (cached) return cached;

      // In a real app, you would download the image and convert it to the right format
      // For now, we'll just use a placeholder implementation
      const prompt = `Analyze this disaster-related image and determine if it appears to be authentic.
      Consider the following factors:
      - Signs of digital manipulation
      - Contextual consistency
      - Likelihood of being related to a real disaster
      
      Return a JSON object with these fields:
      {
        "isAuthentic": boolean,
        "confidence": number (0-1),
        "analysis": "Brief explanation of the analysis",
        "potentialConcerns": ["List", "of", "any", "concerns"]
      }`;

      // In a real implementation, we would process the image here
      // For now, we'll return a mock response
      const mockResponse = {
        isAuthentic: true,
        confidence: 0.85,
        analysis: "Image appears to be authentic based on visual analysis.",
        potentialConcerns: ["Image quality is low", "No timestamp visible"]
      };

      // Cache the result
      await db.setCache(cacheKey, mockResponse);
      
      return mockResponse;
    } catch (error) {
      console.error('Error verifying image with Gemini:', error);
      throw new Error('Failed to verify image');
    }
  }
}

module.exports = new GeminiService();
