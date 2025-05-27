import React from 'react'
import { Routes, Route } from 'react-router-dom'

// Import pages
import Dashboard from '@/pages/Dashboard'
import Calendar from '@/pages/Calendar'
import Email from '@/pages/Email'
import Tasks from '@/pages/Tasks'
import Settings from '@/pages/Settings'
import Chat from '@/pages/Chat'
import SimpleTest from './SimpleTest'

function App() {
  console.log('App rendering - Emergency CSS fix mode')
  
  // Emergency CSS Fix - Inject styles directly
  React.useEffect(() => {
    console.log('Injecting emergency CSS...')
    
    const style = document.createElement('style')
    style.textContent = `
      /* Emergency Executive Assistant CSS */
      * { box-sizing: border-box; margin: 0; padding: 0; }
      
      body { 
        font-family: system-ui, -apple-system, sans-serif; 
        background: #f9fafb;
        color: #111827;
      }
      
      /* Layout */
      .min-h-screen { min-height: 100vh; }
      .flex { display: flex; }
      .items-center { align-items: center; }
      .justify-center { justify-content: center; }
      .justify-between { justify-content: space-between; }
      .space-x-4 > * + * { margin-left: 1rem; }
      .space-y-6 > * + * { margin-top: 1.5rem; }
      .space-y-4 > * + * { margin-top: 1rem; }
      .space-y-3 > * + * { margin-top: 0.75rem; }
      
      /* Grid */
      .grid { display: grid; }
      .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
      .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .gap-6 { gap: 1.5rem; }
      .gap-4 { gap: 1rem; }
      
      /* Spacing */
      .p-6 { padding: 1.5rem; }
      .p-4 { padding: 1rem; }
      .px-4 { padding-left: 1rem; padding-right: 1rem; }
      .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
      .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
      .mb-6 { margin-bottom: 1.5rem; }
      .mb-4 { margin-bottom: 1rem; }
      .mb-3 { margin-bottom: 0.75rem; }
      .ml-4 { margin-left: 1rem; }
      .mr-3 { margin-right: 0.75rem; }
      .mt-1 { margin-top: 0.25rem; }
      .mt-2 { margin-top: 0.5rem; }
      
      /* Typography */
      .text-2xl { font-size: 1.5rem; line-height: 2rem; }
      .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
      .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
      .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
      .text-xs { font-size: 0.75rem; line-height: 1rem; }
      .font-bold { font-weight: 700; }
      .font-semibold { font-weight: 600; }
      .font-medium { font-weight: 500; }
      .text-center { text-align: center; }
      
      /* Colors */
      .text-white { color: #ffffff; }
      .text-gray-900 { color: #111827; }
      .text-gray-600 { color: #4b5563; }
      .text-gray-500 { color: #6b7280; }
      .text-gray-400 { color: #9ca3af; }
      .text-blue-600 { color: #2563eb; }
      .text-green-600 { color: #16a34a; }
      .text-red-600 { color: #dc2626; }
      .text-yellow-600 { color: #ca8a04; }
      .text-purple-600 { color: #9333ea; }
      
      /* Backgrounds */
      .bg-white { background-color: #ffffff; }
      .bg-gray-50 { background-color: #f9fafb; }
      .bg-blue-600 { background-color: #2563eb; }
      .bg-blue-100 { background-color: #dbeafe; }
      .bg-green-600 { background-color: #16a34a; }
      .bg-green-100 { background-color: #dcfce7; }
      .bg-red-600 { background-color: #dc2626; }
      .bg-red-100 { background-color: #fee2e2; }
      .bg-yellow-100 { background-color: #fef3c7; }
      .bg-purple-100 { background-color: #f3e8ff; }
      
      /* Borders */
      .border { border: 1px solid #e5e7eb; }
      .border-gray-200 { border-color: #e5e7eb; }
      .rounded-lg { border-radius: 0.5rem; }
      .rounded { border-radius: 0.375rem; }
      
      /* Shadows */
      .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
      .shadow { box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1); }
      
      /* EA Custom Classes */
      .ea-card { 
        background: white; 
        border-radius: 0.5rem; 
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        border: 1px solid #e5e7eb;
      }
      
      .ea-button-primary {
        background: #2563eb;
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        border: none;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
      }
      .ea-button-primary:hover { background: #1d4ed8; }
      
      .ea-button-secondary {
        background: #f3f4f6;
        color: #111827;
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        border: 1px solid #d1d5db;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
      }
      .ea-button-secondary:hover { background: #e5e7eb; }
      
      /* Sidebar Navigation */
      .sidebar {
        position: fixed;
        left: 0;
        top: 0;
        width: 16rem;
        height: 100vh;
        background: white;
        border-right: 1px solid #e5e7eb;
        z-index: 50;
      }
      
      .main-content {
        margin-left: 16rem;
        min-height: 100vh;
      }
      
      .nav-item {
        display: flex;
        align-items: center;
        padding: 0.75rem;
        color: #4b5563;
        text-decoration: none;
        border-radius: 0.5rem;
        margin: 0.125rem;
        transition: all 0.2s;
      }
      .nav-item:hover { background: #f3f4f6; color: #111827; }
      .nav-item.active { background: #dbeafe; color: #1d4ed8; }
      
      .nav-icon {
        width: 1.25rem;
        height: 1.25rem;
        margin-right: 0.75rem;
      }
      
      /* Header */
      .header {
        background: white;
        border-bottom: 1px solid #e5e7eb;
        padding: 1rem 2rem;
        position: sticky;
        top: 0;
        z-index: 40;
      }
      
      /* Responsive */
      @media (max-width: 1024px) {
        .sidebar { display: none; }
        .main-content { margin-left: 0; }
        .grid-cols-2, .grid-cols-3 { grid-template-columns: 1fr; }
      }
      
      /* Animations */
      .animate-spin {
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      /* Hide scrollbar but keep functionality */
      .scrollbar-hide {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
      .scrollbar-hide::-webkit-scrollbar {
        display: none;
      }
    `
    
    document.head.appendChild(style)
    console.log('Emergency CSS injected successfully')
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div style={{
              width: '2rem',
              height: '2rem',
              background: '#2563eb',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '0.875rem'
            }}>
              EA
            </div>
            <div className="ml-3">
              <h1 className="text-lg font-semibold text-gray-900">
                Executive Assistant
              </h1>
            </div>
          </div>
        </div>
        
        <nav className="p-4">
          <div className="space-y-3">
            <a href="/" className="nav-item active">
              <span className="nav-icon">🏠</span>
              Dashboard
            </a>
            <a href="/calendar" className="nav-item">
              <span className="nav-icon">📅</span>
              Calendar
            </a>
            <a href="/email" className="nav-item">
              <span className="nav-icon">📧</span>
              Email
            </a>
            <a href="/tasks" className="nav-item">
              <span className="nav-icon">📋</span>
              Tasks
            </a>
            <a href="/chat" className="nav-item">
              <span className="nav-icon">💬</span>
              Chat
            </a>
            <a href="/settings" className="nav-item">
              <span className="nav-icon">⚙️</span>
              Settings
            </a>
          </div>
        </nav>
        
        <div className="p-4 border-t border-gray-200" style={{position: 'absolute', bottom: 0, width: '100%'}}>
          <div className="flex items-center text-sm">
            <div style={{
              width: '8px',
              height: '8px',
              background: '#22c55e',
              borderRadius: '50%',
              marginRight: '0.5rem'
            }}></div>
            <span className="text-gray-600">AG-UI Connected</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="header">
          <h2 className="text-xl font-semibold text-gray-900">Dashboard</h2>
        </div>
        
        <main className="p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/email" element={<Email />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/test" element={<SimpleTest />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default App
