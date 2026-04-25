import * as fileStorage from "../services/fileStorage.js";
import type { Context } from "@lifetimesoft/agent-sdk";

interface Task {
    type: string;
    [key: string]: any;
}

async function processTask(task: Task, ctx: Context): Promise<void> {
    // TODO: Implement task processing logic
    // This would typically call the PT crew or similar processing
    ctx.log.info(`Processing task: ${task.type}`);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    ctx.log.info(`Task completed: ${task.type}`);
}

/**
 * @deprecated Use runWorker() instead for single execution
 */
export async function startWorker(ctx: Context): Promise<void> {
    ctx.log.info("startWorker is deprecated, use runWorker instead");
    return runWorker(ctx);
}

export async function runWorker(ctx: Context): Promise<void> {
    ctx.log.info("ptCommentWorker running once");

    try {
        // Process all available tasks in the queue
        let processedCount = 0;
        
        while (true) {
            const task = fileStorage.popTask("ptAgent:tasks");
            if (!task) {
                ctx.log.info(`No more tasks in queue. Processed ${processedCount} tasks.`);
                break;
            }

            ctx.log.info(`Processing task ${processedCount + 1}: ${task.type}`);

            try {
                await Promise.race([
                    processTask(task, ctx),
                    new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error("Task timeout")), 120000)
                    ),
                ]);

                processedCount++;
                ctx.log.info(`Task ${processedCount} completed: ${task.type}`);

            } catch (taskErr) {
                ctx.log.error(`Task processing failed: ${(taskErr as Error).message}`);
                // Continue processing other tasks even if one fails
            }
        }

        ctx.log.info(`Worker completed. Total tasks processed: ${processedCount}`);

    } catch (err) {
        ctx.log.error(`Worker error: ${(err as Error).message}`);
        throw err;
    }
}