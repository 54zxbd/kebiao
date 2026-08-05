# Vercel 部署

## 控制台部署

1. 将项目上传到 GitHub，或在 Vercel 中导入项目目录。
2. 创建项目时选择这个项目根目录：`app_17bevzf14h8 (1)`。
3. 确认以下构建设置：
   - Build Command：`npm run build:vercel`
   - Output Directory：`dist/client`
   - Install Command：`npm install`
4. 点击 Deploy。

部署完成后，Vercel 会提供一个 `https://*.vercel.app` 地址。这个地址可以在任意网络访问，并支持 PWA 安装。

## 本地验证

```bash
npm run build:vercel
npx vite preview --host 0.0.0.0
```

## 自定义域名

在 Vercel 项目的 Settings -> Domains 中添加自己的域名。Vercel 会自动配置 HTTPS 证书。
