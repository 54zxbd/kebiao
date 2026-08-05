import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: {
    label: string;
    onClick: () => void;
    icon?: typeof Plus;
  };
}

export default function PageHeader({ title, subtitle, showBack, rightAction }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="app-safe-top sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-border/50 bg-card/95 px-4 py-2 backdrop-blur-md">
      {showBack ? (
        <Button
          variant="ghost"
          size="icon"
          className="-ml-2 size-11"
          onClick={() => navigate(-1)}
          aria-label="返回"
        >
          <ArrowLeft className="size-5" />
        </Button>
      ) : null}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold">{title}</h1>
        {subtitle ? (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {rightAction ? (
        <Button
          size="icon"
          onClick={rightAction.onClick}
          className="size-10 shrink-0"
          aria-label={rightAction.label}
          title={rightAction.label}
        >
          {rightAction.icon ? <rightAction.icon className="size-5" /> : <Plus className="size-5" />}
        </Button>
      ) : null}
    </header>
  );
}
