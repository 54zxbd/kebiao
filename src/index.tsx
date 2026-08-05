import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import App from "./app";
import "./index.css";

const configuredBasePath = process.env.CLIENT_BASE_PATH || '/';
const routerBasePath = configuredBasePath.includes('{{') ? '/' : configuredBasePath;
document.title = '校园课表';

if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // PWA 安装失败不影响课表主体功能。
    });
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={routerBasePath}>
      <ErrorBoundary
        fallback={
          <main className="flex min-h-[100dvh] items-center justify-center bg-background p-6 text-center">
            <div>
              <h1 className="text-lg font-semibold">页面加载失败</h1>
              <p className="mt-2 text-sm text-muted-foreground">请重新打开应用</p>
              <button
                type="button"
                className="mt-4 h-11 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground"
                onClick={() => window.location.reload()}
              >
                重新加载
              </button>
            </div>
          </main>
        }
      >
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
);
