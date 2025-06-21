# 🔒 Security Guidelines

## Environment Variables

**CRITICAL:** This project uses sensitive API keys and secrets that must NEVER be committed to version control.

### Setup Instructions

1. **Copy the example files:**
   ```bash
   cp backend/.env.example backend/.env
   cp disaster-frontend/.env.example disaster-frontend/.env
   ```

2. **Fill in your actual API keys:**
   - Get Supabase keys from your [Supabase Dashboard](https://supabase.com/dashboard)
   - Get Google Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Get Mapbox token from [Mapbox Account](https://account.mapbox.com/access-tokens/)
   - Generate a strong JWT secret (64+ characters)

### Required API Keys

| Service | Required | Where to Get | Notes |
|---------|----------|--------------|-------|
| Supabase | ✅ Yes | [Dashboard](https://supabase.com/dashboard) | Database & Auth |
| Google Gemini | ✅ Yes | [AI Studio](https://makersuite.google.com/app/apikey) | AI Features |
| Mapbox | ✅ Yes | [Account](https://account.mapbox.com/access-tokens/) | Maps & Geocoding |
| Twitter API | ❌ Optional | [Developer Portal](https://developer.twitter.com/) | Social Media |

### Security Checklist

- [ ] ✅ `.env` files are in `.gitignore`
- [ ] ✅ No API keys in source code
- [ ] ✅ Strong JWT secret generated
- [ ] ✅ Environment variables documented
- [ ] ✅ Production keys separate from development

## Deployment Security

### Vercel Deployment
1. Add environment variables in Vercel dashboard
2. Use different keys for production
3. Enable domain restrictions on API keys where possible

### General Security
- Use HTTPS in production
- Rotate API keys regularly
- Monitor API usage for anomalies
- Implement rate limiting (already configured)

## Reporting Security Issues

If you discover a security vulnerability, please email [your-email] instead of creating a public issue.
