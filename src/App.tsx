import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { QuestExplorerPage } from './pages/QuestExplorerPage'
import { QuestDetailPage } from './pages/QuestDetailPage'
import { ForumPage } from './pages/ForumPage'
import { ForumComposePage } from './pages/ForumComposePage'
import { ForumPostPage } from './pages/ForumPostPage'
import { AddPlacePage } from './pages/AddPlacePage'
import { ModeratorQueuePage } from './pages/ModeratorQueuePage'
import { ProfilePage } from './pages/ProfilePage'
import { AdminPage } from './pages/AdminPage'
import { NotFoundPage } from './pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/quests" replace />} />
        <Route path="quests" element={<QuestExplorerPage mode="list" />} />
        <Route path="map" element={<QuestExplorerPage mode="map" />} />
        <Route path="quests/:questId" element={<QuestDetailPage />} />
        <Route path="forum" element={<ForumPage />} />
        <Route path="forum/new" element={<ForumComposePage />} />
        <Route path="forum/:postId" element={<ForumPostPage />} />
        <Route path="places/new" element={<AddPlacePage />} />
        <Route path="moderator" element={<ModeratorQueuePage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
