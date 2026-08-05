import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Info, CheckCircle, FileSpreadsheet, FileJson, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import PageHeader from '@/components/PageHeader';
import { useCourses, useSemester } from '@/hooks/useTimetable';
import { ICourse } from '@/data/types';
import {
  detectTimetableDate,
  parseTimetableExcel,
  parsedCourseToICourse,
  ParsedCourseInfo,
} from '@/data/excelParser';
import { toast } from 'sonner';
import {
  addDays,
  formatDate,
  getMaxCourseWeek,
  getMinCourseWeek,
  normalizeCourseWeeks,
  parseDate,
  startOfWeek,
} from '@/data/utils';

const EXAMPLE_JSON = `[
  {
    "name": "高等数学",
    "teacher": "张教授",
    "location": "教学楼A101",
    "dayOfWeek": 1,
    "startPeriod": 1,
    "endPeriod": 2,
    "color": "#6750A4",
    "startWeek": 1,
    "endWeek": 16,
    "scope": "whole-semester"
  },
  {
    "name": "大学英语",
    "teacher": "李老师",
    "location": "外语楼B203",
    "dayOfWeek": 3,
    "startPeriod": 3,
    "endPeriod": 4,
    "color": "#386F56",
    "startWeek": 1,
    "endWeek": 16,
    "scope": "whole-semester"
  }
]`;

const FIELD_DESCRIPTIONS = [
  { name: 'name', desc: '课程名称（必填）' },
  { name: 'teacher', desc: '授课教师' },
  { name: 'location', desc: '上课地点' },
  { name: 'dayOfWeek', desc: '星期几，0=周日，1=周一，…，6=周六' },
  { name: 'startPeriod', desc: '起始节次（从1开始）' },
  { name: 'endPeriod', desc: '结束节次' },
  { name: 'color', desc: '课程颜色（十六进制，如 #6750A4）' },
  { name: 'startWeek', desc: '起始周次' },
  { name: 'endWeek', desc: '结束周次' },
  { name: 'weekRange', desc: '周次数组（用于离散周次，如第2、4、6周）' },
  { name: 'scope', desc: '生效范围：single-day / this-week / whole-semester' },
  { name: 'specificDate', desc: '具体日期（scope=single-day 时有效，YYYY-MM-DD）' },
];

const DAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

type DetectedDate = {
  date: string;
  /** true 表示该日期是原课表的学期第 1 周，需要随课程周次一起平移 */
  isSourceSemesterStart: boolean;
};

function normalizeExplicitDate(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const match = value.trim().match(/^((?:19|20)\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})日?$/);
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    return undefined;
  }

  return formatDate(date);
}

function findJsonDate(parsed: unknown): DetectedDate | undefined {
  if (!parsed || typeof parsed !== 'object') return undefined;

  if (!Array.isArray(parsed)) {
    const object = parsed as Record<string, unknown>;
    const semesterDate = normalizeExplicitDate(object.semesterStart)
      ?? normalizeExplicitDate(object.startDate);
    if (semesterDate) {
      return { date: semesterDate, isSourceSemesterStart: true };
    }
  }

  const courseData = Array.isArray(parsed)
    ? parsed
    : (parsed as Record<string, unknown>).courses;
  if (!Array.isArray(courseData)) return undefined;

  const specificDates = courseData
    .map((item) => (
      item && typeof item === 'object'
        ? normalizeExplicitDate((item as Record<string, unknown>).specificDate)
        : undefined
    ))
    .filter((date): date is string => Boolean(date))
    .sort();

  return specificDates[0]
    ? { date: specificDates[0], isSourceSemesterStart: false }
    : undefined;
}

