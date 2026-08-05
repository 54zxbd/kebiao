# 大学生课程表 PWA 应用 - 需求拆解文档

## 产品概述

- **产品类型**: 移动端优先的轻量级课程表 PWA 应用
- **场景类型**: <scene_type>prototype-app</scene_type>
- **目标用户**: 大学生（以洛阳理工学院为默认适配院校）
- **核心价值**: 快速查看每日/每周课程，纯本地存储、离线可用，支持添加到主屏幕
- **界面语言**: 中文（zh-CN）
- **主题偏好**: 浅色/深色主题（跟随系统，user_specified）
- **导航模式**: 路径导航
- **导航布局**: 底部导航栏（移动端优先，Bottom Navigation）

---

## 页面结构总览

> **说明**：底部导航栏 3 个一级页面 + 课程详情/编辑/导入等二级页面

| 页面名称 | 文件名 | 路由 | 页面类型 | 入口来源 |
|---------|-------|------|---------|---------|
| 日课表视图 | `DayViewPage.tsx` | `/day` | 一级 | 底部导航 |
| 周课表视图 | `WeekViewPage.tsx` | `/week` | 一级 | 底部导航 |
| 设置页 | `SettingsPage.tsx` | `/settings` | 一级 | 底部导航 |
| 课程详情页 | `CourseDetailPage.tsx` | `/course/:id` | 二级 | 日视图 → 点击课程卡片 / 周视图 → 点击课程卡片 |
| 课程编辑页 | `CourseEditPage.tsx` | `/course/edit/:id?` | 二级 | 课程详情 → 编辑按钮 / 日/周视图 → 添加按钮 |
| 导入页 | `ImportPage.tsx` | `/import` | 二级 | 设置页 → 导入课表 / 新学期弹窗 → 更新按钮 |

> **默认路由**: `/day`（首次打开默认进入日课表视图）

---

## 页面布局建议

### 日课表视图 (`/day`)
- **布局模式**: 上下分区（顶部日期切换 + 下方时间轴列表）
- **视觉重心**: 中间课程时间轴列表
- **结果承载区**: 课程卡片列表；初始态为"今天"，无课程时显示空状态提示

### 周课表视图 (`/week`)
- **布局模式**: 单栏网格布局（横向可滚动的周次 × 纵向节次）
- **视觉重心**: 课程网格
- **结果承载区**: 网格中的课程色块卡片；初始态为本周

### 设置页 (`/settings`)
- **布局模式**: 单栏分组列表
- **视觉重心**: 设置项列表
- **结果承载区**: 各设置项的当前值展示

---

## 导航配置

- **导航布局**: Bottom Navigation（底部导航栏，移动端优先）
- **导航项**（仅一级页面）:

| 导航文字 | 路由 | 图标 |
|---------|------|------|
| 日视图 | `/day` | CalendarToday / 今日日程 |
| 周视图 | `/week` | CalendarMonth / 月历周视图 |
| 设置 | `/settings` | Settings / 齿轮设置 |

---

## 数据来源声明

| 数据/操作 | 来源类型 | 实现要求 | mock 兜底 |
|---|---|---|---|
| 课程数据存储与读取 | local-persist | localStorage key=`__app_timetable_courses`，存储课程数组 JSON | 初始为空数组，用户可添加或导入 |
| 用户作息时间配置 | local-persist | localStorage key=`__app_timetable_schedule`，存储节次时间配置 | 默认值为洛阳理工学院作息（8 节课 + 午休） |
| 学期配置（学期起止日期、当前学期标识） | local-persist | localStorage key=`__app_timetable_semester`，存储学期开始/结束日期 | 无，首次使用需用户在设置中配置或使用默认推算 |
| 课程数据 JSON 导入 | real-file + import-export | 文本框粘贴 JSON → 前端 JSON.parse → 校验格式 → 预览 → 写入 localStorage | 无（用户主动操作） |
| 课程数据导出备份 | import-export | 读取 localStorage 课程数据 → JSON.stringify → Blob + a.click 触发 .json 下载 | 无 |
| 新学期检测 | local-persist | 读取学期配置 + 对比当前日期 → 弹窗提示 | 无配置时跳过检测 |

