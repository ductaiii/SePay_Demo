# Docker Compose (SePay Demo)

This repo contains a small demo with:
- Postgres database
- Express TypeScript server (`server`)
- Vite React client (`client`)

Quick start (Windows PowerShell):

1. Build and run everything:

```powershell
docker-compose up --build
```

2. Server will be available at: http://localhost:3000
3. Client (vite dev) at: http://localhost:5173

Environment variables for the server are in `server/.env.example` — copy to `server/.env` and adjust values (in particular `SEPAY_API_URL` and `SEPAY_API_TOKEN`).


Database persists under a named volume `db_data`.

Notes

- The server uses `ts-node` to run `index.ts` directly. For production you can add a build step and run compiled JS.
- The client runs Vite dev server. For production build consider using Vite build output served by Nginx.

Auto-init behavior

- On first `docker-compose up --build` the Postgres container will run any SQL files placed in `/docker-entrypoint-initdb.d/`.
- This compose mounts `./database/schema.sql` into that folder so a fresh volume will be initialized automatically with the project's schema.

Recreate the DB to re-run init (careful: this deletes data)

1. Stop compose: `docker-compose down`
2. Remove the named volume: `docker volume rm $(docker volume ls -qf name=SePay_Demo_db_data || true)` (PowerShell: see note below)
3. Start again: `docker-compose up --build`

PowerShell note: the `docker volume rm` command above uses Unix-style substitution. In PowerShell you can remove the volume by name, for example:

```powershell
# list volumes and remove the one named "SePay_Demo_db_data" (replace with the exact volume name on your machine)
docker volume ls
docker volume rm SePay_Demo_db_data
```

