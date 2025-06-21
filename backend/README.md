# Disaster Response Coordination Platform - Backend

A comprehensive backend API for coordinating disaster response efforts, built with Node.js, Express, and Supabase.

## Features

- **Disaster Management**: CRUD operations for disaster events with geolocation
- **Real-time Updates**: WebSocket support for live updates
- **Social Media Integration**: Monitor disaster-related social media posts
- **Resource Management**: Track and locate resources near disaster areas
- **Geospatial Queries**: Find resources and disasters near specific locations
- **Image Verification**: AI-powered verification of disaster-related images
- **Official Updates**: Aggregation of updates from official sources

## Prerequisites

- Node.js 14.0.0 or higher
- npm or yarn
- Supabase account (for database)
- Google AI API key (for Gemini AI features)
- Mapbox access token (for geocoding)

## Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/disaster-response-platform.git
   cd disaster-response-platform/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env.example` to `.env`
   - Update the values in `.env` with your configuration

4. **Initialize the database**
   ```bash
   npm run db:init
   ```

5. **Seed the database (optional)**
   ```bash
   npm run db:seed
   ```

## Running the Application

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## API Documentation

Once the server is running, you can access the API documentation at:
- Swagger UI: `http://localhost:5000/api-docs`
- OpenAPI Spec: `http://localhost:5000/api-docs.json`

## Available Scripts

- `npm start`: Start the production server
- `npm run dev`: Start the development server with hot-reload
- `npm test`: Run tests
- `npm run lint`: Run ESLint
- `npm run format`: Format code with Prettier
- `npm run db:init`: Initialize the database schema
- `npm run db:seed`: Seed the database with sample data
- `npm run db:reset`: Reset the database (init + seed)

## Environment Variables

See `.env.example` for all available environment variables.

## Project Structure

```
backend/
├── config/               # Configuration files
├── controllers/          # Route controllers
├── db/
│   ├── migrations/       # Database migration files
│   └── seeds/            # Database seed files
├── middleware/           # Custom middleware
├── models/               # Database models
├── routes/               # API routes
├── services/             # Business logic
├── scripts/              # Utility scripts
├── tests/                # Test files
├── .env                  # Environment variables
├── .eslintrc.js         # ESLint config
├── .prettierrc          # Prettier config
├── server.js            # Application entry point
└── package.json         # Dependencies and scripts
```

## API Endpoints

### Disasters
- `GET /api/disasters` - List all disasters
- `POST /api/disasters` - Create a new disaster
- `GET /api/disasters/:id` - Get a specific disaster
- `PUT /api/disasters/:id` - Update a disaster
- `DELETE /api/disasters/:id` - Delete a disaster

### Resources
- `GET /api/resources` - List all resources
- `POST /api/resources` - Create a new resource
- `GET /api/resources/nearby` - Find resources near a location
- `GET /api/resources/disaster/:disasterId` - Get resources for a disaster
- `PUT /api/resources/:id` - Update a resource
- `DELETE /api/resources/:id` - Delete a resource

### Social Media
- `GET /api/social/disaster/:disasterId` - Get social media posts for a disaster
- `GET /api/social/search` - Search social media posts

### Official Updates
- `GET /api/updates/disaster/:disasterId` - Get official updates for a disaster
- `GET /api/updates/search` - Search official updates

### Verification
- `POST /api/verify/image` - Verify an image
- `POST /api/verify/report` - Create a verification report
- `GET /api/verify/report/:id` - Get a verification report

### Geocoding
- `GET /api/geocode` - Geocode a location
- `POST /api/geocode/extract` - Extract location from text
- `GET /api/geocode/reverse` - Reverse geocode coordinates

## WebSocket Events

### Connection
- `connection` - When a client connects
- `disconnect` - When a client disconnects

### Rooms
- `join_disaster` - Join a disaster room
- `leave_disaster` - Leave a disaster room

### Events
- `disaster:created` - When a new disaster is created
- `disaster:updated` - When a disaster is updated
- `disaster:deleted` - When a disaster is deleted
- `resource:created` - When a new resource is added
- `resource:updated` - When a resource is updated
- `resource:deleted` - When a resource is deleted
- `social:new_post` - When a new social media post is received
- `update:new` - When a new official update is available

## Testing

```bash
npm test
```

## Linting

```bash
npm run lint
```

## Formatting

```bash
npm run format
```

## Deployment

### Prerequisites
- Docker and Docker Compose
- Supabase project

### Steps
1. Build the Docker image:
   ```bash
   docker build -t disaster-response-api .
   ```

2. Run the container:
   ```bash
   docker run -d --name disaster-api -p 5000:5000 --env-file .env disaster-response-api
   ```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Security

Security is a top priority for the Disaster Response Platform. Here are some key security measures in place:

- **Environment Variables**: Sensitive configuration is stored in `.env` files (not committed to version control)
- **JWT Authentication**: Secure token-based authentication with configurable expiration
- **Rate Limiting**: Protection against brute force and DDoS attacks
- **CORS**: Strict CORS policies to prevent unauthorized cross-origin requests
- **Input Validation**: All user input is validated to prevent injection attacks
- **Dependency Auditing**: Regular updates and security audits of dependencies

### Reporting Security Issues

If you discover a security vulnerability, please report it to [security@example.com](mailto:security@example.com).

For more details, see our [SECURITY.md](SECURITY.md) document.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Express.js](https://expressjs.com/)
- [Supabase](https://supabase.com/)
- [Socket.IO](https://socket.io/)
- [Google Gemini](https://ai.google/)
- [Mapbox](https://www.mapbox.com/)
- [OpenStreetMap](https://www.openstreetmap.org/)
