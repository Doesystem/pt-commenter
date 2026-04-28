import { createBrowser, fetchRoomFeed } from "../tools/ptRssTool.js";
import { isDuplicate, markAsSeen, createTask, getQueueLength } from "../services/taskService.js";
import { Browser } from "playwright";
import type { Context } from "@lifetimesoft/agent-sdk";

const ROOMS = [
    "tech", "sinthorn", "wahkor", "siam", "blueplanet",
    "siliconvalley", "supachalasai", "bangrak", "library",
    "food", "home", "ratchada", "mbk"
];

async function processRoom(room: string, browser: Browser, ctx: Context): Promise<void> {
    try {
        const topics = await fetchRoomFeed(room, browser, ctx);
        let created = 0;

        for (const { topicId, url } of topics) {
            if (await isDuplicate("pt-topic", topicId)) continue;
            await markAsSeen("pt-topic", topicId);
            await createTask("pt-topic", { url }, "ptAgent-tasks", ctx);
            created++;
            ctx.log.info(`New topic added - room: ${room}, topicId: ${topicId}`);
        }

        ctx.log.info(`Room processed - room: ${room}, created: ${created}`);
    } catch (err) {
        ctx.log.error(`Room processing failed - room: ${room}, error: ${(err as Error).message}`);
    }
}

export async function crawl(ctx: Context): Promise<void> {
    ctx.log.info("PT RSS crawler started");
    const start = Date.now();
    const browser = await createBrowser(ctx);

    try {
        await Promise.all(ROOMS.map(room => processRoom(room, browser, ctx)));
        const duration = Date.now() - start;
        const queueLength = await getQueueLength("ptAgent-tasks");
        ctx.log.info(`Crawl completed - duration: ${duration}ms, queueLength: ${queueLength}`);
    } catch (err) {
        ctx.log.error(`Crawl failed: ${(err as Error).message}`);
    } finally {
        await browser.close();
    }
}