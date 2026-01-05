import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useExecutiveState } from '@/hooks/useExecutiveState'
import { useWebSocket } from '@/hooks/useWebSocket'
import { getWsUrl } from '@/config/api'

interface NavigationItem {
  id: string
  label: string
  path: string
}

const navigation: NavigationItem[] = [
  { id: 'overview', label: 'Overview', path: '/' },
  { id: 'schedule', label: 'Schedule', path: '/calendar' },
  { id: 'comms', label: 'Comms', path: '/email' },
  { id: 'tasks', label: 'Tasks', path: '/tasks' },
  { id: 'command', label: 'Command', path: '/chat' },
  { id: 'system', label: 'System', path: '/settings' },
]

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const { state } = useExecutiveState()
  const { isConnected } = useWebSocket(getWsUrl())

  const currentPath = location.pathname

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '240px 1fr',
      minHeight: '100vh',
      background: '#ffffff'
    }}>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          style={{ background: 'rgba(0,0,0,0.5)' }}
        />
      )}

      {/* Sidebar */}
      <aside className="swiss-sidebar hidden lg:flex">
        <div className="swiss-logo">E.A. / System</div>

        <nav className="swiss-nav flex-1">
          <ul style={{ listStyle: 'none' }}>
            {navigation.map((item) => {
              const isActive = currentPath === item.path ||
                (item.path !== '/' && currentPath.startsWith(item.path))
              return (
                <li key={item.id} style={{ marginBottom: '1rem' }}>
                  <Link
                    to={item.path}
                    className={isActive ? 'active' : ''}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Connection status */}
        <div style={{
          paddingTop: '1rem',
          borderTop: '1px solid #eee',
          marginTop: 'auto'
        }}>
          <div style={{
            fontSize: '0.7rem',
            fontWeight: 800,
            color: isConnected ? '#ff0000' : '#666'
          }}>
            {isConnected ? '● SYSTEM ACTIVE' : '○ OFFLINE'}
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: '#666',
            marginTop: '0.5rem'
          }}>
            Sven Arnarsson
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40" style={{
        background: '#fff',
        borderBottom: '1px solid #000',
        padding: '1rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="swiss-logo" style={{ marginBottom: 0 }}>E.A.</div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'none',
              border: '1px solid #000',
              padding: '0.5rem 1rem',
              fontWeight: 700,
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}
          >
            Menu
          </button>
        </div>
      </div>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <aside className="swiss-sidebar fixed inset-y-0 left-0 z-50 lg:hidden" style={{ width: '240px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4rem' }}>
            <div className="swiss-logo" style={{ marginBottom: 0 }}>E.A. / System</div>
            <button
              onClick={() => setSidebarOpen(false)}
              style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
            >
              ×
            </button>
          </div>

          <nav className="swiss-nav flex-1">
            <ul style={{ listStyle: 'none' }}>
              {navigation.map((item) => {
                const isActive = currentPath === item.path ||
                  (item.path !== '/' && currentPath.startsWith(item.path))
                return (
                  <li key={item.id} style={{ marginBottom: '1rem' }}>
                    <Link
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={isActive ? 'active' : ''}
                    >
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        </aside>
      )}

      {/* Main content */}
      <main style={{ padding: '4rem', maxWidth: '1400px' }} className="lg:block">
        <div className="lg:hidden" style={{ height: '60px' }} /> {/* Spacer for mobile header */}
        {children}
      </main>
    </div>
  )
}
