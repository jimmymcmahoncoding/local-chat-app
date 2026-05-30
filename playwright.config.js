// playwright.config.js
const { defineConfig, devices } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

module.exports = defineConfig({
    testDir: './tests/e2e',
    timeout: 45_000,
    expect: { timeout: 12_000 },
    fullyParallel: false,
    workers: 1,
    reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
    use: {
        baseURL: process.env.APP_URL || 'https://kidschat-family.vercel.app/',
        headless: true,
        screenshot: 'only-on-failure',
        video: 'on-first-retry',
    },
    projects: [
        // ── Functional integration suite (Desktop Chrome only) ────────────────
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
            testMatch: '**/kidschat.spec.js',
        },

        // ── Responsive & cross-browser rendering suite ────────────────────────
        // Desktop browsers
        {
            name: 'Desktop Chrome',
            use: { ...devices['Desktop Chrome'] },
            testMatch: '**/responsive.spec.js',
        },
        {
            // Edge uses the installed Microsoft Edge app via the msedge channel.
            name: 'Desktop Edge',
            use: { ...devices['Desktop Chrome'], channel: 'msedge' },
            testMatch: '**/responsive.spec.js',
        },
        {
            // Firefox (Gecko engine) for CSS-compatibility coverage.
            name: 'Desktop Firefox',
            use: { browserName: 'firefox', viewport: { width: 1280, height: 720 } },
            testMatch: '**/responsive.spec.js',
        },

        // Mobile viewports — Chromium engine with device emulation.
        // WebKit is not available on macOS 12; browserName overrides defaultBrowserType
        // in the device descriptor so these run correctly under Chromium.
        {
            // iPhone 15 Pro  —  393 × 659 CSS px, 3× DPR, touch enabled
            name: 'iPhone 15 Pro',
            use: { ...devices['iPhone 15 Pro'], browserName: 'chromium' },
            testMatch: '**/responsive.spec.js',
        },
        {
            // iPhone 15 Pro Max  —  430 × 739 CSS px, 3× DPR, touch enabled
            name: 'iPhone 15 Pro Max',
            use: { ...devices['iPhone 15 Pro Max'], browserName: 'chromium' },
            testMatch: '**/responsive.spec.js',
        },
        {
            // Samsung Galaxy S24  —  384 × 780 CSS px, touch enabled
            name: 'Galaxy S24',
            use: { ...devices['Galaxy S24'] },
            testMatch: '**/responsive.spec.js',
        },
        {
            // Google Pixel 7  —  412 × 915 CSS px, touch enabled
            name: 'Pixel 7',
            use: { ...devices['Pixel 7'] },
            testMatch: '**/responsive.spec.js',
        },
    ],
});
