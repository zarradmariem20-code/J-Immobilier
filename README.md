# Journal Immobilier

Full-stack real estate agency platform for the Tunisian market. Property listings, visit scheduling, admin management, and auto-posting to social media.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS v4 |
| UI Components | Radix UI, shadcn/ui, MUI, Lucide Icons |
| Routing | React Router 7 |
| Forms | React Hook Form |
| Charts | Recharts |
| Maps | Leaflet |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL (Supabase) |
| Auth | Supabase Auth |
| Photo Storage | Supabase Storage |
| Video Storage | Cloudflare R2 |
| Image Processing | Sharp |
| Video Processing | FFmpeg |
| Social Media | Meta Graph API (FB + IG), TikTok Content Posting API |
| Email | Resend |
| Hosting (Frontend) | Vercel |
| Hosting (Backend) | Render |

---

## Project Status

**Version:** 0.0.1 (Active Development)
**Backend URL:** https://j-immobilier.onrender.com
**Frontend URL:** https://j-immobilier.vercel.app

---

## Completed Features

### Property Listings
- Full CRUD (create, read, update, delete)
- Multi-photo gallery with drag-and-drop reordering
- Video upload and playback (Cloudflare R2)
- Image processing (Sharp — multiple sizes, WebP conversion)
- Video preview generation (FFmpeg — VP9/WebM)
- Client-side video compression (FFmpeg WASM)
- Property search and filtering (by region, city, type, price range)
- Responsive masonry grid layout
- SEO-friendly URLs
- Featured listings
- Real-time updates (Supabase subscriptions)

### User Interface
- Fully responsive design (mobile, tablet, desktop)
- Dark/light theme toggle (next-themes)
- Animated transitions (Motion/Framer)
- Interactive maps (Leaflet) with location picker
- Image carousels (React Slick, Embla)
- Confetti effects on successful submissions
- Custom video player component

### Admin Panel
- Dashboard with analytics charts (Recharts)
- Property approval/rejection workflow
- Visit management and status tracking
- Site settings management (brand, contact, regions, offices)
- Bulk operations
- Inquiries management
- Listing submission review

### Authentication & Authorization
- Supabase Auth integration
- OTP-based login
- Admin password management
- Session persistence
- Role-based access (admin vs regular user)

### Social Media Integration
- Auto-post to Facebook (photo, video, carousel posts)
- Auto-post to Instagram (single image, carousel, video)
- Auto-post to TikTok (video via PULL_FROM_URL, photo posts)
- Configurable per-listing posting (admin can choose platforms)
- Results display in admin UI (success/failure per platform)

### Visit Scheduling
- Users can request property visits
- Admin can approve/reject/schedule visits
- Status tracking (pending, approved, scheduled, completed, cancelled)
- Visit analytics

### Media Handling
- Photo upload via Supabase Storage
- Video upload via Cloudflare R2 (pre-signed URLs)
- Backend processing pipeline (resize, convert, compress)
- ZIP download of all listing media
- Multiple image size generation

### Contact & Inquiries
- Contact form submissions
- Inquiry storage and management
- Admin notification emails (Resend)

### Settings & Configuration
- Dynamic site settings (stored in DB, editable via admin)
- Default fallback settings (hardcoded for offline use)
- Social media links management
- Regional coverage configuration
- Office/bureau management

---

## In Progress / Needs Work

### Instagram Connection
- **Status:** Blocked
- **Issue:** Instagram Business Account is in a separate Business Portfolio ("Journal Immobilier") from the Facebook Page ("Journalimmobilier")
- **Fix needed:** Move Facebook Page to the same Business Portfolio, then reconnect Instagram

### Error Handling
- **49 empty catch blocks** across the codebase
- Many `console.error` calls instead of user-facing error messages
- Some errors are silently swallowed
- Priority: Replace with proper toast notifications and error boundaries

### Type Safety
- **100+ `any` types** used across the codebase
- Mostly in `api.ts` (40+), `Admin.tsx` (15+), `admin.ts` (15+)
- Undermines TypeScript's type safety benefits

### Hardcoded Configuration
- Social media URLs duplicated in 5+ files
- Company info (phone, email, address) hardcoded in 10+ files
- DEFAULT_SITE_SETTINGS duplicated in 3 places (frontend, backend, SQL)
- API version strings hardcoded inline
- Timeout/cache values scattered as magic numbers

---

## TODO / Remaining Work

### Critical
- [ ] Fix Instagram Business Account connection
- [ ] Add proper error handling (replace empty catch blocks)
- [ ] Replace `any` types with proper TypeScript types
- [ ] Centralize hardcoded configuration
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Write E2E tests

