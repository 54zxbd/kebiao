import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/PageHeader';
import CourseCard from '@/components/CourseCard';
import { useCourses, useSchedule, useSemester } from '@/hooks/useTimetable';
import {
  addDays,
  formatDate,
  isSameDay,
  getDayLabel,
  getCoursesForDate,
  getCourseStatus,
  parseDate,
} from '@/data/utils';

export default function DayViewPage() {
  const navigate = useNavigate();
  const { courses, loaded: coursesLoaded } = useCourses();
  const { schedule, loaded: scheduleLoaded } = useSchedule();
  const { semester } = useSemester();
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const today = new Date();
    if (!semester) return today;

    const start = parseDate(semester.startDate);
    const end = parseDate(semester.endDate);
    return today < start || today > end ? start : today;
  });
  const dragStartX = useRef<number | null>(null);

  // 学期开始日期，没有配置时用一个默认值（当前日期所在周的周一）
  const semesterStart = useMemo(() => {
    if (semester?.startDate) return semester.startDate;
    // 默认：以当前日期所在周的周一作为第1周开始
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    return formatDate(monday);
  }, [semester]);

  const dayCourses = useMemo(
    () => getCoursesForDate(courses, currentDate, semesterStart),
    [courses, currentDate, semesterStart],
  );

  const isToday = isSameDay(currentDate, new Date());

  const goPrev = () => setCurrentDate((d) => addDays(d, -1));
  const goNext = () => setCurrentDate((d) => addDays(d, 1));
  const goToday = () => setCurrentDate(new Date());

  // 手势滑动切换日期
  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (dragStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - dragStartX.current;
    if (Math.abs(delta) > 60) {
      if (delta > 0) goPrev();
      else goNext();
    }
    dragStartX.current = null;
  };

  const handleCardClick = (id: string) => {
    navigate(`/course/${id}`);
  };

  // 每分钟刷新一次（用于课程状态高亮更新）
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  const loaded = coursesLoaded && scheduleLoaded;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="flex min-h-[100dvh] flex-col"
    >
      <PageHeader
        title="日课表"
        subtitle={isToday ? '今天' : getDayLabel(currentDate)}
        rightAction={{ label: '添加', onClick: () => navigate('/course/edit') }}
      />

      {/* 日期切换条 */}
      <div className="mx-4 mt-3 flex h-14 items-center justify-between rounded-lg border border-border/60 bg-card px-2 shadow-xs">
        <Button
          variant="ghost"
          size="icon"
          onClick={goPrev}
          aria-label="前一天"
          className="size-9"
        >
          <ChevronLeft className="size-5" />
        </Button>

        <div className="text-center">
          <div className="text-base font-semibold">{getDayLabel(currentDate)}</div>
          <div className="text-xs text-muted-foreground">
            {formatDate(currentDate)}
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={goNext}
          aria-label="后一天"
          className="size-9"
        >
          <ChevronRight className="size-5" />
        </Button>
      </div>

      {!isToday && (
        <div className="px-4 pb-2">
          <Button variant="secondary" size="sm" onClick={goToday} className="w-full">
            回到今天
          </Button>
        </div>
      )}

      {/* 课程列表 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={formatDate(currentDate)}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="flex-1 space-y-3 px-4 py-2"
        >
          {!loaded ? (
            <div className="py-8 text-center text-sm text-muted-foreground">加载中...</div>
          ) : dayCourses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CalendarOff className="mb-3 size-10 text-muted-foreground/70" strokeWidth={1.5} />
              <div className="text-base font-medium">今天没有课</div>
              <p className="mt-1 text-sm text-muted-foreground">
                点击右上角「添加」创建课程
              </p>
            </div>
          ) : (
            dayCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                schedule={schedule}
                status={getCourseStatus(course, schedule, currentDate)}
                onClick={() => handleCardClick(course.id)}
              />
            ))
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
