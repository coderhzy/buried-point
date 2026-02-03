# Buried Point - 全栈埋点分析平台

一个对标阿里云 QuickTracking 的全栈埋点解决方案，包含多平台 SDK、后端服务、可视化 Dashboard 和 CLI 工具。

## 特性

- **多平台 SDK** - 支持 Web、微信/支付宝/抖音小程序
- **Schema 验证** - YAML 定义埋点规范，开发时自动校验
- **自动采集** - PV、停留时长、Web Vitals 性能指标
- **可视化报表** - React + ECharts Dashboard
- **漏斗分析** - 转化率分析
- **留存分析** - 用户留存矩阵
- **数据导出** - 支持 JSON/CSV 格式

## 包结构

```
buried-point-
├── core          # 核心类型定义、Schema 验证、工具函数
├── sdk-web       # 浏览器 SDK
├── sdk-miniapp   # 小程序 SDK (微信/支付宝/抖音)
├── server        # Node.js 后端服务 (Fastify + SQLite)
├── dashboard     # Web Dashboard (React + ECharts)
└── cli           # 命令行工具
```

## NPM 包名

| 包名 | 说明 |
|------|------|
| `buried-point-sdk-web` | Web 端 SDK |
| `buried-point-core` | 核心类型和工具 |
| `buried-point-server` | 服务端库 |
| `buried-point-cli` | CLI 工具 |

## 快速开始

### 方式一：Docker 部署（推荐）

在你的项目 `docker-compose.yml` 中添加埋点服务：

```yaml
version: '3.8'

services:
  track-server:
    image: crpi-p1yj6frf0klk58jo.cn-beijing.personal.cr.aliyuncs.com/xiaoman-geek/buried-point:latest
    container_name: buried-point-server
    restart: unless-stopped
    ports:
      - "1024:1024"
    volumes:
      - buried_point_data:/app/data
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:1024/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  buried_point_data:
    driver: local
```

启动服务：

```bash
docker-compose up -d track-server
```

服务启动后：
- **API 端点**: `http://localhost:1024/api/track`
- **Dashboard**: `http://localhost:1024`

### 方式二：CLI 本地运行

```bash
# 全局安装 CLI
npm install -g buried-point-cli

# 初始化配置
bp init

# 或使用 npx
npx buried-point-cli init
```

这会创建以下文件：
- `track-schema.yaml` - 埋点 Schema 定义
- `track-config.json` - SDK 配置
- `data/` - 数据库目录

启动服务：

```bash
# 启动埋点服务器 (包含 Dashboard)
bp serve --port 1024 --dashboard ./packages/dashboard/dist
```

### 集成 SDK

#### Web 端

```bash
npm install buried-point-sdk-web
# 或
pnpm add buried-point-sdk-web
```

```typescript
import { BuriedPoint } from 'buried-point-sdk-web';

const tracker = new BuriedPoint({
  serverUrl: 'http://localhost:1024/api/track',
  appId: 'my-app',
  appVersion: '1.0.0',
  debug: true,  // 开发模式
});

// 设置用户
tracker.setUser({
  userId: 'user_123',
  deviceId: 'auto',
  name: '张三',
});

// 页面浏览 (自动采集，也可手动调用)
tracker.pageView();

// 点击事件
tracker.click('button_click', {
  button_id: 'submit_btn',
  button_text: '提交',
});

// 曝光事件 (支持批量)
tracker.expose('product_expose', [
  { product_id: 'p001', position: 0 },
  { product_id: 'p002', position: 1 },
]);

// 自定义事件
tracker.track('custom_event', { key: 'value' });
```

#### React/Next.js 集成示例

