# Maintenance Guide

คู่มือการดูแลรักษาและ troubleshooting สำหรับ pt-commenter agent

---

## 🔧 Maintenance Tasks

### 1. Clean Up Expired Records

ลบ records ที่หมดอายุ (เก่ากว่า 7 วัน):

```bash
# ผ่าน environment variable
lifectl ai agent run pt-commenter --env mode=maintenance

# หรือตั้งค่าใน .env
mode=maintenance
```

**Output:**
```
[agent:info] Running in maintenance mode
[agent:info] Cleaned up 15 expired records
[agent:info] Storage stats: {...}
[agent:info] Maintenance completed successfully
```

### 2. View Storage Statistics

ดูสถิติการใช้งาน storage:

```bash
lifectl ai agent run pt-commenter --env mode=stats
```

**Output:**
```
[agent:info] === Storage Statistics ===
[agent:info] Total Tasks: 5
[agent:info] Total Seen Records: 120

[agent:info] === Queues ===
[agent:info]   pantipAgent:tasks: 5 tasks

[agent:info] === Seen Records ===
[agent:info]   pantip-topic: 120 records
```

### 3. Clear All Data

⚠️ **ใช้ด้วยความระมัดระวัง!** จะลบข้อมูลทั้งหมด

```bash
# ลบ data directory
npm run clean:data

# หรือ
rm -rf data/
```

### 4. Clear Specific Queue

แก้ไขโค้ดใน maintenance.ts หรือใช้ผ่าน Node.js:

```javascript
import * as fileStorage from './dist/services/fileStorage.js';

// ลบ queue เฉพาะ
fileStorage.clearQueue('ptAgent:tasks');
```

---

## 📊 Monitoring

### Check Queue Length

```javascript
import * as fileStorage from './dist/services/fileStorage.js';

const length = fileStorage.getQueueLength('ptAgent:tasks');
console.log(`Queue length: ${length}`);
```

### Check Storage Stats

```javascript
import * as fileStorage from './dist/services/fileStorage.js';

const stats = fileStorage.getStorageStats();
console.log(JSON.stringify(stats, null, 2));
```

### List All Queues

```javascript
import * as fileStorage from './dist/services/fileStorage.js';

const queues = fileStorage.listQueues();
console.log('Queues:', queues);
```

---

## 🐛 Troubleshooting

### Problem: Queue is Growing Too Large

**Symptoms:**
- Queue length keeps increasing
- Tasks not being processed

**Solutions:**

1. **Check worker status:**
   ```bash
   # ตรวจสอบว่า comment_enable=true
   lifectl ai agent logs pt-commenter
   ```

2. **Check for errors:**
   ```bash
   # ดู logs สำหรับ errors
   lifectl ai agent logs pt-commenter | grep error
   ```

3. **Clear queue if needed:**
   ```bash
   npm run clean:data
   ```

### Problem: Too Many Seen Records

**Symptoms:**
- `pt-topic.json` file is very large
- Slow performance

**Solutions:**

1. **Run maintenance:**
   ```bash
   lifectl ai agent run pt-commenter --env mode=maintenance
   ```

2. **Check expiration:**
   - Records expire after 7 days automatically
   - Maintenance mode cleans them up

3. **Manual cleanup:**
   ```bash
   rm data/seen/pt-topic.json
   ```

### Problem: File Corruption

**Symptoms:**
- JSON parse errors in logs
- Agent crashes on startup

**Solutions:**

1. **Check file integrity:**
   ```bash
   # ตรวจสอบ JSON files
   cat data/queue/ptAgent-tasks.json | jq .
   cat data/seen/pt-topic.json | jq .
   ```

2. **Fix corrupted files:**
   ```bash
   # Backup first
   cp data/queue/ptAgent-tasks.json data/queue/ptAgent-tasks.json.bak
   
   # Reset to empty
   echo '{"tasks":[]}' > data/queue/ptAgent-tasks.json
   ```

3. **Restore from backup:**
   ```bash
   cp data/queue/ptAgent-tasks.json.bak data/queue/ptAgent-tasks.json
   ```

### Problem: Permission Errors

**Symptoms:**
- `EACCES` or `EPERM` errors
- Cannot write to data directory

**Solutions:**

1. **Check permissions:**
   ```bash
   ls -la data/
   ```

2. **Fix permissions:**
   ```bash
   chmod -R 755 data/
   ```

3. **Check disk space:**
   ```bash
   df -h
   ```

### Problem: Race Conditions

**Symptoms:**
- Duplicate tasks
- Lost tasks
- Inconsistent data

**Solutions:**

1. **Ensure single instance:**
   - Run only one agent instance at a time
   - File-based storage is not designed for multi-process

2. **Check for multiple processes:**
   ```bash
   ps aux | grep pt-commenter
   ```

