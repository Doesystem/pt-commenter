import { chromium, Browser, BrowserContext, Page } from "playwright";
import type { Context } from "@lifetimesoft/agent-sdk";
import { randomUserAgent } from "../utils/userAgents.js";

const PT_COMMENT_MAX_LENGTH = 500;

export interface BrowserInstance {
    browser: Browser;
    context: BrowserContext;
    page: Page;
}

export interface TopicData {
    title: string;
    content: string;
    url: string;
}

// ─── Browser ──────────────────────────────────────────────────────────────────

export async function openBrowser(): Promise<BrowserInstance> {
    const browser = await chromium.launch({
        headless: true,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage',
            '--no-sandbox',
        ],
    });

    const context = await browser.newContext({
        userAgent: randomUserAgent(),
        locale: 'th-TH',
        timezoneId: 'Asia/Bangkok',
        viewport: { width: 1920, height: 1080 },
        geolocation: { longitude: 100.5018, latitude: 13.7563 }, // Bangkok
        colorScheme: 'light',
    });

    const page = await context.newPage();

    // hide webdriver flag
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    return { browser, context, page };
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function loginPt(
    page: Page,
    context: BrowserContext,
    username: string,
    password: string,
    ctx: Context
): Promise<void> {
    ctx.log.info('Logging in to PT...');

    await page.goto('https://pantip.com/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000 + Math.random() * 1000);

    // click login link
    await page.waitForSelector('#member_email', { timeout: 15000 });

    ctx.log.info('type email');
    await page.locator('#member_email').click();
    await page.keyboard.type(username, { delay: 50 + Math.random() * 50 });

    ctx.log.info('type password');
    await page.locator('#member_password').click();
    await page.keyboard.type(password, { delay: 50 + Math.random() * 50 });

    await page.waitForTimeout(10000); // wait like a human

    ctx.log.info('submit login');
    await page.click('button[type="submit"]');
    await page.waitForURL('https://pantip.com/**', { timeout: 30000 });
    await page.waitForTimeout(3000);

    // verify login succeeded — check for error message on page
    const errorMsg = await page.locator('.alert-danger, .error-message, [class*="error"]').first().textContent().catch(() => null);
    if (errorMsg) {
        throw new Error(`PT login failed: ${errorMsg.trim()}`);
    }

    ctx.log.info('PT login successful');
}

export async function ensureLogin(
    page: Page,
    context: BrowserContext,
    username: string,
    password: string,
    ctx: Context
): Promise<void> {
    if (!username || !password) {
        throw new Error('PT credentials not configured (pt_username / pt_password)');
    }

    const isLoggedIn = await page.locator('div.editor-input[contenteditable="true"]').count() > 0;
    if (isLoggedIn) {
        ctx.log.info('Already logged in');
        return;
    }

    ctx.log.info('Not logged in — attempting login...');
    await loginPt(page, context, username, password, ctx);
}

// ─── Read Topic ───────────────────────────────────────────────────────────────

export async function readPtTopic(page: Page, url: string, ctx: Context): Promise<TopicData> {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // human-like reading delay
    await page.waitForTimeout(2000 + Math.random() * 2000);

    // wait for content to be present
    await page.waitForSelector('.display-post-title', { timeout: 15000 });

    const title = await page.locator('.display-post-title').textContent();
    const content = await page.locator('.display-post-story').first().innerText().catch(() => null);

    if (!title?.trim()) {
        throw new Error(`Could not read topic title from ${url}`);
    }
    if (!content?.trim()) {
        throw new Error(`Could not read topic content from ${url}`);
    }

    ctx.log.info(`Topic read - title: "${title.trim().slice(0, 60)}..."`);

    // scroll like a human
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(1000 + Math.random() * 2000);

    return { title: title.trim(), content: content.trim(), url };
}

// ─── Post Comment ─────────────────────────────────────────────────────────────

export async function postPtComment(
    page: Page,
    context: BrowserContext,
    url: string,
    comment: string,
    username: string,
    password: string,
    ctx: Context
): Promise<void> {
    // truncate comment to PT's character limit
    const safeComment = comment.length > PT_COMMENT_MAX_LENGTH
        ? comment.slice(0, PT_COMMENT_MAX_LENGTH)
        : comment;

    if (safeComment.length < comment.length) {
        ctx.log.info(`Comment truncated from ${comment.length} to ${safeComment.length} chars`);
    }

    // ensure logged in before posting
    await ensureLogin(page, context, username, password, ctx);

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000 + Math.random() * 2000);

    // scroll to read content first
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 3));
    await page.waitForTimeout(1500 + Math.random() * 1500);

    // wait for comment editor
    const editor = page.locator('div.editor-input[contenteditable="true"]');
    await editor.waitFor({ timeout: 15000 });
    await editor.click();
    await page.waitForTimeout(500 + Math.random() * 500);

    // type comment like a human
    await page.keyboard.type(safeComment, { delay: 50 + Math.random() * 100 });

    // review before submitting
    await page.waitForTimeout(2000 + Math.random() * 2000);

    // submit
    await page.click('#btn_comment');

    // verify comment was posted — wait for the editor to clear (indicates successful post)
    try {
        await page.waitForFunction(
            () => {
                const editor = document.querySelector('div.editor-input[contenteditable="true"]');
                return editor && editor.textContent?.trim() === '';
            },
            { timeout: 10000 }
        );
        ctx.log.info('Comment posted successfully');
    } catch {
        // editor didn't clear — check for error message
        const errorMsg = await page.locator('.alert-danger, [class*="error"]').first().textContent().catch(() => null);
        if (errorMsg?.trim()) {
            throw new Error(`Comment post failed: ${errorMsg.trim()}`);
        }
        // no error message visible — assume success (some PT versions don't clear editor)
        ctx.log.info('Comment submitted (could not verify editor cleared)');
    }
}
