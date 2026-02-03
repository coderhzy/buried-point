# 构建阶段 - 只构建 TypeScript
FROM node:20-alpine AS builder

# 安装 pnpm 和编译依赖
RUN corepack enable && corepack prepare pnpm@latest --activate && \
    apk add --no-cache python3 make g++

WORKDIR /app

# 复制包配置文件
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json ./packages/core/
COPY packages/sdk-web/package.json ./packages/sdk-web/
COPY packages/sdk-miniapp/package.json ./packages/sdk-miniapp/
COPY packages/server/package.json ./packages/server/
COPY packages/cli/package.json ./packages/cli/
COPY packages/dashboard/package.json ./packages/dashboard/

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建
RUN pnpm build

# 运行阶段 - 重新安装生产依赖
FROM node:20-alpine

# 安装编译工具 (better-sqlite3 需要)
RUN apk add --no-cache python3 make g++ && \
    corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# 复制包配置文件
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json ./packages/core/
COPY packages/sdk-web/package.json ./packages/sdk-web/
COPY packages/sdk-miniapp/package.json ./packages/sdk-miniapp/
COPY packages/server/package.json ./packages/server/
COPY packages/cli/package.json ./packages/cli/
COPY packages/dashboard/package.json ./packages/dashboard/

# 安装生产依赖 (会在当前平台编译 better-sqlite3)
RUN pnpm install --frozen-lockfile --prod

# 复制构建产物
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/sdk-web/dist ./packages/sdk-web/dist
COPY --from=builder /app/packages/sdk-miniapp/dist ./packages/sdk-miniapp/dist
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/cli/dist ./packages/cli/dist
COPY --from=builder /app/packages/dashboard/dist ./packages/dashboard/dist

# 创建数据目录
RUN mkdir -p /app/data

# 暴露端口
EXPOSE 1024

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --spider -q http://localhost:1024/api/health || exit 1

# 启动命令
CMD ["node", "packages/cli/dist/index.js", "serve", \
     "--port", "1024", \
     "--host", "0.0.0.0", \
     "--database", "/app/data/track.db", \
     "--dashboard", "/app/packages/dashboard/dist"]
