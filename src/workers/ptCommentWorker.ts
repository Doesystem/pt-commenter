import * as fileStorage from "../services/fileStorage.js";
import { openBrowser, readPtTopic, postPtComment } from "../tools/ptBrowserTool.js";
import { generateComment } from "../agents/ptCommentAgent.js";
import { getEnvString, getEnvNumber } from "@lifetimesoft/agent-sdk";
import type { Context } from "@lifetimesoft/agent-sdk";

interface PtTopicTask {
    type: "pt-topic";
    url: string;
}
// ─── Retry helper ─────────────────────────────────────────────────────────────

async function retry<T>(
    fn: () => Promise<T>,
    options: {
        maxAttempts?: number;
        delay?: number;
        backoff?: number;
        onRetry?: (err: Error, attempt: number, wait: number) => void;
    } = {}
): Promise<T> {
    const { maxAttempts = 3, delay = 1000, backoff = 2, onRetry } = options;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (err) {
            if (attempt === maxAttempts) throw err;
            const wait = delay * Math.pow(backoff, attempt - 1);
            onRetry?.(err as Error, attempt, wait);
            await new Promise(resolve => setTimeout(resolve, wait));
        }
    }
    throw new Error("retry exhausted"); // unreachable
}

// ─── Process single pt-topic task ────────────────────────────────────────────

async function processPtTopicTask(task: PtTopicTask, ctx: Context): Promise<void> {
    const username = getEnvString(ctx.env, 'pt_username') ?? '';
    const password = getEnvString(ctx.env, 'pt_password') ?? '';

    const { browser, context: browserContext, page } = await openBrowser();

    try {
        // Step 1: Read topic
        ctx.log.info(`[read] Reading topic: ${task.url}`);
        const topicData = await retry(
            () => readPtTopic(page, task.url, ctx),
            {
                maxAttempts: 3,
                delay: 2000,
                onRetry: (err, attempt, wait) => {
                    ctx.log.info(`[read] Retry ${attempt}/3 after ${wait}ms — ${err.message}`);
                },
            }
        );

        // human-like thinking delay (10–30 seconds)
        const thinkingTime = 10000 + Math.random() * 20000;
        ctx.log.info(`[think] Thinking for ${Math.round(thinkingTime / 1000)}s before generating comment...`);
        await new Promise(resolve => setTimeout(resolve, thinkingTime));

        // Step 2: Generate comment
        ctx.log.info(`[generate] Generating comment...`);
        const comment = await retry(
            () => generateComment(topicData, ctx),
            {
                maxAttempts: 2,
                delay: 1000,
                onRetry: (err, attempt) => {
                    ctx.log.info(`[generate] Retry ${attempt}/2 — ${err.message}`);
                },
            }
        );

        // Step 3: Post comment
        ctx.log.info(`[post] Posting comment to: ${task.url}`);
        await retry(
            () => postPtComment(page, browserContext, task.url, comment, username, password, ctx),
            {
                maxAttempts: 2,
                delay: 3000,
                onRetry: (err, attempt, wait) => {
                    ctx.log.info(`[post] Retry ${attempt}/2 after ${wait}ms — ${err.message}`);
                },
            }
        );

        ctx.log.info(`[done] Task completed: ${task.url}`);
    } finally {
        await browser.close();
    }
}

// ─── Task router ──────────────────────────────────────────────────────────────

async function processTask(task: { type: string; [key: string]: any }, ctx: Context): Promise<void> {
    if (task.type === "pt-topic") {
        await processPtTopicTask(task as PtTopicTask, ctx);
    } else {
        ctx.log.info(`Unknown task type: ${task.type} — skipping`);
    }
}

// ─── Worker ───────────────────────────────────────────────────────────────────

export async function runWorker(ctx: Context): Promise<void> {
    ctx.log.info("ptCommentWorker running...");

    const minWaitMs = Math.max(1, (getEnvNumber(ctx.env, 'min_wait_minutes', 2) ?? 2)) * 60 * 1000;
    const maxWaitMs = Math.max(minWaitMs, (getEnvNumber(ctx.env, 'max_wait_minutes', 6) ?? 6) * 60 * 1000);

    // max tasks per run — scheduler controls overall pace, this prevents a single
    // run from blocking indefinitely when the queue is large.
    // Remaining tasks will be picked up on the next scheduler trigger.
    const maxTasksPerRun = getEnvNumber(ctx.env, 'max_tasks_per_run', 1) ?? 1;

    const totalInQueue = fileStorage.getQueueLength("ptAgent:tasks");
    if (totalInQueue === 0) {
        ctx.log.info("No tasks in queue. Skipping.");
        return;
    }

    ctx.log.info(`Queue has ${totalInQueue} task(s). Processing up to ${maxTasksPerRun} this run.`);

    let processedCount = 0;

    while (processedCount < maxTasksPerRun) {
        const task = fileStorage.popTask("ptAgent:tasks");
        if (!task) {
            ctx.log.info(`No more tasks in queue. Processed ${processedCount} tasks.`);
            break;
        }

        ctx.log.info(`Processing task ${processedCount + 1}/${maxTasksPerRun}: ${task.type} — ${task.url ?? ''}`);

        try {
            await Promise.race([
                processTask(task, ctx),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error(`Task timeout after 120s — ${task.url ?? task.type}`)), 120000)
                ),
            ]);

            processedCount++;
            ctx.log.info(`Task ${processedCount} completed: ${task.type}`);

        } catch (taskErr) {
            ctx.log.error(`Task failed: ${(taskErr as Error).message}`);
            // count as processed so we don't retry in this run
            processedCount++;
        }

        // wait between tasks only if there are more to process this run
        if (processedCount < maxTasksPerRun && fileStorage.getQueueLength("ptAgent:tasks") > 0) {
            const waitTime = Math.floor(Math.random() * (maxWaitMs - minWaitMs + 1)) + minWaitMs;
            ctx.log.info(`Waiting ${Math.round(waitTime / 60000)} min before next task...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }

    const remaining = fileStorage.getQueueLength("ptAgent:tasks");
    ctx.log.info(`Worker completed. Processed: ${processedCount}, Remaining in queue: ${remaining}`);
    if (remaining > 0) {
        ctx.log.info(`${remaining} task(s) left — will be processed on next scheduler run.`);
    }
}
