# 🚢 Deploying to Kuberns.com (Native PaaS)

This guide explains how to get the **Retail Data Hub** live on [Kuberns.com](https://kuberns.com) using its native AI autopilot (no Docker required).

## Prerequisites
- A GitHub repository with this code pushed.
- A **Gemini API Key** (for AI features).

---

## 1. Backend Service (API)

1.  **Login to Kuberns**: Go to [kuberns.com](https://kuberns.com) and click **Deploy for Free**.
2.  **Connect GitHub**: Select your `retail-data-hub` repository.
3.  **Service Type**: Kuberns will auto-detect **Python/FastAPI**.
4.  **Root Directory**: `/` (repo root).
5.  **Environment Variables**:
    -   `GEMINI_API_KEY`: Paste your key here (mark as Secret).
6.  **Commands**:
    -   **Start Command**: `uvicorn src.api.api:app --host 0.0.0.0 --port 8000`
7.  **Port**: Set to `8000`.
8.  **Deploy**: Click **Deploy**. Copy the provided URL (e.g., `https://retail-data-hub-main-2a82b44.kuberns.cloud`).

---

## 2. Frontend Service (Dashboard)

1.  **New Service**: Create a second service in the same project.
2.  **Service Type**: Kuberns will auto-detect **Next.js**.
3.  **Root Directory**: `/dashboard` (point to the dashboard folder).
4.  **Environment Variables**:
    -   `NEXT_PUBLIC_API_URL`: Use `https://retail-data-hub-main-2a82b44.kuberns.cloud`
    -   `NEXT_PUBLIC_WS_URL`: Use `wss://retail-api.kuberns.cloud/ws/live` (Note: Use your actual Backend Domain with `wss://`)
5.  **Commands**:
    -   **Start Command**: `npm start`
6.  **Port**: Set to `3000`.
7.  **Deploy**: Click **Deploy**.

---

## 💡 Troubleshooting

-   **Data Storage**: Since the `.gitignore` has been updated to **include** `data/gold` and `data/analytics`, your insights are already "baked into" the repository. This is critical because most cloud platforms have temporary filesystems.
-   **WebSocket Connectivity**: If the real-time feed is offline, double-check that `NEXT_PUBLIC_WS_URL` starts with `wss://` for secure production environments.
