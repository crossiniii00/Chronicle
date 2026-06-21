# RecruitMS Local Stack

This project now has two layers:

- `src/`: React + TypeScript frontend
- `server/`: local Node.js + Express backend scaffold for PostgreSQL, session auth, uploads, RBAC, audit logging, and Socket.IO

## Recommended stack

- Frontend: React
- Backend: Node.js + Express
- Database: PostgreSQL
- Authentication: session-based auth with PostgreSQL-backed sessions
- Realtime: Socket.IO
- File storage: local server filesystem in `uploads/resumes`

## Hiring workflow

The shared workflow now supports:

1. Applicant Form
2. Typing Test
3. Initial Interview
4. Assessment
5. Final Interview
6. Final Verdict

The system is now fully migrated to a local service architecture. Legacy Firebase dependencies have been removed in favor of a clean mock database service for local development and a PostgreSQL-backed Express server for production.

## Local setup

1. Install Node.js 20+ and PostgreSQL 15+.
2. Copy `.env.example` to `.env` and adjust values.
3. Run the PostgreSQL schema in `database/postgres/local_server_schema.sql`.
4. Install dependencies with `npm install`.
5. Start the frontend with `npm run dev`.
6. Start the backend with `npm run server:dev`.

## Backend capabilities

- Session auth with recruiter/admin RBAC hooks
- Activity logging to `audit_logs`
- PDF-only resume uploads with size/type checks
- Typing test scoring for timer, WPM, and accuracy
- Socket.IO rooms for recruiters/applicants
- Health check endpoint at `/health`

## Nginx and HTTPS

For local company-server deployment, terminate TLS at Nginx and proxy traffic to the Node server. Use self-signed certificates only inside the trusted local network, and rotate them on a schedule your IT team controls.

## Security checklist

- Enforce HTTPS, even on the local network
- Validate all request payloads with Zod
- Restrict uploads to PDF resumes
- Use RBAC for applicant, recruiter, admin, and guest interviewer roles
- Keep audit logs for status changes, logins, and admin actions
- Back up PostgreSQL regularly and test restore procedures

## Scaling notes

This layout is intended for:

- multiple recruiters working at the same time
- dozens of concurrent applicants
- queue spikes during hiring drives

PostgreSQL handles transactional workflow updates, while Socket.IO handles realtime queue and status updates.
