import * as fileStorage from "./fileStorage.js";
import type { Context } from "@lifetimesoft/agent-sdk";

export async function isDuplicate(namespace: string, id: string): Promise<boolean> {
    return fileStorage.isDuplicate(namespace, id);
}

export async function markAsSeen(namespace: string, id: string): Promise<void> {
    fileStorage.markAsSeen(namespace, id);
}

export async function createTask(type: string, data: any, queue: string = "agent:tasks", ctx: Context): Promise<void> {
    const task = { type, ...data };
    fileStorage.pushTask(queue, task);
    ctx.log.info(`Task created - type: ${type}, queue: ${queue}`);
}

export async function getQueueLength(queue: string = "agent:tasks"): Promise<number> {
    return fileStorage.getQueueLength(queue);
}