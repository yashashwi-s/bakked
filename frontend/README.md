# Bakked CRM Frontend

A premium, minimal CRM interface for WhatsApp marketing.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: Zustand
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Pages

### Login (`/`)
- Simple password authentication
- Password stored in backend `.env` as `PASS`
- Session persisted in localStorage (7 days)

### Dashboard (`/dashboard`)
- Overview stats (contacts, birthdays, anniversaries, nudges)
- Message delivery stats (sent, delivered, read)
- Recent campaigns and messages

### Customers (`/customers`)
- Full customer database view
- Search by name or phone
- Toggle active/inactive (affects messaging)
- Edit contact info (name, DOB, anniversary)
- Phone numbers censored by default (click to reveal)

### Messages (`/messages`)
- Three-column layout:
  1. **Left**: Groups & Recipients
  2. **Middle**: Message Crafting
  3. **Right**: Templates & Preview

#### Features:
- 5 predefined groups (Birthday, Anniversary, 2-Day Nudge, 15-Day Nudge, Festivals)
- Dynamic recipient lists (calculated daily)
- Drag-and-drop placeholders (`[Name]`, `[Days]`)
- Image upload (up to 10)
- CTA buttons
- Save/load templates
- WhatsApp-style preview
- Test message to stored test contact
- Bulk campaign sending with confirmation

## Theme

- Light/Dark mode toggle
- Clean monochrome palette
- Premium, minimal design

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed documentation.
