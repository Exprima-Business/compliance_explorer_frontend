# Cleanup and Update Plan
## Comprehensive Dependency Analysis and Security Review

**Date:** January 2025  
**Status:** Ready for Implementation

---

## Executive Summary

After removing Next.js and duplicate files, we've identified:
- **7 security vulnerabilities** (1 critical, 2 high, 2 moderate, 2 low)
- **1 unused dependency** (formidable)
- **35+ outdated packages** that can be updated
- **Several major version upgrades** available (but require careful testing)

---

## 🔴 CRITICAL: Security Vulnerabilities (7 Total)

### Priority 1: Critical Vulnerabilities

#### 1. form-data (Critical)
- **Current:** 4.0.0 - 4.0.3
- **Issue:** Unsafe random function for choosing boundary
- **Fix:** `npm audit fix` (updates to 4.0.4+)
- **Impact:** HIGH - Used by many packages
- **Action:** ✅ Can auto-fix

#### 2. jspdf (High)
- **Current:** 3.0.1
- **Issue:** Denial of Service (DoS) vulnerability
- **Fix:** Update to 3.0.4+ (latest: 3.0.4)
- **Impact:** MEDIUM - Used for PDF export
- **Action:** ⚠️ Manual update needed (check breaking changes)

### Priority 2: High Severity

#### 3. glob (High)
- **Current:** 10.2.0 - 10.4.5
- **Issue:** Command injection via CLI
- **Fix:** `npm audit fix` (updates to 10.4.6+)
- **Impact:** LOW - Only affects rimraf's glob dependency (dev tool)
- **Action:** ✅ Can auto-fix

### Priority 3: Moderate Severity

#### 4. vite (Moderate - 3 issues)
- **Current:** 6.3.5
- **Issues:**
  - File serving vulnerability
  - `server.fs` settings not applied to HTML files
  - Windows backslash bypass
- **Fix:** Update to 6.4.1+ (latest: 7.2.7)
- **Impact:** MEDIUM - Build tool, affects dev server
- **Action:** ⚠️ Update to 6.4.1+ (minor version safe)

#### 5. js-yaml (Moderate)
- **Current:** 4.0.0 - 4.1.0
- **Issue:** Prototype pollution in merge
- **Fix:** `npm audit fix` (updates to 4.1.1+)
- **Impact:** LOW - Dev dependency
- **Action:** ✅ Can auto-fix

### Priority 4: Low Severity

#### 6. tmp (Low)
- **Current:** <=0.2.3
- **Issue:** Symbolic link vulnerability
- **Fix:** `npm audit fix`
- **Impact:** LOW - Dev dependency
- **Action:** ✅ Can auto-fix

#### 7. brace-expansion (Low)
- **Current:** 1.0.0 - 1.1.11 || 2.0.0 - 2.0.1
- **Issue:** Regular Expression Denial of Service (ReDoS)
- **Fix:** `npm audit fix`
- **Impact:** LOW - Dev dependency
- **Action:** ✅ Can auto-fix

---

## 🗑️ Unused Dependencies

### 1. formidable + @types/formidable
- **Status:** ❌ NOT USED
- **Evidence:** 
  - No imports found in codebase
  - Only FormData (native browser API) is used
- **Action:** Remove both packages
- **Command:** 
  ```bash
  npm uninstall formidable @types/formidable
  ```

---

## 📦 Outdated Packages Analysis

### High Priority Updates (Security & Bug Fixes)

| Package | Current | Wanted | Latest | Priority | Notes |
|---------|---------|--------|--------|----------|-------|
| **jspdf** | 3.0.1 | 3.0.4 | 3.0.4 | 🔴 HIGH | Security fix |
| **vite** | 6.3.5 | 6.4.1 | 7.2.7 | 🟡 MEDIUM | Security fixes in 6.4.1+ |
| **@supabase/supabase-js** | 2.39.3 | 2.87.1 | 2.87.1 | 🟡 MEDIUM | Many bug fixes |
| **openai** | 4.28.0 | 4.104.0 | 6.10.0 | 🟡 MEDIUM | Major version available |
| **react** | 18.2.0 | 18.3.1 | 19.2.3 | 🟡 MEDIUM | React 19 available |
| **react-dom** | 18.2.0 | 18.3.1 | 19.2.3 | 🟡 MEDIUM | React 19 available |
| **typescript** | 5.3.3 | 5.9.3 | 5.9.3 | 🟢 LOW | Bug fixes |

