# SSE System - User vs Admin Comparison

## Side-by-Side Comparison

| Feature | Normal User Side | Admin Side |
|---------|-----------------|------------|
| **Primary Purpose** | Receive real-time notifications | Monitor all SSE connections |
| **Connection Type** | Single EventSource connection | API polling (3s interval) |
| **Main Interface** | Toast notifications + Debug panel | Monitoring dashboard |
| **Access Control** | employee, manager, admin, super_admin | super_admin only |
| **Data Visibility** | Own notifications only | All connections and events |
| **UI Components** | NotificationManager, SSEDebugger | Full admin dashboard with metrics |
| **Connection Management** | Automatic (via Global SSE Manager) | Read-only monitoring |
| **Real-time Updates** | Via SSE stream | Via API polling |
| **Message Types** | transfer_status_change, new_transfer, urgent_transfer, reminder | Connection events, metrics, user activity |
| **Notification Actions** | View, dismiss, mark as read | View, analyze, track |
| **Debug Tools** | Bottom-right debug panel | Full monitoring dashboard |
| **Sound Alerts** | ✅ Web Audio API beeps | ❌ No sounds |
| **Connection Quality** | Shown in debug panel | Calculated and displayed for all users |
| **Auto-reconnect** | ✅ Exponential backoff (max 5 attempts) | N/A (not a persistent connection) |
| **Heartbeat** | Receives every 30s | Tracks all heartbeats |
| **Event History** | Last message only | Last 1000 events stored |
| **Metrics** | Personal connection status | System-wide statistics |
| **Location** | All authenticated pages | /admin/monitoring/sse |

---

## Data Flow Comparison

### Normal User - Message Reception Flow

```mermaid
flowchart TD
    A[Server Event Occurs] --> B[Notification Broadcaster<br/>broadcastToUser userId, notification]
    B --> C[SSE Stream<br/>text/event-stream]
    C --> D[Client EventSource.onmessage]
    D --> E[Global SSE Manager<br/>subscribers.forEach callback]
    E --> F[SSEContext<br/>lastMessage updated]
    F --> G[Component useSSE hook]
    G --> H[NotificationManager]
    H --> I[Toast UI]
    H --> J[Sound Alert]
    
    style A fill:#ff6b6b
    style B fill:#ffd93d
    style C fill:#6bcf7f
    style D fill:#4d96ff
    style E fill:#9b59b6
    style F fill:#e67e22
    style G fill:#1abc9c
    style H fill:#3498db
    style I fill:#2ecc71
    style J fill:#f39c12
```

### Admin - Monitoring Data Flow

```mermaid
flowchart TD
    A[SSE Connection Event Occurs] --> B[Notification Broadcaster<br/>registerClient or<br/>unregisterClient]
    B --> C[SSE Monitoring Integration<br/>trackConnectionEvent<br/>updateConnectionStatus]
    C --> D[In-Memory Storage<br/>activeConnections Map<br/>connectionEvents Array]
    D --> E[Admin Dashboard<br/>polling 3s<br/>fetch /api/admin/monitoring/sse]
    E --> F[SSE Monitoring Service<br/>getRealTimeConnections<br/>getRealTimeSSEMetrics<br/>getRecentConnectionEvents]
    F --> G[Dashboard UI Components]
    G --> H[Metrics Cards]
    G --> I[Connections List]
    G --> J[Events Feed]
    
    style A fill:#ff6b6b
    style B fill:#ffd93d
    style C fill:#6bcf7f
    style D fill:#4d96ff
    style E fill:#9b59b6
    style F fill:#e67e22
    style G fill:#1abc9c
    style H fill:#2ecc71
    style I fill:#3498db
    style J fill:#f39c12
```

---

## User Interface Comparison

### Normal User - Debug Panel (Bottom Right)

