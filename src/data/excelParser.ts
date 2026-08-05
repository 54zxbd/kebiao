// EXPORTS: parseTimetableExcel, detectTimetableDate, ParsedCourseInfo, ParsedTimetableExcel
import * as XLSX from 'xlsx';
import { ICourse, COURSE_COLORS } from './types';
import { parseWeekRange, generateId } from './utils';

/** 解析出的课程信息（预览用） */
export interface ParsedCourseInfo {
  name: string;
  teacher: string;
  location: string;
  dayOfWeek: number; // 1-7 (1=周一, 7=周日)，转为 0-6 (0=周日) 存储
  startPeriod: number;
  endPeriod: number;
  weekRange: number[];
  weekRangeText: string; // 原始周次字符串，用于展示
  color: string;
}

export interface ParsedTimetableExcel {
  courses: ParsedCourseInfo[];
  /** 文件中能明确识别出的最早日期，格式 YYYY-MM-DD */
  detectedStartDate?: string;
}

function formatDetectedDate(year: number, month: number, day: number): string | undefined {
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    return undefined;
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function detectDateInRows(data: string[][]): string | undefined {
  const dates: string[] = [];
  const datePattern = /((?:19|20)\d{2})\s*[年./-]\s*(\d{1,2})\s*[月./-]\s*(\d{1,2})\s*日?/g;

  for (const row of data) {
    for (const cell of row) {
      const text = String(cell ?? '');
      for (const match of text.matchAll(datePattern)) {
        const date = formatDetectedDate(Number(match[1]), Number(match[2]), Number(match[3]));
        if (date) dates.push(date);
      }
    }
  }

  return dates.sort()[0];
}

/** 从包含明确年月日的周课表或日课表中识别最早日期。 */
export async function detectTimetableDate(file: File): Promise<string | undefined> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      raw: false,
    }) as string[][];
    const detectedDate = detectDateInRows(data);
    if (detectedDate) return detectedDate;
  }

  return undefined;
}

/**
 * 解析正方教务系统格式的 Excel 课表
 * @param file Excel 文件（.xls 或 .xlsx）
 * @returns 解析出的课程列表
 */
export async function parseTimetableExcel(file: File): Promise<ParsedTimetableExcel> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  // 取第一个 sheet
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('Excel 文件中没有找到工作表');
  }
  const sheet = workbook.Sheets[firstSheetName];

  // 转为二维数组（保留空单元格）
  const data: string[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as string[][];

  if (data.length === 0) {
    throw new Error('Excel 文件内容为空');
  }

  // 1. 找到表头行（包含"节次"和"星期一"等关键词）
  const headerRowIndex = findHeaderRow(data);
  if (headerRowIndex === -1) {
    throw new Error('未找到课表表头行，请确认文件格式是否正确');
  }

  const headerRow = data[headerRowIndex];

  // 2. 确定星期列的位置（周一到周日）
  const dayColumns = findDayColumns(headerRow);
  if (dayColumns.length === 0) {
    throw new Error('未在表头中找到星期列');
  }

  // 3. 确定节次列的位置（第一列通常是节次）
  const periodColIndex = findPeriodColumn(headerRow);

  // 4. 遍历数据行，解析每一行的节次和课程
  const courses: ParsedCourseInfo[] = [];
  const colorAssignments = new Map<string, string>(); // 课程名 -> 颜色
  let colorIndex = 0;

  for (let rowIdx = headerRowIndex + 1; rowIdx < data.length; rowIdx++) {
    const row = data[rowIdx];
    if (!row || row.length === 0) continue;

    // 从节次列提取节次范围
    const periodCell = row[periodColIndex] || '';
    const periodRange = parsePeriodCell(periodCell);
    if (!periodRange) continue; // 不是有效节次行，跳过

    const { startPeriod, endPeriod } = periodRange;

    // 遍历每个星期列
    for (const { dayOfWeek, colIndex } of dayColumns) {
      const cellText = row[colIndex] || '';
      if (!cellText.trim()) continue;

      // 解析单元格中的课程（可能有多门，用空行分隔）
      const cellCourses = parseCourseCell(cellText);

      for (const cellCourse of cellCourses) {
        // 分配颜色
        let color = colorAssignments.get(cellCourse.name);
        if (!color) {
          color = COURSE_COLORS[colorIndex % COURSE_COLORS.length];
          colorAssignments.set(cellCourse.name, color);
          colorIndex++;
        }

        courses.push({
          name: cellCourse.name,
          teacher: cellCourse.teacher,
          location: cellCourse.location,
          dayOfWeek, // 1-7
          startPeriod,
          endPeriod,
          weekRange: cellCourse.weekRange,
          weekRangeText: cellCourse.weekRangeText,
          color,
        });
      }
    }
  }

  if (courses.length === 0) {
    throw new Error('未解析到任何课程，请检查文件格式');
  }

  return {
    courses,
    detectedStartDate: detectDateInRows(data),
  };
}

