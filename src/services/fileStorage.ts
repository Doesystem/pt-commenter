import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";

// Use process.cwd() for data directory to work with compiled code
const DATA_DIR = join(process.cwd(), "data");

/**
 * Ensure data directory and subdirectories exist
 */
function ensureDataDir(subDir?: string): string {
    const dir = subDir ? join(DATA_DIR, subDir) : DATA_DIR;
    if (!existsSync(dir)) {
        try {
            mkdirSync(dir, { recursive: true });
        } catch (err) {
            const error = err as NodeJS.ErrnoException;
            // Ignore EEXIST errors (race condition when multiple processes create dir)
            if (error.code !== 'EEXIST') {
                throw err;
            }
        }
    }
    return dir;
}

/**
 * Read JSON file safely with error handling
 */
function readJSON<T>(filePath: string, defaultValue: T): T {
    if (!existsSync(filePath)) return defaultValue;
    try {
        const content = readFileSync(filePath, "utf-8");
        if (!content.trim()) return defaultValue;
        return JSON.parse(content);
    } catch (err) {
        console.error(`Failed to read JSON file ${filePath}:`, err);
        return defaultValue;
    }
}

/**
 * Write JSON file safely with error handling and atomic write
 */
function writeJSON<T>(filePath: string, data: T): void {
    try {
        const content = JSON.stringify(data, null, 2);
        // Write to temp file first, then rename (atomic operation)
        const tempPath = `${filePath}.tmp`;
        writeFileSync(tempPath, content, "utf-8");
        
        // Rename is atomic on most file systems
        if (existsSync(filePath)) {
            // On Windows, need to remove target file first
            try {
                writeFileSync(filePath, content, "utf-8");
            } catch {
                // Fallback: just write directly
                writeFileSync(filePath, content, "utf-8");
            }
        } else {
            writeFileSync(filePath, content, "utf-8");
        }
        
        // Clean up temp file if it exists
        if (existsSync(tempPath)) {
            try {
                const fs = require('fs');
                fs.unlinkSync(tempPath);
            } catch {
                // Ignore cleanup errors
            }
        }
    } catch (err) {
        console.error(`Failed to write JSON file ${filePath}:`, err);
        throw err;
    }
}

// ==================== Seen Topics (Deduplication) ====================

interface SeenRecord {
    id: string;
    seenAt: number;
    expiresAt: number;
}

interface SeenData {
    records: SeenRecord[];
}

const DEDUPE_TTL = 86400 * 7 * 1000; // 7 days in milliseconds

/**
 * Clean up expired records
 */
function cleanExpiredRecords(records: SeenRecord[]): SeenRecord[] {
    const now = Date.now();
    return records.filter(r => r.expiresAt > now);
}

/**
 * Check if an item has been seen before
 */
export function isDuplicate(namespace: string, id: string): boolean {
    const dir = ensureDataDir("seen");
    const filePath = join(dir, `${namespace}.json`);
    const data = readJSON<SeenData>(filePath, { records: [] });
    
    // Clean expired records
    data.records = cleanExpiredRecords(data.records);
    
    // Check if exists
    return data.records.some(r => r.id === id);
}

/**
 * Mark an item as seen
 */
export function markAsSeen(namespace: string, id: string): void {
    const dir = ensureDataDir("seen");
    const filePath = join(dir, `${namespace}.json`);
    const data = readJSON<SeenData>(filePath, { records: [] });
    
    // Clean expired records
    data.records = cleanExpiredRecords(data.records);
    
    // Add new record if not exists
    if (!data.records.some(r => r.id === id)) {
        const now = Date.now();
        data.records.push({
            id,
            seenAt: now,
            expiresAt: now + DEDUPE_TTL
        });
    }
    
    writeJSON(filePath, data);
}

// ==================== Task Queue ====================

interface Task {
    type: string;
    [key: string]: any;
}

interface QueueData {
    tasks: Task[];
}

/**
 * Add a task to the queue
 */
export function pushTask(queue: string, task: Task): void {
    const dir = ensureDataDir("queue");
    const filePath = join(dir, `${queue}.json`);
    const data = readJSON<QueueData>(filePath, { tasks: [] });
    
    data.tasks.push(task);
    writeJSON(filePath, data);
}