```mermaid
graph TD
    subgraph DebugPanel["🔧 SSE Debug Info - Bottom Right Corner"]
        A[Connected: Yes]
        B[Connecting: No]
        C[Quality: excellent]
        D[Subscribers: 1]
        E[Retry Count: 0]
        F[Last Message:<br/>Type: transfer_status_change<br/>Data: ...]
    end
    
    style DebugPanel fill:#2c3e50,stroke:#ecf0f1,color:#ecf0f1
    style A fill:#27ae60,color:#fff
    style B fill:#95a5a6,color:#fff
    style C fill:#27ae60,color:#fff
    style D fill:#3498db,color:#fff
    style E fill:#3498db,color:#fff
    style F fill:#34495e,color:#ecf0f1
```

### Admin - Full Dashboard

```mermaid
graph TB
    subgraph Dashboard["SSE Connections Dashboard - /admin/monitoring/sse"]
        Header["SSE Connections &nbsp; &nbsp; &nbsp; [Refresh Button]<br/>Monitor real-time Server-Sent Events<br/>● Live data • Last updated: 10:30:45 AM"]
        
        subgraph Metrics["Key Metrics"]
            M1["Total<br/>15"]
            M2["Active<br/>12"]
            M3["Events<br/>1245"]
            M4["Avg<br/>45 min"]
        end
        
        subgraph Quality["Connection Quality Distribution"]
            Q1["Excellent: 8"]
            Q2["Good: 3"]
            Q3["Poor: 1"]
            Q4["Critical: 0"]
        end
        
        subgraph Connections["Active Connections"]
            C1["user1@example.com<br/>45m • 120 events<br/>Quality: excellent"]
            C2["user2@example.com<br/>30m • 85 events<br/>Quality: good"]
        end
        
        subgraph Events["Recent Events"]
            E1["✓ user connected"]
            E2["● heartbeat"]
            E3["✗ user disconnected"]
            E4["⚠ error occurred"]
        end
    end
    
    style Dashboard fill:#f8f9fa,stroke:#495057
    style Header fill:#6c757d,color:#fff
    style Metrics fill:#e7f3ff
    style Quality fill:#fff3cd
    style Connections fill:#d1ecf1
    style Events fill:#f8d7da
    style M1 fill:#007bff,color:#fff
    style M2 fill:#28a745,color:#fff
    style M3 fill:#6f42c1,color:#fff
    style M4 fill:#fd7e14,color:#fff
    style Q1 fill:#28a745,color:#fff
    style Q2 fill:#17a2b8,color:#fff
    style Q3 fill:#ffc107,color:#000
    style Q4 fill:#dc3545,color:#fff
```

---

## Technical Architecture Comparison

### Normal User Side - Client Architecture

```mermaid
flowchart TD
    subgraph Browser["Browser Context"]
        direction TB
        
        subgraph Components["Application Components"]
            Dashboard["Dashboard"]
            Transfers["Transfers"]
            Calendar["Calendar"]
            Profile["Profile"]
        end
        
        Context["SSEContext<br/>useSSE hook"]
        
        Dashboard --> Context
        Transfers --> Context
        Calendar --> Context
        Profile --> Context
        
        Manager["Global SSE Manager<br/>(Singleton)"]
        Context --> Manager
        
        NotifMgr["NotificationManager"]
        Manager --> NotifMgr
        
        Toast["Toast Notifications"]
        Sound["Sound Alerts"]
        
        NotifMgr --> Toast
        NotifMgr --> Sound
        
        EventSrc["EventSource<br/>/api/notifications/sse"]
        Manager --> EventSrc
    end
    
    Server["Server<br/>SSE Endpoint"]
    EventSrc -.->|SSE Stream| Server
    
    style Browser fill:#e1f5ff
    style Components fill:#d4edda
    style Context fill:#fff3cd
    style Manager fill:#f8d7da
    style EventSrc fill:#d1ecf1
    style Server fill:#495057,color:#fff
```

### Admin Side - Monitoring Architecture

