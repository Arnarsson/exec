import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowTrendingUpIcon, 
  ExclamationTriangleIcon, 
  ClockIcon,
  CheckCircleIcon,
  ChartBarIcon,
  CogIcon,
  PlayIcon,
  CodeBracketIcon,
  EnvelopeIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { okrApiService } from '../services/okrApi';
import { OKRDashboardData, OKR, OKRAlert, priorityColors, statusColors } from '../types/okr';
import toast from 'react-hot-toast';

export default function OKRDashboard() {
  const [dashboardData, setDashboardData] = useState<OKRDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOKR, setSelectedOKR] = useState<OKR | null>(null);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);

  useEffect(() => {
    loadDashboardData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      console.log('[OKR-DASHBOARD] Loading dashboard data...');
      const data = await okrApiService.getDashboardData();
      setDashboardData(data);
      setError(null);
    } catch (err) {
      console.error('[OKR-DASHBOARD] Failed to load dashboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleProgressUpdate = async (okrId: string, newProgress: number) => {
    try {
      await okrApiService.updateProgress(okrId, newProgress, 'MANUAL');
      toast.success('Progress updated successfully!');
      await loadDashboardData(); // Refresh data
    } catch (err) {
      console.error('[OKR-DASHBOARD] Failed to update progress:', err);
      toast.error('Failed to update progress');
    }
  };

  const handleTestGitHubWebhook = async () => {
    setIsTestingWebhook(true);
    try {
      await okrApiService.testGitHubWebhook({
        repoName: 'dozy-sleep-tracker',
        commitMessage: 'feat: Add sleep tracking improvements',
        authorName: 'Test Developer'
      });
      toast.success('GitHub webhook test triggered!');
      
      // Refresh data after a short delay to see the update
      setTimeout(loadDashboardData, 2000);
    } catch (err) {
      console.error('[OKR-DASHBOARD] Failed to test webhook:', err);
      toast.error('Failed to test GitHub webhook');
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysUntilDue = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"
        />
        <span className="ml-3 text-gray-600">Loading OKR Dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-red-800">Error Loading Dashboard</h3>
              <p className="text-red-600 mt-1">{error}</p>
              <button
                onClick={loadDashboardData}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return <div>No data available</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">OKR Dashboard</h1>
          <p className="text-gray-600 mt-1">AI-Powered Work Orchestration • Real-time Progress Tracking</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleTestGitHubWebhook}
            disabled={isTestingWebhook}
            className="flex items-center px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50"
          >
            <CodeBracketIcon className="w-4 h-4 mr-2" />
            {isTestingWebhook ? 'Testing...' : 'Test GitHub'}
          </button>
          <button
            onClick={loadDashboardData}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlayIcon className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overall Progress</p>
              <p className="text-3xl font-bold text-gray-900">{dashboardData.totalProgress}%</p>
            </div>
            <ArrowTrendingUpIcon className="w-8 h-8 text-green-600" />
          </div>
          <div className="mt-4 bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${dashboardData.totalProgress}%` }}
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active OKRs</p>
              <p className="text-3xl font-bold text-gray-900">{dashboardData.okrs.length}</p>
            </div>
            <ChartBarIcon className="w-8 h-8 text-blue-600" />
          </div>
          <div className="mt-2 flex space-x-2 text-xs">
            {Object.entries(dashboardData.priorityDistribution).map(([priority, count]) => (
              <span key={priority} className={`px-2 py-1 rounded ${priorityColors[priority as keyof typeof priorityColors]}`}>
                {count} {priority}
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Alerts</p>
              <p className="text-3xl font-bold text-gray-900">{dashboardData.recentAlerts.length}</p>
            </div>
            <ExclamationTriangleIcon className="w-8 h-8 text-yellow-600" />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {dashboardData.recentAlerts.filter(alert => alert.actionRequired).length} require action
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Upcoming Deadlines</p>
              <p className="text-3xl font-bold text-gray-900">{dashboardData.upcomingDeadlines.length}</p>
            </div>
            <ClockIcon className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {dashboardData.upcomingDeadlines.filter(item => item.daysUntilDue <= 7).length} within 7 days
          </p>
        </motion.div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Smart Priorities */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200"
        >
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Smart Priorities</h2>
            <p className="text-gray-600 text-sm mt-1">Ranked by AI-enhanced RICE scores</p>
          </div>
          <div className="p-6 space-y-4">
            {dashboardData.okrs.slice(0, 5).map((okr, index) => (
              <motion.div
                key={okr.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedOKR(okr)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`px-2 py-1 text-xs rounded ${priorityColors[okr.priority]}`}>
                        {okr.priority}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded ${statusColors[okr.status]}`}>
                        {okr.status.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-500">
                        RICE: {okr.ricePriority.score}
                      </span>
                    </div>
                    <h3 className="font-medium text-gray-900 mb-1">{okr.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">{okr.description}</p>
                    
                    {/* Progress Bar */}
                    <div className="flex items-center space-x-3">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${okr.progress}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 min-w-0">{okr.progress}%</span>
                    </div>

                    {/* Integration Status */}
                    <div className="flex items-center space-x-3 mt-2">
                      {okr.integrations.github && (
                        <div className="flex items-center text-xs text-gray-500">
                          <CodeBracketIcon className="w-3 h-3 mr-1" />
                          {okr.integrations.github.repo}
                        </div>
                      )}
                      {okr.integrations.email && (
                        <div className="flex items-center text-xs text-gray-500">
                          <EnvelopeIcon className="w-3 h-3 mr-1" />
                          Email tracking
                        </div>
                      )}
                      {okr.integrations.calendar && (
                        <div className="flex items-center text-xs text-gray-500">
                          <CalendarIcon className="w-3 h-3 mr-1" />
                          Calendar sync
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Due {formatDate(okr.dueDate)}</p>
                    <p className="text-xs text-gray-500">{getDaysUntilDue(okr.dueDate)} days</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Alerts & Insights */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-8"
        >
          {/* Alerts */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Active Alerts</h2>
              <p className="text-gray-600 text-sm mt-1">AI-detected bottlenecks and risks</p>
            </div>
            <div className="p-6 space-y-4">
              {dashboardData.recentAlerts.slice(0, 4).map((alert, index) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`border-l-4 p-4 rounded-r-lg ${
                    alert.severity === 'HIGH' ? 'border-red-500 bg-red-50' :
                    alert.severity === 'MEDIUM' ? 'border-yellow-500 bg-yellow-50' :
                    'border-blue-500 bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{alert.message}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {alert.type.replace('_', ' ')} • {alert.severity} severity
                      </p>
                      {alert.suggestions.length > 0 && (
                        <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                          {alert.suggestions.slice(0, 2).map((suggestion, i) => (
                            <li key={i}>{suggestion}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    {alert.actionRequired && (
                      <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                        Action Required
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
              <p className="text-gray-600 text-sm mt-1">Auto-tracked progress updates</p>
            </div>
            <div className="p-6 space-y-4">
              {dashboardData.activityTimeline.slice(0, 5).map((activity, index) => (
                <motion.div
                  key={`${activity.okrId}-${activity.timestamp}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center space-x-3"
                >
                  <div className={`w-2 h-2 rounded-full ${
                    activity.source === 'GITHUB' ? 'bg-gray-800' :
                    activity.source === 'EMAIL' ? 'bg-blue-600' :
                    activity.source === 'CALENDAR' ? 'bg-green-600' :
                    'bg-purple-600'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">
                      Progress updated: {activity.previousValue}% → {activity.newValue}%
                      <span className="text-gray-500 ml-2">
                        ({activity.delta > 0 ? '+' : ''}{activity.delta}%)
                      </span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {activity.source} • {new Date(activity.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}