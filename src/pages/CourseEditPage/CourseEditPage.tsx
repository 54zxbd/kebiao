import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import PageHeader from '@/components/PageHeader';
import { useCourses, useSchedule, useSemester, useCurrentDate } from '@/hooks/useTimetable';
import { COURSE_COLORS, ICourse } from '@/data/types';
import { generateId, formatDate, getWeekNumber, parseDate } from '@/data/utils';
import { toast } from 'sonner';

const courseSchema = z.object({
  name: z.string().min(1, '课程名称不能为空'),
  teacher: z.string(),
  location: z.string(),
  dayOfWeek: z.string().min(1, '请选择星期'),
  startPeriod: z.string().min(1, '请选择起始节次'),
  endPeriod: z.string().min(1, '请选择结束节次'),
  color: z.string().min(1, '请选择课程颜色'),
  scope: z.enum(['single-day', 'this-week', 'whole-semester']),
  startWeek: z.string().min(1, '起始周不能为空'),
  endWeek: z.string().min(1, '结束周不能为空'),
  specificDate: z.string(),
});

type CourseFormData = z.infer<typeof courseSchema>;

export default function CourseEditPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { courses, addCourse, updateCourse } = useCourses();
  const { schedule } = useSchedule();
  const { semester } = useSemester();
  const { currentDate } = useCurrentDate();
  const isEdit = !!id;

  const existingCourse = useMemo(
    () => (id ? courses.find((c) => c.id === id) : undefined),
    [courses, id],
  );

  const defaultValues: CourseFormData = useMemo(() => {
    if (existingCourse) {
      return {
        name: existingCourse.name,
        teacher: existingCourse.teacher || '',
        location: existingCourse.location || '',
        dayOfWeek: String(existingCourse.dayOfWeek),
        startPeriod: String(existingCourse.startPeriod),
        endPeriod: String(existingCourse.endPeriod),
        color: existingCourse.color,
        scope: existingCourse.scope,
        startWeek: String(existingCourse.startWeek),
        endWeek: String(existingCourse.endWeek),
        specificDate: existingCourse.specificDate || formatDate(currentDate),
      };
    }
    const semStart = semester?.startDate
      ? parseDate(semester.startDate)
      : new Date();
    const currentWeek = Math.max(1, getWeekNumber(currentDate, semStart));
    return {
      name: '',
      teacher: '',
      location: '',
      dayOfWeek: String(currentDate.getDay()),
      startPeriod: '1',
      endPeriod: '2',
      color: COURSE_COLORS[0],
      scope: 'whole-semester',
      startWeek: String(currentWeek),
      endWeek: '16',
      specificDate: formatDate(currentDate),
    };
  }, [existingCourse, currentDate, semester]);

  const form = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues,
  });

  const watchScope = form.watch('scope');

  const onSubmit = (data: CourseFormData) => {
    const startP = Number(data.startPeriod);
    const endP = Number(data.endPeriod);
    const startW = Number(data.startWeek);
    const endW = Number(data.endWeek);

    if (endP < startP) {
      form.setError('endPeriod', { message: '结束节次不能早于起始节次' });
      return;
    }
    if (isNaN(startW) || isNaN(endW) || endW < startW || startW < 1) {
      form.setError('endWeek', { message: '周次范围无效' });
      return;
    }

    if (isEdit && existingCourse) {
      updateCourse(existingCourse.id, {
        name: data.name,
        teacher: data.teacher,
        location: data.location,
        dayOfWeek: Number(data.dayOfWeek),
        startPeriod: startP,
        endPeriod: endP,
        color: data.color,
        scope: data.scope,
        startWeek: startW,
        endWeek: endW,
        specificDate: data.scope === 'single-day' ? data.specificDate : undefined,
      });
      toast.success('课程已更新');
    } else {
      const newCourse: ICourse = {
        id: generateId(),
        name: data.name,
        teacher: data.teacher,
        location: data.location,
        dayOfWeek: Number(data.dayOfWeek),
        startPeriod: startP,
        endPeriod: endP,
        color: data.color,
        scope: data.scope,
        startWeek: startW,
        endWeek: endW,
        specificDate: data.scope === 'single-day' ? data.specificDate : undefined,
        createdAt: Date.now(),
      };
      addCourse(newCourse);
      toast.success('课程已添加');
    }
    navigate(-1);
  };

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <PageHeader
        title={isEdit ? '编辑课程' : '添加课程'}
        showBack
      />

      <div className="flex-1 px-4 py-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    课程名称 <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="如：高等数学" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="teacher"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>授课教师</FormLabel>
                    <FormControl>
                      <Input placeholder="教师姓名" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>上课地点</FormLabel>
                    <FormControl>
                      <Input placeholder="教室号" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="dayOfWeek"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    星期 <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择星期" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">周一</SelectItem>
                      <SelectItem value="2">周二</SelectItem>
                      <SelectItem value="3">周三</SelectItem>
                      <SelectItem value="4">周四</SelectItem>
                      <SelectItem value="5">周五</SelectItem>
                      <SelectItem value="6">周六</SelectItem>
                      <SelectItem value="0">周日</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startPeriod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      起始节次 <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="第X节" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {schedule.periods.map((p) => (
                          <SelectItem key={p.period} value={String(p.period)}>
                            第 {p.period} 节 ({p.startTime})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endPeriod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      结束节次 <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="第X节" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {schedule.periods.map((p) => (
                          <SelectItem key={p.period} value={String(p.period)}>
                            第 {p.period} 节 ({p.endTime})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>课程颜色</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap gap-2">
                      {COURSE_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => field.onChange(c)}
                          className={`size-8 rounded-full border-2 transition-transform hover:scale-110 ${
                            field.value === c
                              ? 'border-foreground scale-110'
                              : 'border-transparent'
                          }`}
                          style={{ backgroundColor: c }}
                          aria-label={`选择颜色 ${c}`}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="scope"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>生效范围</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="space-y-2"
                    >
                      <Label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 p-3 hover:bg-muted/30">
                        <RadioGroupItem value="single-day" />
                        <div>
                          <div className="text-sm font-medium">仅当天</div>
                          <div className="text-xs text-muted-foreground">只在指定日期有效</div>
                        </div>
                      </Label>
                      <Label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 p-3 hover:bg-muted/30">
                        <RadioGroupItem value="this-week" />
                        <div>
                          <div className="text-sm font-medium">本周</div>
                          <div className="text-xs text-muted-foreground">仅本周有效</div>
                        </div>
                      </Label>
                      <Label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 p-3 hover:bg-muted/30">
                        <RadioGroupItem value="whole-semester" />
                        <div>
                          <div className="text-sm font-medium">本学期</div>
                          <div className="text-xs text-muted-foreground">按周次范围生效</div>
                        </div>
                      </Label>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchScope === 'single-day' && (
              <FormField
                control={form.control}
                name="specificDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>具体日期</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {watchScope !== 'single-day' && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startWeek"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>起始周</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endWeek"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>结束周</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <Button type="submit" className="w-full">
              {isEdit ? '保存修改' : '添加课程'}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
