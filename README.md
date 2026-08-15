# USCL Website (React + Express + MongoDB)

Real-project layout: separate frontend and backend, connected over HTTP/JSON with cookies.

```text
uscl-website/
├── client/     # React (Vite) — http://localhost:5173
├── server/     # Express API — http://localhost:5000
└── package.json
```

## How they connect

1. Browser loads the React app on port **5173**.
2. React calls `/api/...` (see `client/src/api.js`).
3. Vite proxies `/api` → `http://localhost:5000` (`client/vite.config.js`).
4. Express serves auth, registrations, and admin APIs with CORS + httpOnly JWT cookies.

## Setup

```bash
cd uscl-website
npm install
npm run install:all
```

MongoDB (local Community server):

```env
MONGODB_URI=mongodb://localhost:27017/uscl
```

Edit `server/.env` for admin credentials / `JWT_SECRET` as needed.

## Run both together

```bash
npm run dev
```

- Frontend: http://localhost:5173  
- API health: http://localhost:5000/api/health  
- Same health via proxy: http://localhost:5173/api/health  

Admin (seeded): `admin@uscl.com` / `Admin@123`

## Separate terminals (optional)

```bash
npm run dev:server
npm run dev:client
```
