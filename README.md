# AI 廣告影片分析平台 (AIBook Monorepo)

這是一個全端 AI 影片分析平台，前端使用 React 19 + TypeScript，後端使用 Node.js + Express + TypeScript。

## 專案結構

本專案採用 monorepo 架構，將前端與後端程式碼分離在獨立的目錄中，便於管理與部署。

```
aibook-monorepo/
├── frontend/          # React + TypeScript 應用
│   ├── src/
│   └── ...
├── backend/           # Node.js + Express + TypeScript API
│   ├── src/
│   └── ...
└── package.json       # Monorepo 根目錄 (使用 npm workspaces)
```

## 功能亮點

### 前端 (Frontend)
- **React 19 & TypeScript**: 現代化的前端開發體驗。
- **多維度分析儀表板**: 以圖表和卡片清晰展示 AI 分析結果。
- **A/B 比較模式**: 並排比較兩份分析報告的優劣。
- **管理員後台**: 集中管理所有使用者的分析報告。
- **JWT 認證**: 安全的使用者登入與會話管理。
- **報告匯出**: 可將分析報告匯出為 PDF。

### 後端 (Backend)
- **Node.js & Express**: 高效能的非同步 API 服務。
- **PostgreSQL**: 可靠的關聯式資料庫。
- **JWT 認證**: 安全的 API 端點保護與使用者驗證。
- **角色權限控制**: 區分普通使用者與管理員權限。
- **RESTful API 設計**: 清晰、標準化的 API 介面。

## 部署 (Deployment)

前端與後端均已容器化 (Docker)，可獨立部署至 Zeabur 等現代雲端平台。

- **前端**: 從 `frontend/` 目錄部署。後端 API 位址已直接寫入程式碼，無需額外設定環境變數。
- **後端**: 從 `backend/` 目錄部署，需要設定 `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL` 和 `GEMINI_API_KEY` 等環境變數。

## 本地開發

1. 安裝依賴: `npm install` (在根目錄執行)
2. 啟動前端: `npm run dev --workspace=frontend`
3. 啟動後端: `npm run dev --workspace=backend`
