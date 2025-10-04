# 建置階段
FROM node:20-alpine AS builder

WORKDIR /app

# 複製 package 檔案
COPY package*.json ./

# 安裝依賴
RUN npm ci

# 複製所有原始碼
COPY . .

# 建置應用（VITE_API_URL 會在建置時從環境變數讀取）
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# 生產環境階段 - 使用 nginx 提供靜態檔案
FROM nginx:alpine

# 複製建置好的檔案到 nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# 複製 nginx 設定檔
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
