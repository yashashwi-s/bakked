# Bakked CRM - Architecture Documentation

## Overview
A premium, minimal CRM interface for a bakery's WhatsApp marketing platform.

## Tech Stack
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **State Management**: Zustand
- **Backend**: FastAPI (Python) - already built
- **Database**: Supabase (PostgreSQL)
- **Messaging**: Meta WhatsApp Business API

## Project Structure
```
frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── layout.tsx          # Root layout with providers
│   │   ├── page.tsx            # Auth/Login page
│   │   ├── dashboard/          # Dashboard page
│   │   ├── customers/          # Customers CRM page
│   │   └── messages/           # Message crafting page
│   ├── components/
│   │   ├── ui/                 # Reusable UI components
│   │   ├── layout/             # Layout components
│   │   ├── customers/          # Customer-specific components
│   │   ├── messages/           # Message-specific components
│   │   └── dashboard/          # Dashboard-specific components
│   ├── lib/
│   │   ├── api.ts              # API client for backend
│   │   ├── utils.ts            # Utility functions
│   │   └── constants.ts        # App constants
│   ├── stores/                 # Zustand stores
│   │   ├── auth.ts             # Authentication state
│   │   ├── customers.ts        # Customers state
│   │   └── messages.ts         # Messages/templates state
│   └── types/                  # TypeScript types
│       └── index.ts            # All type definitions
```

## API Endpoints (Backend)

### Authentication
- Password stored in backend `.env` as `PASS`
- Frontend sends hash to verify

### Contacts
- `GET /contacts` - Fetch all contacts
- `POST /contacts` - Create/update contact
- `PUT /contacts/{id}` - Update contact fields

### Groups & Recipients
- `GET /groups/{group_type}/members` - Get dynamic group members
- `POST /recipient-groups` - Save custom recipient group

### Templates
- `GET /local-templates` - Get saved templates
- `POST /local-templates` - Create template
- `DELETE /local-templates/{id}` - Delete template

### Campaigns
- `POST /campaigns/send` - Send bulk campaign
- `POST /test-message` - Send test message
- `GET /campaigns` - List campaigns

### Media
- `POST /upload-media` - Upload images

### Analytics
- `GET /message-logs` - Message delivery stats
- Meta Business API provides additional analytics

## Dynamic Groups Logic

### Birthday
Recipients: Contacts where `dob` month/day matches today

### Anniversary
Recipients: Contacts where `anniversary` month/day matches today

### 2-Day Nudge
Recipients: Contacts where `last_visit` was exactly 2 days ago

### 15-Day Nudge
Recipients: Contacts where `last_visit` was exactly 15 days ago

### Festivals
Recipients: All active contacts (manual trigger)

## Message Template Placeholders
- `[Name]` - Contact's name (or "Friend" if empty)
- `[Phone]` - Contact's phone number
- `[Days]` - Days since last visit

## Theme System
- CSS Variables for light/dark mode
- Stored in localStorage
- Clean monochrome palette (black, white, grays)

## Authentication Flow
1. User enters password on login page
2. Password is hashed client-side
3. Compared with server-side hashed password
4. Session stored in localStorage with expiry
