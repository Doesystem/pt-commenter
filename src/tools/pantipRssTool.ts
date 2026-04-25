import Parser from "rss-parser";
import { chromium, Browser } from "playwright";
import type { Context } from "@lifetimesoft/agent-sdk";

const parser = new Parser({ timeout: 10000 });

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15'
];

interface TopicItem {
    topicId: string;
    url: string;
}

function randomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export async function fetchRoomFeed(room: string, browser: Browser, ctx: Context): Promise<TopicItem[]> {
    const url = `https://pantip.com/forum/${room}/feed`;
    
    try {
        ctx.log.info(`Fetching RSS feed - room: ${room}, url: ${url}`);
        
        const page = await browser.newPage();
        
        await page.setExtraHTTPHeaders({
            'User-Agent': randomUserAgent(),
            'Accept-Language': 'th-TH,th;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        });
        
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(5000);
        
        const text = await page.evaluate(() => document.body.textContent || document.body.innerText);
        await page.close();
        
        const feed = await parser.parseString(text);
        
        return feed.items.map(item => {
            const match = item.link?.match(/topic\/(\d+)/);
            return match ? { topicId: match[1], url: item.link } : null;
        }).filter((item): item is TopicItem => item !== null);
        
    } catch (err) {
        ctx.log.error(`Failed to fetch RSS feed - room: ${room}, error: ${(err as Error).message}`);
        throw err;
    }
}

export async function createBrowser(): Promise<Browser> {
    return await chromium.launch({ headless: true });
}