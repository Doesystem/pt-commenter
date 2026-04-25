# Migration from Redis to File Storage

## Overview

โปรเจค pt-commenter ได้เปลี่ยนจากการใช้ Redis เป็นระบบเก็บข้อมูลแบบไฟล์ JSON เพื่อลดความซับซ้อนและ dependencies

## Changes Made

### 1. Removed Redis Dependencies

**Before:**
```json
{
  "dependencies": {
    "ioredis": "^5.10.0"
  }
}
```

**After:**
```json
{
  "dependencies": {
    // ioredis removed
  }
}
```

### 2. New File Storage Service

สร้างไฟล์ใหม่: `src/services/fileStorage.ts`

**Features:**
- ✅ Deduplication with TTL (7 days)
- ✅ FIFO task queue
- ✅ JSON-based storage
- ✅ Automatic cleanup of expired records
- ✅ No external dependencies

### 3. Updated Services

#### `src/services/taskService.ts`

**Before:**
```typescript
import { getRedis } from "./redis.js";

export async function isDuplicate(namespace: string, id: string): Promise<boolean> {
    const redis = getRedis();
    const exists = await redis.exists(`${namespace}:${id}`);
    return exists === 1;
}
```

**After:**
```typescript
import * as fileStorage from "./fileStorage.js";

export async function isDuplicate(namespace: string, id: string): Promise<boolean> {
    return fileStorage.isDuplicate(namespace, id);
}
```

#### `src/workers/pantipCommentWorker.ts`

**Before:**
```typescript
import { getRedis } from "../services/redis.js";

const redis = getRedis();
const task = await redis.blpop("pantipAgent:tasks", 1);
```

**After:**
```typescript
import * as fileStorage from "../services/fileStorage.js";

const task = fileStorage.popTask("pantipAgent:tasks");
```

### 4. Removed Files

- ❌ `src/services/redis.ts` (deleted)

### 5. Environment Variables

**Removed:**
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_USERNAME=
REDIS_PASSWORD=
```

**No longer needed!** 🎉

## Migration Steps

### For Existing Deployments

1. **Stop the agent:**
   ```bash
   lifectl ai agent stop pt-commenter
   ```

2. **Pull latest code:**
   ```bash
   git pull origin main
   ```

3. **Remove Redis environment variables:**
   - Remove `REDIS_HOST`, `REDIS_PORT`, `REDIS_USERNAME`, `REDIS_PASSWORD` from agent config

4. **Install dependencies:**
   ```bash
   npm install
   ```

5. **Build:**
   ```bash
   npm run build
   ```

6. **Start the agent:**
   ```bash
   lifectl ai agent run pt-commenter
   ```

### Data Migration

**Note:** ไม่จำเป็นต้อง migrate ข้อมูลจาก Redis

- Seen topics จะถูกสร้างใหม่เมื่อ agent ทำงาน
- Task queue จะเริ่มต้นใหม่ (tasks เก่าใน Redis จะไม่ถูกประมวลผล)
- Toggle states จะใช้ค่า default (enabled)

ถ้าต้องการ migrate ข้อมูล:

```bash
# Export from Redis (example)
redis-cli --scan --pattern "pantip:topic:*" > seen_topics.txt

# Import to file storage (manual process)
# Read seen_topics.txt and call fileStorage.markAsSeen() for each
```

## Benefits

### ✅ Pros

1. **No External Dependencies** - ไม่ต้องติดตั้ง Redis server
2. **Simpler Deployment** - แค่ copy code และ run
3. **Easy Debugging** - เปิดดูไฟล์ JSON ได้โดยตรง
4. **Portable** - ย้ายไปไหนก็ได้
5. **Lower Resource Usage** - ไม่ต้องรัน Redis process
6. **Version Control Friendly** - สามารถ backup ด้วย git

### ⚠️ Cons

1. **Performance** - ช้ากว่า in-memory database
2. **Concurrency** - ไม่เหมาะกับ multi-process
3. **No Atomic Operations** - ไม่รับประกัน atomicity
4. **File I/O Overhead** - อ่าน/เขียนไฟล์ทุกครั้ง

## Rollback Plan

ถ้าต้องการกลับไปใช้ Redis:

```bash
# Checkout previous version
git checkout <commit-before-migration>

# Reinstall dependencies
npm install

# Rebuild
npm run build

# Configure Redis environment variables
# Start agent
```

## Testing

ทดสอบว่าระบบทำงานถูกต้อง:

```bash
# Build
npm run build

# Run tests (if available)
npm test

# Run agent locally
lifectl ai agent run pt-commenter --local
```

## Support

หากพบปัญหา:
1. ตรวจสอบ logs: `lifectl ai agent logs pt-commenter`
2. ตรวจสอบ data directory: `ls -la data/`
3. ตรวจสอบ permissions: `chmod -R 755 data/`

## References

- [DATA_STRUCTURE.md](./DATA_STRUCTURE.md) - โครงสร้างข้อมูลแบบละเอียด
- [README.md](./README.md) - คู่มือการใช้งาน
