import { Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'

// Import pages
import Dashboard from '@/pages/Dashboard'
import Calendar from '@/pages/Calendar'
import Email from '@/pages/Email'
import Tasks from '@/pages/Tasks'
import Settings from '@/pages/Settings'
import Chat from '@/pages/Chat'
import GoogleSetup from '@/pages/GoogleSetup'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/email" element={<Email />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/google-setup" element={<GoogleSetup />} />
      </Routes>
    </Layout>
  )
}

export default App
