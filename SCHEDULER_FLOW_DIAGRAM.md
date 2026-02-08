# Scheduler Control Flow Diagram

## 1. Application Startup Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Start                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │  Load .env Configuration    │
         │  Read SCHEDULER_ENABLED     │
         └──────────┬──────────────────┘
                    │
                    ▼
         ┌──────────────────────────┐
         │ SCHEDULER_ENABLED=true?  │
         └──────┬───────────┬───────┘
                │           │
           YES  │           │  NO
                │           │
                ▼           ▼
    ┌──────────────────┐   ┌─────────────────────────┐
    │  Auto-Start      │   │  Skip Auto-Start        │
    │  Scheduler       │   │  (Manual Control Only)  │
    └──────────────────┘   └─────────────────────────┘
                │                       │
                ▼                       ▼
    ┌──────────────────┐   ┌─────────────────────────┐
    │  Scheduler       │   │  Scheduler Stopped      │
    │  Running ✅      │   │  (Can start via API) ⏸️ │
    └──────────────────┘   └─────────────────────────┘
```

---

## 2. Scheduler Control Methods

```
┌─────────────────────────────────────────────────────────────┐
│                  Scheduler Control Options                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
           ┌───────────┼───────────┐
           │           │           │
           ▼           ▼           ▼
   ┌──────────┐  ┌─────────┐  ┌──────────┐
   │   .env   │  │   API   │  │  Web UI  │
   │ Variable │  │Endpoints│  │  Panel   │
   └────┬─────┘  └────┬────┘  └────┬─────┘
        │             │             │
        │             │             │
        ▼             ▼             ▼
┌──────────────┐ ┌──────────┐ ┌──────────────┐
│ Auto-Start   │ │  Manual  │ │ User-Friendly│
│ on Launch    │ │ Start/   │ │ Interface    │
│              │ │ Stop     │ │              │
└──────────────┘ └──────────┘ └──────────────┘
```

---

## 3. API Control Flow

```
┌─────────────────────────────────────────────────────────────┐
│              POST /api/scheduler/start                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │  Check: Is scheduler        │
         │  already running?           │
         └──────┬───────────┬──────────┘
                │           │
           YES  │           │  NO
                │           │
                ▼           ▼
    ┌──────────────────┐   ┌─────────────────────────┐
    │  Return Error:   │   │  Start Scheduler        │
    │  "Already        │   │  - Load settings        │
    │   running"       │   │  - Start interval       │
    └──────────────────┘   │  - Return success       │
                           └─────────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│              POST /api/scheduler/stop                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │  Check: Is scheduler        │
         │  currently running?         │
         └──────┬───────────┬──────────┘
                │           │
           NO   │           │  YES
                │           │
                ▼           ▼
    ┌──────────────────┐   ┌─────────────────────────┐
    │  Return Error:   │   │  Stop Scheduler         │
    │  "Not running"   │   │  - Clear interval       │
    │                  │   │  - Return success       │
    └──────────────────┘   └─────────────────────────┘
```

---

## 4. Scheduler Processing Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  Scheduler Running                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │  Wait for interval          │
         │  (default: 30 minutes)      │
         └──────────┬──────────────────┘
                    │
                    ▼
         ┌──────────────────────────┐
         │  Load settings from DB   │
         │  Check: enabled=true?    │
         └──────┬───────────┬───────┘
                │           │
           NO   │           │  YES
                │           │
                ▼           ▼
    ┌──────────────────┐   ┌─────────────────────────┐
    │  Skip processing │   │  Query failed messages  │
    │  (wait next      │   │  from database          │
    │   interval)      │   └──────────┬──────────────┘
    └──────────────────┘              │
                                      ▼
                           ┌──────────────────────────┐
                           │  Process batch           │
                           │  (max: batch_size)       │
                           │  - Check device online   │
                           │  - Retry message         │
                           │  - Random delay          │
                           └──────────┬───────────────┘
                                      │
                                      ▼
                           ┌──────────────────────────┐
                           │  Update message status   │
                           │  - Success: 'sent'       │
                           │  - Failed: increment     │
                           │    retry_count           │
                           └──────────┬───────────────┘
                                      │
                                      ▼
                           ┌──────────────────────────┐
                           │  Wait for next interval  │
                           └──────────────────────────┘
```

---

