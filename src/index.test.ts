import { describe, it, expect, vi } from "vitest"
import { createMockContext } from "@lifetimesoft/agent-sdk/testing"
import agent from "./index"

// base env with credentials — used for tests that run the full agent
const baseEnv = {
    pt_username: 'test_user',
    pt_password: 'test_pass',
    feed_job_enable: false,   // skip actual crawling in tests
    comment_enable: false,    // skip actual commenting in tests
}

describe("pt-commenter", () => {
    it("has __isAgent flag", () => {
        expect(agent.__isAgent).toBe(true)
    })

    it("calls ctx.log.info with PT commenter message", async () => {
        const mockInfo = vi.fn()
        const mockError = vi.fn()

        const ctx = createMockContext({
            env: baseEnv,
            log: { info: mockInfo, error: mockError },
        })

        await agent.run(ctx)

        expect(mockInfo).toHaveBeenCalledWith("PT Commenter Agent starting...")
        expect(mockInfo).toHaveBeenCalledWith("PT Commenter Agent run successfully")
    })

    it("returns undefined (no output)", async () => {
        const ctx = createMockContext({ env: baseEnv })
        const result = await agent.run(ctx)
        expect(result).toBeUndefined()
    })

    it("throws when comment_enable=true but credentials missing", async () => {
        const ctx = createMockContext({
            env: { comment_enable: true }, // no credentials
        })
        await expect(agent.run(ctx)).rejects.toThrow('Missing required env: pt_username')
    })

    it("throws when min_wait_minutes > max_wait_minutes", async () => {
        const ctx = createMockContext({
            env: {
                ...baseEnv,
                comment_enable: true,
                min_wait_minutes: 10,
                max_wait_minutes: 2,
            },
        })
        await expect(agent.run(ctx)).rejects.toThrow('min_wait_minutes')
    })

    it("runs in stats mode without credentials", async () => {
        const mockInfo = vi.fn()
        const ctx = createMockContext({
            env: { mode: 'stats' },
            log: { info: mockInfo },
        })
        await agent.run(ctx)
        expect(mockInfo).toHaveBeenCalledWith("Showing storage statistics")
    })

    it("runs in maintenance mode without credentials", async () => {
        const mockInfo = vi.fn()
        const ctx = createMockContext({
            env: { mode: 'maintenance' },
            log: { info: mockInfo },
        })
        await agent.run(ctx)
        expect(mockInfo).toHaveBeenCalledWith("Running in maintenance mode")
    })
})
