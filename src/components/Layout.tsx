import { Outlet, useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';
import { cn } from '@/lib/utils';

export const Layout = () => {
  const { pathname } = useLocation();

  // 底部导航仅在一级页面显示
  const showBottomNav =
    pathname === '/day' ||
    pathname === '/week' ||
    pathname === '/settings' ||
    pathname === '/';

  return (
    <div className="relative min-h-[100dvh] bg-app-shell text-foreground">
      <main
        className={cn(
          'mx-auto min-h-[100dvh] w-full max-w-[480px] bg-background shadow-app-shell',
          showBottomNav ? 'pb-app-nav' : 'pb-safe',
        )}
      >
        <Outlet />
      </main>
      {showBottomNav && <BottomNav />}
    </div>
  );
};
