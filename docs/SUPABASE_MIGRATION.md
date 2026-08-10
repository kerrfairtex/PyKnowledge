# Supabase Migration Guide

## Overview

Migrate PyKnowledge from Express/Prisma to Supabase client for a static-friendly, zero-server-cost deployment.

## Prerequisites

- Netlify site connected to this repo
- Supabase project created
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set in Netlify environment variables

## Step 1: Install Supabase client

```bash
npm install
```

This installs `@supabase/supabase-js` at the root.

## Step 2: Create Supabase tables

Run these SQL statements in the Supabase SQL Editor:

```sql
create table if not exists public.profiles (
  id uuid not null references auth.users on delete cascade,
  institution text default 'TRAC',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (id)
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create table if not exists public.progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  lesson_id text not null,
  score integer not null,
  completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.progress enable row level security;

create policy "Users can view own progress"
  on public.progress for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own progress"
  on public.progress for insert
  to authenticated
  with check (auth.uid() = user_id);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  badge text not null,
  earned_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.achievements enable row level security;

create policy "Users can view own achievements"
  on public.achievements for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own achievements"
  on public.achievements for insert
  to authenticated
  with check (auth.uid() = user_id);
```

## Step 3: Replace server API calls

In client code where you currently call `/api/auth/login`, `/api/content/lessons`, etc., replace with Supabase client calls.

Example auth replacement:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// Login
async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

// Fetch lessons
async function getLessons() {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
  return { data, error }
}

// Save progress
async function saveProgress(lessonId, score, completed) {
  const { data, error } = await supabase
    .from('progress')
    .insert({
      lesson_id: lessonId,
      score,
      completed,
      user_id: (await supabase.auth.getUser()).data.user.id,
    })
  return { data, error }
}
```

## Step 4: Update routing and state

- Remove `window.PYKNOWLEDGE_API_URL` client-side API toggle
- Replace `core/storage.js` local-only writes with Supabase writes where online
- Keep localStorage fallback for offline mode

## Step 5: Deploy

```bash
git add .
git commit -m "feat: migrate to Supabase"
git push origin main
```

Netlify deploys automatically.

## Step 6: Verify

- Open Netlify site
- Register/login
- Check Supabase Dashboard → Authentication → Users
- Check Supabase Dashboard → Table Editor → progress/profiles/achievements

## Rollback

Keep the Express server in the repo during migration. If Supabase approach fails, revert to server API calls.
