import { memo } from 'react';
import { MapPin, User, Clock } from 'lucide-react';
import { ICourse, IScheduleConfig } from '@/data/types';
import { getPeriodTimeLabel, CourseStatus } from '@/data/utils';
import { cn } from '@/lib/utils';

interface CourseCardProps {
  course: ICourse;
  schedule: IScheduleConfig;
  status: CourseStatus;
  onClick?: () => void;
}

function CourseCard({ course, schedule, status, onClick }: CourseCardProps) {
  const timeLabel = getPeriodTimeLabel(schedule, course.startPeriod, course.endPeriod);
  const periodLabel =
    course.startPeriod === course.endPeriod
      ? `第${course.startPeriod}节`
      : `第${course.startPeriod}-${course.endPeriod}节`;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative w-full overflow-hidden rounded-lg border p-3.5 text-left transition-all active:scale-[0.99]',
        status === 'ongoing' &&
          'border-primary/40 bg-primary/10 shadow-sm ring-1 ring-primary/20',
        status === 'finished' && 'opacity-50',
        status === 'upcoming' && 'border-border bg-card',
      )}
      style={
        status !== 'ongoing'
          ? { borderLeftColor: course.color, borderLeftWidth: '4px' }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold leading-tight">
            {course.name}
          </h3>
          <p
            className={cn(
              'mt-0.5 text-xs font-medium',
              status === 'ongoing' ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            {periodLabel} · {timeLabel}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
          style={{ backgroundColor: course.color }}
        >
          {status === 'ongoing' ? '进行中' : status === 'finished' ? '已结束' : '未开始'}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {course.location && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{course.location}</span>
          </span>
        )}
        {course.teacher && (
          <span className="inline-flex items-center gap-1">
            <User className="size-3.5 shrink-0" />
            <span className="truncate">{course.teacher}</span>
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3.5 shrink-0" />
          <span>
            第{course.startWeek}-{course.endWeek}周
          </span>
        </span>
      </div>
    </button>
  );
}

export default memo(CourseCard);