```mermaid
flowchart TD
    subgraph AdminBrowser["Admin Browser"]
        direction TB
        Page["/admin/monitoring/sse"]
        Polling["setInterval<br/>fetch /api/admin/monitoring/sse<br/>Every 3 seconds"]
        State["Update Dashboard State"]
        
        subgraph DashboardUI["Dashboard UI"]
            Conn["Connections List"]
            Metrics["Metrics Cards"]
            Events["Events Feed"]
            Charts["Quality Charts"]
        end
        
        Page --> Polling
        Polling --> State
        State --> DashboardUI
    end
    
    HTTP["HTTP GET<br/>3s polling"]
    Polling -.->|REST API| HTTP
    
    subgraph Server["Server Side"]
        direction TB
        Endpoint["GET /api/admin/monitoring/sse"]
        Auth["requireSuperAdmin"]
        
        Service["SSE Monitoring Service"]
        subgraph ServiceMethods["Service Methods"]
            M1["getRealTimeConnections"]
            M2["getRealTimeSSEMetrics"]
            M3["getRecentConnectionEvents"]
        end
        
        Integration["SSE Monitoring Integration"]
        subgraph Storage["In-Memory Storage"]
            S1["activeConnections Map"]
            S2["connectionEvents Array"]
            S3["dailyEventCount"]
        end
        
        Response["JSON Response"]
        
        Endpoint --> Auth
        Auth --> Service
        Service --> ServiceMethods
        ServiceMethods --> Integration
        Integration --> Storage
        Storage --> Response
    end
    
    HTTP -.-> Endpoint
    Response -.->|JSON| Polling
    
    style AdminBrowser fill:#fff4e1
    style Server fill:#e1f5ff
    style DashboardUI fill:#d4edda
    style Storage fill:#f8d7da
```

---

## Connection Lifecycle Comparison

### Normal User - Connection Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Login: User Logs In
    Login --> LayoutRender: Auth token stored<br/>in cookies
    LayoutRender --> Subscribe: SSEProvider<br/>initialized
    Subscribe --> CreateConnection: globalSSEManager.subscribe<br/>(app-context, callback)
    CreateConnection --> Authenticate: new EventSource<br/>(/api/notifications/sse)<br/>Cookies included
    Authenticate --> Established: requireEmployeeOrManager<br/>validates JWT
    Established --> Heartbeat: registerClient<br/>Initial message sent
    Heartbeat --> Active: Every 30 seconds<br/>Prevents timeout
    Active --> Active: Messages flow<br/>Server → Client
    Active --> Navigate: User navigates<br/>Connection persists
    Navigate --> Active: No reconnect needed
    Active --> Logout: User logs out
    Logout --> Cleanup: clearUser called<br/>Connection closed
    Cleanup --> [*]: Subscriber removed
    
    note right of Active
        Messages: Server events →
        EventSource → Manager →
        Context → Components
    end note
```

### Admin - Monitoring Session

```mermaid
stateDiagram-v2
    [*] --> Navigate: Admin navigates to<br/>/admin/monitoring/sse
    Navigate --> Mount: Component mounts
    Mount --> InitialFetch: fetchSSEData<br/>called immediately
    InitialFetch --> StartPolling: setInterval<br/>(fetchSSEData, 3000)
    StartPolling --> Polling: Timer active
    
    state Polling {
        [*] --> HTTPGet: HTTP GET<br/>/api/admin/monitoring/sse
        HTTPGet --> Auth: requireSuperAdmin<br/>authentication
        Auth --> Collect: Collect data from<br/>monitoring service
        Collect --> Response: Return JSON response
        Response --> UpdateState: Update dashboard state
        UpdateState --> Render: Re-render UI<br/>components
        Render --> Wait: Wait 3 seconds
        Wait --> [*]
    }
    
    Polling --> Polling: Auto-refresh<br/>every 3 seconds
    Polling --> ManualRefresh: Admin clicks<br/>refresh button
    ManualRefresh --> Polling: Immediate<br/>fetchSSEData
    Polling --> NavigateAway: Admin leaves page
    NavigateAway --> Cleanup: clearInterval<br/>stops polling
    Cleanup --> Unmount: Component unmounts
    Unmount --> [*]
    
    note right of Polling
        No persistent SSE connection
        Only polling HTTP requests
    end note
