# Grade Calc — Web App (Next.js + Supabase)

Professional field calculator for pipe invert, slope verification, and structure calculations.
Built as a web app with Next.js 14 + Supabase. Deploys to Vercel in 2 clicks.

---

## ✅ What's Built

- **Dark mode only** (no light mode toggle needed)
- **Email/password auth** (Supabase)
- **Cloud sync** (all runs saved to your database)
- **All 4 sections:**
  - Section 1: Height of Instrument (HI)
  - Section 2: Hub → Start Invert
  - Section 3: Slope Verify
  - Section 4: Structure Calcs (optional)
- **Runs history** with delete
- **Responsive design** (works on desktop, tablet, phone)
- **Copy rod values** with one click

---

## 🚀 Deploy to Vercel (2 minutes)

### Step 1: Install dependencies
```bash
cd gradecalc-web
npm install
```

### Step 2: Test locally
```bash
npm run dev
```
Open http://localhost:3000 — you should see the login screen.

### Step 3: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

### Step 4: Deploy to Vercel
1. Go to https://vercel.com
2. Sign in with GitHub
3. Click "New Project"
4. Import your `gradecalc-web` repository
5. Vercel auto-detects Next.js — click "Deploy"
6. Done! Your app is live at `https://your-project.vercel.app`

**No environment variables needed** — Supabase credentials are already in the code.

---

## 🗄️ Your Supabase Backend

Already connected to:
- **Project URL:** https://bdcxphwibxyoqxtssoqu.supabase.co
- **Database:** `runs` table (already created)
- **Auth:** Email/password enabled

### View your data
Go to: https://supabase.com/dashboard/project/bdcxphwibxyoqxtssoqu

You can:
- See all saved runs in the database
- View active users
- Monitor API usage
- Manually add/delete users if needed

---

## 📁 Project Structure

```
gradecalc-web/
├── app/
│   ├── globals.css          # Tailwind + dark mode styles
│   ├── layout.tsx            # Root layout (dark mode always on)
│   ├── page.tsx              # Login/signup page
│   ├── calculator/
│   │   └── page.tsx          # Main calculator (protected)
│   └── runs/
│       └── page.tsx          # Runs history (protected)
├── lib/
│   └── supabase.ts           # Supabase client + types
├── utils/
│   └── formulas.ts           # All math (frozen)
├── .env.local                # Supabase credentials (local dev)
├── package.json
├── tailwind.config.js
└── README.md
```

---

## 🎨 Dark Mode

Dark mode is **always enabled** and cannot be toggled off.

Theme colors:
- Background: `#0a0f1a`
- Surface: `#111827`
- Accent (orange): `#f59e0b`
- Green: `#10b981`
- Red: `#ef4444`
- Blue: `#3b82f6`

---

## 🔐 How Auth Works

1. User opens app → sees login screen
2. Signs up with email + password
3. Supabase sends confirmation email
4. User clicks link → account confirmed
5. User signs in → session token stored in browser
6. Token auto-refreshes → stays logged in

All data is filtered by `user_id` automatically (Row Level Security).

---

## 💾 How Data Sync Works

When user saves a run:
```typescript
await supabase.from('runs').insert({
  user_id: user.id,
  name: 'My Run',
  bm_elev: 105.25,
  // ... all other fields
})
```

Supabase checks:
- Does the session token match this `user_id`?
- If yes → save to database
- If no → permission denied

The database **automatically** filters all queries by `user_id` — users cannot see each other's data.

---

## 🛠️ Development Commands

```bash
# Install dependencies
npm install

# Run dev server (localhost:3000)
npm run dev

# Build for production
npm run build

# Run production build locally
npm run start

# Lint code
npm run lint
```

---

## 📊 Database Schema

The `runs` table stores everything:

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | References auth.users |
| `name` | text | Run name |
| `created_at` | timestamp | Auto-set on insert |
| `updated_at` | timestamp | Auto-set on update |
| `bm_elev` | numeric | Benchmark elevation |
| `rod_bm` | numeric | Rod on benchmark |
| `hi` | numeric | Height of instrument |
| `hi_locked` | boolean | Section 1 locked? |
| `rod_hub` | numeric | Rod on hub |
| `cf_mode` | text | 'cut' or 'fill' |
| `cf_value` | numeric | Cut/fill value |
| `hub_elev` | numeric | Hub elevation |
| `start_invert` | numeric | Starting invert |
| `start_locked` | boolean | Section 2 locked? |
| `rod_a` | numeric | Rod shot A |
| `rod_b` | numeric | Rod shot B |
| `distance` | numeric | Distance A to B |
| `inv_a` | numeric | Invert A |
| `inv_b` | numeric | Invert B |
| `slope_percent` | numeric | Calculated slope % |
| `slope_locked` | boolean | Section 3 locked? |
| `struct_enabled` | boolean | Structure calcs on? |
| `struct_invert` | numeric | Invert for structure |
| `pipe_wall` | numeric | Pipe wall thickness |
| `basin_floor` | numeric | Basin floor thickness |
| `stone_depth` | numeric | Stone depth |
| `box_height` | numeric | Box height |
| `notes` | text | User notes |
| `project_name` | text | Project name |

---

## 🔮 Future Features

- [ ] Load saved run back into calculator
- [ ] Project name field in calculator
- [ ] Notes field in calculator
- [ ] Export run as PDF
- [ ] Multiple structures per run
- [ ] Pipe size selector with auto wall lookup
- [ ] On-grade tolerance checker (0.02' flag)
- [ ] Real-time collaboration

---

## 💰 Cost

**Free tier (current):**
- 500MB database
- 50,000 monthly active users
- Unlimited API requests
- Perfect for personal use or small teams

**Paid (when you scale):**
- $25/month: 8GB database, 100K users
- Vercel hosting: Free for hobby projects

---

## 🆘 Support

- Next.js docs: https://nextjs.org/docs
- Supabase docs: https://supabase.com/docs
- Tailwind docs: https://tailwindcss.com/docs
- Vercel docs: https://vercel.com/docs

---

**Built for the field. No compromises.**
