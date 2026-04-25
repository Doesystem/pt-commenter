# Data Storage Structure

โปรเจค pt-commenter ใช้ระบบเก็บข้อมูลแบบไฟล์ JSON แทน Redis เพื่อความง่ายในการ deploy และไม่ต้องพึ่งพา external service

## 📁 โครงสร้างไฟล์

```
data/
├── seen/                      # เก็บ topic ที่เคยเห็นแล้ว (deduplication)
│   └── pantip-topic.json     # รายการ topic ที่เคย crawl แล้ว
└── queue/                     # เก็บ task queue
    └── pantipAgent-tasks.json # tasks ที่รอประมวลผล
```

## 📄 รูปแบบข้อมูล

### 1. Seen Topics (`data/seen/pantip-topic.json`)

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

**คุณสมบัติ:**
- `id`: Topic ID จาก Pantip
- `seenAt`: เวลาที่เห็น topic (timestamp)
- `expiresAt`: เวลาที่จะหมดอายุ (timestamp)
- ระบบจะลบ records ที่หมดอายุอัตโนมัติเมื่ออ่านไฟล์

เก็บรายการ topic ที่เคยเห็นแล้ว พร้อม TTL 7 วัน

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

**คุณสมบัติ:**
- `id`: Topic ID จาก Pantip
- `seenAt`: เวลาที่เห็น topic (timestamp)
- `expiresAt`: เวลาที่จะหมดอายุ (timestamp)
- ระบบจะลบ records ที่หมดอายุอัตโนมัติเมื่ออ่านไฟล์

### 2. Task Queue (`data/queue/pantipAgent-tasks.json`)

เก็บ tasks ที่รอประมวลผลแบบ FIFO (First In First Out)

```json
{
  "tasks": [
    {
      "type": "pantip-topic",
      "url": "https://pantip.com/topic/12345678"
    },
    {
      "type": "pantip-topic",
      "url": "https://pantip.com/topic/87654321"
    }
  ]
}
```

**คุณสมบัติ:**
- `type`: ประเภทของ task
- `url`: URL ของ topic ที่ต้องประมวลผล
- Tasks จะถูกดึงออกจาก queue ตามลำดับ FIFO

## 🔧 API Functions

### Deduplication

```typescript
import * as fileStorage from "./services/fileStorage.js";

// ตรวจสอบว่าเคยเห็น topic นี้แล้วหรือไม่
const isDupe = fileStorage.isDuplicate("pantip-topic", "12345678");

// บันทึกว่าเห็น topic นี้แล้ว
fileStorage.markAsSeen("pantip-topic", "12345678");
```

### Task Queue

```typescript
import * as fileStorage from "./services/fileStorage.js";

// เพิ่ม task เข้า queue
fileStorage.pushTask("pantipAgent:tasks", {
  type: "pantip-topic",
  url: "https://pantip.com/topic/12345678"
});

// ดึง task ออกจาก queue (FIFO)
const task = fileStorage.popTask("pantipAgent:tasks");

// ดูจำนวน tasks ใน queue
const length = fileStorage.getQueueLength("pantipAgent:tasks");

// ดู task แรกโดยไม่ลบออก
const firstTask = fileStorage.peekTask("pantipAgent:tasks");

// ลบ tasks ทั้งหมดใน queue
fileStorage.clearQueue("pantipAgent:tasks");
```

## ⚙️ Configuration

Worker enable/disable ถูกควบคุมผ่าน environment variables:

```env
# Enable/disable feed job (RSS crawler)
feed_job_enable=true

# Enable/disable comment worker
comment_enable=true
```

ตั้งค่าผ่าน agent.json หรือ platform dashboard

## 🚀 ข้อดีของระบบไฟล์

1. **ไม่ต้องพึ่งพา Redis** - ลด complexity ในการ deploy
2. **ง่ายต่อการ debug** - สามารถเปิดดูไฟล์ได้โดยตรง
3. **Portable** - ย้ายไปไหนก็ได้ แค่คัดลอก data folder
4. **Version control friendly** - สามารถ backup ด้วย git (ถ้าต้องการ)
5. **No external dependencies** - ไม่ต้องติดตั้ง Redis server

## ⚠️ ข้อจำกัด

1. **ไม่เหมาะกับ high concurrency** - ถ้ามีหลาย process เขียนไฟล์พร้อมกันอาจเกิด race condition
2. **Performance** - อ่าน/เขียนไฟล์ช้ากว่า in-memory database
3. **ไม่มี atomic operations** - ไม่รับประกัน atomicity เหมือน Redis

## 💡 Use Cases ที่เหมาะสม

- Single process agent
- Low to medium traffic
- Development และ testing
- Simple deployment scenarios
- ไม่ต้องการ real-time performance