```typescript
// lib/tracker.ts
import { BuriedPoint } from 'buried-point-sdk-web';

let tracker: BuriedPoint | null = null;

export function getTracker(): BuriedPoint | null {
  if (typeof window === 'undefined') return null;

  if (!tracker) {
    tracker = new BuriedPoint({
      serverUrl: process.env.NEXT_PUBLIC_TRACK_SERVER_URL || 'http://localhost:1024/api/track',
      appId: 'my-app',
      appVersion: '1.0.0',
      debug: process.env.NODE_ENV === 'development',
    });
  }

  return tracker;
}

// 便捷方法
export function trackClick(eventName: string, properties?: Record<string, unknown>) {
  getTracker()?.click(eventName, properties || {});
}

export function trackExpose(eventName: string, properties?: Record<string, unknown>) {
  getTracker()?.expose(eventName, properties || {});
}
```

在组件中使用：

```tsx
import { trackClick } from '@/lib/tracker';

function LoginButton() {
  const handleClick = () => {
    trackClick('login_button_click', { source: 'header' });
    // 执行登录逻辑...
  };

  return <button onClick={handleClick}>登录</button>;
}
```

环境变量配置：

```bash
# .env.local
NEXT_PUBLIC_TRACK_SERVER_URL=http://localhost:1024/api/track
```

#### 小程序端

```bash
npm install buried-point-sdk-miniapp
```

```typescript
import { BuriedPointMiniApp } from 'buried-point-sdk-miniapp';

// 平台自动检测 (微信/支付宝/抖音)
const tracker = new BuriedPointMiniApp({
  serverUrl: 'https://api.example.com/track',
  appId: 'my-miniapp',
  appVersion: '1.0.0',
});

// 在页面 onShow 中设置当前页面
tracker.setCurrentPage({
  path: '/pages/home/index',
  query: { id: '123' },
  scene: 1001,
});

// API 与 Web SDK 一致
tracker.pageView();
tracker.click('button_click', { buttonId: 'submit' });
```

## CLI 命令

```bash
# 初始化配置
bp init [dir]

# 启动服务器
bp serve [options]
  -p, --port <port>      服务端口 (默认: 1024)
  -h, --host <host>      服务地址 (默认: 0.0.0.0)
  -d, --database <path>  数据库路径 (默认: ./data/track.db)

# 启动 Dashboard
bp dashboard [options]
  -p, --port <port>      Dashboard 端口 (默认: 8080)

# 生成埋点文档
bp docs [options]
  -s, --schema <path>    Schema 文件路径 (默认: ./track-schema.yaml)
  -o, --output <path>    输出文件路径 (默认: ./docs/track-events.md)

# 校验 Schema
bp validate [options]
  -s, --schema <path>    Schema 文件路径 (默认: ./track-schema.yaml)

# 导出数据
bp export [options]
  -d, --database <path>  数据库路径 (默认: ./data/track.db)
  --from <date>          开始日期 (ISO 格式)
  --to <date>            结束日期 (ISO 格式)
  -f, --format <format>  输出格式 json|csv (默认: json)
  -o, --output <path>    输出文件路径 (默认: stdout)
```

## Schema 定义

使用 YAML 定义埋点规范：

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

## API 端点

| 方法 | 路径 | 说明 |
|-----|------|-----|
| POST | `/api/track` | 上报事件（支持单个或批量） |
| GET | `/api/events` | 查询事件列表 |
| GET | `/api/events/recent` | 最近事件 |
| GET | `/api/stats/overview` | 概览统计 (PV/UV) |
| GET | `/api/stats/events` | 事件统计 |
| GET | `/api/stats/funnel` | 漏斗分析 |
| GET | `/api/stats/retention` | 留存分析 |
| GET | `/api/schema` | 获取 Schema 配置 |
| GET | `/api/health` | 健康检查 |

### 查询参数

**GET /api/events**
- `startDate` - 开始日期
- `endDate` - 结束日期
- `eventName` - 事件名称筛选
- `eventType` - 事件类型筛选
- `limit` - 返回数量 (最大 1000)
- `offset` - 分页偏移

**GET /api/stats/funnel**
- `steps` - 漏斗步骤 (逗号分隔的事件名)
- `startDate` - 开始日期
- `endDate` - 结束日期

