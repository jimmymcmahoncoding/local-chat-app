// tests/e2e/responsive.spec.js
// Cross-browser & responsive-layout tests for KidsChat.
//
// Runs against every browser/device project in playwright.config.js:
//   Desktop Chrome, Desktop Edge, Desktop Firefox,
//   iPhone 15 Pro (393 px), iPhone 15 Pro Max (430 px),
//   Galaxy S24, Pixel 7.
//
// NOTE: WebKit (Safari engine) is not available on macOS 12. Desktop Edge and
// the iPhone/Android projects run via Chromium with the correct viewport,
// deviceScaleFactor, isMobile and hasTouch settings. Desktop Firefox uses
// the Gecko engine for CSS-compatibility coverage.

const { test, expect } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

const APP_URL = process.env.APP_URL || 'https://kidschat-family.vercel.app/';
const A_EMAIL = process.env.USER_A_EMAIL;
const A_PASS = process.env.USER_A_PASS;

// Minimum touch target dimension per Apple HIG / WCAG 2.5.5 (44 × 44 CSS px).
const MIN_TOUCH = 44;

async function signIn(page, email, password) {
    await page.goto(APP_URL);
    await page.waitForSelector('#signin-card', { state: 'visible', timeout: 20_000 });
    await page.fill('#email-email-input', email);
    await page.fill('#email-password-input', password);
    await page.click('#email-submit-btn');
    await Promise.race([
        page.waitForSelector('#chat-section', { state: 'visible', timeout: 25_000 }),
        page.waitForSelector('#pending-card', { state: 'visible', timeout: 25_000 }),
    ]);
    const isPending = await page.locator('#pending-card').isVisible();
    if (isPending) throw new Error(`Account ${email} is pending approval`);
}

// ── R1  Sign-in screen ───────────────────────────────────────────────────────
// Uses the per-test `page` fixture — each test gets a fresh isolated context.

test.describe('R1 — Sign-in screen layout', () => {

    test('Sign-in card fits viewport without horizontal overflow', async ({ page }) => {
        await page.goto(APP_URL);
        await page.waitForSelector('#signin-card', { state: 'visible', timeout: 20_000 });

        const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth
        );
        expect(overflow, 'page should not scroll horizontally').toBe(false);

        const card = await page.locator('#signin-card').boundingBox();
        const vp = page.viewportSize();
        expect(card.x, 'card left edge must be inside viewport').toBeGreaterThanOrEqual(0);
        expect(card.x + card.width, 'card right edge must be inside viewport')
            .toBeLessThanOrEqual(vp.width + 1);
    });

    test('KidsChat logo and title are visible and centred in sign-in card', async ({ page }) => {
        await page.goto(APP_URL);
        await page.waitForSelector('#signin-card', { state: 'visible', timeout: 20_000 });

        const card = page.locator('#signin-card');
        await expect(card.locator('.signin-icon')).toBeVisible();
        await expect(card.locator('.signin-title')).toContainText('KidsChat');

        // Icon must sit above the title (lower y value in the DOM flow)
        const iconBox = await card.locator('.signin-icon').boundingBox();
        const titleBox = await card.locator('.signin-title').boundingBox();
        expect(iconBox.y, 'icon must appear above title').toBeLessThan(titleBox.y);

        // Both must be horizontally centred inside the card (within 4 px tolerance)
        const iconCentre = iconBox.x + iconBox.width / 2;
        const titleCentre = titleBox.x + titleBox.width / 2;
        const cardCentre = (await card.boundingBox()).x + (await card.boundingBox()).width / 2;
        expect(Math.abs(iconCentre - cardCentre), 'icon centre off by more than 4 px').toBeLessThanOrEqual(4);
        expect(Math.abs(titleCentre - cardCentre), 'title centre off by more than 4 px').toBeLessThanOrEqual(4);
    });

    test('Email / password fields and submit button are visible and aligned', async ({ page }) => {
        await page.goto(APP_URL);
        await page.waitForSelector('#signin-card', { state: 'visible', timeout: 20_000 });

        const emailInput = page.locator('#email-email-input');
        const passwordInput = page.locator('#email-password-input');
        const submitBtn = page.locator('#email-submit-btn');

        await expect(emailInput).toBeVisible();
        await expect(passwordInput).toBeVisible();
        await expect(submitBtn).toBeVisible();

        // All three must have the same left edge (aligned in a column)
        const emailBox = await emailInput.boundingBox();
        const passwordBox = await passwordInput.boundingBox();
        const submitBox = await submitBtn.boundingBox();

        expect(Math.abs(emailBox.x - passwordBox.x), 'email & password inputs must share the same left edge')
            .toBeLessThanOrEqual(2);
        expect(Math.abs(emailBox.x - submitBox.x), 'email input & submit button must share the same left edge')
            .toBeLessThanOrEqual(2);

        // Fields must appear in order: email above password above submit
        expect(emailBox.y).toBeLessThan(passwordBox.y);
        expect(passwordBox.y).toBeLessThan(submitBox.y);
    });

    test('Submit button meets minimum touch target height', async ({ page }) => {
        await page.goto(APP_URL);
        await page.waitForSelector('#signin-card', { state: 'visible', timeout: 20_000 });
        const box = await page.locator('#email-submit-btn').boundingBox();
        expect(box.height, `submit button height ${box.height}px is below ${MIN_TOUCH}px minimum`)
            .toBeGreaterThanOrEqual(MIN_TOUCH);
    });
});

