import { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarArrowUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSemester, useCourses } from '@/hooks/useTimetable';
import { parseDate } from '@/data/utils';

function NewSemesterDialog() {
  const navigate = useNavigate();
  const { semester, markReminded, loaded: semLoaded } = useSemester();
  const { courses, loaded: coursesLoaded } = useCourses();
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    if (!semLoaded || !coursesLoaded) return;
    if (!semester) return;
    if (courses.length === 0) return;

    const now = new Date();
    const endDate = parseDate(semester.endDate);

    // 如果当前日期已过学期结束日期，且还没提醒过这个"新"学期
    // 简化判断：当前日期 > 结束日期 + 30天，视为新学期可能开始
    if (now.getTime() > endDate.getTime() + 30 * 86400000) {
      const semesterKey = semester.name + '_new';
      if (semester.lastRemindedSemester !== semesterKey) {
        setShowDialog(true);
      }
    }
  }, [semester, semLoaded, coursesLoaded, courses.length]);

  const handleUpdate = () => {
    if (semester) {
      markReminded(semester.name + '_new');
    }
    setShowDialog(false);
    navigate('/import');
  };

  const handleLater = () => {
    if (semester) {
      markReminded(semester.name + '_new');
    }
    setShowDialog(false);
  };

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarArrowUp className="size-5 text-primary" />
            新学期提醒
          </DialogTitle>
          <DialogDescription>
            新学期已开始，您的课表似乎还是上学期的。建议尽快更新课表以保持准确。
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <p className="text-muted-foreground">
            当前学期：<span className="font-medium text-foreground">{semester?.name || '未设置'}</span>
          </p>
        </div>

        <DialogFooter className="flex-row gap-2">
          <Button variant="secondary" onClick={handleLater} className="flex-1">
            稍后再说
          </Button>
          <Button onClick={handleUpdate} className="flex-1">
            立即更新
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default memo(NewSemesterDialog);
