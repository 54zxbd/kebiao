import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { Layout } from '@/components/Layout';
import NewSemesterDialog from '@/components/NewSemesterDialog';
import DayViewPage from '@/pages/DayViewPage/DayViewPage';
import WeekViewPage from '@/pages/WeekViewPage/WeekViewPage';
import SettingsPage from '@/pages/SettingsPage/SettingsPage';
import CourseDetailPage from '@/pages/CourseDetailPage/CourseDetailPage';
import CourseEditPage from '@/pages/CourseEditPage/CourseEditPage';
import ImportPage from '@/pages/ImportPage/ImportPage';
import NotFoundPage from '@/pages/NotFoundPage/NotFoundPage';

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/day" replace />} />
          <Route path="day" element={<DayViewPage />} />
          <Route path="week" element={<WeekViewPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="course/:id" element={<CourseDetailPage />} />
          <Route path="course/edit/:id?" element={<CourseEditPage />} />
          <Route path="import" element={<ImportPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Toaster position="top-center" />
      <NewSemesterDialog />
    </>
  );
}
