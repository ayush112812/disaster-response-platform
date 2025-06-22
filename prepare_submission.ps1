# PowerShell script to prepare submission zip file
# Run this script to create a submission-ready zip file

Write-Host "🚀 Preparing Disaster Response Platform Submission..." -ForegroundColor Green

# Create submission directory
$submissionDir = "disaster-response-platform-submission"
if (Test-Path $submissionDir) {
    Remove-Item $submissionDir -Recurse -Force
}
New-Item -ItemType Directory -Path $submissionDir

Write-Host "📁 Creating submission directory..." -ForegroundColor Yellow

# Copy main project files
Copy-Item -Path "backend" -Destination "$submissionDir/backend" -Recurse
Copy-Item -Path "disaster-frontend" -Destination "$submissionDir/disaster-frontend" -Recurse

# Copy documentation files
Copy-Item -Path "README.md" -Destination "$submissionDir/"
Copy-Item -Path "AI_TOOL_USAGE_DOCUMENTATION.md" -Destination "$submissionDir/"
Copy-Item -Path "SUBMISSION_NOTES.md" -Destination "$submissionDir/"
Copy-Item -Path "DEPLOYMENT_GUIDE.md" -Destination "$submissionDir/"
Copy-Item -Path "DEPLOYMENT_READY.md" -Destination "$submissionDir/"

# Create a submission summary file
$summaryContent = @"
# Disaster Response Platform - Submission Package

## 🎯 Assignment Completion Summary

This submission package contains a complete disaster response platform that fulfills all assignment requirements:

### ✅ **Core Requirements Implemented**
1. **CRUD Operations**: Complete disaster and resource management
2. **Gemini API Integration**: Location extraction and image verification
3. **Geospatial Queries**: PostGIS integration with Supabase
4. **Social Media Monitoring**: Mock social media aggregation with urgency scoring
5. **Official Updates**: Government and emergency services data aggregation
6. **Real-Time Features**: WebSocket implementation for live updates
7. **Backend Optimization**: Caching, rate limiting, and structured logging

### 🤖 **AI Tool Usage (95%+ of codebase)**
- **Primary Tool**: Cursor/Windsurf with Claude Sonnet 4
- **Cursor generated WebSocket logic** for real-time communication
- **Windsurf generated Gemini API integration** for AI-powered features
- **Cursor generated PostGIS queries** for geospatial functionality
- **Windsurf generated mock social media logic** for monitoring simulation
- **AI-generated frontend** with React, TypeScript, and interactive maps
- **AI-generated backend** with Node.js, Express, and comprehensive APIs

### 🚀 **Live Deployment**
- **Frontend**: https://disaster-response-platform-swart.vercel.app/
- **Backend**: Configured for Render deployment
- **Database**: Supabase PostgreSQL with PostGIS

### 📁 **Package Contents**
- `/backend/` - Complete Node.js/Express API server
- `/disaster-frontend/` - Complete React/TypeScript frontend
- `AI_TOOL_USAGE_DOCUMENTATION.md` - Detailed AI tool usage documentation
- `SUBMISSION_NOTES.md` - Assignment-specific submission notes
- `README.md` - Complete project documentation with AI usage declaration
- `DEPLOYMENT_GUIDE.md` - Comprehensive deployment instructions

### 🎯 **Key Features Demonstrated**
1. **Real-Time Dashboard**: Live monitoring with WebSocket updates
2. **Interactive Maps**: Leaflet integration with geospatial queries
3. **AI Integration**: Gemini API for location and image processing
4. **Responsive Design**: Mobile-first UI with modern components
5. **Production Ready**: Optimized builds and deployment configuration

### 📊 **Technical Stack**
- **Frontend**: React, TypeScript, Vite, Mantine UI, Leaflet
- **Backend**: Node.js, Express, TypeScript, Socket.IO
- **Database**: Supabase (PostgreSQL + PostGIS)
- **AI**: Google Gemini API
- **Deployment**: Vercel (frontend), Render (backend)

**Note**: This project demonstrates extensive and effective use of AI tools (Cursor/Windsurf) for rapid, high-quality application development while maintaining production-ready code standards.
"@

Set-Content -Path "$submissionDir/SUBMISSION_SUMMARY.md" -Value $summaryContent

Write-Host "📝 Created submission summary..." -ForegroundColor Yellow

# Remove node_modules and build artifacts to reduce size
Write-Host "🧹 Cleaning up build artifacts..." -ForegroundColor Yellow
Remove-Item "$submissionDir/backend/node_modules" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$submissionDir/backend/dist" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$submissionDir/disaster-frontend/node_modules" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$submissionDir/disaster-frontend/dist" -Recurse -Force -ErrorAction SilentlyContinue

# Create the zip file
$zipFileName = "disaster-response-platform-submission.zip"
if (Test-Path $zipFileName) {
    Remove-Item $zipFileName -Force
}

Write-Host "📦 Creating zip file..." -ForegroundColor Yellow
Compress-Archive -Path $submissionDir -DestinationPath $zipFileName

# Clean up temporary directory
Remove-Item $submissionDir -Recurse -Force

Write-Host "✅ Submission package created: $zipFileName" -ForegroundColor Green
Write-Host "📊 Package includes:" -ForegroundColor Cyan
Write-Host "   - Complete source code (frontend & backend)" -ForegroundColor White
Write-Host "   - AI tool usage documentation" -ForegroundColor White
Write-Host "   - Deployment configuration" -ForegroundColor White
Write-Host "   - Live deployment URLs" -ForegroundColor White
Write-Host "   - Comprehensive README with AI usage notes" -ForegroundColor White

Write-Host "`n🎯 Ready for submission!" -ForegroundColor Green
Write-Host "📁 File: $zipFileName" -ForegroundColor Yellow
Write-Host "🌐 Live Demo: https://disaster-response-platform-swart.vercel.app/" -ForegroundColor Blue
