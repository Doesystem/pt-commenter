import { describe, it, expect, vi } from "vitest"
import { createMockContext } from "@lifetimesoft/agent-sdk/testing"
import agent from "./index"

describe("pt-commenter", () => {
  it("has __isAgent flag", () => {
    expect(agent.__isAgent).toBe(true)
  })

  it("calls ctx.log.info with PT commenter message", async () => {
    const mockInfo = vi.fn()
    const mockError = vi.fn()

    const ctx = createMockContext({
      log: { info: mockInfo, error: mockError },
    })

    await agent.run(ctx)

    expect(mockInfo).toHaveBeenCalledWith("PT Commenter Agent starting...")
    expect(mockInfo).toHaveBeenCalledWith("PT Commenter Agent run successfully")
  })

  it("returns undefined (no output)", async () => {
    const ctx = createMockContext()
    const result = await agent.run(ctx)
    expect(result).toBeUndefined()
  })
})