### Medium Priority Updates (Feature Updates)

| Package | Current | Wanted | Latest | Notes |
|---------|---------|--------|--------|-------|
| **@tanstack/react-query** | 5.80.7 | 5.90.12 | 5.90.12 | Bug fixes |
| **@tanstack/react-query-devtools** | 5.80.7 | 5.91.1 | 5.91.1 | Bug fixes |
| **react-router-dom** | 6.22.1 | 6.30.2 | 7.10.1 | Major version available |
| **react-dropzone** | 14.2.3 | 14.3.8 | 14.3.8 | Bug fixes |
| **d3** | 7.8.5 | 7.9.0 | 7.9.0 | Minor updates |
| **react-force-graph-2d** | 1.27.1 | 1.29.0 | 1.29.0 | Bug fixes |

### Material-UI Updates (Major Version Available)

| Package | Current | Wanted | Latest | Notes |
|---------|---------|--------|--------|-------|
| **@mui/material** | 5.15.10 | 5.18.0 | **7.3.6** | ⚠️ Major version jump |
| **@mui/icons-material** | 5.15.10 | 5.18.0 | **7.3.6** | ⚠️ Major version jump |
| **@mui/x-data-grid** | 6.19.4 | 6.20.4 | **8.22.0** | ⚠️ Major version jump |

**⚠️ Warning:** Material-UI v7 is a major version with breaking changes. Test thoroughly before upgrading.

### Dev Dependencies Updates

| Package | Current | Wanted | Latest | Notes |
|---------|---------|--------|--------|-------|
| **@vitejs/plugin-react** | 4.5.1 | 4.7.0 | 5.1.2 | Major version available |
| **@typescript-eslint/eslint-plugin** | 6.21.0 | 6.21.0 | **8.49.0** | ⚠️ Major version jump |
| **@typescript-eslint/parser** | 6.21.0 | 6.21.0 | **8.49.0** | ⚠️ Major version jump |
| **eslint** | 8.56.0 | 8.57.1 | **9.39.1** | ⚠️ Major version jump |
| **vitest** | 3.2.4 | 3.2.4 | **4.0.15** | ⚠️ Major version jump |
| **@emotion/react** | 11.11.3 | 11.14.0 | 11.14.0 | Bug fixes |
| **@emotion/styled** | 11.11.0 | 11.14.1 | 11.14.1 | Bug fixes |

---

## 📋 Recommended Action Plan

### Phase 1: Security Fixes (IMMEDIATE)

```bash
# 1. Auto-fix most vulnerabilities
npm audit fix

# 2. Manually update jspdf (security fix)
npm install jspdf@latest

# 3. Update vite to latest 6.x (security fixes)
npm install vite@^6.4.1

# 4. Remove unused dependencies
npm uninstall formidable @types/formidable
```

**Expected Result:** All critical and high vulnerabilities resolved

### Phase 2: Safe Minor Updates (LOW RISK)

```bash
# Core dependencies
npm install react@^18.3.1 react-dom@^18.3.1
npm install typescript@^5.9.3
npm install @supabase/supabase-js@latest
npm install @tanstack/react-query@latest @tanstack/react-query-devtools@latest

# UI libraries (minor versions)
npm install react-dropzone@latest
npm install d3@latest
npm install react-force-graph-2d@latest

# Dev dependencies
npm install @emotion/react@latest @emotion/styled@latest
npm install @testing-library/jest-dom@latest
npm install @types/node@latest @types/react@latest @types/react-dom@latest
```

