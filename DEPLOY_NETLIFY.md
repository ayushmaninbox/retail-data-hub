# Deployment Guide: Retail Data Hub

This guide explains how to deploy the **Retail Data Hub** project using a hybrid approach: **Netlify** for the frontend and **Render** (or Railway) for the backend.

---

## 🏗️ Deployment Architecture

- **Frontend**: Next.js 14 Dashboard → [Netlify](https://www.netlify.com/)
- **Backend**: FastAPI (Python) → [Render](https://render.com/) or [Railway](https://railway.app/)
- **Data**: Parquet files stored alongside the backend.

---

## 1️⃣ Backend Deployment (Render/Railway)

The backend must be deployed first to provide the API URL for the frontend.

### Prerequisites
- A [Render](https://render.com/) or [Railway](https://railway.app/) account.
- Your project pushed to GitHub/GitLab.

### Steps on Render
1. **New Web Service**: Connect your repository. Render will automatically detect the `render.yaml` file.
2. **Environment Variables**:
   - `GEMINI_API_KEY`: Set your Gemini API key in the Render dashboard.
3. **Build**: Render will run:
   ```bash
   ./scripts/installation.sh && ./scripts/transform.sh
   ```
4. **Start**: Render will run:
   ```bash
   uvicorn src.api.api:app --host 0.0.0.0 --port $PORT
   ```

---

## 2️⃣ Frontend Deployment (Netlify)

Once the backend is live (e.g., `https://retail-api.onrender.com`), proceed to Netlify.

### Steps on Netlify
1. **Add New Site**: Import from GitHub. Netlify will use the `dashboard/netlify.toml` for configuration.
2. **Environment Variables**:
   - `NEXT_PUBLIC_API_URL`: The URL of your deployed backend (e.g., `https://retail-api.onrender.com`).
   - `NEXT_PUBLIC_WS_URL`: The WebSocket URL (e.g., `wss://retail-api.onrender.com`).

---

## 3️⃣ Connecting the Two

Update your `dashboard/src/config.ts` (if applicable) or ensure the app uses the environment variables:

```javascript
// Example in dashboard code
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
```

---

## 🔍 Verification

1. **Check Backend Docs**: Visit `https://your-backend-url.com/docs` to see if the Swagger UI loads.
2. **Check Frontend**: Visit your Netlify URL and verify that the dashboard pulls data from the API.
3. **Live Feed**: Ensure the `/live` page connects to the WebSocket.

> [!TIP]
> If you need to refresh data, you can trigger a "Manual Deploy" on Render to re-run the `transform.sh` script.
