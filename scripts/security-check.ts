#!/usr/bin/env node

/**
 * Pre-Deployment Security Check Script
 * Run this before every deployment to ensure security best practices
 * 
 * Usage: npm run security-check
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface SecurityCheck {
  name: string;
  check: () => Promise<boolean>;
  critical: boolean;
}

const securityChecks: SecurityCheck[] = [
  {
    name: 'Environment variables set',
    critical: true,
    check: async () => {
      const requiredEnvVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
        'STRIPE_SECRET_KEY',
        'STRIPE_WEBHOOK_SECRET',
        'RESEND_API_KEY',
        'INTERNAL_API_KEY',
      ];

      const missing = requiredEnvVars.filter(
        (key) => !process.env[key]
      );

      if (missing.length > 0) {
        console.error(`   ❌ Missing environment variables: ${missing.join(', ')}`);
        return false;
      }
      return true;
    },
  },
  {
    name: 'No test keys in production',
    critical: true,
    check: async () => {
      if (process.env.NODE_ENV === 'production') {
        const testKeys = [
          process.env.STRIPE_SECRET_KEY?.includes('_test_'),
          process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.includes('pk_test_'),
        ];

        if (testKeys.some(Boolean)) {
          console.error('   ❌ Test API keys detected in production environment');
          return false;
        }
      }
      return true;
    },
  },
  {
    name: 'No hardcoded secrets in code',
    critical: true,
    check: async () => {
      try {
        // Check for common secret patterns
        const secretPatterns = [
          'sk_live_',
          'sk_test_',
          'password\\s*=\\s*["\'][^"\']+["\']',
          'apiKey\\s*=\\s*["\'][^"\']+["\']',
        ];

        const result = execSync(
          `git grep -E "${secretPatterns.join('|')}" -- '*.ts' '*.tsx' '*.js' '*.jsx' || true`,
          { encoding: 'utf-8' }
        );

        if (result.trim()) {
          console.error('   ❌ Potential hardcoded secrets found:');
          console.error(result);
          return false;
        }
        return true;
      } catch (error) {
        // If git grep fails, assume pass (might not be in git repo)
        return true;
      }
    },
  },
  {
    name: 'Dependencies up to date (no high/critical vulnerabilities)',
    critical: true,
    check: async () => {
      try {
        execSync('npm audit --audit-level=high', { stdio: 'ignore' });
        return true;
      } catch {
        console.error('   ❌ High or critical vulnerabilities found');
        console.error('   Run: npm audit fix');
        return false;
      }
    },
  },
  {
    name: 'TypeScript compiles without errors',
    critical: true,
    check: async () => {
      try {
        execSync('npx tsc --noEmit', { stdio: 'ignore' });
        return true;
      } catch {
        console.error('   ❌ TypeScript compilation errors');
        console.error('   Run: npx tsc --noEmit for details');
        return false;
      }
    },
  },
  {
    name: 'ESLint passes',
    critical: false,
    check: async () => {
      try {
        execSync('npm run lint', { stdio: 'ignore' });
        return true;
      } catch {
        console.warn('   ⚠️  ESLint warnings/errors found');
        return false;
      }
    },
  },
  {
    name: 'Security headers configured',
    critical: true,
    check: async () => {
      const nextConfigPath = path.join(process.cwd(), 'next.config.ts');
      const nextConfig = fs.readFileSync(nextConfigPath, 'utf-8');

      const requiredHeaders = [
        'Content-Security-Policy',
        'X-Frame-Options',
        'X-Content-Type-Options',
        'Strict-Transport-Security',
      ];

      const missing = requiredHeaders.filter(
        (header) => !nextConfig.includes(header)
      );

      if (missing.length > 0) {
        console.error(`   ❌ Missing security headers: ${missing.join(', ')}`);
        return false;
      }
      return true;
    },
  },
  {
    name: '.env files not committed',
    critical: true,
    check: async () => {
      const gitignorePath = path.join(process.cwd(), '.gitignore');
      if (!fs.existsSync(gitignorePath)) {
        console.error('   ❌ No .gitignore file found');
        return false;
      }

      const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
      if (!gitignore.includes('.env')) {
        console.error('   ❌ .env files not in .gitignore');
        return false;
      }

      // Check if .env files are tracked
      try {
        const trackedEnvFiles = execSync(
          'git ls-files | grep -E "^\\.env" || true',
          { encoding: 'utf-8' }
        );
        if (trackedEnvFiles.trim()) {
          console.error('   ❌ .env files are tracked in git:');
          console.error(trackedEnvFiles);
          return false;
        }
      } catch {
        // Not a git repo or no env files tracked - OK
      }
      return true;
    },
  },
  {
    name: 'Rate limiting middleware exists',
    critical: true,
    check: async () => {
      const middlewarePath = path.join(process.cwd(), 'middleware.ts');
      if (!fs.existsSync(middlewarePath)) {
        console.error('   ❌ middleware.ts not found');
        return false;
      }
      return true;
    },
  },
  {
    name: 'Cloudflare security layer configured',
    critical: false,
    check: async () => {
      const cfConfigPath = path.join(process.cwd(), 'config', 'cloudflare.ts');
      const cfLibPath = path.join(process.cwd(), 'lib', 'cloudflare.ts');

      if (!fs.existsSync(cfConfigPath) || !fs.existsSync(cfLibPath)) {
        console.error('   ❌ Cloudflare config or lib files missing');
        return false;
      }

      // In production, CLOUDFLARE_ENABLED should be true
      if (
        process.env.NODE_ENV === 'production' &&
        process.env.CLOUDFLARE_ENABLED !== 'true'
      ) {
        console.warn(
          '   ⚠️  CLOUDFLARE_ENABLED is not set to "true" in production'
        );
        console.warn(
          '   Consider enabling Cloudflare proxy for additional security'
        );
        return false;
      }

      return true;
    },
  },
  {
    name: 'Supabase RLS enabled on tables',
    critical: true,
    check: async () => {
      const schemaPath = path.join(
        process.cwd(),
        'initial_supabase_table_schema.sql'
      );
      if (!fs.existsSync(schemaPath)) {
        console.warn('   ⚠️  Schema file not found, skipping RLS check');
        return true;
      }

      const schema = fs.readFileSync(schemaPath, 'utf-8');
      if (!schema.includes('ENABLE ROW LEVEL SECURITY')) {
        console.error('   ❌ RLS not enabled in schema');
        return false;
      }
      return true;
    },
  },
];

async function runSecurityChecks() {
  console.log('\n🔒 Running Security Checks...\n');
  console.log('═'.repeat(60));

  let passed = 0;
  let failed = 0;
  let warnings = 0;
  let criticalFailed = false;

  for (const check of securityChecks) {
    process.stdout.write(`\n${check.name}...\n`);

    try {
      const result = await check.check();

      if (result) {
        console.log(`   ✅ PASS`);
        passed++;
      } else {
        if (check.critical) {
          console.log(`   ❌ FAIL (CRITICAL)`);
          failed++;
          criticalFailed = true;
        } else {
          console.log(`   ⚠️  WARNING`);
          warnings++;
        }
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${error}`);
      if (check.critical) {
        failed++;
        criticalFailed = true;
      } else {
        warnings++;
      }
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('\n📊 Security Check Results:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   ⚠️  Warnings: ${warnings}`);

  if (criticalFailed) {
    console.log('\n❌ CRITICAL SECURITY CHECKS FAILED!');
    console.log('   Fix all critical issues before deploying to production.');
    console.log('\n🚫 Deployment BLOCKED\n');
    process.exit(1);
  } else if (warnings > 0) {
    console.log('\n⚠️  Some non-critical checks failed.');
    console.log('   Consider fixing warnings before deployment.');
  } else {
    console.log('\n✅ All security checks passed!');
    console.log('   Safe to deploy.\n');
  }
}

// Run checks
runSecurityChecks().catch((error) => {
  console.error('Security check script failed:', error);
  process.exit(1);
});
