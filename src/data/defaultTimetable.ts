import { ICourse, ISemesterConfig } from './types';

const createdAt = new Date('2026-02-23T00:00:00').getTime();

function createCourse(
  id: string,
  name: string,
  teacher: string,
  location: string,
  dayOfWeek: number,
  startPeriod: number,
  endPeriod: number,
  color: string,
  weekRange: number[],
): ICourse {
  return {
    id,
    name,
    teacher,
    location,
    dayOfWeek,
    startPeriod,
    endPeriod,
    color,
    startWeek: weekRange[0],
    endWeek: weekRange[weekRange.length - 1],
    weekRange,
    scope: 'whole-semester',
    createdAt,
  };
}

export const DEFAULT_SEMESTER: ISemesterConfig = {
  name: '2025-2026 学年第二学期',
  startDate: '2026-02-23',
  endDate: '2026-06-28',
  lastRemindedSemester: '2025-2026 学年第二学期_new',
};

export const DEFAULT_COURSES: ICourse[] = [
  createCourse('seed-english-mon', '大学英语(4)', '董爱娟', 'XB418', 1, 1, 2, '#6750A4', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 13, 14, 15, 16]),
  createCourse('seed-digital-mon', '数字电子技术', '赵小明', 'XC210', 1, 3, 4, '#7D5260', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14]),
  createCourse('seed-mao-mon', '毛泽东思想和中国特色社会主义理论体系概论', '杨培培', 'XE103', 1, 5, 6, '#386F56', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 13, 14, 15, 16]),
  createCourse('seed-probability-tue', '概率论与数理统计I', '李艳晓, 袁可红', 'XD1', 2, 1, 2, '#7C5E1C', [1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 13, 14, 15, 16]),
  createCourse('seed-current-affairs-tue', '形势与政策', '徐旖旎', 'XD3', 2, 3, 4, '#65558F', [2, 4, 6, 8]),
  createCourse('seed-english-wed', '大学英语(4)', '董爱娟', 'XD414', 3, 1, 2, '#6750A4', [15, 16]),
  createCourse('seed-digital-wed', '数字电子技术', '赵小明', 'XC210', 3, 1, 2, '#7D5260', [1, 3, 5, 7, 9, 10, 12, 13, 14]),
  createCourse('seed-pe-wed', '体育(4)', '', '罗源(乒乓球)', 3, 3, 4, '#006874', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]),
  createCourse('seed-microcontroller-wed', '微控制器原理及应用', '董红政', 'XC305', 3, 5, 6, '#8C5A00', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15]),
  createCourse('seed-semiconductor-wed', '半导体物理', '杨伟光', 'XC108', 3, 7, 8, '#006A4E', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14]),
  createCourse('seed-mao-thu', '毛泽东思想和中国特色社会主义理论体系概论', '杨培培', 'XC415', 4, 3, 4, '#386F56', [13]),
  createCourse('seed-probability-thu', '概率论与数理统计I', '李艳晓, 袁可红', 'XD1', 4, 3, 4, '#7C5E1C', [1, 2, 3, 4, 5, 6, 7, 8, 9, 12]),
  createCourse('seed-semiconductor-fri', '半导体物理', '杨伟光', 'XC108', 5, 1, 2, '#006A4E', [2, 4, 6, 8, 9, 10, 14]),
  createCourse('seed-design-fri-early', '电子工程设计基础', '张刚', 'XC205', 5, 1, 2, '#5C5D98', [12]),
  createCourse('seed-design-fri', '电子工程设计基础', '张刚', 'XC205', 5, 3, 4, '#5C5D98', [1, 2, 4, 5, 6, 7, 8, 9, 10, 13, 14]),
  createCourse('seed-microcontroller-fri', '微控制器原理及应用', '董红政', 'XC107', 5, 5, 6, '#8C5A00', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15]),
  createCourse('seed-mao-fri', '毛泽东思想和中国特色社会主义理论体系概论', '杨培培', 'XC415', 5, 5, 6, '#386F56', [16]),
];
