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

# Create a simple submission summary file
$summaryContent = "# Disaster Response Platform - Submission Package

## AI Tool Usage Declaration
Primary Tool: Cursor/Windsurf with Claude Sonnet 4
AI-Generated Code: 95%+ of the codebase

## Key AI Contributions
- Cursor generated WebSocket logic for real-time communication
- Windsurf generated Gemini API integration for AI-powered features
- Cursor generated PostGIS queries for geospatial functionality
- Windsurf generated mock social media logic for monitoring simulation
- AI-generated frontend with React, TypeScript, and interactive maps
- AI-generated backend with Node.js, Express, and comprehensive APIs

## Live Deployment
Frontend: https://disaster-response-platform-swart.vercel.app/
Backend: Configured for Render deployment
Database: Supabase PostgreSQL with PostGIS

## Package Contents
- /backend/ - Complete Node.js/Express API server
- /disaster-frontend/ - Complete React/TypeScript frontend
- AI_TOOL_USAGE_DOCUMENTATION.md - Detailed AI tool usage documentation
- SUBMISSION_NOTES.md - Assignment-specific submission notes
- README.md - Complete project documentation with AI usage declaration
- DEPLOYMENT_GUIDE.md - Comprehensive deployment instructions

Note: This project demonstrates extensive and effective use of AI tools for rapid, high-quality application development."

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
