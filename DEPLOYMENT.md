# 🚀 Free Deployment Guide for Bakked CRM

## Overview
- **Frontend**: Vercel (free tier - unlimited)
- **Backend**: Render (free tier - 750 hours/month)
- **Database**: Supabase (already configured)

---

## Step 1: Push Code to GitHub

Make sure your code is pushed to GitHub:

```bash
cd /home/yashashwi-s/bakked
git add .
git commit -m "Prepare for deployment"
git push origin main
```

---

## Step 2: Deploy Backend on Render

### 2.1 Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub

### 2.2 Create New Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repo: `yashashwi-s/bakked`
3. Configure:
   - **Name**: `bakked-api`
   - **Region**: Choose closest to your users
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free`

### 2.3 Add Environment Variables
In the Render dashboard, go to **Environment** tab and add:

| Key | Value |
|-----|-------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Your Supabase service key |
| `WHATSAPP_ACCESS_TOKEN` | Your Meta access token |
| `WHATSAPP_PHONE_ID` | Your WhatsApp phone ID |
| `APP_PASSWORD` | Your secure app password |

### 2.4 Deploy
Click **"Create Web Service"**

Your backend URL will be: `https://bakked-api.onrender.com`

> ⚠️ **Note**: Free tier spins down after 15 minutes of inactivity. First request after sleep takes ~30 seconds.

---

## Step 3: Deploy Frontend on Vercel

### 3.1 Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub

### 3.2 Import Project
1. Click **"Add New..."** → **"Project"**
2. Import from GitHub: `yashashwi-s/bakked`
3. Configure:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `frontend`

### 3.3 Add Environment Variables
Before deploying, add this environment variable:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://bakked-api.onrender.com` (your Render URL) |

### 3.4 Deploy
Click **"Deploy"**

Your frontend URL will be: `https://bakked-crm.vercel.app` (or similar)

---

## Step 4: Configure CORS (Important!)

After deployment, update your backend to allow the Vercel domain.

In `backend/app.py`, update the CORS origins:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://bakked-crm.vercel.app",  # Add your Vercel URL
        "https://*.vercel.app",  # Allow all Vercel preview URLs
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 🎉 Done!

Your app is now live:
- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://bakked-api.onrender.com`
- **Database**: Supabase (already hosted)

---

## Troubleshooting

### Backend not responding?
- Free Render instances sleep after 15 min. First request takes ~30s to wake up.
- Check Render logs for errors.

### CORS errors?
- Make sure your Vercel URL is added to the CORS origins in `app.py`
- Redeploy backend after updating CORS

### Environment variables not working?
- In Vercel, env vars starting with `NEXT_PUBLIC_` are exposed to browser
- Redeploy after adding/changing env vars

---

## Alternative: Railway (Both in one place)

If you prefer hosting both on one platform:

1. Go to [railway.app](https://railway.app)
2. You get $5 free credit/month
3. Can host both frontend and backend
4. No cold starts like Render free tier

---

## Upgrading Later

When you're ready to upgrade:
- **Render**: $7/month for always-on instance
- **Vercel**: Free tier is usually enough
- **Railway**: Pay-as-you-go after $5 credit
