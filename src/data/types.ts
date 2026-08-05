// EXPORTS: ICourse, IPeriod, IScheduleConfig, ISemesterConfig, DEFAULT_SCHEDULE, COURSE_COLORS, STORAGE_KEYS

export interface ICourse {
  /** 课程唯一 ID */
  id: string;
  /** 课程名称 */
  name: string;
  /** 授课教师 */
  teacher: string;
  /** 上课地点 */
  location: string;
  /** 星期几 0-6 (0=周日, 1=周一, ..., 6=周六) */
  dayOfWeek: number;
  /** 起始节次（从 1 开始） */
  startPeriod: number;
  /** 结束节次 */
  endPeriod: number;
  /** 课程颜色（十六进制） */
  color: string;
  /** 起始周次（兼容连续周次场景） */
  startWeek: number;
  /** 结束周次（兼容连续周次场景） */
  endWeek: number;
  /** 周次范围数组，用于离散周次（如第2、4、6、8周）；为空时使用 startWeek-endWeek */
  weekRange?: number[];
  /** 生效范围类型 */
  scope: 'single-day' | 'this-week' | 'whole-semester';
  /** 具体日期（仅 scope=single-day 时有效）ISO 格式 */
  specificDate?: string;
  /** 创建时间戳 */
  createdAt?: number;
}

export interface IPeriod {
  /** 节次序号，从 1 开始 */
  period: number;
  /** 开始时间，格式 "HH:mm" */
  startTime: string;
  /** 结束时间，格式 "HH:mm" */
  endTime: string;
}

export interface IScheduleConfig {
  /** 节次列表 */
  periods: IPeriod[];
  /** 午休开始时间 "HH:mm" */
  lunchStartTime: string;
  /** 午休结束时间 "HH:mm" */
  lunchEndTime: string;
}

export interface ISemesterConfig {
  /** 学期开始日期 ISO 字符串 */
  startDate: string;
  /** 学期结束日期 ISO 字符串 */
  endDate: string;
  /** 学期名称 */
  name: string;
  /** 上次提醒的学期标识，避免重复弹窗 */
  lastRemindedSemester?: string;
}

/** 默认作息 — 洛阳理工学院 */
export const DEFAULT_SCHEDULE: IScheduleConfig = {
  periods: [
    { period: 1, startTime: '08:00', endTime: '08:45' },
    { period: 2, startTime: '08:55', endTime: '09:40' },
    { period: 3, startTime: '10:00', endTime: '10:45' },
    { period: 4, startTime: '10:55', endTime: '11:40' },
    { period: 5, startTime: '14:30', endTime: '15:15' },
    { period: 6, startTime: '15:25', endTime: '16:10' },
    { period: 7, startTime: '16:30', endTime: '17:15' },
    { period: 8, startTime: '17:25', endTime: '18:10' },
    { period: 9, startTime: '19:10', endTime: '19:55' },
    { period: 10, startTime: '20:05', endTime: '20:50' },
  ],
  lunchStartTime: '11:40',
  lunchEndTime: '14:30',
};

/** 课程预设颜色（Material Design 3 风格） */
export const COURSE_COLORS = [
  '#6750A4', // 紫
  '#7D5260', // 玫红
  '#386F56', // 青绿
  '#7C5E1C', // 金棕
  '#65558F', // 淡紫
  '#006874', // 青
  '#8C5A00', // 橙
  '#006A4E', // 深绿
  '#5C5D98', // 靛
  '#BA1A1A', // 红
];

export const STORAGE_KEYS = {
  COURSES: '__app_timetable_courses',
  SCHEDULE: '__app_timetable_schedule',
  SEMESTER: '__app_timetable_semester',
  CURRENT_DATE: '__app_timetable_currentDate',
};
