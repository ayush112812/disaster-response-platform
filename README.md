# Disaster Response Coordination Platform

A MERN stack application for coordinating disaster response efforts by aggregating real-time data from multiple sources.

## Features

- **Disaster Management**: CRUD operations for disaster records with location tracking
- **Location Intelligence**: Extract locations from text and convert to coordinates
- **Real-time Social Media Monitoring**: Track disaster-related posts from social media
- **Resource Mapping**: Find and manage resources near disaster areas
- **Official Updates**: Aggregate updates from government and relief organizations
- **Image Verification**: Verify the authenticity of disaster-related images
- **Geospatial Queries**: Find resources and disasters near specific locations

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: Supabase (PostgreSQL with PostGIS)
- **Real-time**: Socket.IO
- **AI/ML**: Google Gemini API for location extraction and image verification
- **Geocoding**: Mapbox and OpenStreetMap/Nominatim
- **Frontend**: (To be implemented) React.js

## Prerequisites

- Node.js (v14+)
- npm or yarn
- Supabase account
- Google AI API key
- Mapbox access token (optional)
- Twitter API credentials (optional)

## Setup Instructions

### 1. Clone the repository

```bash
git clone <repository-url>
cd disaster-response-platform
```

### 2. Set up the backend

```bash
cd backend
cp .env.example .env
```

Edit the `.env` file with your credentials:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key

# Google AI (Gemini) Configuration
GOOGLE_AI_KEY=your_google_ai_key

# Mapbox Configuration (optional)
MAPBOX_ACCESS_TOKEN=your_mapbox_access_token

# Twitter API Configuration (optional)
TWITTER_BEARER_TOKEN=your_twitter_bearer_token
```

### 3. Install dependencies

```bash
npm install
```

### 4. Set up the database

1. Create a new project in Supabase
2. Run the SQL from `backend/db/migrations/001_initial_schema.sql` in the Supabase SQL editor
3. Run the SQL from `backend/db/functions.sql` to create the necessary functions

### 5. Start the backend server

```bash
npm start
```

The API will be available at `http://localhost:5000`

## API Documentation

### Base URL
`http://localhost:5000/api`

### Endpoints

#### Disasters
- `GET /api/disasters` - Get all disasters
- `POST /api/disasters` - Create a new disaster
- `GET /api/disasters/:id` - Get a specific disaster
- `PUT /api/disasters/:id` - Update a disaster
- `DELETE /api/disasters/:id` - Delete a disaster

#### Social Media
- `GET /api/social-media/disaster/:disasterId` - Get social media posts for a disaster
- `GET /api/social-media/search?q=query` - Search social media for keywords

#### Resources
- `POST /api/resources` - Create a new resource
- `GET /api/resources/disaster/:disasterId` - Get resources for a disaster
- `GET /api/resources/nearby?lat=...&lng=...&radius=...` - Find resources near a location

#### Official Updates
- `GET /api/official-updates/disaster/:disasterId` - Get official updates for a disaster
- `GET /api/official-updates/search?q=query` - Search for official updates

#### Verification
- `POST /api/verify/image` - Verify an image
- `GET /api/verify/report/:reportId` - Get verification status for a report
- `GET /api/verify/disaster/:disasterId` - Get all verifications for a disaster

#### Geocoding
- `GET /api/geocode/location?q=address` - Geocode an address
- `POST /api/geocode/extract-location` - Extract and geocode location from text
- `GET /api/geocode/reverse?lat=...&lng=...` - Reverse geocode coordinates
- `GET /api/geocode/nearby-disasters?lat=...&lng=...&radius=...` - Find disasters near a location

## WebSocket Events

The server emits the following WebSocket events:

- `disaster_created` - When a new disaster is created
- `disaster_updated` - When a disaster is updated
- `disaster_deleted` - When a disaster is deleted
- `resource_created` - When a new resource is added
- `resource_updated` - When a resource is updated
- `resource_deleted` - When a resource is deleted
- `social_media_updated` - When new social media posts are available

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| PORT | Port to run the server on | No | 5000 |
| NODE_ENV | Environment (development/production) | No | development |
| SUPABASE_URL | Supabase project URL | Yes | - |
| SUPABASE_KEY | Supabase anon/public key | Yes | - |
| GOOGLE_AI_KEY | Google Gemini API key | Yes | - |
| MAPBOX_ACCESS_TOKEN | Mapbox access token | No | - |
| TWITTER_BEARER_TOKEN | Twitter API bearer token | No | - |

## Deployment

### Backend

The backend can be deployed to any Node.js hosting service (e.g., Heroku, Render, Railway).

1. Set up the environment variables in your hosting provider
2. Deploy the code
3. Run database migrations if needed

### Database

The database is hosted on Supabase. Make sure to:

1. Set up proper Row Level Security (RLS) policies
2. Create appropriate indexes for performance
3. Set up backups

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Acknowledgments

- [Supabase](https://supabase.com/) for the awesome open-source Firebase alternative
- [Google Gemini](https://ai.google/) for the AI capabilities
- [Mapbox](https://www.mapbox.com/) and [OpenStreetMap](https://www.openstreetmap.org/) for geocoding services
- All the open-source libraries that made this project possible
