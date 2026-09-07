// EXPORTS: formatDate, parseDate, isSameDay, addDays, startOfWeek, getWeekNumber, getCurrentWeek,
//   timeToMinutes, isCourseActive, getCourseStatus, generateId, getDayLabel, getWeekdayName,
//   getDateRangeOfWeek, parseWeekRange, expandWeekRanges, isWeekInRange

import { IScheduleConfig, ICourse } from './types';

/** 格式化日期为 YYYY-MM-DD */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 解析 YYYY-MM-DD 为 Date（本地时间） */
export function parseDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** 是否同一天 */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** 日期加减天数 */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** 所在周的周一（周一为一周开始） */
export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=周日
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** 计算某日期是学期的第几周（从第1周开始） */
export function getWeekNumber(date: Date, semesterStart: Date): number {
  const start = startOfWeek(semesterStart);
  const target = startOfWeek(date);
  const diffMs = target.getTime() - start.getTime();
  const week = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
  return week;
}

/** 获取当前周次 */
export function getCurrentWeek(semesterStart: string): number {
  return getWeekNumber(new Date(), parseDate(semesterStart));
}

/** HH:mm 转分钟数 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** 课程状态：'ongoing' | 'upcoming' | 'finished' */
export type CourseStatus = 'ongoing' | 'upcoming' | 'finished';

/**
 * 判断某门课在给定日期+当前时间的状态
 */
export function getCourseStatus(
  course: ICourse,
  schedule: IScheduleConfig,
  date: Date,
): CourseStatus {
  const nowMinutes = date.getHours() * 60 + date.getMinutes();
  const startPeriod = schedule.periods.find((p) => p.period === course.startPeriod);
  const endPeriod = schedule.periods.find((p) => p.period === course.endPeriod);
  if (!startPeriod || !endPeriod) return 'upcoming';

  const startMin = timeToMinutes(startPeriod.startTime);
  const endMin = timeToMinutes(endPeriod.endTime);

  if (nowMinutes < startMin) return 'upcoming';
  // 下课满 5 分钟后才显示"已结束"（缓冲，避免刚下课立即变灰）
  if (nowMinutes >= endMin + 5) return 'finished';
  return 'ongoing';
}

/** 判断某周是否在课程周次范围内（支持 weekRange 离散周 + startWeek/endWeek 连续周） */
export function isWeekInRange(course: ICourse, weekNum: number): boolean {
  if (course.weekRange && course.weekRange.length > 0) {
    return course.weekRange.includes(weekNum);
  }
  return weekNum >= course.startWeek && weekNum <= course.endWeek;
}

/** 检查课程是否在给定日期有效 */
export function isCourseOnDate(course: ICourse, date: Date, semesterStart: string): boolean {
  const weekNum = getWeekNumber(date, parseDate(semesterStart));
  const dayOfWeek = date.getDay(); // 0=周日

  // single-day 只匹配具体日期
  if (course.scope === 'single-day') {
    if (!course.specificDate) return false;
    return isSameDay(parseDate(course.specificDate), date);
  }

  // 星期不匹配
  if (course.dayOfWeek !== dayOfWeek) return false;

  // this-week / whole-semester 都检查周次范围
  if (!isWeekInRange(course, weekNum)) return false;

  return true;
}

/** 过滤某天的所有课程，按节次排序 */
export function getCoursesForDate(
  courses: ICourse[],
  date: Date,
  semesterStart: string,
): ICourse[] {
  return courses
    .filter((c) => isCourseOnDate(c, date, semesterStart))
    .sort((a, b) => a.startPeriod - b.startPeriod);
}

/** 生成简单唯一 ID */
export function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 获取某日期的周标签（如 "周一"） */
export function getWeekdayName(date: Date): string {
  const names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return names[date.getDay()];
}

