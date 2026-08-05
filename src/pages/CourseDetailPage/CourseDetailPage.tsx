import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit, Trash2, MapPin, User, CalendarDays, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import PageHeader from '@/components/PageHeader';
import { useCourses, useSchedule, useSemester } from '@/hooks/useTimetable';
import { getPeriodTimeLabel, getWeekdayName, expandWeekRanges } from '@/data/utils';
import { toast } from 'sonner';

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { courses, deleteCourseRange } = useCourses();
  const { schedule } = useSchedule();
  const { semester } = useSemester();
  const [deleteScope, setDeleteScope] = useState<'this-one' | 'rest-of-week' | 'whole-semester'>('whole-semester');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const course = useMemo(() => courses.find((c) => c.id === id), [courses, id]);
  const weekRangeText = useMemo(() => {
    if (!course) return '';

    const weeks = expandWeekRanges(course);
    if (weeks.length === 0) return '未设置';
    if (weeks.length <= 8) {
      return `第 ${weeks.join('、')} 周`;
    }
    return `第 ${course.startWeek} - ${course.endWeek} 周（共 ${weeks.length} 周）`;
  }, [course]);

  if (!course) {
    return (
      <div className="flex min-h-[100dvh] flex-col">
        <PageHeader title="课程详情" showBack />
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="text-center">
            <div className="mb-2 text-4xl">🔍</div>
            <p className="text-sm text-muted-foreground">课程不存在或已删除</p>
            <Button variant="secondary" size="sm" className="mt-4" onClick={() => navigate(-1)}>
              返回
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const timeLabel = getPeriodTimeLabel(schedule, course.startPeriod, course.endPeriod);
  const periodLabel =
    course.startPeriod === course.endPeriod
      ? `第 ${course.startPeriod} 节`
      : `第 ${course.startPeriod} - ${course.endPeriod} 节`;

  const handleDelete = () => {
    deleteCourseRange(
      course,
      deleteScope,
      new Date(),
      semester?.startDate,
    );
    setDeleteDialogOpen(false);
    toast.success('课程已删除');
    navigate(-1);
  };

  const scopeLabels: Record<typeof deleteScope, string> = {
    'this-one': '仅本次',
    'rest-of-week': '本周剩余',
    'whole-semester': '本学期全部',
  };

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <PageHeader
        title="课程详情"
        showBack
        rightAction={{ label: '编辑', icon: Edit, onClick: () => navigate(`/course/edit/${course.id}`) }}
      />

      <div className="space-y-4 px-4 py-6">
        {/* 课程头部 */}
        <div
          className="rounded-lg p-5 text-white shadow-sm"
          style={{ backgroundColor: course.color }}
        >
          <h1 className="text-xl font-bold leading-tight">{course.name}</h1>
          <p className="mt-1 text-sm opacity-90">{periodLabel}</p>
          <p className="text-sm opacity-80">{timeLabel}</p>
        </div>

        {/* 详情列表 */}
        <div className="overflow-hidden rounded-lg border border-border/60 bg-card">
          <InfoRow icon={<User className="size-4" />} label="授课教师" value={course.teacher || '未填写'} />
          <InfoRow icon={<MapPin className="size-4" />} label="上课地点" value={course.location || '未填写'} />
          <InfoRow
            icon={<CalendarDays className="size-4" />}
            label="星期"
            value={getWeekdayName(new Date(Date.UTC(2024, 0, course.dayOfWeek === 0 ? 7 : course.dayOfWeek)))}
          />
          <InfoRow
            icon={<Clock className="size-4" />}
            label="周次范围"
            value={weekRangeText}
          />
          <InfoRow
            icon={<Clock className="size-4" />}
            label="生效范围"
            value={scopeLabels[course.scope as keyof typeof scopeLabels] || course.scope}
          />
        </div>

        {/* 删除按钮 */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 size-4" />
              删除课程
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除？</AlertDialogTitle>
              <AlertDialogDescription>
                此操作不可撤销，请选择删除范围：
              </AlertDialogDescription>
            </AlertDialogHeader>

            <RadioGroup
              value={deleteScope}
              onValueChange={(v) => setDeleteScope(v as typeof deleteScope)}
              className="space-y-2"
            >
              <Label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 p-3 hover:bg-muted/30">
                <RadioGroupItem value="this-one" />
                <div>
                  <div className="text-sm font-medium">仅本次</div>
                  <div className="text-xs text-muted-foreground">只删除这一节课</div>
                </div>
              </Label>
              <Label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 p-3 hover:bg-muted/30">
                <RadioGroupItem value="rest-of-week" />
                <div>
                  <div className="text-sm font-medium">本周剩余</div>
                  <div className="text-xs text-muted-foreground">删除本周剩余的所有该课程</div>
                </div>
              </Label>
              <Label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 p-3 hover:bg-muted/30">
                <RadioGroupItem value="whole-semester" />
                <div>
                  <div className="text-sm font-medium">本学期全部</div>
                  <div className="text-xs text-muted-foreground">删除本学期所有该课程</div>
                </div>
              </Label>
            </RadioGroup>

            <AlertDialogFooter className="flex-row gap-2">
              <AlertDialogCancel className="flex-1">取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                确认删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border/40 p-3 last:border-b-0">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-0.5 text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}
