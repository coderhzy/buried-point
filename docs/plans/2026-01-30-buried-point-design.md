# Buried Point 埋点统计 NPM 包设计文档

## 概述

一个对标阿里云 QuickTracking 的全栈埋点解决方案，包含多平台 SDK、后端服务、可视化 Dashboard 和 CLI 工具。

## 核心需求

- 全栈方案：前端 SDK + 后端服务
- 内置轻量存储：SQLite
- 全平台支持：Web + 小程序 + React Native + Flutter + iOS + Android
- 标准埋点：PV、点击、曝光、停留时长、性能监控、自定义事件
- 内置 Web Dashboard：ECharts 可视化
- 埋点文档管理：Schema 定义、文档生成、数据校验

## 架构设计

```
SDK (各平台) → HTTP → Server (Node.js) → SQLite
                              ↓
                        Dashboard (Web)
```

## Monorepo 包结构

```
@buried-point/
├── core              # 核心类型定义、Schema 验证、通用工具
├── sdk-web           # 浏览器 SDK
├── sdk-miniapp       # 小程序 SDK (微信/支付宝/抖音)
├── sdk-react-native  # React Native SDK
├── sdk-flutter       # Flutter SDK (Dart 包)
├── sdk-ios           # iOS SDK (Swift)
├── sdk-android       # Android SDK (Kotlin)
├── server            # Node.js 后端服务
├── dashboard         # Web Dashboard (React + ECharts)
└── cli               # 命令行工具
```

**初期优先级**：core → sdk-web → server → dashboard → cli

## 核心数据模型

```typescript
interface TrackEvent {
  eventId: string;          // 事件唯一 ID (UUID)
  eventName: string;        // 事件名称
  eventType: EventType;     // 事件类型
  timestamp: number;        // 客户端时间戳
  serverTime?: number;      // 服务端接收时间

  // 用户标识
  userId?: string;          // 登录用户 ID
  deviceId: string;         // 设备唯一标识
  sessionId: string;        // 会话 ID

  // 环境信息
  platform: Platform;       // web | miniapp | ios | android | rn | flutter
  appVersion: string;       // 应用版本
  sdkVersion: string;       // SDK 版本

  // 页面信息
  pageUrl?: string;         // 页面 URL 或路由
  pageTitle?: string;       // 页面标题
  referrer?: string;        // 来源页面

  // 自定义属性
  properties: Record<string, unknown>;
}

type EventType =
  | 'page_view'      // 页面浏览
  | 'click'          // 点击事件
  | 'expose'         // 曝光事件
  | 'duration'       // 停留时长
  | 'performance'    // 性能数据
  | 'custom';        // 自定义事件

type Platform = 'web' | 'miniapp' | 'ios' | 'android' | 'rn' | 'flutter';
```

## 埋点 Schema 定义

```yaml
# track-schema.yaml
version: "1.0"
events:
  - name: button_click
    description: 按钮点击事件
    type: click
    module: 首页
    owner: 张三
    properties:
      - name: button_id
        type: string
        required: true
        description: 按钮唯一标识
      - name: button_text
        type: string
        required: false
        description: 按钮文案

  - name: product_expose
    description: 商品曝光
    type: expose
    module: 商品列表
    properties:
      - name: product_id
        type: string
        required: true
      - name: position
        type: number
        description: 曝光位置索引
```

**功能流程：**
1. 开发阶段：SDK 根据 Schema 校验上报数据
2. 构建阶段：CLI 生成 Markdown 埋点文档
3. 运行阶段：Dashboard 显示埋点覆盖率对比

## SDK API 设计

```typescript
import { BuriedPoint } from '@buried-point/sdk-web';

const tracker = new BuriedPoint({
  serverUrl: 'http://localhost:3000/track',
  appId: 'my-app',
  appVersion: '1.0.0',
  schema: require('./track-schema.yaml'),
  debug: true,
  batchSize: 10,
  flushInterval: 5000,
});

// 设置用户
tracker.setUser({ userId: 'user_123', name: '张三' });

// 页面浏览
tracker.pageView({ pageTitle: '首页' });

// 点击事件
tracker.click('button_click', {
  button_id: 'submit_btn',
  button_text: '提交'
});

// 曝光事件
tracker.expose('product_expose', [
  { product_id: 'p001', position: 0 },
  { product_id: 'p002', position: 1 },
]);

// 自定义事件
tracker.track('custom_event', { key: 'value' });
```

**自动采集功能：**
- 页面 PV（路由变化监听）
- 停留时长（页面离开时计算）
- Web Vitals 性能指标 (FCP, LCP, FID)

## Server 后端服务

```typescript
import { createServer } from '@buried-point/server';

const server = createServer({
  port: 3000,
  database: './data/track.db',
  cors: ['http://localhost:8080'],
  auth: {
    secret: 'your-secret-key',
  },
});

server.start();
```

**API 端点：**

| 方法 | 路径 | 说明 |
|-----|------|-----|
| POST | `/track` | 接收埋点数据 |
| POST | `/track/batch` | 批量上报 |
| GET | `/api/events` | 查询事件列表 |
| GET | `/api/stats/overview` | 概览统计 |
| GET | `/api/stats/funnel` | 漏斗分析 |
| GET | `/api/stats/retention` | 留存分析 |
| GET | `/api/schema` | 获取埋点 Schema |

**SQLite 表结构：**
- `events` - 原始事件表
- `users` - 用户表
- `sessions` - 会话表
- `daily_stats` - 日统计聚合表

## Dashboard 可视化报表

**技术栈**：React + ECharts + TailwindCSS

**页面结构：**
- 概览页：PV/UV 卡片、趋势图、实时事件流
- 事件分析：事件列表、参数分布、事件趋势
- 用户分析：活跃统计、留存表、用户路径 (Sankey)
- 埋点管理：已定义列表、异常埋点、覆盖率
- 设置：数据导出、时区配置

**启动方式：**
```bash
npx @buried-point/cli dashboard --port 8080
```

## CLI 命令行工具

```bash
# 初始化项目配置
bp init

# 启动服务端
bp serve --port 3000

# 启动 Dashboard
bp dashboard --port 8080

# 生成埋点文档
bp docs --output ./docs/track-events.md

# 校验埋点定义
bp validate

# 数据导出
bp export --from 2024-01-01 --to 2024-01-31 --format csv
```

## 技术栈

| 包 | 技术 |
|---|------|
| core | TypeScript, Zod |
| sdk-web | TypeScript, Rollup |
| server | Node.js, Fastify, better-sqlite3 |
| dashboard | React 18, ECharts, TailwindCSS, Vite |
| cli | Commander.js, Inquirer.js |

**Monorepo 工具**：pnpm workspace + Turborepo

## 实现计划

### 阶段一：核心功能
1. 初始化 Monorepo 项目结构
2. 实现 core 包（类型定义、Schema 校验）
3. 实现 sdk-web 基础功能
4. 实现 server 基础功能
5. 实现 cli 基础命令

### 阶段二：Dashboard
6. 搭建 dashboard 项目
7. 实现概览页
8. 实现事件分析页
9. 实现埋点管理页

### 阶段三：完善
10. SDK 自动采集功能
11. 用户分析功能
12. 文档生成功能
13. 测试与文档

### 阶段四：多平台 SDK
14. sdk-miniapp
15. sdk-react-native
16. sdk-flutter / sdk-ios / sdk-android
