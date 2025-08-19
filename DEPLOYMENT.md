# Vercel Deployment Guide

## Steps to Deploy on Vercel

### 1. Push to GitHub
```bash
git add .
git commit -m "Fix deployment issues"
git push origin main
```

### 2. Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Select the repository

### 3. Configure Environment Variables
In Vercel dashboard, go to Settings > Environment Variables and add:

```
NEXT_PUBLIC_SANITY_PROJECT_ID=idji8ni7
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_TOKEN=skZj75Ix11taNeKvp4gcIoW2AD6a25HoVDEyx8tJLdrE9WfSoYyfpd4eS1dM3uzQIlldURLbRV5BK8zLP6L5UMRApPKtZZkweznSHdoR0XyNdsbkIkKmXG8Ze8Fnh1wtd4uWc8u4cbJouvdYpcjCO6fbADC1s4IpXQoaEIYsJl9juMNVaGur
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_c2ltcGxlLWdvb3NlLTM3LmNsZXJrLmFjY291bnRzLmRldiQ
CLERK_SECRET_KEY=sk_test_SJLjH13u1cw5YRCBnv5OJ0YITd2IjdkllmNBhjegVN
NEXT_PUBLIC_ENABLE_ADMIN_MANAGEMENT=true
NEXT_PUBLIC_SUPER_ADMIN_EMAIL=mkhicher404@gmail.com
NEXT_PUBLIC_SUPPORT_EMAIL=support@electricianshop.com
NEXT_PUBLIC_SUPPORT_PHONE=+91-9876543210
NEXT_PUBLIC_SUPPORT_WHATSAPP=+91-9876543210
```

### 4. Build Settings
- Framework Preset: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

### 5. Deploy
Click "Deploy" and wait for the build to complete.

## Troubleshooting

### If you get 404 errors:
1. Check that all environment variables are set correctly
2. Verify the build completed successfully
3. Check the function logs in Vercel dashboard

### Test URLs after deployment:
- `/` - Landing page
- `/test-deploy` - Simple test page
- `/login` - Login page

## Common Issues

1. **Environment Variables**: Make sure all `NEXT_PUBLIC_` variables are set
2. **Build Errors**: Check the build logs in Vercel dashboard
3. **Runtime Errors**: Check the function logs in Vercel dashboard