// ── R2  Chat UI layout (signed in) ───────────────────────────────────────────
// Signs in once via beforeAll; all tests share the same page through closure.

test.describe.serial('R2 — Chat UI layout', () => {
    let sharedPage;

    test.beforeAll(async ({ browser }) => {
        if (!A_EMAIL || !A_PASS) throw new Error('Missing credentials in .env.test');
        const ctx = await browser.newContext({ permissions: ['notifications'] });
        sharedPage = await ctx.newPage();
        await signIn(sharedPage, A_EMAIL, A_PASS);
        // If the app restored a DM panel from a previous session, close it so all
        // R2 tests start from the known group-chat view.
        if (await sharedPage.locator('#dm-panel').isVisible()) {
            await sharedPage.click('#dm-back-btn');
            await sharedPage.locator('#dm-panel').waitFor({ state: 'hidden', timeout: 5_000 });
        }
    });

    test.afterAll(async () => {
        await sharedPage?.close();
    });

    // ── Layout integrity ──────────────────────────────────────────────────────

    test('No horizontal overflow on main chat view', async () => {
        const overflow = await sharedPage.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth
        );
        expect(overflow, 'chat view should not scroll horizontally').toBe(false);
    });

    test('KidsChat brand logo is visible and within viewport', async () => {
        const brand = sharedPage.locator('.chat-header__brand');
        await expect(brand).toBeVisible();

        const box = await brand.boundingBox();
        const vp = sharedPage.viewportSize();
        expect(box.x, 'brand left edge must be inside viewport').toBeGreaterThanOrEqual(0);
        expect(box.x + box.width, 'brand right edge must be inside viewport')
            .toBeLessThanOrEqual(vp.width + 1);
        expect(box.y, 'brand top edge must be inside viewport').toBeGreaterThanOrEqual(0);
    });

    test('Chat header emoji icon and brand text are vertically aligned', async () => {
        const brand = sharedPage.locator('.chat-header__brand');
        const children = brand.locator('span');

        const emojiBox = await children.nth(0).boundingBox();
        const textBox = await children.nth(1).boundingBox();

        // Both spans must share roughly the same vertical midpoint (within 4 px)
        const emojiMid = emojiBox.y + emojiBox.height / 2;
        const textMid = textBox.y + textBox.height / 2;
        expect(Math.abs(emojiMid - textMid), 'brand emoji and text are not vertically aligned')
            .toBeLessThanOrEqual(4);
    });

    test('Chat header is within full viewport bounds', async () => {
        const box = await sharedPage.locator('.chat-header').boundingBox();
        const vp = sharedPage.viewportSize();
        expect(box.x, 'header left').toBeGreaterThanOrEqual(0);
        expect(box.y, 'header top').toBeGreaterThanOrEqual(0);
        expect(box.x + box.width, 'header right edge must not exceed viewport width')
            .toBeLessThanOrEqual(vp.width + 1);
    });

    test('Message list has vertical scrolling enabled', async () => {
        const overflowY = await sharedPage.locator('#messages').evaluate(
            el => getComputedStyle(el).overflowY
        );
        expect(['auto', 'scroll'], `overflowY was "${overflowY}"`).toContain(overflowY);
    });

    test('Message composer sits at or within the viewport bottom edge', async () => {
        const composer = sharedPage.locator('.composer');
        await expect(composer).toBeVisible();
        const box = await composer.boundingBox();
        const vp = sharedPage.viewportSize();
        expect(box.y + box.height, 'composer bottom must not exceed viewport height')
            .toBeLessThanOrEqual(vp.height + 2);
    });

    test('Message input and send button are vertically aligned (flex-end baseline)', async () => {
        // The send button is hidden when the input is empty (voice-button logic);
        // type a character so it becomes visible before measuring.
        await sharedPage.locator('#message-input').fill('x');
        await sharedPage.locator('#message-form .btn-send').waitFor({ state: 'visible', timeout: 3_000 });

        const inputBox = await sharedPage.locator('#message-input').boundingBox();
        // Scope to #message-form to avoid strict-mode clash with the DM panel's .btn-send
        const sendBox = await sharedPage.locator('#message-form .btn-send').boundingBox();

        await sharedPage.locator('#message-input').fill('');  // restore empty state

        // Both must be visible and share a similar bottom edge (within 6 px)
        const inputBottom = inputBox.y + inputBox.height;
        const sendBottom = sendBox.y + sendBox.height;
        expect(Math.abs(inputBottom - sendBottom), 'input and send button bottom edges misaligned')
            .toBeLessThanOrEqual(6);
    });

    test('Message input is focusable', async () => {
        await sharedPage.locator('#message-input').click();
        const focused = await sharedPage.evaluate(() => document.activeElement?.id);
        expect(focused).toBe('message-input');
    });

    // ── CSS rendering ─────────────────────────────────────────────────────────

    test('CSS custom properties (--bg tokens) are applied by the browser', async () => {
        const props = await sharedPage.evaluate(() => {
            const s = getComputedStyle(document.documentElement);
            return {
                primary: s.getPropertyValue('--primary').trim(),
                pageBg: s.getPropertyValue('--page-bg').trim(),
                border: s.getPropertyValue('--border').trim(),
            };
        });
        expect(props.primary, '--primary must be set').not.toBe('');
        expect(props.pageBg, '--page-bg must be set').not.toBe('');
        expect(props.border, '--border must be set').not.toBe('');
    });

    // ── Touch targets ─────────────────────────────────────────────────────────

    test(`Chats button meets ${MIN_TOUCH}×${MIN_TOUCH}px touch target`, async () => {
        await sharedPage.waitForSelector('#chats-btn:not(.hidden)', { timeout: 10_000 });
        const box = await sharedPage.locator('#chats-btn').boundingBox();
        expect(box.width, `#chats-btn width  ${box.width}px  < ${MIN_TOUCH}px`).toBeGreaterThanOrEqual(MIN_TOUCH);
        expect(box.height, `#chats-btn height ${box.height}px < ${MIN_TOUCH}px`).toBeGreaterThanOrEqual(MIN_TOUCH);
    });

    test(`Users button meets ${MIN_TOUCH}×${MIN_TOUCH}px touch target`, async () => {
        await sharedPage.waitForSelector('#users-btn:not(.hidden)', { timeout: 10_000 });
        const box = await sharedPage.locator('#users-btn').boundingBox();
        expect(box.width, `#users-btn width  ${box.width}px  < ${MIN_TOUCH}px`).toBeGreaterThanOrEqual(MIN_TOUCH);
        expect(box.height, `#users-btn height ${box.height}px < ${MIN_TOUCH}px`).toBeGreaterThanOrEqual(MIN_TOUCH);
    });

    test(`Profile button meets ${MIN_TOUCH}px height touch target`, async () => {
        const box = await sharedPage.locator('#profile-btn').boundingBox();
        expect(box.height, `#profile-btn height ${box.height}px < ${MIN_TOUCH}px`).toBeGreaterThanOrEqual(MIN_TOUCH);
    });

    test(`Send button meets ${MIN_TOUCH}×${MIN_TOUCH}px touch target`, async () => {
        // The send button is hidden when the input is empty; type a character to reveal it.
        await sharedPage.locator('#message-input').fill('x');
        await sharedPage.locator('#message-form .btn-send').waitFor({ state: 'visible', timeout: 3_000 });
        // Scope to #message-form to avoid strict-mode clash with the DM panel's .btn-send
        const box = await sharedPage.locator('#message-form .btn-send').boundingBox();
        await sharedPage.locator('#message-input').fill('');  // restore empty state
        expect(box.width, `#message-form .btn-send width  ${box.width}px  < ${MIN_TOUCH}px`).toBeGreaterThanOrEqual(MIN_TOUCH);
        expect(box.height, `#message-form .btn-send height ${box.height}px < ${MIN_TOUCH}px`).toBeGreaterThanOrEqual(MIN_TOUCH);
    });

    // ── Panels & modals ───────────────────────────────────────────────────────

    test('Profile modal opens, fits within viewport, and closes', async () => {
        await sharedPage.click('#profile-btn');
        const modal = sharedPage.locator('#profile-modal');
        await expect(modal).toBeVisible({ timeout: 5_000 });

        const box = await modal.boundingBox();
        const vp = sharedPage.viewportSize();
        expect(box.x, 'modal left').toBeGreaterThanOrEqual(0);
        expect(box.y, 'modal top').toBeGreaterThanOrEqual(0);
        expect(box.x + box.width, 'modal right must not exceed viewport width').toBeLessThanOrEqual(vp.width + 1);
        expect(box.y + box.height, 'modal bottom must not exceed viewport height').toBeLessThanOrEqual(vp.height + 1);

        await sharedPage.click('#profile-cancel-btn');
        await expect(modal).not.toBeVisible({ timeout: 3_000 });
    });

    test('Users panel opens, fits within viewport, and closes', async () => {
        await sharedPage.waitForSelector('#users-btn:not(.hidden)', { timeout: 10_000 });
        await sharedPage.click('#users-btn');
        const panel = sharedPage.locator('#users-panel');
        await expect(panel).toBeVisible({ timeout: 8_000 });

        const box = await panel.boundingBox();
        const vp = sharedPage.viewportSize();
        expect(box.x, 'panel left').toBeGreaterThanOrEqual(0);
        expect(box.width, 'panel width must not exceed viewport width').toBeLessThanOrEqual(vp.width + 1);

        await sharedPage.click('#users-panel-close-btn');
        await expect(panel).not.toBeVisible({ timeout: 3_000 });
    });

    test('Chats panel opens, fits within viewport, and closes', async () => {
        await sharedPage.waitForSelector('#chats-btn:not(.hidden)', { timeout: 10_000 });
        await sharedPage.click('#chats-btn');
        const panel = sharedPage.locator('#chats-panel');
        await expect(panel).toBeVisible({ timeout: 8_000 });

        const box = await panel.boundingBox();
        const vp = sharedPage.viewportSize();
        expect(box.x, 'panel left').toBeGreaterThanOrEqual(0);
        expect(box.width, 'panel width must not exceed viewport width').toBeLessThanOrEqual(vp.width + 1);

        await sharedPage.click('#chats-panel-close-btn');
        await expect(panel).not.toBeVisible({ timeout: 3_000 });
    });

    // ── Content overflow ──────────────────────────────────────────────────────

    test('Message bubbles do not overflow their container horizontally', async () => {
        const bubbleCount = await sharedPage.locator('.msg__bubble').count();
        if (bubbleCount === 0) return; // No messages yet — nothing to check

        const overflow = await sharedPage.evaluate(() => {
            const bubbles = document.querySelectorAll('.msg__bubble');
            const containerW = document.getElementById('messages')?.clientWidth || window.innerWidth;
            return Array.from(bubbles).some(b => b.scrollWidth > containerW + 2);
        });
        expect(overflow, 'one or more message bubbles overflow the message container').toBe(false);
    });

    test('Composer buttons do not cause horizontal overflow', async () => {
        const overflow = await sharedPage.evaluate(() => {
            const form = document.getElementById('message-form');
            return form ? form.scrollWidth > form.clientWidth + 2 : false;
        });
        expect(overflow, 'composer form overflows its container horizontally').toBe(false);
    });
});
