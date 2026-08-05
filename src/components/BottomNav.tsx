import { NavLink } from 'react-router-dom';
import { CalendarDays, CalendarRange, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { path: '/day', label: '日视图', Icon: CalendarDays },
  { path: '/week', label: '周视图', Icon: CalendarRange },
  { path: '/settings', label: '设置', Icon: Settings },
];

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[480px] border-t border-border/70 bg-card/95 backdrop-blur-xl">
      <ul className="flex h-16 items-center justify-around px-2 pb-safe-bottom">
        {NAV_ITEMS.map(({ path, label, Icon }) => (
          <li key={path} className="flex-1">
            <NavLink
              to={path}
              end={path === '/day'}
              className={({ isActive }) =>
                cn(
                  'flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors active:scale-95',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              <Icon className="size-5 shrink-0" strokeWidth={2} />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
