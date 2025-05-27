import React from 'react'

function SimpleTest() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      fontFamily: 'system-ui',
      backgroundColor: '#f3f4f6'
    }}>
      <div style={{ 
        textAlign: 'center', 
        backgroundColor: 'white', 
        padding: '2rem',
        borderRadius: '1rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1rem' }}>
          🎉 Executive Assistant MVP
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          React app is working perfectly!
        </p>
        <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
          Time: {new Date().toLocaleString()}
        </div>
        <div style={{ marginTop: '1rem' }}>
          <button 
            onClick={() => window.location.href = '/'}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '0.5rem 1rem',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

export default SimpleTest
