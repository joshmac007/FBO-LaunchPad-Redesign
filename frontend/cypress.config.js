const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'tests/support/e2e.js',
    fixturesFolder: 'tests/fixtures',
    specPattern: 'tests/e2e/**/*.test.js',
    videosFolder: 'tests/videos',
    screenshotsFolder: 'tests/screenshots',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    env: {
      apiUrl: 'http://localhost:5001/api',
      // Default users from DATABASE_SETUP.md
      adminEmail: 'admin@fbolaunchpad.com',
      adminPassword: 'Admin123!',
      csrEmail: 'csr@fbolaunchpad.com',
      csrPassword: 'CSR123!',
      fuelerEmail: 'fueler@fbolaunchpad.com',
      fuelerPassword: 'Fueler123!',
      memberEmail: 'member@fbolaunchpad.com',
      memberPassword: 'Member123!'
    },
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000
  },
}) 