/** 格式化日期显示（如 "2月14日 周五"） */
export function getDayLabel(date: Date): string {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${m}月${d}日 ${getWeekdayName(date)}`;
}

/** 获取某周的日期范围标签 */
export function getDateRangeOfWeek(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  return `${weekStart.getMonth() + 1}.${weekStart.getDate()} - ${end.getMonth() + 1}.${end.getDate()}`;
}

/** 从一节的起止时间获取展示字符串 */
export function getPeriodTimeLabel(
  schedule: IScheduleConfig,
  startPeriod: number,
  endPeriod: number,
): string {
  const s = schedule.periods.find((p) => p.period === startPeriod);
  const e = schedule.periods.find((p) => p.period === endPeriod);
  if (!s || !e) return '';
  if (startPeriod === endPeriod) return `${s.startTime}-${s.endTime}`;
  return `${s.startTime}-${e.endTime}`;
}

/**
 * 解析周次范围字符串，返回周次数组
 * 支持格式：
 *   "1-10周" → [1,2,...,10]
 *   "2,4,6,8周" → [2,4,6,8]
 *   "1-10,13-16周" → [1..10,13..16]
 *   "1,3,5,7,9-10,12-14 周" → 混合格式（含空格）
 */
export function parseWeekRange(str: string): number[] {
  if (!str || typeof str !== 'string') return [];
  // 去除空格和"周"字
  let cleaned = str.replace(/\s+/g, '').replace(/周$/, '').replace(/周/g, '');
  if (!cleaned) return [];

  const weeks = new Set<number>();
  const parts = cleaned.split(/[,，、]/);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // 连续周：如 "1-10" 或 "1～10" 或 "1~10"
    const rangeMatch = trimmed.match(/^(\d+)[-～~](\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let w = start; w <= end; w++) {
          weeks.add(w);
        }
      }
      continue;
    }

    // 单周
    const single = parseInt(trimmed, 10);
    if (!isNaN(single) && single > 0) {
      weeks.add(single);
    }
  }

  return Array.from(weeks).sort((a, b) => a - b);
}

/**
 * 将课程的周次范围展开为 weekRange 数组（用于离散周展示）
 * 若已有 weekRange 则直接返回；否则从 startWeek/endWeek 展开
 */
export function expandWeekRanges(course: ICourse): number[] {
  if (course.weekRange && course.weekRange.length > 0) {
    return [...course.weekRange].sort((a, b) => a - b);
  }
  const result: number[] = [];
  for (let w = course.startWeek; w <= course.endWeek; w++) {
    result.push(w);
  }
  return result;
}

/** 获取课表中使用到的最大周次。没有课程时返回 0。 */
export function getMaxCourseWeek(courses: ICourse[]): number {
  return courses.reduce((maxWeek, course) => {
    const weeks = expandWeekRanges(course).filter((week) => Number.isFinite(week) && week > 0);
    return weeks.length > 0 ? Math.max(maxWeek, ...weeks) : maxWeek;
  }, 0);
}

/** 获取课表中使用到的最小周次。没有课程时返回 0。 */
export function getMinCourseWeek(courses: ICourse[]): number {
  const minWeek = courses.reduce((currentMin, course) => {
    const weeks = expandWeekRanges(course).filter((week) => Number.isFinite(week) && week > 0);
    return weeks.length > 0 ? Math.min(currentMin, ...weeks) : currentMin;
  }, Number.POSITIVE_INFINITY);

  return Number.isFinite(minWeek) ? minWeek : 0;
}

/** 将课表最早出现的周次平移为第 1 周，保持星期和节次不变。 */
export function normalizeCourseWeeks(courses: ICourse[]): ICourse[] {
  const minWeek = getMinCourseWeek(courses);
  if (minWeek <= 1) return courses;

  const offset = minWeek - 1;
  return courses.map((course) => {
    const shiftedWeeks = course.weekRange
      ?.map((week) => week - offset)
      .filter((week) => week > 0);

    return {
      ...course,
      startWeek: Math.max(1, course.startWeek - offset),
      endWeek: Math.max(1, course.endWeek - offset),
      weekRange: shiftedWeeks && shiftedWeeks.length > 0 ? shiftedWeeks : undefined,
    };
  });
}
