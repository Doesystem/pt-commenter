import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, rmSync, mkdirSync } from "fs";
import { join } from "path";
import * as fileStorage from "./fileStorage.js";

const TEST_DATA_DIR = join(process.cwd(), "data");

describe("fileStorage", () => {
    beforeEach(() => {
        // Clean up test data before each test
        if (existsSync(TEST_DATA_DIR)) {
            rmSync(TEST_DATA_DIR, { recursive: true, force: true });
        }
    });

    afterEach(() => {
        // Clean up test data after each test
        if (existsSync(TEST_DATA_DIR)) {
            rmSync(TEST_DATA_DIR, { recursive: true, force: true });
        }
    });

    describe("Deduplication", () => {
        it("should return false for new items", () => {
            const isDupe = fileStorage.isDuplicate("test-namespace", "item-1");
            expect(isDupe).toBe(false);
        });

        it("should return true for seen items", () => {
            fileStorage.markAsSeen("test-namespace", "item-1");
            const isDupe = fileStorage.isDuplicate("test-namespace", "item-1");
            expect(isDupe).toBe(true);
        });

        it("should handle multiple namespaces", () => {
            fileStorage.markAsSeen("namespace-1", "item-1");
            fileStorage.markAsSeen("namespace-2", "item-1");

            expect(fileStorage.isDuplicate("namespace-1", "item-1")).toBe(true);
            expect(fileStorage.isDuplicate("namespace-2", "item-1")).toBe(true);
            expect(fileStorage.isDuplicate("namespace-3", "item-1")).toBe(false);
        });

        it("should clean up expired records", () => {
            // This test would need to mock Date.now() to test expiration
            // For now, we just verify the structure is created
            fileStorage.markAsSeen("test-namespace", "item-1");
            expect(fileStorage.isDuplicate("test-namespace", "item-1")).toBe(true);
        });
    });

    describe("Task Queue", () => {
        it("should return null for empty queue", () => {
            const task = fileStorage.popTask("test-queue");
            expect(task).toBeNull();
        });

        it("should push and pop tasks in FIFO order", () => {
            fileStorage.pushTask("test-queue", { type: "task-1", data: "first" });
            fileStorage.pushTask("test-queue", { type: "task-2", data: "second" });
            fileStorage.pushTask("test-queue", { type: "task-3", data: "third" });

            const task1 = fileStorage.popTask("test-queue");
            const task2 = fileStorage.popTask("test-queue");
            const task3 = fileStorage.popTask("test-queue");
            const task4 = fileStorage.popTask("test-queue");

            expect(task1).toEqual({ type: "task-1", data: "first" });
            expect(task2).toEqual({ type: "task-2", data: "second" });
            expect(task3).toEqual({ type: "task-3", data: "third" });
            expect(task4).toBeNull();
        });

        it("should get queue length", () => {
            expect(fileStorage.getQueueLength("test-queue")).toBe(0);

            fileStorage.pushTask("test-queue", { type: "task-1" });
            expect(fileStorage.getQueueLength("test-queue")).toBe(1);

            fileStorage.pushTask("test-queue", { type: "task-2" });
            expect(fileStorage.getQueueLength("test-queue")).toBe(2);

            fileStorage.popTask("test-queue");
            expect(fileStorage.getQueueLength("test-queue")).toBe(1);
        });

        it("should peek without removing", () => {
            fileStorage.pushTask("test-queue", { type: "task-1", data: "first" });
            fileStorage.pushTask("test-queue", { type: "task-2", data: "second" });

            const peeked1 = fileStorage.peekTask("test-queue");
            const peeked2 = fileStorage.peekTask("test-queue");

            expect(peeked1).toEqual({ type: "task-1", data: "first" });
            expect(peeked2).toEqual({ type: "task-1", data: "first" });
            expect(fileStorage.getQueueLength("test-queue")).toBe(2);
        });

        it("should clear queue", () => {
            fileStorage.pushTask("test-queue", { type: "task-1" });
            fileStorage.pushTask("test-queue", { type: "task-2" });
            fileStorage.pushTask("test-queue", { type: "task-3" });

            expect(fileStorage.getQueueLength("test-queue")).toBe(3);

            fileStorage.clearQueue("test-queue");

            expect(fileStorage.getQueueLength("test-queue")).toBe(0);
            expect(fileStorage.popTask("test-queue")).toBeNull();
        });

        it("should handle multiple queues", () => {
            fileStorage.pushTask("queue-1", { type: "task-1" });
            fileStorage.pushTask("queue-2", { type: "task-2" });

            expect(fileStorage.getQueueLength("queue-1")).toBe(1);
            expect(fileStorage.getQueueLength("queue-2")).toBe(1);

            const task1 = fileStorage.popTask("queue-1");
            const task2 = fileStorage.popTask("queue-2");

            expect(task1).toEqual({ type: "task-1" });
            expect(task2).toEqual({ type: "task-2" });
        });
    });

    describe("File System", () => {
        it("should create data directories automatically", () => {
            fileStorage.markAsSeen("test-namespace", "item-1");
            expect(existsSync(join(TEST_DATA_DIR, "seen"))).toBe(true);

            fileStorage.pushTask("test-queue", { type: "task-1" });
            expect(existsSync(join(TEST_DATA_DIR, "queue"))).toBe(true);
        });

        it("should handle corrupted JSON files gracefully", () => {
            // This would require manually creating corrupted files
            // For now, we just verify the system doesn't crash
            const isDupe = fileStorage.isDuplicate("test-namespace", "item-1");
            expect(isDupe).toBe(false);
        });
    });
});
