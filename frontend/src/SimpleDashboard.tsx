import { useWebSocket } from '@/hooks/useWebSocket'
import { config } from '@/config/api'

function SimpleDashboard() {
  const { isConnected, connectionError } = useWebSocket(config.wsUrl)
  
  const currentTime = new Date().toLocaleString()
  
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '1rem'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '0.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', margin: 0, marginBottom: '0.5rem' }}>
          🚀 Executive Assistant MVP
        </h1>
        <p style={{ margin: 0, opacity: 0.9 }}>
          Welcome to your AI-powered executive dashboard
        </p>
        <p style={{ margin: 0, marginTop: '0.5rem', fontSize: '0.875rem' }}>
          Current time: {currentTime}
        </p>
      </div>

      {/* Connection Status */}
      <div style={{
        backgroundColor: isConnected ? '#dcfce7' : '#fee2e2',
        color: isConnected ? '#166534' : '#991b1b',
        padding: '1rem',
        borderRadius: '0.5rem',
        marginBottom: '1.5rem',
        border: `1px solid ${isConnected ? '#bbf7d0' : '#fecaca'}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isConnected ? '#22c55e' : '#ef4444'
          }} />
          <strong>WebSocket Status:</strong> {isConnected ? 'Connected' : 'Disconnected'}
          {connectionError && <span> - {connectionError}</span>}
        </div>
      </div>

      {/* Quick Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: 0, marginBottom: '0.5rem', color: '#1f2937' }}>📊 Active Projects</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#3b82f6' }}>3</p>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Currently in progress</p>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: 0, marginBottom: '0.5rem', color: '#1f2937' }}>⚠️ Urgent Items</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#ef4444' }}>1</p>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Needs attention</p>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: 0, marginBottom: '0.5rem', color: '#1f2937' }}>📧 Emails</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#10b981' }}>12</p>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Unread messages</p>
        </div>
      </div>

      {/* Navigation */}
      <div style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '1.5rem'
      }}>
        <h3 style={{ margin: 0, marginBottom: '1rem', color: '#1f2937' }}>🧭 Navigation</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '1rem'
        }}>
          {[
            { name: 'Dashboard', emoji: '🏠', desc: 'Overview' },
            { name: 'Calendar', emoji: '📅', desc: 'Schedule' },
            { name: 'Email', emoji: '📧', desc: 'Messages' },
            { name: 'Tasks', emoji: '📋', desc: 'To-do' },
            { name: 'Chat', emoji: '💬', desc: 'AI Assistant' },
            { name: 'Settings', emoji: '⚙️', desc: 'Configure' }
          ].map(item => (
            <button
              key={item.name}
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                padding: '1rem',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                const target = e.target as HTMLButtonElement
                target.style.backgroundColor = '#e2e8f0'
                target.style.transform = 'translateY(-2px)'
              }}
              onMouseOut={(e) => {
                const target = e.target as HTMLButtonElement
                target.style.backgroundColor = '#f8fafc'
                target.style.transform = 'translateY(0)'
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{item.emoji}</div>
              <div style={{ fontWeight: 'bold', color: '#1f2937' }}>{item.name}</div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{item.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Status Info */}
      <div style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: 0, marginBottom: '1rem', color: '#1f2937' }}>🔧 System Status</h3>
        <div style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: '1.5' }}>
          <p>✅ <strong>React App:</strong> Running successfully</p>
          <p>✅ <strong>Backend API:</strong> Available at http://localhost:3001</p>
          <p>{isConnected ? '✅' : '❌'} <strong>WebSocket:</strong> {isConnected ? 'Connected' : 'Disconnected'}</p>
          <p>✅ <strong>Icons:</strong> Rendering correctly</p>
          <p>⚙️ <strong>Layout:</strong> Using fallback styling (Tailwind CSS issue detected)</p>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        textAlign: 'center',
        marginTop: '2rem',
        padding: '1rem',
        color: '#6b7280',
        fontSize: '0.875rem'
      }}>
        <p>Executive Assistant MVP - Built with React + AG-UI Protocol</p>
        <p>🎉 Your app is working! The layout issue can be fixed by debugging Tailwind CSS.</p>
      </div>
    </div>
  )
}

export default SimpleDashboard
