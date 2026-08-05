import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Clock,
  Calendar as CalendarIcon,
  Download,
  Upload,
  Moon,
  Smartphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PageHeader from '@/components/PageHeader';
import { useSchedule, useSemester, useCourses } from '@/hooks/useTimetable';
import { IPeriod, IScheduleConfig, ISemesterConfig } from '@/data/types';
import { toast } from 'sonner';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { schedule, updateSchedule, resetSchedule } = useSchedule();
  const { semester, updateSemester } = useSemester();
  const { courses } = useCourses();
  const { canInstall, installed, install } = usePWAInstall();

  // 作息编辑状态
  const [periodsDraft, setPeriodsDraft] = useState<IPeriod[]>(schedule.periods);
  const [lunchStart, setLunchStart] = useState(schedule.lunchStartTime);
  const [lunchEnd, setLunchEnd] = useState(schedule.lunchEndTime);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);

  // 学期编辑状态
  const [semesterDraft, setSemesterDraft] = useState<ISemesterConfig>(
    semester ?? {
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 120 * 86400000).toISOString().slice(0, 10),
      name: '',
    },
  );
  const [semesterDialogOpen, setSemesterDialogOpen] = useState(false);

  const openScheduleDialog = () => {
    setPeriodsDraft(schedule.periods);
    setLunchStart(schedule.lunchStartTime);
    setLunchEnd(schedule.lunchEndTime);
    setScheduleDialogOpen(true);
  };

  const addPeriod = () => {
    const next = periodsDraft.length + 1;
    setPeriodsDraft([
      ...periodsDraft,
      { period: next, startTime: '19:00', endTime: '19:45' },
    ]);
  };

  const removePeriod = () => {
    if (periodsDraft.length <= 1) return;
    setPeriodsDraft(periodsDraft.slice(0, -1));
  };

  const updatePeriodTime = (index: number, field: 'startTime' | 'endTime', value: string) => {
    const next = [...periodsDraft];
    next[index] = { ...next[index], [field]: value };
    setPeriodsDraft(next);
  };

  const saveSchedule = () => {
    const next: IScheduleConfig = {
      periods: periodsDraft,
      lunchStartTime: lunchStart,
      lunchEndTime: lunchEnd,
    };
    updateSchedule(next);
    setScheduleDialogOpen(false);
    toast.success('作息时间已更新');
  };

  const handleResetSchedule = () => {
    resetSchedule();
    setScheduleDialogOpen(false);
    toast.success('已恢复默认作息');
  };

  const openSemesterDialog = () => {
    if (semester) setSemesterDraft(semester);
    setSemesterDialogOpen(true);
  };

  const saveSemester = () => {
    if (!semesterDraft.name.trim()) {
      toast.error('请填写学期名称');
      return;
    }
    if (!semesterDraft.startDate || !semesterDraft.endDate) {
      toast.error('请填写学期起止日期');
      return;
    }
    updateSemester(semesterDraft);
    setSemesterDialogOpen(false);
    toast.success('学期配置已保存');
  };

  const handleExport = () => {
    const data = {
      courses,
      schedule,
      semester,
      exportedAt: new Date().toISOString(),
      version: 1,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timetable-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('导出成功');
  };

  const handleInstall = async () => {
    const accepted = await install();
    if (accepted) toast.success('已添加到手机主屏幕');
  };

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <PageHeader title="设置" subtitle="管理你的课表" />

      <div className="space-y-4 px-4 py-3">
        {/* 作息时间 */}
        <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              onClick={openScheduleDialog}
              className="flex w-full items-center gap-3 rounded-lg border border-border/60 bg-card p-4 text-left transition-colors hover:bg-muted/50"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Clock className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">作息时间</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {schedule.periods.length} 节课 · 默认洛阳理工学院
                </div>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
            <DialogHeader>
              <DialogTitle>作息时间设置</DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2">
              {periodsDraft.map((p, i) => (
                <div key={p.period} className="flex items-center gap-3">
                  <div className="w-10 shrink-0 text-sm font-medium">
                    第{p.period}节
                  </div>
                  <div className="flex flex-1 items-center gap-2">
                    <Input
                      type="time"
                      value={p.startTime}
                      onChange={(e) => updatePeriodTime(i, 'startTime', e.target.value)}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground">至</span>
                    <Input
                      type="time"
                      value={p.endTime}
                      onChange={(e) => updatePeriodTime(i, 'endTime', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              ))}

              <div className="flex gap-2 pt-2">
                <Button variant="secondary" size="sm" onClick={addPeriod} className="flex-1">
                  增加一节
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={removePeriod}
                  disabled={periodsDraft.length <= 1}
                  className="flex-1"
                >
                  减少一节
                </Button>
              </div>

              <div className="pt-4">
                <div className="mb-2 text-sm font-medium">午休时间</div>
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={lunchStart}
                    onChange={(e) => setLunchStart(e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground">至</span>
                  <Input
                    type="time"
                    value={lunchEnd}
                    onChange={(e) => setLunchEnd(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="flex-row gap-2">
              <Button variant="secondary" onClick={handleResetSchedule} className="flex-1">
                恢复默认
              </Button>
              <Button onClick={saveSchedule} className="flex-1">
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 学期配置 */}
        <Dialog open={semesterDialogOpen} onOpenChange={setSemesterDialogOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              onClick={openSemesterDialog}
              className="flex w-full items-center gap-3 rounded-lg border border-border/60 bg-card p-4 text-left transition-colors hover:bg-muted/50"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <CalendarIcon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">学期配置</div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">
                  {semester?.name || '未设置，点击配置'}
                </div>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>学期配置</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="sem-name">学期名称</Label>
                <Input
                  id="sem-name"
                  value={semesterDraft.name}
                  onChange={(e) =>
                    setSemesterDraft({ ...semesterDraft, name: e.target.value })
                  }
                  placeholder="如：2024-2025 学年第一学期"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sem-start">开学日期</Label>
                <Input
                  id="sem-start"
                  type="date"
                  value={semesterDraft.startDate}
                  onChange={(e) =>
                    setSemesterDraft({ ...semesterDraft, startDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sem-end">学期结束日期</Label>
                <Input
                  id="sem-end"
                  type="date"
                  value={semesterDraft.endDate}
                  onChange={(e) =>
                    setSemesterDraft({ ...semesterDraft, endDate: e.target.value })
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button onClick={saveSemester}>保存</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 数据管理 */}
        <button
          type="button"
          onClick={handleInstall}
          disabled={installed || !canInstall}
          className="flex w-full items-center gap-3 rounded-lg border border-border/60 bg-card p-4 text-left transition-colors hover:bg-muted/50 disabled:cursor-default disabled:opacity-80"
        >
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Smartphone className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">安装到手机</div>
            <div className="mt-0.5 truncate text-xs text-muted-foreground">
              {installed ? '已安装到主屏幕' : canInstall ? '添加到安卓主屏幕' : '请使用浏览器菜单添加'}
            </div>
          </div>
          <span className="text-xs text-muted-foreground">{installed ? '已安装' : 'PWA'}</span>
        </button>

        {/* 数据管理 */}
        <div className="overflow-hidden rounded-lg border border-border/60 bg-card">
          <button
            type="button"
            onClick={() => navigate('/import')}
            className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/50"
          >
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Upload className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">导入课表</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                支持 Excel 课表导入和 JSON 数据导入
              </div>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </button>

          <div className="h-px bg-border/40" />

          <button
            type="button"
            onClick={handleExport}
            className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/50"
          >
            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Download className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">导出备份</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                导出全部课程与配置
              </div>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </div>

        {/* 主题 */}
        <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card p-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Moon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">显示主题</div>
            <div className="mt-0.5 text-xs text-muted-foreground">跟随系统设置自动切换</div>
          </div>
          <span className="text-xs text-muted-foreground">自动</span>
        </div>

        {/* 版本信息 */}
        <div className="py-6 text-center text-xs text-muted-foreground">
          课程表 v1.0.0 · 纯本地存储
        </div>
      </div>
    </div>
  );
}
