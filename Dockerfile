# syntax=docker/dockerfile:1

# 1) deps: 安装全量依赖（包含 devDependencies，供 next build 使用）
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 2) builder: 复制源码并构建
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 3) runner: 只安装生产依赖，然后拷贝构建产物运行
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 仅生产依赖
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# 运行所需文件
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next

# 如果你仓库里确实有 next.config.ts，就保留这一行；否则也可以删掉
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3000
CMD ["npm", "run", "start"]