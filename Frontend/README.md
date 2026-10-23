# CareBase Frontend

CareBase is a hospital management workspace built with React, TypeScript, and Vite. This app provides the public CareBase website and appointment booking flow, along with hospital staff, clinical, pharmacy, billing, and platform administration screens.

## Requirements

- Node.js and npm versions compatible with the dependencies in `package.json`.
- The CareBase backend running locally or at a reachable API URL.

## Setup

From this directory:

```bash
npm install
```

Create a local `.env` file in `Frontend/` with the values for your environment:

```dotenv
VITE_API_URL=http://localhost:8000/api/v1
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
```

`VITE_API_URL` is the backend API base URL, including `/api/v1`. The reCAPTCHA site key is used for automatic verification on the login and signup forms. Those forms require a valid site key and a matching backend secret key; the visible notice describes the verification and links to Google's privacy and terms pages.

Do not commit `.env` files or place private keys in variables prefixed with `VITE_`; Vite exposes those values to browser code.

## Development and build

```bash
npm run dev       # Start the Vite development server
npm run lint      # Run ESLint
npm run build     # Type-check and create the production bundle in dist/
npm run preview   # Serve the production bundle locally
```

Vite prints the local development URL after startup. The frontend expects the backend to allow requests from that origin through its CORS configuration.

## Main application areas

- **Public pages:** landing page, public doctor directory and appointment booking, booking lookup, login, signup, hospital onboarding, and approval status.
- **Hospital workspace:** dashboards, patients, appointments, clinical desk and operations, pharmacy, billing, staff, departments, roles, wards, rooms, beds, hospital profile, and audit logs.
- **Platform administration:** hospital approval tools restricted to configured platform administrators.

Routes are declared in `src/App.tsx`. Protected routes check authentication, role, or permission before rendering a workspace page. Most page components are loaded lazily and show the shared page skeleton while loading.

## Project structure

```text
src/
  components/
    auth/       Authentication-related UI
    common/     Shared route guards and loading components
    pages/      Public, hospital, and platform pages
  hooks/        Authentication, tenant, and shared React hooks
  services/     HTTP API and public booking Socket.IO clients
  store/        Redux Toolkit state
  styles/       Sass stylesheets
  types/        Shared TypeScript types
  utils/        Shared frontend helpers
  App.tsx       Application routes and providers
  main.tsx      Browser entry point
```

The shared Axios client is in `src/services/axiosinstance.ts`; API functions are grouped in `src/services/api.ts`. Public appointment slots use `src/services/publicBookingSocket.ts` to receive live availability updates from the backend.

## Authentication and API behavior

The frontend sends access tokens with authenticated API calls and handles access-token refresh through the shared Axios client. Public signup, login, appointment browsing, booking, and booking lookup use the API endpoints exposed by the backend. Keep API response shape changes coordinated between both apps.

## Production deployment

Build the app with `npm run build` and deploy the generated `dist/` directory to a static web host. Configure `VITE_API_URL` and `VITE_RECAPTCHA_SITE_KEY` for the deployment environment at build time. Configure the backend CORS origin to match the deployed frontend origin. Because Vite variables are embedded in the bundle, changing them requires a new build.

## Troubleshooting

- **API requests fail:** confirm `VITE_API_URL` points to the backend API base URL and that the backend is running.
- **Browser reports a CORS error:** add the frontend origin to the backend's CORS configuration.
- **Login or signup challenge is unavailable:** configure the matching reCAPTCHA site key in the frontend and secret key in the backend.
- **A protected page redirects or shows an access error:** verify the signed-in user's active status, hospital approval, role, and permissions in the backend.
