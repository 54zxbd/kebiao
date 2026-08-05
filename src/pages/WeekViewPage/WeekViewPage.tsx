import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/PageHeader';
import { useCourses, useSchedule, useSemester } from '@/hooks/useTimetable';
import {
  addDays,
  startOfWeek,
  getWeekNumber,
  getDateRangeOfWeek,
  formatDate,
  isCourseOnDate,
  parseDate,
  isSameDay,
  getMaxCourseWeek,
} from '@/data/utils';
import { ICourse, IScheduleConfig } from '@/data/types';
import { cn } from '@/lib/utils';

const WEEKDAY_HEADERS = ['一', '二', '三', '四', '五', '六', '日'];
// 周一=1, 周二=2, ..., 周六=6, 周日=0
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function isSameWeek(a: Date, b: Date): boolean {
  const aStart = startOfWeek(a);
  const bStart = startOfWeek(b);
  return (
    aStart.getFullYear() === bStart.getFullYear() &&
    aStart.getMonth() === bStart.getMonth() &&
    aStart.getDate() === bStart.getDate()
  );
}

export default function WeekViewPage() {
  const navigate = useNavigate();
  const { courses, loaded: coursesLoaded } = useCourses();
  const { schedule, loaded: scheduleLoaded } = useSchedule();
  const { semester } = useSemester();
  const dragStartX = useRef<number | null>(null);

  const [weekStart, setWeekStart] = useState<Date>(() => {
    const today = new Date();
    if (!semester) return startOfWeek(today);

    const start = parseDate(semester.startDate);
    const end = parseDate(semester.endDate);
    return startOfWeek(today < start || today > end ? start : today);
  });

  const semesterStart = useMemo(() => {
    if (semester?.startDate) return semester.startDate;
    const monday = startOfWeek(new Date());
    return formatDate(monday);
  }, [semester]);

  useEffect(() => {
    if (semester?.startDate) {
      setWeekStart(startOfWeek(parseDate(semester.startDate)));
    }
  }, [semester?.startDate]);

  const currentWeekNum = getWeekNumber(weekStart, parseDate(semesterStart));
  const maxCourseWeek = useMemo(() => getMaxCourseWeek(courses), [courses]);
  const showWeekNumber = currentWeekNum >= 1 && currentWeekNum <= maxCourseWeek;
  const isThisWeek = useMemo(() => {
    const thisWeekStart = startOfWeek(new Date());
    return isSameWeek(weekStart, thisWeekStart);
  }, [weekStart]);

  const goPrev = () => setWeekStart((d) => addDays(d, -7));
  const goNext = () => setWeekStart((d) => addDays(d, 7));
  const goThisWeek = () => setWeekStart(startOfWeek(new Date()));

  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (dragStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - dragStartX.current;
    if (Math.abs(delta) > 80) {
      if (delta > 0) goPrev();
      else goNext();
    }
    dragStartX.current = null;
  };

  const loaded = coursesLoaded && scheduleLoaded;
  const periods = schedule.periods;

  // 构建当前周可见课程，并计算它们在手机网格中的行列跨度。
  const visibleCourses = useMemo(() => {
    const result: Array<{ course: ICourse; column: number; row: number; span: number }> = [];
    const occupied = new Set<string>();

    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      const dayOfWeek = date.getDay();
      const dayCourses = courses.filter((c) => isCourseOnDate(c, date, semesterStart));
      for (const course of dayCourses) {
        const startRow = periods.findIndex((period) => period.period === course.startPeriod);
        const endRow = periods.findIndex((period) => period.period === course.endPeriod);
        if (startRow < 0 || endRow < startRow) continue;

        const key = `${dayOfWeek}-${course.startPeriod}`;
        if (occupied.has(key)) continue;
        occupied.add(key);
        result.push({
          course,
          column: i + 2,
          row: startRow + 1,
          span: endRow - startRow + 1,
        });
      }
    }
    return result;
  }, [courses, periods, weekStart, semesterStart]);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="flex min-h-[100dvh] flex-col"
    >
      <PageHeader
        title="周课表"
        subtitle={showWeekNumber ? `第 ${currentWeekNum} 周 · ${getDateRangeOfWeek(weekStart)}` : getDateRangeOfWeek(weekStart)}
        rightAction={{ label: '添加', onClick: () => navigate('/course/edit') }}
      />

      {/* 周切换条 */}
      <div className="mx-4 mt-3 flex h-14 items-center justify-between rounded-lg border border-border/60 bg-card px-2 shadow-xs">
        <Button
          variant="ghost"
          size="icon"
          onClick={goPrev}
          aria-label="上一周"
          className="size-9"
        >
          <ChevronLeft className="size-5" />
        </Button>

        <div className="text-center">
          {showWeekNumber && <div className="text-sm font-semibold">第 {currentWeekNum} 周</div>}
          <div className="text-[11px] text-muted-foreground">
            {getDateRangeOfWeek(weekStart)}
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={goNext}
          aria-label="下一周"
          className="size-9"
        >
          <ChevronRight className="size-5" />
        </Button>
      </div>

      {!isThisWeek && (
        <div className="px-4 pb-2">
          <Button variant="secondary" size="sm" onClick={goThisWeek} className="w-full">
            回到本周
          </Button>
        </div>
      )}

      {/* 周课表网格 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={formatDate(weekStart)}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="flex-1 px-3 pb-4 pt-2"
        >
          {!loaded ? (
            <div className="py-8 text-center text-sm text-muted-foreground">加载中...</div>
          ) : periods.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              暂无作息配置
            </div>
          ) : (
            <div className="w-full">
              {/* 星期头 */}
              <div className="grid grid-cols-[40px_repeat(7,minmax(0,1fr))] text-center text-[10px] font-medium text-muted-foreground">
                <div className="py-2">节次</div>
                {WEEKDAY_ORDER.map((d, i) => {
                  const date = addDays(weekStart, i);
                  const isToday = isSameDay(date, new Date());
                  return (
                    <div
                      key={d}
                      className={cn('border-l border-border/20 py-2', isToday && 'font-semibold text-primary')}
                    >
                      <div>周{WEEKDAY_HEADERS[i]}</div>
                      <div className="text-[9px] text-muted-foreground">
                        {date.getMonth() + 1}/{date.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 节次网格 */}
              <div
                className="relative grid grid-cols-[40px_repeat(7,minmax(0,1fr))]"
                style={{ gridTemplateRows: `repeat(${periods.length}, 52px)` }}
              >
                {periods.map((period, index) => (
                  <div
                    key={`period-${period.period}`}
                    className="flex flex-col items-center justify-center border-b border-border/30 text-center text-[9px] text-muted-foreground"
                    style={{ gridColumn: 1, gridRow: index + 1 }}
                  >
                    <span className="font-medium">{period.period}</span>
                    <span>{period.startTime}</span>
                  </div>
                ))}

                {periods.flatMap((period, rowIndex) =>
                  WEEKDAY_ORDER.map((dayOfWeek, columnIndex) => (
                    <div
                      key={`${dayOfWeek}-${period.period}`}
                      className="border-b border-l border-border/20"
                      style={{ gridColumn: columnIndex + 2, gridRow: rowIndex + 1 }}
                    />
                  )),
                )}

                {visibleCourses.map(({ course, column, row, span }) => (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => navigate(`/course/${course.id}`)}
                    className="z-10 m-0.5 min-w-0 overflow-hidden rounded-md p-1.5 text-left text-white shadow-sm transition-transform active:scale-[0.98]"
                    style={{
                      backgroundColor: course.color,
                      gridColumn: column,
                      gridRow: `${row} / span ${span}`,
                    }}
                    aria-label={`${course.name}${course.location ? ` ${course.location}` : ''}`}
                  >
                    <div className="line-clamp-3 text-[10px] font-semibold leading-tight">
                      {course.name}
                    </div>
                    {course.location && (
                      <div className="mt-0.5 truncate text-[9px] opacity-90">
                        {course.location}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
