import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthGate } from '@/features/auth/AuthGate'
import { Shell } from '@/app/Shell'
import { LessonsLayout } from '@/features/lessons/LessonsLayout'
import { JournalPage } from '@/features/journal/JournalPage'
import { ReviewPage } from '@/features/review/ReviewPage'
import { BeforeLessonPage } from '@/features/before-lesson/BeforeLessonPage'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route
          element={
            <AuthGate>
              <Shell />
            </AuthGate>
          }
        >
          <Route path="/" element={<LessonsLayout />} />
          <Route path="/lessons/:id" element={<LessonsLayout />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/before-lesson" element={<BeforeLessonPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