> 注：所有数据均为本地存储，不上传服务器。PWA 离线能力由 Service Worker 缓存实现。

---

## 功能列表

### 日课表视图页 (`/day`)

- **页面目标**: 以时间轴形式快速浏览当天所有课程，支持左右滑动切换日期
- **功能点**:
  - **日视图时间轴展示**: 按时间顺序纵向排列当天所有课程卡片，每张卡片显示课程名、上课时间（节次+具体时间）、教室、授课教师
  - **课程状态高亮**: 根据当前时间自动判断课程状态——进行中课程高亮显示（底色加深+边框强调），已结束课程置灰（透明度降低），未开始课程正常显示
  - **左右滑动切换日期**: 支持触摸滑动（移动端）和点击箭头切换前后日期，顶部显示当前日期和星期
  - **快速跳转今天**: 顶部提供"今天"按钮，一键回到当前日期
  - **点击课程进入详情**: 点击课程卡片跳转到 `/course/:id` 课程详情页

### 周课表视图页 (`/week`)

- **页面目标**: 以网格形式概览整周课程安排，支持切换周次
- **功能点**:
  - **周视图网格展示**: 横向为周一到周日、纵向为节次的网格布局，课程以彩色色块卡片形式填充对应单元格，不同课程自动分配不同颜色
  - **左右滑动切换周次**: 支持触摸滑动切换上一周/下一周，顶部显示当前周次（如"第 3 周"）和日期范围
  - **点击课程查看/编辑**: 点击课程色块弹出或跳转至课程详情页，可进一步进入编辑
  - **快速跳转本周**: 顶部提供"本周"按钮，一键回到当前周

### 课程详情页 (`/course/:id`)

- **页面目标**: 展示单门课程的完整信息，并提供编辑和删除入口
- **功能点**:
  - **课程信息展示**: 展示课程名称、授课教师、上课地点、上课时间（节次+具体起止时间）、周次范围（如"第1-16周"）、课程颜色标识
  - **编辑入口**: 顶部"编辑"按钮跳转到课程编辑页
  - **删除课程** (操作型):
    - 触发: 页面底部"删除课程"按钮
    - 交互: 弹出底部操作表/Dialog，选择删除范围：仅本次 / 本周剩余 / 本学期全部
    - 提交: 根据选择范围从 localStorage 中移除对应课程实例，更新课程列表
    - 反馈: toast.success('删除成功') + 返回上一页
    - 二次确认: 删除前弹出确认 Dialog，防止误操作

### 课程编辑页 (`/course/edit/:id?`)

- **页面目标**: 添加新课程或修改已有课程信息
- **功能点**:
  - **课程信息表单**: 表单字段包括：课程名称（必填）、授课教师、上课地点、节次选择（起始节+结束节，下拉选择）、星期几选择、课程颜色（颜色选择器）
  - **生效范围选择**: 添加新课程时可选生效范围：仅当天 / 本周 / 本学期；修改课程时默认仅修改当前选中的单次实例
  - **周次范围配置**: 本学期模式下可设置起始周和结束周（如第 1-16 周）
  - **保存提交**: 表单验证通过后写入/更新 localStorage 课程数据，toast 反馈后返回上一页

### 导入页 (`/import`)

- **页面目标**: 通过 JSON 格式批量导入课程数据
- **功能点**:
  - **JSON 文本输入**: 提供多行文本框，用户粘贴 JSON 格式的课表数据
  - **格式说明与示例**: 提供可展开的"数据格式说明"，包含示例 JSON 结构和字段说明
  - **解析与预览**: 点击"解析预览"按钮，前端 JSON.parse 并校验格式，校验通过后以列表形式展示即将导入的课程预览
  - **确认导入**: 预览确认后点击"导入"按钮，将课程数据合并/覆盖写入 localStorage，toast 反馈后返回

### 设置页 (`/settings`)

