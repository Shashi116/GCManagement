# GC Management

Gaming Café Management System — standalone, local-only, single café.

## Prerequisites

- Node.js LTS (v18+)
- MongoDB Community running locally on port 27017
- Git

## Setup after cloning

### 1. Backend

```bash
cd backend
npm install
```

Create `backend/.env`:
```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/gc
JWT_SECRET=gc_jwt_secret_change_in_production
JWT_REFRESH_SECRET=gc_refresh_secret_change_in_production
JWT_DEVICE_SECRET=gc_device_secret_change_in_production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

```bash
npm run dev
```

### 2. Frontend

```bash
cd frontend
npm install
npm start
```

### 3. First run

Open `http://localhost:3000` — the Setup Wizard will launch automatically.
Complete it to create the admin account and initial devices.

> **Note:** Devices added during Setup Wizard cannot authenticate with the Windows Agent.
> To use the Agent, add devices via **Admin → Devices** after setup to get a Device ID + Secret.

## Windows Agent

Separate repo: `C:\Users\shash\source\repos\CafeAgent\CafeAgent`

Configure `config.json` next to the `.exe`:
```json
{
  "HubUrl": "http://localhost:5000",
  "DeviceId": "<from Admin → Devices>",
  "DeviceSecret": "<from Admin → Devices>",
  "DevMode": true
}
```

Set `DevMode: false` before deploying to real café PCs.
