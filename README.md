# pt-commenter

A PT commenter agent built with [`@lifetimesoft/agent-sdk`](https://www.npmjs.com/package/@lifetimesoft/agent-sdk).

---

## 📦 Features

* PT commenting agent using `defineAgent()` from `@lifetimesoft/agent-sdk`
* TypeScript with strict mode
* Scheduler support — configure via platform dashboard (none / interval / cron)

---

## 🚀 Getting Started

```bash
lifectl ai agent pull pt-commenter
lifectl ai agent run pt-commenter
lifectl ai agent logs pt-commenter
lifectl ai agent stop pt-commenter
```

---

## 🧠 How It Works

```ts
import { defineAgent } from "@lifetimesoft/agent-sdk"

export default defineAgent({
  async run(ctx) {
    ctx.log.info("PT commenter agent is running")
    // TODO: Implement PT commenting logic here
  },
})
```

The `lifectl` runtime handles everything automatically:
- Detects your package manager and runs `install`
- Starts the agent via `agent-runtime` (from `@lifetimesoft/agent-sdk`)
- Maintains a **WebSocket connection** to SaaS for heartbeat (hibernates between messages — near-zero cost)
- Detects offline immediately when connection drops
- Manages lifecycle and graceful shutdown — agent code never needs to know
- Runs `run()` on schedule or on manual trigger — based on scheduler config from the platform

---

## 🕐 Scheduler

Scheduler config is set from the platform dashboard — no code changes needed.

| type | behavior |
|---|---|
| `none` | manual trigger only — click Trigger in the dashboard |
| `interval` | runs every N milliseconds |
| `cron` | runs on a cron schedule (e.g. `0 9 * * 1-5`) |

---

## 📁 Project Structure

```
src/
  index.ts        ← agent logic (main implementation)
  index.test.ts   ← unit tests
dist/
  index.js        ← compiled output (built by tsc)
package.json      ← dependencies including @lifetimesoft/agent-sdk
agent.json        ← agent metadata
```

---

## 📋 agent.json

```json
{
  "name": "pt-commenter",
  "version": "0.0.1",
  "runtime": "node20",
  "main": "dist/index.js",
  "public": true,
  "keywords": ["pt", "commenter", "agent"]
}
```

---

## 🧩 Related Tools

* [`lifectl`](https://www.npmjs.com/package/@lifetimesoft/lifectl) – CLI for running and managing agents
* [`@lifetimesoft/agent-sdk`](https://www.npmjs.com/package/@lifetimesoft/agent-sdk) – SDK for building portable AI agents

---

## 📄 License

MIT