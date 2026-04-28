# pt-commenter

A PT commenter agent built with [`@lifetimesoft/agent-sdk`](https://www.npmjs.com/package/@lifetimesoft/agent-sdk) that automatically monitors PT forums and posts intelligent comments.

---

## 📦 Features

* **RSS Feed Monitoring**: Automatically crawls PT forum RSS feeds for new topics
* **Intelligent Commenting**: Processes topics and generates contextual comments
* **File-based Storage**: Uses JSON files for task queuing and deduplication (no external dependencies)
* **Configurable Scheduling**: Supports cron-based scheduling via platform dashboard
* **TypeScript**: Full TypeScript support with strict mode
* **Robust Error Handling**: Comprehensive logging and error recovery

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- PT account credentials

### Installation

```bash
# Clone and install dependencies
npm install

# Build the project
npm run build

# Run via lifectl (environment variables configured via platform)
lifectl ai agent pull pt-commenter
lifectl ai agent run pt-commenter
lifectl ai agent logs pt-commenter
lifectl ai agent stop pt-commenter
```

---

## ⚙️ Configuration

Environment variables are configured via `ctx.env` through the platform dashboard or `agent.json`:

**Agent Configuration:**
- `mode` - Operation mode: normal, maintenance, or stats (default: normal)
- `feed_job_enable` - Enable/disable RSS feed crawler (default: true)
- `comment_enable` - Enable/disable comment worker (default: true)

**PT Configuration:**
- `pt_username` - PT account username (optional)
- `pt_password` - PT account password (optional)

**Timing Configuration:**
- `min_wait_minutes` - Minimum wait time between operations (default: 2)
- `max_wait_minutes` - Maximum wait time between operations (default: 6)

All configuration is managed through the platform dashboard or `agent.json`.

---

## 🧠 How It Works

The agent consists of two main components:

### 1. Feed Job (RSS Crawler)
```ts
// Runs every hour via cron
startCronJob() // Crawls RSS feeds from multiple PT rooms
```

### 2. Comment Worker  
```ts
// Processes tasks from Redis queue
startWorker() // Generates and posts comments
```

### Architecture Flow:
1. **Feed Job** crawls PT RSS feeds hourly
2. New topics are added to file-based task queue
3. **Comment Worker** processes tasks from queue
4. Worker generates intelligent comments and posts them
5. Deduplication prevents processing same topics twice (7-day TTL)

---

## 🕐 Scheduler

Scheduler config is set from the platform dashboard:

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
    ptFeedJob.ts        ← RSS feed crawler (cron job)
  workers/
    ptCommentWorker.ts  ← task processor (queue worker)
  services/
    fileStorage.ts      ← file-based storage (queue & deduplication)
    taskService.ts      ← task queue management
  tools/
    ptRssTool.ts        ← RSS parsing utilities
    maintenance.ts      ← maintenance tools
dist/                   ← compiled output
logs/                   ← application logs
data/                   ← JSON data files (queue, seen topics)
  seen/                 ← deduplication records
  queue/                ← task queues
```

See [DATA_STRUCTURE.md](./DATA_STRUCTURE.md) for detailed information about data storage.

---

## 🎯 Monitored PT Rooms

- tech, sinthorn, wahkor, siam, blueplanet
- siliconvalley, supachalasai, bangrak, library  
- food, home, ratchada, mbk

---

## 🧩 Related Tools

* [`lifectl`](https://www.npmjs.com/package/@lifetimesoft/lifectl) – CLI for running and managing agents
* [`@lifetimesoft/agent-sdk`](https://www.npmjs.com/package/@lifetimesoft/agent-sdk) – SDK for building portable AI agents

---

## 🔧 Maintenance

The agent includes built-in maintenance tools:

### Operation Modes

1. **Normal Mode** (default) - Run feed job and comment worker
2. **Maintenance Mode** - Clean up expired records and show stats
3. **Stats Mode** - Display storage statistics only

```bash
# Run maintenance
lifectl ai agent run pt-commenter --env mode=maintenance

# View statistics
lifectl ai agent run pt-commenter --env mode=stats
```

See [MAINTENANCE.md](./MAINTENANCE.md) for detailed maintenance guide.

---

## 📄 License

MIT