### High Priority
- [ ] Implement `toggleFavorite` (currently a stub)
- [ ] Add proper logging (replace console.error with structured logging)
- [ ] Add CI/CD pipeline (GitHub Actions)
- [ ] Add README documentation
- [ ] Add `.env.example` file
- [ ] Remove committed `.env.local` from git history

### Medium Priority
- [ ] Add error boundaries for React components
- [ ] Add loading skeletons for better UX
- [ ] Add proper form validation messages
- [ ] Add SEO meta tags (Open Graph, Twitter Cards)
- [ ] Add sitemap generation
- [ ] Add robots.txt
- [ ] Optimize bundle size (code splitting)
- [ ] Add Lighthouse performance audit

### Low Priority
- [ ] Add internationalization (i18n) — French/Arabic
- [ ] Add PWA support
- [ ] Add offline mode
- [ ] Add push notifications
- [ ] Add analytics tracking (Google Analytics / Plausible)
- [ ] Add A/B testing infrastructure
- [ ] Add accessibility audit (WCAG compliance)

---

## Known Issues

| Issue | Severity | File |
|---|---|---|
| 49 empty catch blocks (silent error swallowing) | High | Multiple files |
| 100+ `any` types | Medium | Multiple files |
| DEFAULT_SITE_SETTINGS duplicated 3x | Medium | `api.ts`, `settings.ts`, `migration.sql` |
| Social URLs hardcoded in 5 files | Medium | `Footer.tsx`, `PropertyDetail.tsx`, `api.ts`, `settings.ts` |
| ESLint suppressions in Admin.tsx | Low | `Admin.tsx`, `MapLocationPicker.tsx` |
| Package version still 0.0.1 | Info | `package.json` |
| No test coverage | High | — |
| No CI/CD pipeline | Medium | — |
| README minimal | Medium | `README.md` |

---

## Setup

### Prerequisites
- Node.js 18+
- npm
- Supabase account
- Cloudflare R2 account (for videos)
- Cloudinary account (for photos)

### Installation

```bash
# Install dependencies
npm i

# Set up environment variables
cp .env.example .env.local   # Edit with your values

# Start development servers (frontend + backend)
npm run dev
```

### Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start both frontend and backend dev servers |
| `npm run dev:frontend` | Start only frontend (Vite) |
| `npm run dev:backend` | Start only backend (Express) |
| `npm run build` | Build frontend for production |
| `npm run build:backend` | Build backend TypeScript |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed database with initial data |

---

## Environment Variables

### Frontend (`.env.local`)

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Backend (`backend/.env.local`)

```
# Database
DATABASE_URL=your_postgresql_connection_string

# Supabase
SUPABASE_JWT_SECRET=your_jwt_secret
SUPABASE_URL=your_supabase_url
SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_service_role_key

# Cloudinary (photos)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_UPLOAD_PRESET=your_upload_preset

# Cloudflare R2 (videos)
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=your_public_url

# Resend (emails)
RESEND_API_KEY=your_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com
ADMIN_NOTIFICATION_EMAIL=admin@yourdomain.com

# Social Media (Meta / Facebook / Instagram)
META_PAGE_ACCESS_TOKEN=your_page_access_token
META_PAGE_ID=your_facebook_page_id
META_IG_BUSINESS_ID=your_instagram_business_id

# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

---

## Deployment

### Frontend (Vercel)
1. Connect GitHub repository to Vercel
2. Set framework preset to Vite
3. Add environment variables
4. Deploy

### Backend (Render)
1. Connect GitHub repository to Render
2. Set build command: `cd backend && npm install && npm run build`
3. Set start command: `cd backend && node dist/server.js`
4. Add environment variables from `backend/.env.render`
5. Deploy

### Database (Supabase)
1. Create Supabase project
2. Run migrations from `backend/migrations/`
3. Update connection strings in env vars

---

## Architecture

```
Frontend (Vercel)          Backend (Render)           External Services
├── React SPA              ├── Express API            ├── Supabase (DB + Auth)
├── Supabase Client        ├── PostgreSQL (pg)        ├── Cloudflare R2 (videos)
├── Direct DB queries      ├── Sharp (images)         ├── Cloudinary (photos)
└── Realtime subs          ├── FFmpeg (video)         ├── Meta Graph API (FB/IG)
                           └── Social posting         ├── TikTok API
                                                      └── Resend (emails)
```

**Data Flow:**
- Frontend queries Supabase directly for reads (with backend fallback)
- Writes go through the Express backend
- Media uploads: photos → Supabase Storage, videos → Cloudflare R2
- Social posting happens server-side via Graph/TikTok APIs

---

## License

Private — All rights reserved.
