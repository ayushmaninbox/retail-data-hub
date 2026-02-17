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
1. **New Web Service**: Connect your repository.
2. **Environment**: Select `Python`.
3. **Build Command**: 
   ```bash
   pip install -r requirements.txt && ./scripts/transform.sh
   ```
   > [!NOTE]
   > This build command ensures that the data is processed into Gold layer Parquet files during deployment.
4. **Start Command**:
   ```bash
   uvicorn src.api.api:app --host 0.0.0.0 --port $PORT
   ```
5. **Environment Variables**:
   - `GEMINI_API_KEY`: Your Google Gemini API Key.
   - `PYTHONPATH`: `.` (Ensure root is in path).

---

## 2️⃣ Frontend Deployment (Netlify)

Once the backend is live (e.g., `https://retail-api.onrender.com`), proceed to Netlify.

### Steps on Netlify
1. **Add New Site**: Import from GitHub.
2. **Site Settings**:
   - **Base directory**: `dashboard`
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
3. **Environment Variables**:
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
