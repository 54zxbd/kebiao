// EXPORTS: useCourses, useSchedule, useSemester, useCurrentDate
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ICourse,
  IScheduleConfig,
  ISemesterConfig,
  DEFAULT_SCHEDULE,
  STORAGE_KEYS,
} from '@/data/types';
import { DEFAULT_COURSES, DEFAULT_SEMESTER } from '@/data/defaultTimetable';
import { formatDate, parseDate, getWeekNumber, generateId, expandWeekRanges } from '@/data/utils';

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

/* ---------- 课程 ---------- */

export function useCourses() {
  const [courses, setCourses] = useState<ICourse[]>(() =>
    readJSON<ICourse[]>(STORAGE_KEYS.COURSES, DEFAULT_COURSES),
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      writeJSON(STORAGE_KEYS.COURSES, courses);
    }
  }, [courses, loaded]);

  const addCourse = useCallback((course: ICourse) => {
    setCourses((prev) => [...prev, course]);
  }, []);

  const updateCourse = useCallback((id: string, patch: Partial<ICourse>) => {
    setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const deleteCourse = useCallback((id: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const deleteCourseRange = useCallback(
    (course: ICourse, scope: 'this-one' | 'rest-of-week' | 'whole-semester', referenceDate: Date, semesterStart?: string) => {
      if (scope === 'whole-semester') {
        // 本学期全部：直接删除整门课
        setCourses((prev) => prev.filter((c) => c.id !== course.id));
        return;
      }

      // single-day 类型的课程：任何范围都直接删除（只有一次）
      if (course.scope === 'single-day') {
        setCourses((prev) => prev.filter((c) => c.id !== course.id));
        return;
      }

      // 计算当前周次
      const currentWeek = semesterStart
        ? getWeekNumber(referenceDate, parseDate(semesterStart))
        : course.startWeek;

      // 获取课程的所有生效周
      const allWeeks = expandWeekRanges(course);

      if (scope === 'rest-of-week') {
        // 本周剩余：删除当前周及之后的所有周
        const remainingWeeks = allWeeks.filter((w) => w < currentWeek);
        if (remainingWeeks.length === 0) {
          setCourses((prev) => prev.filter((c) => c.id !== course.id));
        } else {
          const newStartWeek = remainingWeeks[0];
          const newEndWeek = remainingWeeks[remainingWeeks.length - 1];
          setCourses((prev) =>
            prev.map((c) =>
              c.id === course.id
                ? {
                    ...c,
                    startWeek: newStartWeek,
                    endWeek: newEndWeek,
                    weekRange: remainingWeeks.length === newEndWeek - newStartWeek + 1
                      ? undefined
                      : remainingWeeks,
                  }
                : c,
            ),
          );
        }
        return;
      }

      // scope === 'this-one' 且是周期课
      // 从周次列表中移除当前周
      const newWeeks = allWeeks.filter((w) => w !== currentWeek);

      if (newWeeks.length === 0) {
        // 没有剩余周次了，删除整门
        setCourses((prev) => prev.filter((c) => c.id !== course.id));
        return;
      }

      const newStartWeek = newWeeks[0];
      const newEndWeek = newWeeks[newWeeks.length - 1];
      const isContinuous = newWeeks.length === newEndWeek - newStartWeek + 1;

      setCourses((prev) =>
        prev.map((c) =>
          c.id === course.id
            ? {
                ...c,
                startWeek: newStartWeek,
                endWeek: newEndWeek,
                weekRange: isContinuous ? undefined : newWeeks,
              }
            : c,
        ),
      );
    },
    [],
  );

  const replaceAll = useCallback((newCourses: ICourse[]) => {
    setCourses(newCourses);
  }, []);

  return useMemo(
    () => ({ courses, loaded, addCourse, updateCourse, deleteCourse, deleteCourseRange, replaceAll }),
    [courses, loaded, addCourse, updateCourse, deleteCourse, deleteCourseRange, replaceAll],
  );
}

/* ---------- 作息 ---------- */

export function useSchedule() {
  const [schedule, setSchedule] = useState<IScheduleConfig>(DEFAULT_SCHEDULE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const data = readJSON<IScheduleConfig>(STORAGE_KEYS.SCHEDULE, DEFAULT_SCHEDULE);
    setSchedule(data);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      writeJSON(STORAGE_KEYS.SCHEDULE, schedule);
    }
  }, [schedule, loaded]);

  const updateSchedule = useCallback((next: IScheduleConfig) => {
    setSchedule(next);
  }, []);

  const resetSchedule = useCallback(() => {
    setSchedule(DEFAULT_SCHEDULE);
  }, []);

  return useMemo(
    () => ({ schedule, loaded, updateSchedule, resetSchedule }),
    [schedule, loaded, updateSchedule, resetSchedule],
  );
}

/* ---------- 学期 ---------- */

export function useSemester() {
  const [semester, setSemester] = useState<ISemesterConfig | null>(() =>
    readJSON<ISemesterConfig>(STORAGE_KEYS.SEMESTER, DEFAULT_SEMESTER),
  );
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      if (semester) {
        writeJSON(STORAGE_KEYS.SEMESTER, semester);
      } else {
        localStorage.removeItem(STORAGE_KEYS.SEMESTER);
      }
    }
  }, [semester, loaded]);

  const updateSemester = useCallback((next: ISemesterConfig) => {
    setSemester(next);
  }, []);

  const markReminded = useCallback((semesterName: string) => {
    setSemester((prev) => (prev ? { ...prev, lastRemindedSemester: semesterName } : prev));
  }, []);

  return useMemo(
    () => ({ semester, loaded, updateSemester, markReminded }),
    [semester, loaded, updateSemester, markReminded],
  );
}

/* ---------- 当前选中日期 ---------- */

export function useCurrentDate() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_DATE);
    if (raw) {
      try {
        setCurrentDate(parseDate(raw));
      } catch {
        setCurrentDate(new Date());
      }
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      writeJSON(STORAGE_KEYS.CURRENT_DATE, formatDate(currentDate));
    }
  }, [currentDate, loaded]);

  return useMemo(() => ({ currentDate, setCurrentDate }), [currentDate]);
}
