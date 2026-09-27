# Naukri Spot V1

A real web-app foundation for the private Naukri Spot Job Finding Engine.

## Current scope
Only two things:
1. Simple member database
2. Private job finding interface

No public member portal, no automatic member messaging, no extra CRM.

## Run locally

1. Install Node.js.
2. Copy `.env.example` to `.env`.
3. Add your Supabase project URL and publishable/anon key.
4. In Supabase SQL Editor, run `supabase/schema.sql`.
5. Install dependencies:
   `npm install`
6. Start:
   `npm run dev`

If `.env` is missing, the UI starts in safe demo mode with dummy records.

## Supabase security
Member data is private. RLS is enabled in the schema and no public policies are created.
Do not put a Supabase service-role key in the frontend.
