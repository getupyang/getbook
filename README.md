# Getbook

iPhone-first paper book capture app.

V1 scope:

- bookshelf and active book
- photo upload / camera capture + text capture
- optional on-photo highlight strokes for quote targeting
- client-side image compression
- IndexedDB local persistence
- record detail and edit surfaces
- Vercel API route for OCR / AI structuring through OpenRouter

OCR / AI setup:

1. Copy `.env.example` to `.env.local` for local `vercel dev`, or set the same
   variables in Vercel Project Settings.
2. Set `OPENROUTER_API_KEY` on the server side only.
3. Set `OPENROUTER_MODEL` to a vision model that supports image input and
   structured JSON output.

The browser never receives the API key. A capture is saved to IndexedDB first,
then `/api/analyze` tries to extract `quote`, `thought`, and `page` from the
compressed photo plus raw input.

Deployment:

- GitHub + Vercel is the intended path for iPhone use.
- Build command: `npm run build`
- Output directory: `dist`

Not in this version yet:

- account system
- cloud sync
- review questions
