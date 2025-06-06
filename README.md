# Compliance Explorer Backend

This is the backend service for the Compliance Explorer application, providing API endpoints for document scanning, clause management, and data processing.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with the following variables:
```
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

3. Start the development server:
```bash
npm run dev
```

## API Endpoints

### Document Scanning
- `POST /api/scan/document` - Upload and scan a document
- `GET /api/scan/progress/:id` - Get scan progress

### Clauses
- `GET /api/clauses` - Get all clauses
- `GET /api/clauses/:id` - Get a specific clause
- `GET /api/clauses/families` - Get clause families

## Development

- The server runs on port 3001 by default
- TypeScript is used for type safety
- Express.js is used as the web framework
- Supabase is used for database and authentication

## Deployment

The backend is deployed on Vercel as serverless functions. The API routes are automatically configured based on the file structure in the `src/routes` directory.
