# PR Smart Attendance System

React, TypeScript, and Vite frontend for the PR Smart Attendance dashboard.

## Run locally

1. Start the backend by following `../pr_attendence_sys_backend/README.md`.
2. Install frontend dependencies with `npm install`.
3. Start the frontend with `npm run dev`.

Vite proxies `/api` and `/uploads` requests to the local backend at `http://127.0.0.1:8000` by default. The active pages use the backend APIs for authentication, organization and people management, attendance, reporting, notifications, and audit workflows. The backend exposes device provisioning, signed heartbeat/scan APIs, and consent-gated enrollment commands; AMB82-Mini firmware and board behavior still need to be implemented and verified against the backend contract.

For production builds, set `VITE_API_BASE_URL` to the backend's public HTTP(S) origin (for example, `https://your-backend.onrender.com`). The production build fails clearly if this variable is missing or is not an origin. Set it in the frontend host's build environment; it is a public API URL, not a secret. Local development can leave it unset and use the Vite proxy.

The platform super admin signs in without choosing a tenant and lands on **Organizations**, a platform-only console for viewing all organizations, creating tenants, managing admin invitations, and deactivating/reactivating organizations. Organization admins use their organization dashboard to manage staff and employees; teachers invite students into assigned groups from **Invite student**. Codes expire in 24 hours and are shown once. Invitees complete registration at `/register` and set a password; existing users may use their current password to join another organization. Student/employee accounts use the same login page and see only their own attendance.

Create the first account using the backend's `npm run seed:admin` script with private environment values. No demo account or password is provided by the frontend.

## Validate

```sh
npm run build
npm run lint
```
