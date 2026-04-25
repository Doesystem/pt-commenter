import * as fileStorage from "../services/fileStorage.js";
import type { Context } from "@lifetimesoft/agent-sdk";

/**
 * Run maintenance tasks
 */
export async function runMaintenance(ctx: Context): Promise<void> {
    ctx.log.info("Starting maintenance tasks...");
    
    try {
        // Clean up expired records
        const cleaned = fileStorage.cleanupExpiredRecords();
        ctx.log.info(`Cleaned up ${cleaned} expired records`);
        
        // Get storage statistics
        const stats = fileStorage.getStorageStats();
        ctx.log.info(`Storage stats: ${JSON.stringify(stats, null, 2)}`);
        
        ctx.log.info("Maintenance completed successfully");
    } catch (err) {
        ctx.log.error(`Maintenance failed: ${(err as Error).message}`);
        throw err;
    }
}

/**
 * Clear all queues (use with caution!)
 */
export async function clearAllQueues(ctx: Context): Promise<void> {
    ctx.log.info("Clearing all queues...");
    
    try {
        const queues = fileStorage.listQueues();
        
        for (const queue of queues) {
            fileStorage.clearQueue(queue);
            ctx.log.info(`Cleared queue: ${queue}`);
        }
        
        ctx.log.info(`Cleared ${queues.length} queues`);
    } catch (err) {
        ctx.log.error(`Failed to clear queues: ${(err as Error).message}`);
        throw err;
    }
}

/**
 * Display storage statistics
 */
export async function showStats(ctx: Context): Promise<void> {
    try {
        const stats = fileStorage.getStorageStats();
        
        ctx.log.info("=== Storage Statistics ===");
        ctx.log.info(`Total Tasks: ${stats.totalTasks}`);
        ctx.log.info(`Total Seen Records: ${stats.totalSeenRecords}`);
        
        ctx.log.info("\n=== Queues ===");
        for (const [queue, count] of Object.entries(stats.queues)) {
            ctx.log.info(`  ${queue}: ${count} tasks`);
        }
        
        ctx.log.info("\n=== Seen Records ===");
        for (const [namespace, count] of Object.entries(stats.seenRecords)) {
            ctx.log.info(`  ${namespace}: ${count} records`);
        }
    } catch (err) {
        ctx.log.error(`Failed to show stats: ${(err as Error).message}`);
        throw err;
    }
}
