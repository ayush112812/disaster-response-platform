# 🚀 Deployment Guide

## Pre-Deployment Checklist

### ✅ Security Verification
- [ ] All `.env` files are in `.gitignore`
- [ ] No API keys in source code
- [ ] `.env.example` files are updated
- [ ] `SECURITY.md` is reviewed

### ✅ Code Quality
- [ ] All TypeScript errors resolved
- [ ] Build succeeds locally
- [ ] Tests pass (if any)
- [ ] Dependencies are up to date

## Vercel Deployment

### 1. Frontend Deployment (disaster-frontend)

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Initial commit - ready for deployment"
   git push origin main
   ```

2. **Deploy to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Select `disaster-frontend` as root directory
   - Add environment variables in Vercel dashboard:
     ```
     VITE_API_URL=https://your-backend-url.vercel.app/api
     VITE_WEBSOCKET_URL=wss://your-backend-url.vercel.app
     VITE_SOCKET_URL=https://your-backend-url.vercel.app
     VITE_MAPBOX_ACCESS_TOKEN=pk.your_actual_token
     VITE_GEMINI_API_KEY=your_actual_key
     ```

### 2. Backend Deployment

1. **Create separate Vercel project for backend:**
   - Import same repository
   - Select `backend` as root directory
   - Add environment variables:
     ```
     NODE_ENV=production
     SUPABASE_URL=your_actual_url
     SUPABASE_ANON_KEY=your_actual_key
     SUPABASE_SERVICE_ROLE_KEY=your_actual_key
     GEMINI_API_KEY=your_actual_key
     MAPBOX_ACCESS_TOKEN=your_actual_token
     JWT_SECRET=your_strong_secret
     CORS_ORIGIN=https://your-frontend-url.vercel.app
     ```

### 3. Update Frontend API URL
After backend is deployed, update frontend environment variables with actual backend URL.

## Alternative Deployment Options

### Railway
- Good for backend deployment
- Automatic HTTPS
- Database hosting available

### Netlify
- Great for frontend
- Easy GitHub integration
- Environment variable management

### Heroku
- Full-stack deployment
- Add-ons for databases
- Automatic deployments

## Production Considerations

### Security
- Use production API keys
- Enable domain restrictions
- Set up monitoring
- Configure rate limiting

### Performance
- Enable caching
- Optimize images
- Use CDN for static assets
- Monitor API usage

### Monitoring
- Set up error tracking (Sentry)
- Monitor API performance
- Set up uptime monitoring
- Configure alerts

## Troubleshooting

### Common Issues
1. **Build fails:** Check TypeScript errors
2. **API not connecting:** Verify CORS settings
3. **Environment variables:** Check Vercel dashboard
4. **Database connection:** Verify Supabase settings

### Debug Steps
1. Check Vercel function logs
2. Verify environment variables
3. Test API endpoints manually
4. Check browser console for errors