- **页面目标**: 管理作息时间配置、学期配置、数据导入导出等
- **功能点**:
  - **作息时间配置**: 以列表形式展示每节课的起止时间，支持点击修改；支持增加节次和减少节次按钮；支持修改午休起止时间；修改即时写入 localStorage 并生效
  - **学期配置**: 设置学期开始日期和结束日期，用于周次计算和新学期检测
  - **数据导入入口**: 点击"导入课表"跳转到 `/import` 页
  - **数据导出备份**: 点击"导出备份"将当前课程数据和配置打包为 JSON 文件下载
  - **主题说明**: 显示当前主题（浅色/深色），说明主题跟随系统设置

### 全局功能

- **新学期检测弹窗**: 应用启动时读取学期配置，若当前日期已进入新学期且本地仍有上学期课程数据，弹出提示 Dialog；点击"更新"跳转到导入页，点击"稍后"关闭
- **PWA 支持**: 配置 manifest.json + Service Worker，支持添加到主屏幕、离线缓存、启动 splash screen
- **浅色/深色主题**: 跟随系统 `prefers-color-scheme`，Material Design 3 风格适配

---

## 数据共享配置

| 存储键名 | 数据说明 | 使用页面 |
|---------|---------|---------|
| `__app_timetable_courses` | 课程列表数据，类型为 `ICourse[]` | 日视图、周视图、课程详情、课程编辑、导入、设置 |
| `__app_timetable_schedule` | 作息时间配置，类型为 `IScheduleConfig` | 日视图、周视图、设置、课程编辑 |
| `__app_timetable_semester` | 学期配置，类型为 `ISemesterConfig` | 日视图、周视图、设置（新学期检测） |
| `__app_timetable_currentDate` | 当前选中日期，类型为 `string`（ISO 日期） | 日视图、周视图 |

