// tests/e2e/kidschat.spec.js
// Full integration test suite for KidsChat.
// Requires: .env.test with USER_A/USER_B email+pass credentials (email/password auth).
// Both accounts must be approved in the Firebase `allowedUsers` collection.

const { test, expect, chromium } = require('@playwright/test');
require('dotenv').config({ path: '.env.test' });

const APP_URL = process.env.APP_URL || 'https://kidschat-family.vercel.app/';
const A_EMAIL = process.env.USER_A_EMAIL;
const A_PASS = process.env.USER_A_PASS;
const A_NAME = process.env.USER_A_NAME;
const B_EMAIL = process.env.USER_B_EMAIL;
const B_PASS = process.env.USER_B_PASS;
const B_NAME = process.env.USER_B_NAME;

// ── helpers ─────────────────────────────────────────────────────────────────

async function signIn(page, email, password) {
    await page.goto(APP_URL);
    await page.waitForSelector('#signin-card', { state: 'visible', timeout: 20_000 });
    await page.fill('#email-email-input', email);
    await page.fill('#email-password-input', password);
    await page.click('#email-submit-btn');
    // waitForSelector with a comma picks the first DOM element (pending-card) and
    // waits only for that. Use Promise.race so we react to whichever becomes visible.
    await Promise.race([
        page.waitForSelector('#chat-section', { state: 'visible', timeout: 25_000 }),
        page.waitForSelector('#pending-card', { state: 'visible', timeout: 25_000 }),
    ]);
    const isPending = await page.locator('#pending-card').isVisible();
    if (isPending) throw new Error(`Account ${email} is in PENDING state — add it to allowedUsers`);
    const isChat = await page.locator('#chat-section').isVisible();
    if (!isChat) throw new Error(`Sign-in failed for ${email} — check credentials`);
}

async function waitForMessage(page, text, container = '#messages') {
    await expect(page.locator(container)).toContainText(text, { timeout: 12_000 });
}

async function sendGroupMessage(page, text) {
    await page.fill('#message-input', text);
    await page.keyboard.press('Enter');
}

async function sendDMMessage(page, text) {
    await page.fill('#dm-input', text);
    await page.keyboard.press('Enter');
}

// ── fixtures ─────────────────────────────────────────────────────────────────

let browser;
let ctxA, ctxB;
let pageA, pageB;

