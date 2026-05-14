# pt-commenter

A PT commenter agent built with [`@lifetimesoft/agent-sdk`](https://www.npmjs.com/package/@lifetimesoft/agent-sdk) that automatically monitors PT forums and posts intelligent comments.

> **Node.js only** — this agent requires `system.fs` and `system.browser-automation` capabilities. It runs on the Node.js host (`lifectl`) and is not compatible with the Chrome Extension host.

---

## 📦 Features

* **RSS Feed Monitoring** — automatically crawls PT forum RSS feeds for new topics
* **Intelligent Commenting** — processes topics and generates contextual comments
* **File-based Storage** — uses JSON files for task queuing and deduplication (no external dependencies)
* **Configurable Scheduling** — supports cron-based scheduling via platform dashboard
* **TypeScript** — full TypeScript support with strict mode
* **Robust Error Handling** — comprehensive logging and error recovery

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- PT account credentials
- [`lifectl`](https://www.npmjs.com/package/@lifetimesoft/lifectl) CLI

### Run via lifectl

```bash
lifectl ai agent pull pt-commenter
lifectl ai agent run pt-commenter
lifectl ai agent logs pt-commenter
lifectl ai agent stop pt-commenter
```

---

## ⚙️ Configuration

Environment variables are configured via the platform dashboard or `agent.json`:

| Variable | Type | Default | Description |
|---|---|---|---|
| `mode` | string | `normal` | Operation mode: `normal`, `maintenance`, or `stats` |
| `feed_job_enable` | boolean | `true` | Enable/disable RSS feed crawler |
| `comment_enable` | boolean | `true` | Enable/disable comment worker |
| `pt_username` | string | — | PT account username |
| `pt_password` | password | — | PT account password |
| `max_tasks_per_run` | number | `1` | Max tasks to process per scheduler run |
| `min_wait_minutes` | number | `2` | Minimum wait time between operations |
| `max_wait_minutes` | number | `6` | Maximum wait time between operations |
| `headless` | boolean | `true` | Run browser in headless mode |

---

## 🧠 How It Works

The agent consists of two main components:

### 1. Feed Job (RSS Crawler)

Crawls PT RSS feeds on a cron schedule and enqueues new topics for processing.

### 2. Comment Worker

Dequeues topics, generates intelligent comments using AI, and posts them to PT.

### Flow

```text
Feed Job (cron)
    → crawl PT RSS feeds
    → enqueue new topics to file-based queue

Comment Worker (cron)
    → dequeue topic
    → generate comment via ctx.ai
    → post comment via Playwright
    → mark topic as seen (7-day TTL)
```

---

## 🔧 Capabilities

This agent declares the following capabilities in `agent.json`:

```json
{
  "capabilities": {
    "ai": {
      "required": true,
      "features": ["chat"]
    },
    "system": {
      "required": true,
      "features": ["fs", "browser-automation"]
    }
  }
}
```

Because `system.fs` and `system.browser-automation` are required, this agent is **only compatible with the Node.js host** (`lifectl`). Attempting to install it on the Chrome Extension host will return an error.

---

## 🕐 Scheduler

| type | behavior |
|---|---|
| `none` | manual trigger only |
| `interval` | runs every N milliseconds |
| `cron` | runs on cron schedule (e.g. `0 9 * * 1-5`) |

---

## 📁 Project Structure

```
src/
  index.ts              ← main agent entry point
  jobs/
    ptFeedJob.ts        ← RSS feed crawler
  workers/
    ptCommentWorker.ts  ← task processor
  services/
    fileStorage.ts      ← file-based storage (queue & deduplication)
    taskService.ts      ← task queue management
  tools/
    ptRssTool.ts        ← RSS parsing utilities
    maintenance.ts      ← maintenance tools
dist/                   ← compiled output
data/
  seen/                 ← deduplication records
  queue/                ← task queues
```

---

## 🎯 Monitored PT Rooms

tech, sinthorn, wahkor, siam, blueplanet, siliconvalley, supachalasai, bangrak, library, food, home, ratchada, mbk

---

## 🔧 Maintenance

### Operation Modes

| Mode | Behavior |
|---|---|
| `normal` | Run feed job and comment worker |
| `maintenance` | Clean up expired records and show stats |
| `stats` | Display storage statistics only |

---

## 🧩 Related Projects

* [`lifectl`](https://www.npmjs.com/package/@lifetimesoft/lifectl) — CLI for running and managing agents
* [`@lifetimesoft/agent-sdk`](https://www.npmjs.com/package/@lifetimesoft/agent-sdk) — SDK for building portable AI agents

---

## 📄 License

MIT