/**
 * Get and remove the first task from the queue (FIFO)
 */
export function popTask(queue: string): Task | null {
    const dir = ensureDataDir("queue");
    const filePath = join(dir, `${queue}.json`);
    const data = readJSON<QueueData>(filePath, { tasks: [] });
    
    if (data.tasks.length === 0) return null;
    
    const task = data.tasks.shift()!;
    writeJSON(filePath, data);
    
    return task;
}

/**
 * Get queue length without removing tasks
 */
export function getQueueLength(queue: string): number {
    const dir = ensureDataDir("queue");
    const filePath = join(dir, `${queue}.json`);
    const data = readJSON<QueueData>(filePath, { tasks: [] });
    
    return data.tasks.length;
}

/**
 * Peek at the first task without removing it
 */
export function peekTask(queue: string): Task | null {
    const dir = ensureDataDir("queue");
    const filePath = join(dir, `${queue}.json`);
    const data = readJSON<QueueData>(filePath, { tasks: [] });
    
    return data.tasks.length > 0 ? data.tasks[0] : null;
}

/**
 * Clear all tasks from a queue
 */
export function clearQueue(queue: string): void {
    const dir = ensureDataDir("queue");
    const filePath = join(dir, `${queue}.json`);
    writeJSON(filePath, { tasks: [] });
}

/**
 * Get all queues
 */
export function listQueues(): string[] {
    const dir = ensureDataDir("queue");
    if (!existsSync(dir)) return [];
    
    try {
        const fs = require('fs');
        const files = fs.readdirSync(dir);
        return files
            .filter((f: string) => f.endsWith('.json'))
            .map((f: string) => f.replace('.json', ''));
    } catch {
        return [];
    }
}

/**
 * Get statistics for all queues
 */
export function getQueueStats(): Record<string, number> {
    const queues = listQueues();
    const stats: Record<string, number> = {};
    
    for (const queue of queues) {
        stats[queue] = getQueueLength(queue);
    }
    
    return stats;
}

/**
 * Clean up all expired seen records across all namespaces
 */
export function cleanupExpiredRecords(): number {
    const dir = ensureDataDir("seen");
    if (!existsSync(dir)) return 0;
    
    let totalCleaned = 0;
    
    try {
        const fs = require('fs');
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
            if (!file.endsWith('.json')) continue;
            
            const filePath = join(dir, file);
            const data = readJSON<SeenData>(filePath, { records: [] });
            const beforeCount = data.records.length;
            
            data.records = cleanExpiredRecords(data.records);
            const afterCount = data.records.length;
            
            if (beforeCount !== afterCount) {
                writeJSON(filePath, data);
                totalCleaned += (beforeCount - afterCount);
            }
        }
    } catch (err) {
        console.error('Failed to cleanup expired records:', err);
    }
    
    return totalCleaned;
}

/**
 * Get storage statistics
 */
export function getStorageStats(): {
    queues: Record<string, number>;
    seenRecords: Record<string, number>;
    totalTasks: number;
    totalSeenRecords: number;
} {
    const queueStats = getQueueStats();
    const seenStats: Record<string, number> = {};
    
    const seenDir = ensureDataDir("seen");
    if (existsSync(seenDir)) {
        try {
            const fs = require('fs');
            const files = fs.readdirSync(seenDir);
            
            for (const file of files) {
                if (!file.endsWith('.json')) continue;
                
                const namespace = file.replace('.json', '');
                const filePath = join(seenDir, file);
                const data = readJSON<SeenData>(filePath, { records: [] });
                seenStats[namespace] = data.records.length;
            }
        } catch {
            // Ignore errors
        }
    }
    
    const totalTasks = Object.values(queueStats).reduce((sum, count) => sum + count, 0);
    const totalSeenRecords = Object.values(seenStats).reduce((sum, count) => sum + count, 0);
    
    return {
        queues: queueStats,
        seenRecords: seenStats,
        totalTasks,
        totalSeenRecords
    };
}
