# Staging Branch Strategy

## Branch Structure

```
main (production)
├── staging (staging environment)
│   ├── feature/ai-document-scanner-phase1 (current)
│   ├── feature/staging-environment-setup
│   └── other feature branches
└── develop (optional - for integration)
```

## Branch Purposes

### `main` Branch
- **Purpose**: Production deployment
- **Deploys to**: Production Vercel environment
- **API**: `api.clauseatlas.com`
- **Supabase**: Production project
- **Environment**: `VITE_API_URL=https://api.clauseatlas.com`

### `staging` Branch
- **Purpose**: Staging deployment
- **Deploys to**: Staging Vercel environment
- **API**: `api-staging.clauseatlas.com`
- **Supabase**: Staging project
- **Environment**: `VITE_API_URL=https://api-staging.clauseatlas.com`

### Feature Branches
- **Purpose**: Development of new features
- **Base**: Usually `staging` for new features
- **Merge**: Into `staging` when ready for testing

## Workflow

### Development Workflow
1. **Create feature branch** from `staging`
   ```bash
   git checkout staging
   git pull origin staging
   git checkout -b feature/new-feature
   ```

2. **Develop and commit** on feature branch
   ```bash
   git add .
   git commit -m "Add new feature"
   ```

3. **Push feature branch** for review
   ```bash
   git push -u origin feature/new-feature
   ```

4. **Create PR** to merge into `staging`

5. **Test in staging** environment

6. **Merge to main** when ready for production

### Deployment Workflow
- **Staging**: Automatically deploys from `staging` branch
- **Production**: Manually deploy from `main` branch

## Environment Variables

### Vercel Configuration
Environment variables are configured in Vercel Dashboard → Project Settings → Environment Variables:

#### Production Environment (main branch)
```env
VITE_API_URL=https://api.clauseatlas.com
VITE_SUPABASE_URL=https://uqisvouvfslfplbjfiox.supabase.co
VITE_SUPABASE_ANON_KEY=your_production_key
VITE_ENABLE_SCANNER=true
```

#### Preview Environment (staging and feature branches)
```env
VITE_API_URL=https://api-staging.clauseatlas.com
VITE_SUPABASE_URL=https://uqisvouvfslfplbjfiox.supabase.co
VITE_SUPABASE_ANON_KEY=your_production_key
VITE_ENABLE_SCANNER=true
```

### Local Development
```env
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://uqisvouvfslfplbjfiox.supabase.co
VITE_SUPABASE_ANON_KEY=your_production_key
VITE_ENABLE_SCANNER=true
```

## Current Status

- ✅ `staging` branch created
- ✅ `feature/ai-document-scanner-phase1` merged into staging
- 🔄 Backend staging environment setup in progress
- ⏳ Vercel staging environment configuration pending
- ⏳ Supabase staging project setup pending

## Next Steps

1. **Backend**: Set up staging Railway environment
2. **Frontend**: Configure Vercel staging environment
3. **Database**: Set up staging Supabase project
4. **Testing**: Validate staging deployment
5. **Documentation**: Update deployment guides

## Commands Reference

```bash
# Switch to staging
git checkout staging

# Create feature branch
git checkout -b feature/new-feature

# Update staging with latest main
git checkout staging
git merge main

# Deploy staging
git push origin staging

# Deploy production
git checkout main
git merge staging
git push origin main
```

---

*Last updated: December 2024* 