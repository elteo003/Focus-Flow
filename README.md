# Focus-Flow

ChronoFocus is a time blocking application built with Vite + React, Supabase and shadcn/ui.

## Prerequisites

- Node.js 20+
- Supabase CLI (`npm install -g supabase`)
- GitHub account (CI runs on GitHub Actions)

## Environment variables

Create a `.env` file in the project root (and configure the same keys on Render):

```bash
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_GOOGLE_CLIENT_SECRET=your-google-client-secret
```

You can optionally add environment-specific files such as `.env.production` for Render.

## Installation & development

```bash
git clone https://github.com/elteo003/Focus-Flow.git
cd Focus-Flow
npm install
npm run dev
```

The dev server runs on [http://localhost:8080](http://localhost:8080).

## Supabase migrations

1. Log into Supabase: `supabase login`
2. Link the project: `supabase link --project-ref <your-project-ref>`
3. Push migrations and database changes:
   ```bash
   supabase db push
   ```
   This executes migrations in chronological order (first the table creation, then extensions like `paused_duration`).

## Testing and quality checks

- `npm run lint` – ESLint (strict rules, zero warnings)
- `npm test` – Vitest unit tests (utilities like recurrence covered)
- `npm run build` – production build

GitHub Actions (`.github/workflows/ci.yml`) esegue `npm install`, `npm run lint` e `npm run build` su ogni push/PR verso `main`.

## Deployment to Render

1. Build a Render **Static Site** pointed to this repository.
2. Build command: `npm install && npm run build`
3. Publish directory: `dist`
4. Add the environment variables listed above in Render dashboard.
5. Add a redirect rule for client-side routing:
   ```
   /*  /index.html  200
   ```

Supabase Edge Functions and database run on Supabase; no server needs to be hosted on Render.

## Project structure (high level)

```
src/
  components/
  contexts/
  hooks/
  integrations/
  pages/
  utils/
supabase/
  migrations/
  functions/
```

- `hooks/useTimeBlocks.ts`: optimistic updates + realtime sync per time blocks
- `components/Today/*`: timeline UI, modal, timer controls
- `components/Analytics/AnalyticsView.tsx`: charts and statistics
- `supabase/migrations`: database schema and incremental changes

## Contributing

1. Create a feature branch
2. Run `npm run lint && npm test`
3. Commit and open a Pull Request

## License

MIT