```

---

## Key Differences Summary

| Aspect | Normal User | Admin |
|--------|-------------|-------|
| **Connection Type** | Persistent SSE (EventSource) | Polling HTTP requests |
| **Purpose** | Receive real-time updates | Monitor system health |
| **Authentication** | Cookies with JWT | API route authentication |
| **Data Persistence** | Last message only | In-memory history |
| **Update Frequency** | Real-time (instant) | Every 3 seconds |
| **Connection Stability** | Auto-reconnect with backoff | N/A (stateless) |
| **Resource Usage** | 1 persistent connection | Many short HTTP requests |
| **Scalability** | One per user | Minimal (read-only) |
| **Visibility** | Personal data only | All system data |
| **Interactivity** | Can dismiss notifications | Read-only monitoring |
| **Client State** | Managed by React Context | Local component state |
| **Server State** | Registered in clients Map | No server state |

---

## Performance Comparison

### Normal User Side
- **Network:** 1 persistent connection per user
- **Bandwidth:** Minimal (only when events occur + heartbeat)
- **Latency:** < 100ms (instant delivery)
- **CPU:** Low (event-driven)
- **Memory:** ~100KB per connection

### Admin Side
- **Network:** HTTP request every 3 seconds
- **Bandwidth:** Higher (continuous polling)
- **Latency:** 0-3 seconds (depends on poll timing)
- **CPU:** Moderate (3s interval processing)
- **Memory:** Minimal (no persistent state)

---

## Security Model Comparison

### Normal User
```typescript
// Authentication via middleware
middleware.ts: Check JWT token in cookies
  ↓
/api/notifications/sse: requireEmployeeOrManager()
  ↓
User can only receive their own notifications
No access to other users' data
```

### Admin
```typescript
// Super admin only
middleware.ts: Check JWT token + admin role
  ↓
/api/admin/monitoring/sse: requireSuperAdmin()
  ↓
Can view all connections and events
Full system visibility
```

---

## Use Case Examples

### Normal User - Typical Flow

```mermaid
sequenceDiagram
    participant Manager
    participant Server
    participant Broadcaster
    participant EventSource
    participant SSEManager
    participant Context
    participant NotifMgr
    participant UI
    participant User
    
    Manager->>Server: Approves transfer
    Server->>Server: Update transfer status
    Server->>Broadcaster: broadcastToUser(employeeId, notification)
    Broadcaster->>EventSource: Send via SSE stream
    EventSource->>SSEManager: onmessage event
    SSEManager->>Context: Broadcast to subscribers
    Context->>NotifMgr: lastMessage updated
    NotifMgr->>UI: Show toast notification
    NotifMgr->>UI: Play sound alert (beep)
    Note over UI: Toast displays for 5 seconds
    UI-->>UI: Auto-dismiss after 5s
    User->>UI: Clicks notification
    UI->>User: Navigate to transfer details
```

### Admin - Typical Flow

```mermaid
sequenceDiagram
    participant Admin
    participant Dashboard
    participant API
    participant MonitoringService
    participant Storage
    participant SSESystem
    
    Admin->>Dashboard: Opens /admin/monitoring/sse
    Dashboard->>API: Initial fetch
    API->>MonitoringService: getRealTimeSSEMetrics()
    MonitoringService->>Storage: Query activeConnections
    Storage-->>MonitoringService: Return data
    MonitoringService-->>API: Metrics + connections
    API-->>Dashboard: JSON response
    Dashboard->>Admin: Shows 12 active connections
    
    loop Every 3 seconds
        Dashboard->>API: Auto-refresh poll
        API->>MonitoringService: Get latest data
        MonitoringService-->>Dashboard: Updated metrics
    end
    
    Note over Dashboard: Admin notices connection quality: "poor"
    Admin->>Dashboard: Clicks on connection
    Dashboard->>Admin: Show details:<br/>john@example.com<br/>Last ping: 45s ago
    
    SSESystem->>Storage: Connection recovers
    Storage->>Storage: Update quality to "good"
    
    Dashboard->>API: Next poll (3s later)
    API->>Storage: Get connections
    Storage-->>Dashboard: Quality now "good"
    Dashboard->>Admin: Reflects change
```

---

End of Comparison Chart