/** 查找表头行索引（包含"节次"和"星期一"） */
function findHeaderRow(data: string[][]): number {
  for (let i = 0; i < Math.min(data.length, 10); i++) {
    const row = data[i];
    const rowStr = row.join(' ');
    if (rowStr.includes('节次') && rowStr.includes('星期一')) {
      return i;
    }
    // 兼容"节 次"或"星期"等变体
    if (/节[次\s]?/.test(rowStr) && /星期[一二三四五六日]/.test(rowStr)) {
      return i;
    }
  }
  return -1;
}

/** 星期列描述 */
interface DayColumn {
  dayOfWeek: number; // 1=周一, 2=周二, ..., 7=周日
  colIndex: number;
}

/** 找出所有星期列的位置 */
function findDayColumns(headerRow: string[]): DayColumn[] {
  const result: DayColumn[] = [];
  const dayMap: Record<string, number> = {
    星期一: 1,
    星期二: 2,
    星期三: 3,
    星期四: 4,
    星期五: 5,
    星期六: 6,
    星期日: 7,
    周一: 1,
    周二: 2,
    周三: 3,
    周四: 4,
    周五: 5,
    周六: 6,
    周日: 7,
  };

  for (let i = 0; i < headerRow.length; i++) {
    const cell = (headerRow[i] || '').trim();
    for (const [key, day] of Object.entries(dayMap)) {
      if (cell.includes(key)) {
        result.push({ dayOfWeek: day, colIndex: i });
        break;
      }
    }
  }

  return result.sort((a, b) => a.colIndex - b.colIndex);
}

/** 找出节次列索引 */
function findPeriodColumn(headerRow: string[]): number {
  for (let i = 0; i < headerRow.length; i++) {
    const cell = (headerRow[i] || '').trim();
    if (cell.includes('节次') || cell.includes('节 次') || /^节\s*次$/.test(cell)) {
      return i;
    }
  }
  // 找不到就默认第0列
  return 0;
}

/** 节次范围解析结果 */
interface PeriodRange {
  startPeriod: number;
  endPeriod: number;
}

/**
 * 解析节次单元格，提取起始和结束节次
 * 支持格式：
 *   "1-2节 08:00:00-09:40:00"
 *   "第1-2节"
 *   "1,2节"
 *   "第一节"
 */
function parsePeriodCell(cell: string): PeriodRange | null {
  if (!cell) return null;
  const text = cell.replace(/\s+/g, '');

  // 匹配 "X-Y节" 或 "第X-Y节" 格式
  const rangeMatch = text.match(/(\d+)[-～~,，、](\d+)节?/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start) {
      return { startPeriod: start, endPeriod: end };
    }
  }

  // 匹配单节 "第X节" 或 "X节"
  const singleMatch = text.match(/第?(\d+)节/);
  if (singleMatch) {
    const p = parseInt(singleMatch[1], 10);
    if (!isNaN(p) && p > 0) {
      return { startPeriod: p, endPeriod: p };
    }
  }

  // 匹配开头就是数字的节次行（如 "1-2"）
  const simpleMatch = text.match(/^(\d+)[-～~](\d+)/);
  if (simpleMatch) {
    const start = parseInt(simpleMatch[1], 10);
    const end = parseInt(simpleMatch[2], 10);
    if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start) {
      return { startPeriod: start, endPeriod: end };
    }
  }

  return null;
}

/** 单元格内单门课程解析结果 */
interface CellCourse {
  name: string;
  teacher: string;
  location: string;
  weekRange: number[];
  weekRangeText: string;
}

/**
 * 解析一个课程单元格，可能包含多门课程（空行分隔）
 * 每门课程一般4行：课程名 / 周次 / 教室 / 教师
 * 但顺序可能有变体，需要智能识别
 */
