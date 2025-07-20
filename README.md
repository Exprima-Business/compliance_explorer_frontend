# Compliance Explorer Frontend.

This is the frontend application for the Compliance Explorer, built with React, TypeScript, and Vite. The application provides a modern web interface for document scanning, clause management, and compliance analysis.

## Features

- **URL-based routing** - Supports organization and project slugs in URLs for better navigation and sharing
- **Document scanning** - Upload and analyze documents for compliance clauses
- **Clause management** - Browse, search, and organize compliance clauses
- **Matrix view** - Visual representation of clause relationships
- **Real-time updates** - Live progress tracking for document scanning

## Setup

1. Install dependencies:
```bash
npm install
```

2. Environment variables are managed in Vercel console and shared with Railway and Supabase:
- `VITE_ENABLE_URL_BASED_ROUTING` - Enable URL-based routing with org/project slugs
- `VITE_API_URL` - Backend API URL
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

3. Start the development server:
```bash
npm run dev
```

## Development

- Built with React 18 and TypeScript
- Uses Vite for fast development and building
- Material-UI for components and theming
- React Router for navigation
- Supabase for authentication and data storage

## Deployment

The frontend is deployed on Vercel with automatic deployments from the main branch. The application supports both URL-based routing (with org/project slugs) and traditional header-based routing for backward compatibility.

**Last updated:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

## URL Structure

When URL-based routing is enabled:
- `/app/login` - Authentication page
- `/app/org-slug/project-slug/` - Main application
- `/app/org-slug/project-slug/matrix` - Matrix view
- `/app/org-slug/project-slug/document-scanner` - Document scanner (if enabled)