## 5. Configuration Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                Configuration Levels                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
           ┌───────────┼───────────┐
           │           │           │
           ▼           ▼           ▼
   ┌──────────────┐ ┌──────────┐ ┌──────────────┐
   │ Environment  │ │ Database │ │   Runtime    │
   │  (.env)      │ │ Settings │ │   (API)      │
   └──────┬───────┘ └────┬─────┘ └──────┬───────┘
          │              │               │
          ▼              ▼               ▼
   ┌──────────────┐ ┌──────────┐ ┌──────────────┐
   │ SCHEDULER_   │ │ enabled  │ │ start/stop   │
   │ ENABLED      │ │ batch_   │ │ commands     │
   │              │ │ size     │ │              │
   │ Controls:    │ │ interval │ │ Controls:    │
   │ Auto-start   │ │ delays   │ │ Running      │
   │ on launch    │ │ retries  │ │ state        │
   └──────────────┘ └──────────┘ └──────────────┘
          │              │               │
          └──────────────┼───────────────┘
                         │
                         ▼
              ┌──────────────────┐
              │  Final Behavior  │
              │  of Scheduler    │
              └──────────────────┘
```

---

## 6. Use Case Scenarios

### Scenario A: Development Mode

```
Developer
    │
    ├─► Edit .env: SCHEDULER_ENABLED=false
    │
    ├─► Restart app
    │
    ├─► Scheduler: STOPPED ⏸️
    │
    ├─► When needed:
    │   POST /api/scheduler/start
    │
    └─► Scheduler: RUNNING ✅
        (Manual control)
```

### Scenario B: Production Mode

```
Production Server
    │
    ├─► Edit .env: SCHEDULER_ENABLED=true
    │
    ├─► Restart app
    │
    └─► Scheduler: AUTO-STARTED ✅
        (Always running)
```

### Scenario C: Maintenance

```
Admin
    │
    ├─► POST /api/scheduler/stop
    │
    ├─► Scheduler: STOPPED ⏸️
    │
    ├─► Perform maintenance...
    │
    ├─► POST /api/scheduler/start
    │
    └─► Scheduler: RUNNING ✅
```

---

## 7. Status Check Flow

```
┌─────────────────────────────────────────────────────────────┐
│              GET /api/scheduler/status                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │  getSchedulerStatus()       │
         └──────────┬──────────────────┘
                    │
                    ▼
         ┌──────────────────────────┐
         │  Return:                 │
         │  {                       │
         │    running: bool,        │
         │    isProcessing: bool,   │
         │    config: {             │
         │      enabled,            │
         │      batch_size,         │
         │      interval_minutes,   │
         │      ...                 │
         │    }                     │
         │  }                       │
         └──────────────────────────┘
```

---

## 8. Complete System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User/Client                              │
└──────────────┬──────────────────────────────────────────────┘
               │
               ├─► Web UI (scheduler-control.html)
               │   └─► JWT Auth → API Calls
               │
               ├─► API Client (curl/Postman)
               │   └─► JWT Auth → API Calls
               │
               └─► Direct .env Edit
                   └─► Restart Required
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Express.js Server                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  src/app.js                                           │  │
│  │  - Check SCHEDULER_ENABLED                            │  │
│  │  - Conditional auto-start                             │  │
│  └────────────────────┬──────────────────────────────────┘  │
│                       │                                      │
│  ┌────────────────────▼──────────────────────────────────┐  │
│  │  src/routes/api.js                                    │  │
│  │  - POST /scheduler/start                              │  │
│  │  - POST /scheduler/stop                               │  │
│  │  - GET  /scheduler/status                             │  │
│  │  - POST /scheduler/settings                           │  │
│  │  - POST /scheduler/trigger                            │  │
│  └────────────────────┬──────────────────────────────────┘  │
│                       │                                      │
│  ┌────────────────────▼──────────────────────────────────┐  │
│  │  src/services/messageScheduler.js                     │  │
│  │  - startScheduler()                                   │  │
│  │  - stopScheduler()                                    │  │
│  │  - startSchedulerManually()                           │  │
│  │  - stopSchedulerManually()                            │  │
│  │  - processFailedMessages()                            │  │
│  │  - getSchedulerStatus()                               │  │
│  │  - updateSettings()                                   │  │
│  └────────────────────┬──────────────────────────────────┘  │
│                       │                                      │
└───────────────────────┼──────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   MySQL Database                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  scheduler_settings                                   │  │
│  │  - enabled                                            │  │
│  │  - batch_size                                         │  │
│  │  - interval_minutes                                   │  │
│  │  - min_delay_seconds                                  │  │
│  │  - max_delay_seconds                                  │  │
│  │  - max_retries                                        │  │
│  │  - cooldown_minutes                                   │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  message_logs                                         │  │
│  │  - status (failed/sent/permanently_failed)            │  │
│  │  - retry_count                                        │  │
│  │  - device_id                                          │  │
│  │  - ...                                                │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

**Legend:**

- ✅ = Running/Active
- ⏸️ = Stopped/Paused
- ▶️ = Start
- ⏹️ = Stop
- 🔄 = Refresh
- ⚡ = Trigger