function parseCourseCell(cellText: string): CellCourse[] {
  // 按换行符分割，去除空行
  const lines = cellText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return [];

  // 尝试将行分割为多门课程的分组
  // 策略：每遇到一个"周次行"后接 1-2 行（教室+教师），再下一个课程名开始新分组
  // 简化策略：先找所有"周次行"的位置，每个课程以周次行结束或开始
  const courses: CellCourse[] = [];

  // 找出包含"周"字的行索引（周次行）
  const weekLineIndices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (isWeekLine(lines[i])) {
      weekLineIndices.push(i);
    }
  }

  if (weekLineIndices.length === 0) {
    // 没有找到周次行，可能是只有一门课且格式特殊，尝试直接解析
    const course = tryParseSingleCourse(lines);
    if (course) return [course];
    return [];
  }

  // 每门课程 = [课程名...] + [周次行] + [教室?] + [教师?]
  // 以周次行为锚点，向前找课程名，向后找教室和教师
  for (let w = 0; w < weekLineIndices.length; w++) {
    const weekIdx = weekLineIndices[w];
    const nextWeekIdx = w < weekLineIndices.length - 1 ? weekLineIndices[w + 1] : lines.length;

    // 教务表按“课程名 / 周次 / 教室 / 教师”排列；多门课连续时，上一门课的元数据位于前一个周次后，
    // 因此当前周次前的最后一行始终是当前课程名。不要用中文长度判断教师名，以免误判“半导体物理”等课程。
    const name = lines[weekIdx - 1] || '未知课程';
    const weekRangeText = lines[weekIdx];
    const weekRange = parseWeekRange(weekRangeText);

    // 教室和教师：周次行后面，下一个周次行之前
    const postLines = lines.slice(weekIdx + 1, nextWeekIdx);
    let location = '';
    let teacher = '';

    for (const line of postLines) {
      if (location && teacher) break;
      if (!location && looksLikeLocation(line)) {
        location = line;
      } else if (!teacher && looksLikeTeacher(line)) {
        teacher = line;
      } else if (!location) {
        // 不确定的先算地点
        location = line;
      } else if (!teacher) {
        teacher = line;
      }
    }

    courses.push({
      name,
      teacher,
      location,
      weekRange,
      weekRangeText,
    });
  }

  return courses;
}

/** 尝试解析单门课程（无周次行的特殊情况） */
function tryParseSingleCourse(lines: string[]): CellCourse | null {
  if (lines.length === 0) return null;
  const name = lines[0] || '未知课程';
  let location = '';
  let teacher = '';

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!location && looksLikeLocation(line)) {
      location = line;
    } else if (!teacher && looksLikeTeacher(line)) {
      teacher = line;
    } else if (!location) {
      location = line;
    } else if (!teacher) {
      teacher = line;
    }
  }

  return {
    name,
    teacher,
    location,
    weekRange: [1],
    weekRangeText: '全学期',
  };
}

/** 是否为周次行（包含"周"字且有数字） */
function isWeekLine(line: string): boolean {
  if (!line.includes('周')) return false;
  // 必须包含数字或"全"字
  return /\d/.test(line) || line.includes('全');
}

/** 是否像教室名（字母+数字组合，或包含"楼/室/教/堂"等） */
function looksLikeLocation(line: string): boolean {
  if (!line) return false;
  if (line.length > 30) return false;
  // 包含楼、室、教、堂、馆、厅、房、舍、场等字
  if (/[楼室教馆厅房舍场院]/.test(line)) return true;
  // 纯字母+数字组合（如 XB418, XC210, A101）
  if (/^[A-Za-z]{1,4}\d{2,4}[A-Za-z]?$/.test(line)) return true;
  // 字母数字混合，长度适中
  if (/^[A-Za-z0-9\u4e00-\u9fa5]{2,15}$/.test(line) && /\d/.test(line) && /[A-Za-z\u4e00-\u9fa5]/.test(line)) {
    return true;
  }
  return false;
}

/** 是否像教师名（2-4个中文字，或常见英文名格式） */
function looksLikeTeacher(line: string): boolean {
  if (!line) return false;
  if (line.length > 20) return false;
  // 2-4 个纯中文
  if (/^[\u4e00-\u9fa5]{2,4}$/.test(line)) return true;
  // 英文名（首字母大写）
  if (/^[A-Z][a-z]+(\s[A-Z][a-z]+)*$/.test(line)) return true;
  // 含"老师/教授/讲师"等称谓
  if (/[老师教授讲师导师]/g.test(line)) return true;
  return false;
}

/**
 * 将 ParsedCourseInfo 转换为 ICourse
 * @param parsed 解析出的课程信息
 * @param semesterStart 学期开始日期字符串（用于生成具体日期，此处不需要）
 */
export function parsedCourseToICourse(parsed: ParsedCourseInfo): ICourse {
  const weekRange = parsed.weekRange.length > 0 ? parsed.weekRange : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  const sortedWeeks = [...weekRange].sort((a, b) => a - b);
  const startWeek = sortedWeeks[0] || 1;
  const endWeek = sortedWeeks[sortedWeeks.length - 1] || 16;

  return {
    id: generateId(),
    name: parsed.name,
    teacher: parsed.teacher,
    location: parsed.location,
    dayOfWeek: parsed.dayOfWeek === 7 ? 0 : parsed.dayOfWeek, // 周日转为 0
    startPeriod: parsed.startPeriod,
    endPeriod: parsed.endPeriod,
    color: parsed.color,
    startWeek,
    endWeek,
    weekRange: sortedWeeks,
    scope: 'whole-semester',
    createdAt: Date.now(),
  };
}