```ts
interface ICourse {
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
  /** 起始周次 */
  startWeek: number;
  /** 结束周次 */
  endWeek: number;
  /** 生效范围类型 */
  scope: 'single-day' | 'this-week' | 'whole-semester';
  /** 具体日期（仅 scope=single-day 时有效）ISO 格式 */
  specificDate?: string;
}

interface IPeriod {
  /** 节次序号，从 1 开始 */
  period: number;
  /** 开始时间，格式 "HH:mm" */
  startTime: string;
  /** 结束时间，格式 "HH:mm" */
  endTime: string;
}

interface IScheduleConfig {
  /** 节次列表 */
  periods: IPeriod[];
  /** 午休开始时间 "HH:mm" */
  lunchStartTime: string;
  /** 午休结束时间 "HH:mm" */
  lunchEndTime: string;
}

interface ISemesterConfig {
  /** 学期开始日期 ISO 字符串 */
  startDate: string;
  /** 学期结束日期 ISO 字符串 */
  endDate: string;
  /** 学期名称，如 "2024-2025 学年第一学期" */
  name: string;
  /** 上次提醒的学期标识，避免重复弹窗 */
  lastRemindedSemester?: string;
}

-------

<scene_type>prototype-app</scene_type>

# UI 设计指南

## 1. 设计推导依据

- **参考意图**: Free Direction —— 无参考材料，从大学生课程表产品语义与 Material Design 3 约束出发自主设计
- **核心情绪 / 应用类型**: 轻量、清爽、可快速扫视的校园日程工具，核心情绪是「安心规划感 + 轻快校园感」
- **独特记忆点**: 课程卡片采用柔和色块 + 左侧 3px 色条识别，当前课程用「高亮色块 + 微光晕 + 时间轴指示点」三重信号，一眼定位「我现在在哪节课」

## 2. Art Direction

- **方向名**: Soft Campus MD3
- **Design Style**: Material Design 3 + Soft Blocks 柔色块 —— MD3 保证组件秩序与平台熟悉感，柔色块课程卡贴合校园青春感，降低工具冰冷感
- **DNA 参数**: 圆角 `rounded-xl`(卡片) / `rounded-full`(芯片、FAB)；阴影 `shadow-sm` 单层柔影；间距 `gap-3` / `p-4` 标准紧凑；字体方向 Noto Sans SC 清晰无衬线；装饰手法 左侧色条 + 微渐变课程卡面
- **应用类型**: Tool —— 底部导航 + 内容滚动区，移动端优先

## 3. Color System

**色彩关系**: 浅靛青主色 + 同色系极浅反馈底 + 纸白背景；课程色板从 6 种低饱和柔色中派生，保证多课程并置不刺眼
**配色设计理由**: primary 用浅靛青传达「校园 + 可靠规划」，强度克制不抢课程内容；bg 为略带暖调的纸白，长时看课表不疲劳；accent 做 hover/选中底，border 弱化结构线，信息层次靠间距与字重而非重边框
**主色推导**: 从「大学生校园日程」语义取靛青色相(220°)，降低饱和度到 60%、明度 55%，既保留青春感又避免刺眼，契合 MD3 tonal palette 的柔和调性
**使用比例**: 65% 中性 / 28% 辅助(课程色块 + accent) / 7% primary；primary 只用于 FAB、主按钮、底部导航激活态、当前课程指示点；课程颜色独立于主色系统

| 角色 | CSS 变量 | Tailwind Class | HSL 值 | 设计说明 |
|---|---|---|---|---|
| bg | `--background` | `bg-background` | hsl(210 40% 98%) | 页面背景，暖调纸白 |
| card | `--card` | `bg-card` | hsl(0 0% 100%) | 卡片、表单、底部导航、弹层 |
| text | `--foreground` | `text-foreground` | hsl(222 20% 16%) | 标题与正文，深靛灰 |
| textMuted | `--muted-foreground` | `text-muted-foreground` | hsl(220 10% 45%) | 时间、教室、教师等辅助信息 |
| primary | `--primary` | `bg-primary` / `text-primary` | hsl(220 60% 55%) | FAB、主按钮、导航激活、当前课程指示 |
| primaryForeground | `--primary-foreground` | `text-primary-foreground` | hsl(0 0% 100%) | primary 上的文字图标 |
| accent | `--accent` | `bg-accent` | hsl(220 30% 94%) | hover/focus 浅底、选中底、骨架屏 |
| accentForeground | `--accent-foreground` | `text-accent-foreground` | hsl(222 20% 20%) | accent 上的文字图标 |
| border | `--border` | `border-border` | hsl(220 15% 88%) | 输入框、卡片、分隔线边界 |

**语义色提示**: 
- 成功：删除确认等强操作反色不使用；导出/导入成功用 `hsl(142 55% 92%)` bg / `hsl(142 45% 70%)` border / `hsl(142 60% 30%)` text，饱和度与 primary 对齐
- 警告：新学期提示用 `hsl(38 90% 94%)` bg / `hsl(38 80% 75%)` border / `hsl(32 80% 35%)` text，暖色饱和度略高但明度足够
- 错误：删除确认/导入失败用 `hsl(0 75% 95%)` bg / `hsl(0 65% 80%)` border / `hsl(0 70% 40%)` text，饱和度与 primary ±10% 内对齐
- 课程色板(6 色，柔色块)：靛蓝 hsl(220 55% 90%)、薄荷 hsl(150 45% 88%)、珊瑚 hsl(10 75% 90%)、琥珀 hsl(40 85% 88%)、紫罗 hsl(270 50% 90%)、青瓷 hsl(180 40% 88%)；每色配深 25% 的左侧色条与文字色

## 4. 字体与节奏

- **font-display**: Noto Sans SC, 600/700 —— 清晰现代无衬线，中文显示稳定，课程名加粗仍保持易读
- **font-body**: Noto Sans SC, 400/500 —— 正文与辅助信息统一字体族，减少混排干扰，适配 MD3 阅读节奏
- **字号**: H1(日期/周标题) text-2xl；H2(课程名/设置分组) text-lg；body text-base；muted(时间/教室/教师) text-sm。
- **圆角**: 中到大 —— 卡片 `rounded-xl`、按钮/FAB `rounded-full`、输入框 `rounded-lg`，贴合 MD3 soft rounded 调性

## 5. 全局布局契约

- **Reference Layout Use**: 按需求结构推导，底部导航三页面 + 模态弹层承载编辑/详情/导入
- **Page / Section Order**: 日视图 / 周视图 / 设置(含时间配置、导入导出、关于)；课程详情与编辑以底部 sheet / 全页表单呈现
- **Standard Content Zone**: Tool max-w-md(mobile-first，桌面端 `max-w-2xl`) + `mx-auto`，保持单手可及的信息宽度
- **Shell / Frame Alignment**: 底部导航为固定 chrome，内容区独立滚动，padding 与导航内边距对齐(左右均 16px)
- **Padding & Rhythm**: `px-4 py-4`(移动端)；`md:px-6 md:py-6`(桌面端)，section 间距 `gap-6`，卡片组间距 `gap-3`
- **Full-bleed Zones**: 无全幅 Hero；底部导航、顶部日期栏全宽，内部元素受内容区约束
- **Local Narrowing**: 表单(添加/编辑课程、导入)、设置详情在 `max-w-md` 基础上不再收窄，保证触控面积
- **Overflow Strategy**: 周视图网格横向可滑动(`overflow-x-auto`)，不缩小课程卡片高度；日视图时间轴纵向滚动
- **Flexibility Boundary**: 允许移动端卡片内边距在 `p-3~p-4` 间微调、课程字体大小自适应；不允许改变主色、圆角系统、底部导航形态

## 6. 视觉与动效

- **装饰**: 左侧色条课程卡 + 微光晕当前课指示
- **阴影/边界**: 轻 —— 卡片 `shadow-sm`，底部导航 `shadow-md`，弹层 `shadow-lg`；边界用 `border` 极浅灰
- **动效**: 克制 —— 页面切换 200ms 左右滑动过渡；卡片按下 100ms 微缩放；FAB 展开 250ms 缓动；当前课高亮用柔和呼吸光(3s 循环，极低强度)

## 7. 组件原则

- 按钮、输入、卡片、底部导航项必须有 Default / Hover / Pressed / Focus / Disabled 五态
- Primary 色仅用于 FAB、主操作按钮、底部导航激活图标、当前课时间点；其余交互用 accent + border
- 课程卡片状态：进行中(饱和色块 + 左侧深色色条 + 顶部进度条)、已结束(灰度 50% + 文字减淡)、未开始(正常柔色块)
- 空状态、加载骨架沿用课程卡轮廓与圆角，不要退回默认灰条
- 底部导航 MD3 风格：激活项用填充型 pill 背景 + primary 图标色，未激活用 outline 图标

## 8. Image Direction

- **Image Role**: 应用图标 + 启动画面(splash screen)核心图形
- **Image Art Direction**: 极简几何校园意象，一本翻开的柔和色块日程本叠加时钟刻度，扁平化矢量风格，主色靛青背景配柔色课程块点缀；构图居中对称，四周留足安全区适配各尺寸启动屏；光线为均匀柔光，无强烈阴影，材质为哑光纸面感；情绪是清新、安心、有条理
- **Image Prompt Keywords**: minimal vector icon, open schedule book with clock hands, soft indigo background, pastel colored class blocks, flat design, clean geometric shapes, matte paper texture, soft lighting, centered composition, campus planner vibe, 1024x1024
- **Image Avoidance**: 真实校园照片、人物形象、3D 渲染、复杂插画场景、高饱和渐变、卡通吉祥物、手写涂鸦风

## 9. Anti-patterns

- **Split personality**: 日视图和周视图用不同圆角或卡片语言；两视图共享同一套课程卡视觉，仅布局形态不同
- **Color overload**: 课程色板超过 6 种或饱和度过高，导致周视图眼花；课程色统一柔色低饱和，深色色条做识别
- **Phantom MD3**: 只抄圆角不抄状态层级；MD3 核心是 state layer、tonal 配色和清晰的 elevation 层级
- **Invisible today**: 当前课只靠颜色区分，无形状/位置辅助；必须同时有色条 + 时间轴指示点 + 文字加粗
- **Mono-hue tyranny**: primary 铺满按钮、tab、图标、边框、链接；严格控制 primary 只在 FAB、主操作、激活导航、当前课指示出现
- **Status color drift**: 错误/警告色饱和度过高盖过主色；语义色饱和度与 primary 保持 ±10% 内，用明度差区分强度
- **Desktop-first drift**: 为桌面端放大内容区宽度导致移动端信息稀疏；以移动端单手宽度为基准，桌面端只增左右留白不增内容密度