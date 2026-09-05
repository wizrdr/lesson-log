import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthGate } from '@/features/auth/AuthGate'
import { Shell } from '@/app/Shell'
import { LessonsPage } from '@/features/lessons/LessonsPage'
import { LessonPage } from '@/features/lessons/LessonPage'
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
          <Route path="/" element={<LessonsPage />} />
          <Route path="/lessons/:id" element={<LessonPage />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/before-lesson" element={<BeforeLessonPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
