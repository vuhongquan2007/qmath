# QMath · Lớp toán anh Quân

Responsive React application for scheduled math exams, student results, tutor management, and class materials. The frontend uses Vite, TypeScript, Tailwind CSS, Recharts, and KaTeX; Supabase stores the application records and Realtime exam-session updates.

## Local development

Requirements: Node.js 20 or newer and access to the configured Supabase project.

```sh
npm install
npm run dev
```

The development server listens on `http://localhost:3000`. `npm run lint` runs the TypeScript check. `npm run build` creates the Vite client bundle and production Express server.

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` for the browser database client. Set `GEMINI_API_KEY` there to enable Gemini-backed answer-key parsing.

## Supabase setup

The application reads and writes `assignments`, `students`, `attempts`, and `class_groups`. Tutor login supports `tutors` (`username`, `name`, `password`) and the legacy singular `tutor` table (`name`, `password`). Set `VITE_SUPABASE_EXAM_SESSIONS=true` after applying the optional session migration to enable cross-device live progress. By default, session monitoring uses same-browser updates without probing a missing table.

The migration's `exam_sessions` policies allow the browser anon role to read and update session metadata because the current credential flow is table-based, not Supabase Auth. This is suitable only for a trusted prototype: anyone with the public anon key can inspect or forge session records. The existing student/tutor credentials are also checked from the client and are not a secure authorization boundary. Before production use, move login and privileged writes behind Supabase Auth or a server-side credential/session API, hash credentials, and apply role-scoped RLS policies to every table.

Exam PDFs and lecture files are stored as base64 data in Supabase records for compatibility with the existing schema. For larger libraries, move file bytes into a private Supabase Storage bucket and store object paths in the records.