3. **Stop all instances:**
   ```bash
   lifectl ai agent stop pt-commenter
   ```

---

## 📁 Data Directory Structure

```
data/
├── seen/
│   └── pt-topic.json           # Seen topics (auto-cleanup after 7 days)
├── queue/
│   └── ptAgent-tasks.json      # Pending tasks (FIFO)
└── toggle.json                 # Worker states
```

### File Formats

#### seen/pt-topic.json
```json
{
  "records": [
    {
      "id": "12345678",
      "seenAt": 1735123456789,
      "expiresAt": 1735728256789
    }
  ]
}
```

#### queue/ptAgent-tasks.json
```json
{
  "tasks": [
    {
      "type": "pt-topic",
      "url": "https://pantip.com/topic/12345678"
    }
  ]
}
```

#### toggle.json
```json
{
  "worker:ptCommentWorker": true
}
```

---

## 🔄 Backup & Restore

### Backup

```bash
# Backup entire data directory
tar -czf pt-commenter-backup-$(date +%Y%m%d).tar.gz data/

# Backup to specific location
cp -r data/ /backup/pt-commenter-data-$(date +%Y%m%d)/
```

### Restore

```bash
# Restore from tar
tar -xzf pt-commenter-backup-20260425.tar.gz

# Restore from directory
cp -r /backup/pt-commenter-data-20260425/ data/
```

### Automated Backup

เพิ่มใน cron:

```bash
# Backup ทุกวันเวลา 2:00 AM
0 2 * * * cd /path/to/pt-commenter && tar -czf backup/pt-commenter-$(date +\%Y\%m\%d).tar.gz data/
```

---

## 📈 Performance Optimization

### 1. Regular Maintenance

รัน maintenance mode เป็นประจำ:

```bash
# ทุกวันเวลา 3:00 AM
0 3 * * * lifectl ai agent run pt-commenter --env mode=maintenance
```

### 2. Monitor Queue Size

ตั้ง alert เมื่อ queue ใหญ่เกินไป:

```bash
#!/bin/bash
QUEUE_SIZE=$(cat data/queue/pantipAgent-tasks.json | jq '.tasks | length')
if [ $QUEUE_SIZE -gt 1000 ]; then
    echo "Warning: Queue size is $QUEUE_SIZE"
    # Send alert
fi
```

### 3. Archive Old Data

เก็บ backup และลบข้อมูลเก่า:

```bash
#!/bin/bash
# Backup
tar -czf archive/pt-commenter-$(date +%Y%m%d).tar.gz data/

# Clean old data
npm run clean:data
```

---

## 🔍 Health Checks

### Basic Health Check

```bash
#!/bin/bash
# Check if data directory exists
if [ ! -d "data" ]; then
    echo "ERROR: data directory not found"
    exit 1
fi

# Check if queue file is valid JSON
if ! jq empty data/queue/pantipAgent-tasks.json 2>/dev/null; then
    echo "ERROR: Invalid queue JSON"
    exit 1
fi

echo "OK: Health check passed"
```

### Advanced Health Check

```javascript
import * as fileStorage from './dist/services/fileStorage.js';

function healthCheck() {
    try {
        // Check storage stats
        const stats = fileStorage.getStorageStats();
        
        // Alert if queue too large
        if (stats.totalTasks > 1000) {
            console.warn(`WARNING: Queue size is ${stats.totalTasks}`);
        }
        
        // Alert if too many seen records
        if (stats.totalSeenRecords > 10000) {
            console.warn(`WARNING: Too many seen records: ${stats.totalSeenRecords}`);
        }
        
        console.log('Health check passed');
        return true;
    } catch (err) {
        console.error('Health check failed:', err);
        return false;
    }
}

healthCheck();
```

---

## 📞 Support

หากพบปัญหาที่ไม่สามารถแก้ไขได้:

1. ตรวจสอบ logs: `lifectl ai agent logs pt-commenter`
2. ตรวจสอบ data directory: `ls -la data/`
3. รัน health check
4. ดู [IMPROVEMENTS.md](./IMPROVEMENTS.md) สำหรับข้อมูลเพิ่มเติม
5. ดู [DATA_STRUCTURE.md](./DATA_STRUCTURE.md) สำหรับโครงสร้างข้อมูล

---

## 📝 Maintenance Schedule

แนะนำให้รัน maintenance tasks ตามตารางนี้:

| Task | Frequency | Command |
|------|-----------|---------|
| Cleanup expired records | Daily | `mode=maintenance` |
| View statistics | Daily | `mode=stats` |
| Backup data | Daily | `tar -czf backup.tar.gz data/` |
| Health check | Hourly | Custom script |
| Full cleanup | Monthly | `npm run clean:data` |

---

**Last Updated:** 2026-04-25