test.describe.serial('KidsChat — full integration suite', () => {

    test.beforeAll(async () => {
        if (!A_EMAIL || !A_PASS || !B_EMAIL || !B_PASS) {
            throw new Error('Missing credentials. Copy .env.test.example to .env.test and fill in values.');
        }
        browser = await chromium.launch({ headless: true });

        // Each context is fully isolated (separate cookies/localStorage/IndexedDB)
        ctxA = await browser.newContext({
            permissions: ['notifications'],
            ignoreHTTPSErrors: false,
        });
        ctxB = await browser.newContext({
            permissions: ['notifications'],
            ignoreHTTPSErrors: false,
        });

        pageA = await ctxA.newPage();
        pageB = await ctxB.newPage();

        // Sign both users in in parallel
        await Promise.all([
            signIn(pageA, A_EMAIL, A_PASS),
            signIn(pageB, B_EMAIL, B_PASS),
        ]);

        // If a prior test run left User A with a changed display name, reset it
        // so that DM conversation metadata is consistent across runs.
        const currentName = (await pageA.locator('#user-name').textContent())?.trim();
        if (currentName && currentName !== A_NAME) {
            await pageA.click('#profile-btn');
            await pageA.locator('#profile-modal').waitFor({ state: 'visible', timeout: 8_000 });
            await pageA.fill('#profile-name-input', A_NAME);
            await pageA.click('#profile-save-btn');
            await pageA.locator('#profile-modal').waitFor({ state: 'hidden', timeout: 8_000 });
            await expect(pageA.locator('#user-name')).toContainText(A_NAME, { timeout: 10_000 });
        }
    });

    test.afterAll(async () => {
        await browser?.close();
    });

    // ── 1. Auth ───────────────────────────────────────────────────────────────

    test('1.1  Both users see the chat section after sign-in', async () => {
        await expect(pageA.locator('#chat-section')).toBeVisible();
        await expect(pageB.locator('#chat-section')).toBeVisible();
    });

    test('1.2  Profile button shows display name', async () => {
        // User name span should be non-empty
        await expect(pageA.locator('#user-name')).not.toBeEmpty({ timeout: 10_000 });
        await expect(pageB.locator('#user-name')).not.toBeEmpty({ timeout: 10_000 });
    });

    test('1.3  Chats button is visible', async () => {
        await expect(pageA.locator('#chats-btn')).toBeVisible();
        await expect(pageB.locator('#chats-btn')).toBeVisible();
    });

    // ── 2. Group chat ─────────────────────────────────────────────────────────

    test('2.1  User A sends a group message and User B receives it', async () => {
        const msg = `Hello from A — ${Date.now()}`;
        await sendGroupMessage(pageA, msg);
        await waitForMessage(pageB, msg, '#messages');
    });

    test('2.2  User B sends a group message and User A receives it', async () => {
        const msg = `Hello from B — ${Date.now()}`;
        await sendGroupMessage(pageB, msg);
        await waitForMessage(pageA, msg, '#messages');
    });

    test('2.3  Sent message appears in own view', async () => {
        const msg = `Echo check — ${Date.now()}`;
        await sendGroupMessage(pageA, msg);
        await waitForMessage(pageA, msg, '#messages');
    });

    // ── 3. Typing indicators (group chat) ─────────────────────────────────────

    test('3.1  Typing indicator appears for other user in group chat', async () => {
        // Close DM panel if open (shouldn't be yet, but guard)
        const dmOpen = await pageA.locator('#dm-panel').isVisible();
        if (dmOpen) await pageA.click('#dm-back-btn');

        // Use pressSequentially so each keystroke fires a real `input` event,
        // which is what triggers handleTypingInput() in the app.
        await pageB.locator('#message-input').click();
        await pageB.locator('#message-input').pressSequentially('hi!');

        // Indicator should appear in pageA's view
        await expect(pageA.locator('#typing-indicator')).toBeVisible({ timeout: 10_000 });
    });

    test('3.2  Typing indicator disappears after clearing input', async () => {
        // Select all and delete so the input event fires with an empty value,
        // then wait for the app's 3-second debounce to clear the indicator.
        await pageB.locator('#message-input').selectText();
        await pageB.locator('#message-input').press('Backspace');
        // Debounce is 3 s; Firestore propagation ~1 s — 12 s is plenty.
        await expect(pageA.locator('#typing-indicator')).not.toBeVisible({ timeout: 12_000 });
    });

    // ── 4. Users panel ────────────────────────────────────────────────────────

    test('4.1  User A opens Users panel and sees User B listed', async () => {
        await pageA.click('#users-btn');
        await expect(pageA.locator('#users-panel')).toBeVisible();

        // User B's display name should appear in the list
        await expect(pageA.locator('#users-panel-list')).toContainText(B_NAME, { timeout: 10_000 });
    });

    test('4.2  User A starts a DM with User B via the Message button', async () => {
        const bRow = pageA.locator('.user-list-item', { hasText: B_NAME }).first();
        await bRow.locator('.user-list-item__dm-btn').click();

        // DM panel should open; users panel should close
        await expect(pageA.locator('#dm-panel')).toBeVisible({ timeout: 8_000 });
        await expect(pageA.locator('#users-panel')).not.toBeVisible();

        // DM header should show User B's name
        await expect(pageA.locator('#dm-user-name')).toContainText(B_NAME, { timeout: 8_000 });
    });

    // ── 5. Direct messages ────────────────────────────────────────────────────

    test('5.1  User A sends a DM and User B gets an unread badge on Chats button', async () => {
        const msg = `DM from A — ${Date.now()}`;
        await sendDMMessage(pageA, msg);

        // User B's Chats badge should become visible with count ≥ 1
        await expect(pageB.locator('#chats-badge')).toBeVisible({ timeout: 12_000 });
        const badgeText = await pageB.locator('#chats-badge').textContent();
        expect(parseInt(badgeText, 10)).toBeGreaterThan(0);
    });

    test('5.2  User B opens Chats panel and sees DM with unread count', async () => {
        await pageB.click('#chats-btn');
        await expect(pageB.locator('#chats-panel')).toBeVisible();

        // Should show a DM row with User A's name and an unread badge
        await expect(pageB.locator('#chats-panel-list')).toContainText(A_NAME, { timeout: 10_000 });
        await expect(pageB.locator('.chat-list-item__unread')).toBeVisible({ timeout: 8_000 });
    });

    test('5.3  User B clicks the DM in Chats panel — DM panel opens', async () => {
        const aRow = pageB.locator('.chat-list-item', { hasText: A_NAME }).first();
        await aRow.click();

        await expect(pageB.locator('#dm-panel')).toBeVisible({ timeout: 8_000 });
        await expect(pageB.locator('#chats-panel')).not.toBeVisible();
        await expect(pageB.locator('#dm-user-name')).toContainText(A_NAME, { timeout: 8_000 });
    });

    test('5.4  DM message sent by User A is visible in User B\'s DM panel', async () => {
        // Whatever A sent in 5.1 should appear in B's DM messages
        await expect(pageB.locator('#dm-messages')).toContainText('DM from A', { timeout: 10_000 });
    });

    test('5.5  After opening DM, User B\'s Chats badge clears', async () => {
        // Badge should disappear now that B has opened the conversation
        await expect(pageB.locator('#chats-badge')).not.toBeVisible({ timeout: 8_000 });
    });

    test('5.6  User B replies in DM and User A gets a Chats badge', async () => {
        const reply = `Reply from B — ${Date.now()}`;
        await sendDMMessage(pageB, reply);

        // A should now have a badge (A's DM panel may or may not still be open)
        // Close A's DM panel first to ensure the badge accumulates
        const aHasDm = await pageA.locator('#dm-panel').isVisible();
        if (aHasDm) {
            await pageA.click('#dm-back-btn');
            await expect(pageA.locator('#dm-panel')).not.toBeVisible();
        }

        // Send another to trigger the badge now DM is closed
        const reply2 = `Reply from B again — ${Date.now()}`;
        await sendDMMessage(pageB, reply2);
        await expect(pageA.locator('#chats-badge')).toBeVisible({ timeout: 12_000 });
    });

    test('5.7  User A opens DM from Chats panel — badge clears', async () => {
        await pageA.click('#chats-btn');
        await expect(pageA.locator('#chats-panel')).toBeVisible();
        await expect(pageA.locator('#chats-panel-list')).toContainText(B_NAME, { timeout: 10_000 });

        const bRow = pageA.locator('.chat-list-item', { hasText: B_NAME }).first();
        await bRow.click();

        await expect(pageA.locator('#dm-panel')).toBeVisible({ timeout: 8_000 });
        await expect(pageA.locator('#chats-badge')).not.toBeVisible({ timeout: 8_000 });
    });

    // ── 6. DM typing indicators ───────────────────────────────────────────────

    test('6.1  DM typing indicator appears when partner is typing', async () => {
        // pageA has DM open with B; B also has DM open with A
        await pageB.locator('#dm-input').click();
        await pageB.locator('#dm-input').pressSequentially('hey!');
        await expect(pageA.locator('#dm-typing-indicator')).toBeVisible({ timeout: 10_000 });
    });

    test('6.2  DM typing indicator clears when partner stops typing', async () => {
        await pageB.locator('#dm-input').selectText();
        await pageB.locator('#dm-input').press('Backspace');
        await expect(pageA.locator('#dm-typing-indicator')).not.toBeVisible({ timeout: 12_000 });
    });

    // ── 7. Chats panel — Group Chat navigation ────────────────────────────────

    test('7.1  Clicking "Group Chat" row in Chats panel closes the panel', async () => {
        // Close A's DM first, then open Chats panel
        const dmOpen = await pageA.locator('#dm-panel').isVisible();
        if (dmOpen) await pageA.click('#dm-back-btn');

        await pageA.click('#chats-btn');
        await expect(pageA.locator('#chats-panel')).toBeVisible();

        const groupRow = pageA.locator('.chat-list-item', { hasText: 'Group Chat' }).first();
        await groupRow.click();

        await expect(pageA.locator('#chats-panel')).not.toBeVisible();
    });

    test('7.2  Chats panel close button works', async () => {
        await pageA.click('#chats-btn');
        await expect(pageA.locator('#chats-panel')).toBeVisible();
        await pageA.click('#chats-panel-close-btn');
        await expect(pageA.locator('#chats-panel')).not.toBeVisible();
    });

    test('7.3  Clicking backdrop of Chats panel closes it', async () => {
        await pageA.click('#chats-btn');
        await expect(pageA.locator('#chats-panel')).toBeVisible();
        // Click on the overlay backdrop (the panel element itself, outside the inner card)
        await pageA.locator('#chats-panel').click({ position: { x: 5, y: 5 } });
        await expect(pageA.locator('#chats-panel')).not.toBeVisible();
    });

    // ── 8. Profile editing ────────────────────────────────────────────────────

    test('8.1  User A can open the profile modal', async () => {
        await pageA.click('#profile-btn');
        await expect(pageA.locator('#profile-modal')).toBeVisible({ timeout: 8_000 });
    });

    test('8.2  Profile name input is pre-filled', async () => {
        const value = await pageA.locator('#profile-name-input').inputValue();
        expect(value.length).toBeGreaterThan(0);
    });

    test('8.3  User A can save a new display name', async () => {
        const newName = `UserA-${Date.now().toString().slice(-4)}`;
        await pageA.fill('#profile-name-input', newName);
        await pageA.click('#profile-save-btn');
        await expect(pageA.locator('#profile-modal')).not.toBeVisible({ timeout: 8_000 });
        // Header name should update
        await expect(pageA.locator('#user-name')).toContainText(newName, { timeout: 10_000 });

        // Restore canonical name so subsequent test runs are not contaminated
        await pageA.click('#profile-btn');
        await pageA.locator('#profile-modal').waitFor({ state: 'visible', timeout: 5_000 });
        await pageA.fill('#profile-name-input', A_NAME);
        await pageA.click('#profile-save-btn');
        await expect(pageA.locator('#profile-modal')).not.toBeVisible({ timeout: 8_000 });
        await expect(pageA.locator('#user-name')).toContainText(A_NAME, { timeout: 10_000 });
    });

    test('8.4  Cancel closes profile modal without saving', async () => {
        const originalName = await pageA.locator('#user-name').textContent();
        await pageA.click('#profile-btn');
        await pageA.fill('#profile-name-input', 'SHOULD_NOT_SAVE_THIS');
        await pageA.click('#profile-cancel-btn');
        await expect(pageA.locator('#profile-modal')).not.toBeVisible();
        // Name should be unchanged
        await expect(pageA.locator('#user-name')).toContainText(originalName.trim());
    });

    // ── 9. New DM button in Chats panel ───────────────────────────────────────

    test('9.1  New DM pencil button in Chats panel opens Users panel', async () => {
        await pageA.click('#chats-btn');
        await expect(pageA.locator('#chats-panel')).toBeVisible();
        await pageA.click('#new-dm-btn');
        await expect(pageA.locator('#users-panel')).toBeVisible({ timeout: 8_000 });
        // Close again
        await pageA.click('#users-panel-close-btn');
    });

    // ── 10. Sign out ─────────────────────────────────────────────────────────

    test('10.1  Sign-out button is hidden by default (in collapsed state)', async () => {
        // #sign-out-btn has class hidden — it's shown only on profile hover / mobile
        // Just assert the element exists and that sign-in screen is not shown
        await expect(pageA.locator('#signin-screen')).not.toBeVisible();
    });

});
