const {defineConfig} = require('@playwright/test');

module.exports = defineConfig({
    testDir: './test/browser',
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: 0,
    use: {
        browserName: 'chromium',
        viewport: {width: 900, height: 600},
        locale: 'en-US',
        serviceWorkers: 'block',
        trace: 'retain-on-failure'
    }
});
