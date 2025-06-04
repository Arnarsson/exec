import React, { useState, useEffect } from 'react';

interface AuthStatus {
  authenticated: boolean;
  hasGoogleCredentials: boolean;
  timestamp: string;
}

const GoogleSetup: React.FC = () => {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuthStatus = async () => {
    try {
      console.log('Checking auth status...');
      const response = await fetch('http://localhost:3001/auth/status');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setAuthStatus(data);
      setError(null);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setError(error instanceof Error ? error.message : 'Failed to check authentication status');
    } finally {
      setLoading(false);
    }
  };

  const startGoogleAuth = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/auth/google');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl;
      } else {
        throw new Error('No auth URL received');
      }
    } catch (error) {
      console.error('Error starting Google auth:', error);
      setError(error instanceof Error ? error.message : 'Failed to start Google authentication');
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
    
    // Poll auth status every 3 seconds
    const interval = setInterval(checkAuthStatus, 3000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Google Setup
          </h1>
          <p className="text-gray-600">
            Connect your Google account to enable calendar and email integration
          </p>
        </div>

        {loading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong>Error:</strong> {error}
          </div>
        )}

        {authStatus && !loading && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Authenticated:</span>
                  <span className={authStatus.authenticated ? 'text-green-600' : 'text-red-600'}>
                    {authStatus.authenticated ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Google Credentials:</span>
                  <span className={authStatus.hasGoogleCredentials ? 'text-green-600' : 'text-red-600'}>
                    {authStatus.hasGoogleCredentials ? 'Configured' : 'Missing'}
                  </span>
                </div>
              </div>
            </div>

            {!authStatus.hasGoogleCredentials && (
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                <strong>Setup Required:</strong> Google OAuth credentials need to be configured in the backend environment variables.
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={startGoogleAuth}
                disabled={!authStatus.hasGoogleCredentials || loading}
                className="w-full ea-button-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {authStatus.authenticated ? 'Re-authenticate' : 'Connect Google Account'}
              </button>

              <button
                onClick={checkAuthStatus}
                className="w-full ea-button-secondary"
              >
                Refresh Status
              </button>

              <a
                href="/"
                className="block w-full text-center ea-button-secondary text-decoration-none"
              >
                Back to Dashboard
              </a>
            </div>

            <div className="text-xs text-gray-500 text-center">
              Last checked: {new Date(authStatus.timestamp).toLocaleString()}
            </div>
          </div>
        )}

        <div className="mt-6 text-xs text-gray-500">
          <h4 className="font-semibold mb-2">Required Permissions:</h4>
          <ul className="list-disc list-inside space-y-1">
            <li>Read your email address and profile</li>
            <li>View your calendar events</li>
            <li>Read your Gmail messages</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default GoogleSetup;