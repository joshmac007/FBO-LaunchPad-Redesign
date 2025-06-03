#!/usr/bin/env node

/**
 * FBO LaunchPad Authentication & User Access Test Runner
 * 
 * This script runs comprehensive end-to-end tests to verify:
 * 1. Authentication flow works correctly
 * 2. Permission loading doesn't cause 401 errors
 * 3. Each user role has appropriate access
 * 4. Cross-role access is properly restricted
 */

const { spawn } = require('child_process');
const path = require('path');

// Test configurations
const testConfigs = [
  {
    name: 'Authentication Flow Tests',
    file: 'tests/e2e/authentication-flow.test.js',
    description: 'Tests authentication flow and permission loading without 401 errors'
  },
  {
    name: 'Admin User Access Tests',
    file: 'tests/e2e/admin-user-access.test.js',
    description: 'Tests admin user access to all system features'
  },
  {
    name: 'CSR User Access Tests',
    file: 'tests/e2e/csr-user-access.test.js',
    description: 'Tests CSR user access and restrictions'
  },
  {
    name: 'Fueler User Access Tests',
    file: 'tests/e2e/fueler-user-access.test.js',
    description: 'Tests fueler/LST user access and operational capabilities'
  },
  {
    name: 'Member User Access Tests',
    file: 'tests/e2e/member-user-access.test.js',
    description: 'Tests member user limited access and restrictions'
  }
];

async function runCypressTest(testFile, testName) {
  return new Promise((resolve, reject) => {
    console.log(`\n🧪 Running: ${testName}`);
    console.log(`📁 File: ${testFile}`);
    console.log('─'.repeat(60));

    const cypress = spawn('npx', ['cypress', 'run', '--spec', testFile], {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    cypress.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${testName} - PASSED`);
        resolve(code);
      } else {
        console.log(`❌ ${testName} - FAILED (exit code: ${code})`);
        reject(new Error(`Test failed with exit code ${code}`));
      }
    });

    cypress.on('error', (error) => {
      console.error(`💥 Error running ${testName}:`, error);
      reject(error);
    });
  });
}

async function runAllTests() {
  console.log('🚀 FBO LaunchPad Authentication & User Access Test Suite');
  console.log('═'.repeat(60));
  console.log('This test suite validates:');
  console.log('• Authentication flow works without 401 errors');
  console.log('• Permission-based access control (PBAC) enforcement');
  console.log('• User role access restrictions');
  console.log('• Cross-role security boundaries');
  console.log('═'.repeat(60));

  // Check if Cypress is installed
  try {
    const cypress = spawn('npx', ['cypress', '--version'], { stdio: 'pipe' });
    await new Promise((resolve, reject) => {
      cypress.on('close', resolve);
      cypress.on('error', reject);
    });
  } catch (error) {
    console.error('❌ Cypress is not installed. Please run: npm install cypress');
    process.exit(1);
  }

  const results = {
    passed: 0,
    failed: 0,
    total: testConfigs.length
  };

  // Run tests sequentially to avoid conflicts
  for (const config of testConfigs) {
    try {
      await runCypressTest(config.file, config.name);
      results.passed++;
    } catch (error) {
      results.failed++;
      console.error(`\n💥 ${config.name} failed:`, error.message);
    }
  }

  // Print summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(60));
  console.log(`✅ Passed: ${results.passed}/${results.total}`);
  console.log(`❌ Failed: ${results.failed}/${results.total}`);
  
  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! Authentication and user access controls are working correctly.');
  } else {
    console.log(`\n⚠️  ${results.failed} test(s) failed. Please review the output above.`);
  }

  process.exit(results.failed > 0 ? 1 : 0);
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
FBO LaunchPad Authentication Test Runner

Usage:
  node run-auth-tests.js [options]

Options:
  --help, -h     Show this help message
  --list, -l     List available tests
  
Examples:
  node run-auth-tests.js                    # Run all tests
  node run-auth-tests.js --list            # List all available tests
`);
    process.exit(0);
  }

  if (args.includes('--list') || args.includes('-l')) {
    console.log('Available Tests:');
    console.log('─'.repeat(40));
    testConfigs.forEach((config, index) => {
      console.log(`${index + 1}. ${config.name}`);
      console.log(`   📁 ${config.file}`);
      console.log(`   📝 ${config.description}`);
      console.log('');
    });
    process.exit(0);
  }

  // Run all tests
  runAllTests().catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests, runCypressTest, testConfigs }; 