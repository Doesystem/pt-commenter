# Changelog: Redis Removal

## Version 0.0.2 (Unreleased)

### 🔥 Breaking Changes

- **Removed Redis dependency** - The project no longer requires Redis server
- **Environment variables removed**: `REDIS_HOST`, `REDIS_PORT`, `REDIS_USERNAME`, `REDIS_PASSWORD`

### ✨ New Features

- **File-based storage system** - New `fileStorage.ts` service for data persistence
- **Automatic data cleanup** - Expired records are cleaned up automatically
- **Multiple queue support** - Can manage multiple task queues independently
- **Comprehensive tests** - Added 12 unit tests for file storage operations

### 📁 New Files

- `src/services/fileStorage.ts` - Core file storage implementation
- `src/services/fileStorage.test.ts` - Unit tests for file storage
- `data/` - Data directory for runtime files
- `DATA_STRUCTURE.md` - Detailed documentation of data structure
- `MIGRATION.md` - Migration guide from Redis to file storage

### 🗑️ Removed Files

- `src/services/redis.ts` - Redis connection service (no longer needed)

### 🔧 Modified Files

- `src/index.ts` - Removed Redis initialization
- `src/services/taskService.ts` - Updated to use file storage instead of Redis
- `src/workers/pantipCommentWorker.ts` - Updated to use file storage for queue operations
- `src/services/toggleState.ts` - Fixed import.meta issue by using process.cwd()
- `package.json` - Removed `ioredis` dependency
- `README.md` - Updated documentation to reflect file-based storage
- `.gitignore` - Added `data/` directory

### 📊 Data Storage

#### Before (Redis)
```
Redis Server
├── Keys: pantip:topic:{id} (deduplication)
├── List: pantipAgent:tasks (task queue)
└── In-memory storage
```

#### After (File-based)
```
data/
├── seen/
│   └── pantip-topic.json (deduplication with TTL)
├── queue/
│   └── pantipAgent-tasks.json (task queue)
└── toggle.json (worker states)
```

### 🎯 API Changes

#### Deduplication
```typescript
// Before
const redis = getRedis();
await redis.exists(`pantip:topic:${id}`);
await redis.set(`pantip:topic:${id}`, "1", "EX", 604800);

// After
fileStorage.isDuplicate("pantip-topic", id);
fileStorage.markAsSeen("pantip-topic", id);
```

#### Task Queue
```typescript
// Before
const redis = getRedis();
await redis.rpush("pantipAgent:tasks", JSON.stringify(task));
const result = await redis.blpop("pantipAgent:tasks", 1);
const task = JSON.parse(result[1]);

// After
fileStorage.pushTask("pantipAgent:tasks", task);
const task = fileStorage.popTask("pantipAgent:tasks");
```

### ✅ Testing

All tests passing:
- ✅ 12 file storage tests
- ✅ 3 agent integration tests
- ✅ Total: 15 tests passed

### 📈 Performance Considerations

**Pros:**
- No external service dependency
- Simpler deployment
- Easy debugging (human-readable JSON)
- Lower resource usage (no Redis process)

**Cons:**
- Slower than in-memory database
- Not suitable for high concurrency
- File I/O overhead on every operation

### 🚀 Deployment

**Before:**
1. Install Redis server
2. Configure Redis connection
3. Deploy agent

**After:**
1. Deploy agent (that's it!)

### 📝 Migration Steps

For existing deployments:

1. Stop the agent
2. Pull latest code
3. Remove Redis environment variables
4. Run `npm install`
5. Run `npm run build`
6. Start the agent

**Note:** Existing data in Redis will not be migrated. The agent will start fresh with empty queues and seen lists.

### 🔗 Documentation

- [DATA_STRUCTURE.md](./DATA_STRUCTURE.md) - Detailed data structure documentation
- [MIGRATION.md](./MIGRATION.md) - Complete migration guide
- [README.md](./README.md) - Updated usage documentation

### 👥 Contributors

- Migration from Redis to file-based storage
- Improved test coverage
- Enhanced documentation

---

**Full Diff:** See git history for complete changes