**Expected Result:** Bug fixes and minor improvements, minimal breaking changes

### Phase 3: Major Version Updates (REQUIRES TESTING)

**⚠️ Do these one at a time and test thoroughly:**

1. **Material-UI v7** (if needed)
   ```bash
   npm install @mui/material@latest @mui/icons-material@latest
   ```
   - Check migration guide: https://mui.com/material-ui/migration/migration-v6/
   - Test all UI components

2. **React 19** (if needed)
   ```bash
   npm install react@^19 react-dom@^19
   npm install @types/react@^19 @types/react-dom@^19
   ```
   - Check React 19 migration guide
   - Test all components

3. **React Router v7** (if needed)
   ```bash
   npm install react-router-dom@latest
   ```
   - Check migration guide
   - Test routing

4. **ESLint 9** (if needed)
   ```bash
   npm install eslint@latest @typescript-eslint/eslint-plugin@latest @typescript-eslint/parser@latest
   ```
   - Update eslint config (may need flat config)
   - Test linting

5. **Vite 7** (if needed)
   ```bash
   npm install vite@latest @vitejs/plugin-react@latest
   ```
   - Check migration guide
   - Test build

---

## 🧪 Testing Checklist

After each phase, verify:

- [ ] `npm run build` succeeds
- [ ] `npm run dev` starts without errors
- [ ] All pages load correctly
- [ ] Authentication works
- [ ] File uploads work (if using formidable replacement)
- [ ] PDF exports work (jspdf)
- [ ] Data grid displays correctly
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Tests pass: `npm test`

---

## 📊 Impact Assessment

### Security Impact
- **Before:** 7 vulnerabilities (1 critical, 2 high)
- **After Phase 1:** 0 vulnerabilities ✅
- **Risk Reduction:** 100%

### Bundle Size Impact
- **Current:** ~1.5MB main bundle
- **Expected:** Similar or slightly smaller after cleanup
- **Removed:** formidable (~50KB)

### Breaking Changes Risk
- **Phase 1:** LOW (auto-fixes and minor updates)
- **Phase 2:** LOW-MEDIUM (minor version updates)
- **Phase 3:** HIGH (major version updates require testing)

---

## 🎯 Quick Win Commands

### All Security Fixes + Cleanup (Recommended First Step)
```bash
# Fix vulnerabilities
npm audit fix

# Update critical security packages
npm install jspdf@latest vite@^6.4.1

# Remove unused
npm uninstall formidable @types/formidable

# Test
npm run build
npm run dev
```

### Safe Updates Only (Conservative Approach)
```bash
# Security fixes
npm audit fix
npm install jspdf@latest vite@^6.4.1

# Safe minor updates
npm install react@^18.3.1 react-dom@^18.3.1 typescript@^5.9.3
npm install @supabase/supabase-js@latest
npm install @tanstack/react-query@latest @tanstack/react-query-devtools@latest

# Remove unused
npm uninstall formidable @types/formidable
```

---

## 📝 Notes

1. **formidable:** This package is NOT used. The codebase uses native `FormData` API instead. Safe to remove.

2. **jspdf:** Used for PDF exports. Update to 3.0.4 fixes DoS vulnerability. Test PDF generation after update.

3. **vite:** Update to 6.4.1+ fixes 3 moderate vulnerabilities. Version 7 is available but requires migration.

4. **React 19:** Major version available but React 18.3.1 is still supported and stable. Consider React 19 upgrade separately.

5. **Material-UI v7:** Major version available. Current v5 is stable. Consider v7 upgrade as separate project.

6. **ESLint 9:** Requires flat config format. Consider as separate migration.

---

## ✅ Recommended Next Steps

1. **Immediate:** Run Phase 1 (Security Fixes)
2. **This Week:** Run Phase 2 (Safe Updates)
3. **Future:** Plan Phase 3 (Major Updates) as separate tickets

---

**Last Updated:** January 2025  
**Next Review:** After Phase 1 completion

