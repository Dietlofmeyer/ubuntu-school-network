# Ubuntu School Network - Deployment Guide

## 🚀 Deployment Overview

This project uses a dual deployment strategy for Ubuntu School Network:

- **Production**: Firebase Hosting (for live school users)
- **Testing**: GitHub Pages (for testing and preview)

## 🔥 Firebase Hosting (Production)

### Manual Deployment

```bash
# Deploy hosting only
npm run deploy:firebase

# Deploy hosting + functions + Firestore rules
npm run deploy:firebase:full

# Deploy everything
firebase deploy
```

### Automatic Deployment

- **Trigger**: Push to `main` branch or create a tag
- **URL**: https://ubuntu-school-network.web.app (update after Firebase project rename)
- **GitHub Action**: `.github/workflows/deploy-production.yml`

### Setup Requirements

1. Firebase CLI installed (`npm install -g firebase-tools`)
2. Firebase service account key added to GitHub secrets
3. Firebase project initialized

## 🐙 GitHub Pages (Testing)

### Manual Deployment

```bash
# Build and deploy to GitHub Pages
npm run deploy:test

# Or step by step
npm run build
npm run deploy:gh-pages
```

### Automatic Deployment

- **Trigger**: Push to `main`, `develop`, or `test` branches
- **URL**: https://yourusername.github.io/Test/
- **GitHub Action**: `.github/workflows/deploy-test.yml`

### Setup Requirements

1. Enable GitHub Pages in repository settings
2. Set source to "GitHub Actions"
3. No additional secrets required

## 🔧 Environment Configuration

### Production (.env.production)

- Used for Firebase hosting builds
- Production Firebase configuration
- Optimized for performance

### Testing (.env.test)

- Used for GitHub Pages builds
- Testing-specific configuration
- Debug features enabled

## 📋 Deployment Commands

| Command                   | Purpose                | Environment |
| ------------------------- | ---------------------- | ----------- |
| `npm run dev`             | Local development      | Development |
| `npm run build`           | Build for production   | Production  |
| `npm run deploy:firebase` | Deploy to Firebase     | Production  |
| `npm run deploy:test`     | Deploy to GitHub Pages | Testing     |
| `npm run preview`         | Preview build locally  | Local       |

## 🔐 Required GitHub Secrets

For Firebase deployment, add these secrets to your GitHub repository:

1. **FIREBASE_SERVICE_ACCOUNT_UBUNTU_SCHOOL_NETWORK**
   - Firebase service account JSON key
   - Get from Firebase Console > Project Settings > Service Accounts

## 🌐 URLs

- **Production**: https://school-system-aa9b4.web.app
- **Testing**: https://yourusername.github.io/Test/
- **Local Dev**: http://localhost:5173

## 🚨 Important Notes

1. **GitHub Pages Limitations**:

   - Static hosting only (no server-side functions)
   - Firebase Functions won't work on GitHub Pages
   - Use for frontend testing only

2. **Firebase Security**:

   - Firestore rules apply to both environments
   - Test thoroughly before production deployment

3. **Branch Strategy**:
   - `main` → Production (Firebase)
   - `develop/test` → Testing (GitHub Pages)
   - Feature branches → Manual testing

## 🔧 Troubleshooting

### Build Failures

- Check Node.js version (18+ required)
- Clear node_modules: `rm -rf node_modules && npm install`
- Check environment variables

### Deployment Issues

- Verify Firebase CLI authentication: `firebase login`
- Check GitHub Pages settings in repository
- Verify secrets are properly configured

### Firebase Functions

- Functions only work on Firebase hosting
- Test functions locally: `firebase emulators:start`
- Deploy functions separately: `firebase deploy --only functions`
