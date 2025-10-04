# 使用 Node.js 20 LTS 版本
FROM node:20-alpine AS builder

# 設定工作目錄
WORKDIR /app

# 複製 package 檔案
COPY package*.json ./

# 安裝所有依賴（包含 devDependencies）
RUN npm ci

# 複製所有原始碼
COPY . .

# 建置 TypeScript
RUN npm run build

# 生產環境階段
FROM node:20-alpine

WORKDIR /app

# 複製 package 檔案
COPY package*.json ./

# 只安裝生產依賴
RUN npm ci --omit=dev

# 從 builder 階段複製編譯後的檔案
COPY --from=builder /app/dist ./dist

# 暴露端口
EXPOSE 8080

# 啟動應用
CMD ["npm", "start"]
