
# 🔖 Smart Bookmark App

A personal bookmark manager with Google login and real-time sync across tabs.

## Live URL
https://smart-bookmark-app-gold-eight.vercel.app/

## Features
- 🔐 Google OAuth login (no password needed)
- ➕ Add bookmarks (URL + title)
- 🗑️ Delete your own bookmarks
- 🔒 Private — users only see their own bookmarks
- ⚡ Real-time sync — open 2 tabs, add in one, appears in the other instantly

## Tech Stack
- **Next.js** (App Router)
- **Supabase** (Auth, PostgreSQL database, Realtime)
- **Tailwind CSS** (styling)
- **Vercel** (deployment)



# Problems Faced & Solutions

#### Problem 1: When I deleted a bookmark in one tab, it disappeared from that tab instantly but the other tab still showed it until I refreshed the page.
`
Why it happened: I was using a single real-time listener for all events (event: '*'), but Supabase's DELETE event doesn't include the full row data the same way INSERT does — so the other tab had no way of knowing which bookmark was removed.
How I fixed it: I split the real-time listener into two separate ones — one for INSERT and one for DELETE. The DELETE listener receives a payload.old object which contains the ID of the deleted row. I used that ID to instantly filter it out from the list on the other tab without needing to refresh.
`


#### Problem 2:

`Problem 2: fetchBookmarks accessed before declaration
Called fetchBookmarks() inside a useEffect before the function was defined below it. Fixed by moving the function above the useEffect and wrapping it in useCallback.`


#### Problem 3:

`Google OAuth redirecting to localhost after deploy
After deploying to Vercel, signing in with Google redirected back to localhost:3000 instead of the live URL. Fixed by updating the Site URL and Redirect URLs in Supabase Authentication → URL Configuration, and adding the Vercel URL to Authorized JavaScript origins in Google Cloud Console.`




## Demo:



https://drive.google.com/file/d/1VTR_mXILT-dHzvlVmVYG8yh8ZeJYpDfL/view?usp=sharing






## Local Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Create environment file
```bash
cp .env.local.example .env.local
```
Fill in your Supabase URL and anon key (from Supabase → Project Settings → API).

### 3. Set up the database
Run the SQL in your Supabase SQL Editor.

### 4. Enable Google OAuth
- Go to Supabase → Authentication → Providers → Google
- Add your Google Cloud OAuth credentials

### 5. Enable Real-time
- Go to Supabase → Database → Replication
- Toggle ON the `bookmarks` table

### 6. Run locally
```bash
npm run dev
```
Open http://localhost:3000