export default function ImportPage() {
  const navigate = useNavigate();
  const { courses, replaceAll } = useCourses();
  const { semester, updateSemester } = useSemester();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supportingFileInputRef = useRef<HTMLInputElement>(null);

  // JSON 导入相关
  const [jsonText, setJsonText] = useState('');
  const [jsonParsedCourses, setJsonParsedCourses] = useState<ICourse[] | null>(null);
  const [jsonDetectedDate, setJsonDetectedDate] = useState<DetectedDate | undefined>();
  const [jsonError, setJsonError] = useState('');

  // Excel 导入相关
  const [excelFileName, setExcelFileName] = useState('');
  const [excelParsedCourses, setExcelParsedCourses] = useState<ParsedCourseInfo[] | null>(null);
  const [excelDetectedDate, setExcelDetectedDate] = useState<DetectedDate | undefined>();
  const [excelError, setExcelError] = useState('');
  const [excelParsing, setExcelParsing] = useState(false);

  // 通用状态
  const [mode, setMode] = useState<'merge' | 'overwrite'>('merge');
  const [importTab, setImportTab] = useState<'excel' | 'json'>('excel');
  const [showDateDialog, setShowDateDialog] = useState(false);
  const [pendingCourses, setPendingCourses] = useState<ICourse[] | null>(null);
  const [firstWeekDate, setFirstWeekDate] = useState('');
  const [supportingFileName, setSupportingFileName] = useState('');
  const [supportingFileError, setSupportingFileError] = useState('');
  const [supportingFileParsing, setSupportingFileParsing] = useState(false);

  const handleJsonParse = () => {
    setJsonError('');
    setJsonParsedCourses(null);
    setJsonDetectedDate(undefined);

    const trimmed = jsonText.trim();
    if (!trimmed) {
      setJsonError('请输入 JSON 数据');
      return;
    }

    try {
      const parsed = JSON.parse(trimmed);
      const data = Array.isArray(parsed) ? parsed : parsed.courses;

      if (!Array.isArray(data)) {
        setJsonError('数据格式错误：应为课程数组或包含 courses 字段的对象');
        return;
      }

      // 校验字段
      const validCourses: ICourse[] = data.map((item: any, index: number) => {
        if (!item.name || typeof item.name !== 'string') {
          throw new Error(`第 ${index + 1} 条课程缺少 name 字段`);
        }
        return {
          id: item.id || `${Date.now().toString(36)}_${index}_${Math.random().toString(36).slice(2, 6)}`,
          name: String(item.name),
          teacher: item.teacher ? String(item.teacher) : '',
          location: item.location ? String(item.location) : '',
          dayOfWeek: Number(item.dayOfWeek) || 1,
          startPeriod: Number(item.startPeriod) || 1,
          endPeriod: Number(item.endPeriod) || 1,
          color: item.color || '#6750A4',
          startWeek: Number(item.startWeek) || 1,
          endWeek: Number(item.endWeek) || 16,
          weekRange: Array.isArray(item.weekRange) ? item.weekRange.map(Number) : undefined,
          scope: (['single-day', 'this-week', 'whole-semester'].includes(item.scope)
            ? item.scope
            : 'whole-semester') as ICourse['scope'],
          specificDate: item.specificDate,
          createdAt: Date.now(),
        };
      });

      setJsonParsedCourses(validCourses);
      setJsonDetectedDate(findJsonDate(parsed));
      toast.success(`成功解析 ${validCourses.length} 门课程`);
    } catch (e) {
      console.error('JSON parse error:', e);
      setJsonError(e instanceof Error ? e.message : 'JSON 解析失败');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelError('');
    setExcelParsedCourses(null);
    setExcelDetectedDate(undefined);
    setExcelParsing(true);
    setExcelFileName(file.name);

    try {
      const parsed = await parseTimetableExcel(file);
      setExcelParsedCourses(parsed.courses);
      setExcelDetectedDate(parsed.detectedStartDate
        ? { date: parsed.detectedStartDate, isSourceSemesterStart: true }
        : undefined);
      toast.success(`成功解析 ${parsed.courses.length} 门课程`);
    } catch (err) {
      console.error('Excel parse error:', err);
      setExcelError(err instanceof Error ? err.message : 'Excel 解析失败');
      setExcelParsedCourses(null);
    } finally {
      setExcelParsing(false);
    }

    // 重置 input 以便同一文件可以再次选择
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const finishOverwriteImport = (
    coursesToImport: ICourse[],
    referenceDate: string,
    isSourceSemesterStart: boolean,
  ) => {
    const sourceMinWeek = Math.max(1, getMinCourseWeek(coursesToImport));
    const normalizedCourses = normalizeCourseWeeks(coursesToImport);
    const referenceWeekStart = startOfWeek(parseDate(referenceDate));
    const importStart = isSourceSemesterStart
      ? addDays(referenceWeekStart, (sourceMinWeek - 1) * 7)
      : referenceWeekStart;
    const maxCourseWeek = Math.max(1, getMaxCourseWeek(normalizedCourses));
    const importEnd = addDays(importStart, maxCourseWeek * 7 - 1);

    replaceAll(normalizedCourses);
    updateSemester({
      ...(semester ?? { name: '导入课表' }),
      startDate: formatDate(importStart),
      endDate: formatDate(importEnd),
      lastRemindedSemester: undefined,
    });
    setShowDateDialog(false);
    setPendingCourses(null);
    toast.success(`已导入 ${normalizedCourses.length} 门课程（覆盖模式）`);
    navigate(-1);
  };

  const handleImport = () => {
    let coursesToImport: ICourse[] = [];

    if (importTab === 'json' && jsonParsedCourses && jsonParsedCourses.length > 0) {
      coursesToImport = jsonParsedCourses;
    } else if (importTab === 'excel' && excelParsedCourses && excelParsedCourses.length > 0) {
      coursesToImport = excelParsedCourses.map((c) => parsedCourseToICourse(c));
    }

    if (coursesToImport.length === 0) return;

    if (mode === 'overwrite') {
      const detectedDate = importTab === 'json' ? jsonDetectedDate : excelDetectedDate;
      if (detectedDate) {
        finishOverwriteImport(
          coursesToImport,
          detectedDate.date,
          detectedDate.isSourceSemesterStart,
        );
        return;
      }

      setPendingCourses(coursesToImport);
      setFirstWeekDate('');
      setSupportingFileName('');
      setSupportingFileError('');
      setShowDateDialog(true);
      return;
    }

    // 合并模式沿用当前学期时间轴，不改动已有课表的第一周。
    const merged = [...courses, ...coursesToImport];
    replaceAll(merged);
    toast.success(`已导入 ${coursesToImport.length} 门课程（合并模式）`);
    navigate(-1);
  };

  const handleSupportingFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSupportingFileName(file.name);
    setSupportingFileError('');
    setSupportingFileParsing(true);

    try {
      let detectedDate: string | undefined;
      if (file.name.toLowerCase().endsWith('.json')) {
        const parsed = JSON.parse(await file.text());
        detectedDate = findJsonDate(parsed)?.date
          ?? normalizeExplicitDate((parsed as Record<string, unknown>)?.date);
      } else {
        detectedDate = await detectTimetableDate(file);
      }

      if (!detectedDate) {
        throw new Error('文件中没有找到明确的年月日，请直接选择第 1 周周一日期');
      }

      const firstWeekMonday = formatDate(startOfWeek(parseDate(detectedDate)));
      setFirstWeekDate(firstWeekMonday);
      toast.success(`已识别第 1 周周一：${firstWeekMonday}`);
    } catch (error) {
      setSupportingFileError(error instanceof Error ? error.message : '补充课表解析失败');
    } finally {
      setSupportingFileParsing(false);
      if (supportingFileInputRef.current) {
        supportingFileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmFirstWeek = () => {
    if (!pendingCourses || !firstWeekDate) return;
    finishOverwriteImport(pendingCourses, firstWeekDate, false);
  };

  // Excel 统计信息
  const excelStats = (() => {
    if (!excelParsedCourses) return null;
    const uniqueCourses = new Set(excelParsedCourses.map((c) => c.name));
    const daysCount = new Set(excelParsedCourses.map((c) => c.dayOfWeek)).size;
    return { unique: uniqueCourses.size, days: daysCount };
  })();

  const hasPreview = importTab === 'json'
    ? (jsonParsedCourses && jsonParsedCourses.length > 0)
    : (excelParsedCourses && excelParsedCourses.length > 0);

  const previewCount = importTab === 'json'
    ? (jsonParsedCourses?.length ?? 0)
    : (excelParsedCourses?.length ?? 0);

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <PageHeader title="导入课表" showBack />

      <div className="space-y-4 px-4 py-4">
        {/* 导入方式切换 */}
        <Tabs value={importTab} onValueChange={(v) => setImportTab(v as 'excel' | 'json')}>
          <TabsList className="w-full">
            <TabsTrigger value="excel" className="flex-1">
              <FileSpreadsheet className="mr-2 size-4" />
              Excel 导入
            </TabsTrigger>
            <TabsTrigger value="json" className="flex-1">
              <FileJson className="mr-2 size-4" />
              JSON 导入
            </TabsTrigger>
          </TabsList>

          {/* Excel 导入 */}
          <TabsContent value="excel" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">上传课表 Excel</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xls,.xlsx"
                onChange={handleFileSelect}
                className="hidden"
                id="excel-upload"
              />
              <label
                htmlFor="excel-upload"
                className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/60 bg-card px-4 py-8 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <FileSpreadsheet className="size-10 text-muted-foreground" />
                <div className="text-sm font-medium">点击选择 Excel 文件</div>
                <div className="text-xs text-muted-foreground">
                  支持 .xls 和 .xlsx 格式（正方教务系统导出格式）
                </div>
                {excelFileName && (
                  <div className="mt-1 text-xs text-primary">{excelFileName}</div>
                )}
              </label>
              {excelParsing && (
                <p className="text-xs text-muted-foreground">正在解析...</p>
              )}
              {excelError && <p className="text-xs text-destructive">{excelError}</p>}
            </div>

            {/* 格式说明 */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="excel-format">
                <AccordionTrigger className="text-sm font-medium">
                  <span className="flex items-center gap-2">
                    <Info className="size-4" />
                    Excel 格式说明
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p>支持正方教务系统导出的标准课表格式：</p>
                    <ul className="space-y-1 pl-4 list-disc">
                      <li>第一列：节次（如 1-2节、3-4节）</li>
                      <li>列标题：星期一到星期日</li>
                      <li>每个单元格包含：课程名 / 周次范围 / 教室 / 教师</li>
                      <li>同一单元格支持多门课程（空行分隔）</li>
                      <li>周次格式：1-10周、2,4,6周、1-10,13-16周</li>
                    </ul>
                    <p className="pt-1">导入后会自动生成整学期的课表数据。</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Excel 预览 */}
            {excelParsedCourses && excelParsedCourses.length > 0 && (
              <div className="space-y-3 rounded-lg border border-border/60 bg-card p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="size-5 text-emerald-500" />
                  <div>
                    <div className="font-medium">
                      解析成功，共 {excelParsedCourses.length} 条课程记录
                    </div>
                    {excelStats && (
                      <div className="text-xs text-muted-foreground">
                        {excelStats.unique} 门课程 · 覆盖 {excelStats.days} 天
                      </div>
                    )}
                  </div>
                </div>

                {/* 预览列表 */}
                <div className="max-h-[240px] space-y-2 overflow-y-auto">
                  {excelParsedCourses.slice(0, 6).map((c, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-lg bg-muted/50 p-2"
                    >
                      <div
                        className="mt-1 size-3 shrink-0 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{c.name}</div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                          <span>{DAY_NAMES[c.dayOfWeek === 7 ? 0 : c.dayOfWeek]}</span>
                          <span>第{c.startPeriod}-{c.endPeriod}节</span>
                          {c.location && <span>@{c.location}</span>}
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {c.weekRangeText}
                          {c.teacher && ` · ${c.teacher}`}
                        </div>
                      </div>
                    </div>
                  ))}
                  {excelParsedCourses.length > 6 && (
                    <div className="text-center text-xs text-muted-foreground">
                      还有 {excelParsedCourses.length - 6} 条课程记录...
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* JSON 导入 */}
          <TabsContent value="json" className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">JSON 数据</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setJsonText(EXAMPLE_JSON)}
                  className="h-7 px-2 text-xs"
                >
                  填入示例
                </Button>
              </div>
              <Textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder="在此粘贴 JSON 格式的课表数据..."
                className="min-h-[160px] font-mono text-xs"
              />
              {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
            </div>

            <Button onClick={handleJsonParse} className="w-full">
              <Upload className="mr-2 size-4" />
              解析预览
            </Button>

            {/* 格式说明 */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="json-format">
                <AccordionTrigger className="text-sm font-medium">
                  <span className="flex items-center gap-2">
                    <Info className="size-4" />
                    数据格式说明
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p>导入数据应为课程对象数组，支持的字段如下：</p>
                    <ul className="space-y-1 pl-4">
                      {FIELD_DESCRIPTIONS.map((f) => (
                        <li key={f.name}>
                          <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                            {f.name}
                          </code>{' '}
                          — {f.desc}
                        </li>
                      ))}
                    </ul>
                    <p>也支持包含 <code className="rounded bg-muted px-1 py-0.5">courses</code> 字段的对象。</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* JSON 预览 */}
            {jsonParsedCourses && jsonParsedCourses.length > 0 && (
              <div className="space-y-3 rounded-lg border border-border/60 bg-card p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="size-5 text-emerald-500" />
                  <span className="font-medium">
                    解析成功，共 {jsonParsedCourses.length} 门课程
                  </span>
                </div>

                <div className="max-h-[200px] space-y-2 overflow-y-auto">
                  {jsonParsedCourses.slice(0, 5).map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-lg bg-muted/50 p-2"
                    >
                      <div
                        className="size-3 shrink-0 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{c.name}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {c.teacher} · {c.location}
                        </div>
                      </div>
                    </div>
                  ))}
                  {jsonParsedCourses.length > 5 && (
                    <div className="text-center text-xs text-muted-foreground">
                      还有 {jsonParsedCourses.length - 5} 门课程...
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* 导入模式 + 确认按钮 */}
        {hasPreview && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button
                variant={mode === 'merge' ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setMode('merge')}
                className="flex-1"
              >
                合并导入
              </Button>
              <Button
                variant={mode === 'overwrite' ? 'destructive' : 'secondary'}
                size="sm"
                onClick={() => setMode('overwrite')}
                className="flex-1"
              >
                覆盖原有
              </Button>
            </div>

            <Button onClick={handleImport} className="w-full">
              确认导入 {previewCount} 条课程
            </Button>
          </div>
        )}
      </div>

      <Dialog open={showDateDialog} onOpenChange={setShowDateDialog}>
        <DialogContent className="text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="size-5 text-primary" />
              确认课表第 1 周
            </DialogTitle>
            <DialogDescription>
              原课表没有明确年月日，无法根据导入时间推测学期。请选择第 1 周周一，或上传含日期的第一周周课表、第一天日课表。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="first-week-date" className="text-sm font-medium">
                第 1 周周一日期
              </label>
              <Input
                id="first-week-date"
                type="date"
                value={firstWeekDate}
                onChange={(event) => setFirstWeekDate(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                最早出现课程的那一周会重新编号为第 1 周，课程原来的星期不会改变。
              </p>
            </div>

            <div className="space-y-2 border-t border-border/60 pt-4">
              <input
                ref={supportingFileInputRef}
                id="supporting-timetable-upload"
                type="file"
                accept=".xls,.xlsx,.json"
                onChange={handleSupportingFileSelect}
                className="hidden"
              />
              <Button asChild variant="secondary" className="w-full">
                <label htmlFor="supporting-timetable-upload" className="cursor-pointer">
                  <Upload className="mr-2 size-4" />
                  上传含日期的补充课表
                </label>
              </Button>
              {supportingFileName && (
                <p className="truncate text-xs text-muted-foreground">{supportingFileName}</p>
              )}
              {supportingFileParsing && (
                <p className="text-xs text-muted-foreground">正在识别日期...</p>
              )}
              {supportingFileError && (
                <p className="text-xs text-destructive">{supportingFileError}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowDateDialog(false)}>
              暂不导入
            </Button>
            <Button onClick={handleConfirmFirstWeek} disabled={!firstWeekDate || supportingFileParsing}>
              确认并覆盖导入
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
