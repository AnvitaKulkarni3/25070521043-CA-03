# TrackMySpend — FLEXI Submission

## Submission folder structure

```text
25070521043/
├── client/   # React + Vite frontend
└── server/   # Node.js + Express + MongoDB backend
```

## Requirements
- Node.js 18+ (Node.js 20 LTS recommended)
- MongoDB Community Server running locally
- MongoDB Compass is optional for viewing database records

> MongoDB Compass is only a database GUI. The MongoDB Community Server must also be installed and running.

## Run the backend (Terminal 1)
Open a terminal in `25070521043/server` and run:

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

If `.env` already exists, do not overwrite it. Confirm it contains:
`MONGODB_URI=mongodb://127.0.0.1:27017/trackmyspend`

## Run the frontend (Terminal 2)
Open a second terminal in `25070521043/client` and run:

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

## Test the predictor
In a terminal at `25070521043/server`, run:

```powershell
npm test
```

## Check persistence
Add an expense, then open MongoDB Compass and connect to:
`mongodb://127.0.0.1:27017`

The database name is `trackmyspend`. The app uses a shared demonstration room and sample roommates; it does not implement login/authentication.

## API
- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/expenses`
- `POST /api/expenses`
- `DELETE /api/expenses/:id`
- `GET /api/roommates`
- `PUT /api/budget`

## Notes
- Keep your real `.env` file private; do not submit credentials or secrets.
- For a production deployment, add authentication, authorization, and further security controls.