**GET /api/stats/retention**
- `startDate` - 开始日期
- `endDate` - 结束日期
- `days` - 留存天数 (默认 7，最大 30)

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端                                │
├─────────────────┬─────────────────┬─────────────────────────┤
│   sdk-web       │  sdk-miniapp    │   sdk-react-native*     │
│   (Browser)     │  (微信/支付宝)   │   (React Native)*       │
└────────┬────────┴────────┬────────┴────────────┬────────────┘
         │                 │                      │
         └─────────────────┼──────────────────────┘
                           │ HTTP POST
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      server (Fastify)                       │
├─────────────────────────────────────────────────────────────┤
│  • 事件接收与验证 (Zod)                                      │
│  • 数据存储 (SQLite)                                        │
│  • 统计分析 (漏斗/留存)                                      │
│  • REST API                                                 │
└────────┬────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    dashboard (React)                        │
├─────────────────────────────────────────────────────────────┤
│  • 概览统计                                                  │
│  • 事件分析                                                  │
│  • 用户分析                                                  │
│  • 埋点管理                                                  │
│  • 设置导出                                                  │
└─────────────────────────────────────────────────────────────┘

* 待实现
```

## 数据模型

```typescript
interface TrackEvent {
  eventId: string;          // 事件唯一 ID
  eventName: string;        // 事件名称
  eventType: EventType;     // page_view | click | expose | duration | performance | custom
  timestamp: number;        // 客户端时间戳
  serverTime?: number;      // 服务端时间戳

  userId?: string;          // 用户 ID
  deviceId: string;         // 设备 ID
  sessionId: string;        // 会话 ID

  platform: Platform;       // web | miniapp | ios | android | rn | flutter
  appId: string;
  appVersion: string;
  sdkVersion: string;

  pageUrl?: string;
  pageTitle?: string;
  referrer?: string;

  properties: Record<string, unknown>;
}
```

## 技术栈

| 模块 | 技术 |
|------|------|
| Monorepo | pnpm workspace + Turborepo |
| 构建 | tsup, Vite |
| 类型 | TypeScript, Zod |
| 后端 | Fastify, better-sqlite3 |
| 前端 | React 18, ECharts, TailwindCSS |
| CLI | Commander.js |
| 测试 | Vitest |

## 开发

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建
pnpm build

# 测试
pnpm test

# 清理
pnpm clean
```

## Dashboard 预览

Dashboard 包含以下页面：

1. **概览** - PV/UV 趋势图、实时事件流
2. **事件分析** - 事件分布、事件详情
3. **用户分析** - 留存矩阵、活跃用户趋势
4. **埋点管理** - Schema 配置、埋点覆盖率
5. **设置** - 数据导出、时区配置

## 自动采集

Web SDK 自动采集以下数据：

- **页面浏览 (PV)** - 监听路由变化
- **停留时长** - 页面离开时计算
- **性能指标** - FCP, LCP, TTFB

## 安全性

- API 参数校验 (Zod)
- 请求限制 (limit max 1000)
- CORS 配置
- 输入验证

## 路线图

- [x] 核心类型与 Schema 验证
- [x] Web SDK
- [x] 小程序 SDK
- [x] 后端服务
- [x] Dashboard
- [x] CLI 工具
- [x] 漏斗分析
- [x] 留存分析
- [ ] React Native SDK
- [ ] Flutter SDK
- [ ] 实时数据推送 (WebSocket)
- [ ] 数据聚合优化

## 部署建议

### 使用 Nginx Proxy Manager

如果使用 Nginx Proxy Manager 进行反向代理：

1. 添加 Proxy Host：`track.yourdomain.com`
2. Forward to：`buried-point-server:1024`
3. 启用 SSL

### 数据持久化

Docker 部署时数据存储在 `/app/data/track.db`，通过 volume 挂载确保数据持久化。

### 生产环境配置

```bash
# .env.production
NEXT_PUBLIC_TRACK_SERVER_URL=https://track.yourdomain.com/api/track
```

## 许可证

MIT
