import React, { useState, useEffect } from 'react';
import { 
  CogIcon, 
  PlayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EnvelopeIcon,
  CalendarIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';

interface AutomationStatus {
  n8n_connected: boolean;
  active_workflows: string[];
  last_execution: string;
  metrics: {
    emails_processed_today: number;
    tasks_created_today: number;
    meetings_prepared_today: number;
    automations_successful: number;
    automations_failed: number;
  };
}

export const AutomationDashboard: React.FC = () => {
  const [status, setStatus] = useState<AutomationStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAutomationStatus();
    const interval = setInterval(fetchAutomationStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAutomationStatus = async () => {
    try {
      const response = await fetch('/api/automation/status');
      const data = await response.json();
      setStatus(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch automation status:', error);
      setLoading(false);
    }
  };

  const triggerWorkflow = async (workflow: string) => {
    try {
      const response = await fetch(`/api/automation/trigger/${workflow}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true })
      });
      
      if (response.ok) {
        console.log(`✅ Triggered ${workflow}`);
        await fetchAutomationStatus();
      }
    } catch (error) {
      console.error(`❌ Failed to trigger ${workflow}:`, error);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <CogIcon className="w-5 h-5 mr-2" />
          Automation Hub
        </h3>
      </div>
      
      <div className="p-6">
        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${
              status?.n8n_connected ? 'bg-green-400' : 'bg-red-400'
            }`}></div>
            <span className="text-sm text-gray-600">
              n8n {status?.n8n_connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          <div className="flex items-center">
            <PlayIcon className="w-4 h-4 mr-2 text-blue-500" />
            <span className="text-sm text-gray-600">
              {status?.active_workflows.length || 0} Active Workflows
            </span>
          </div>
          
          <div className="flex items-center">
            <CheckCircleIcon className="w-4 h-4 mr-2 text-green-500" />
            <span className="text-sm text-gray-600">
              {status?.metrics ? 
                Math.round((status.metrics.automations_successful / 
                  (status.metrics.automations_successful + status.metrics.automations_failed) || 1) * 100)
                : 0}% Success Rate
            </span>
          </div>
          
          <div className="text-sm text-gray-600">
            Last: {status?.last_execution ? 
              new Date(status.last_execution).toLocaleTimeString() : 'Never'}
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <EnvelopeIcon className="w-8 h-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-600">Emails Processed</p>
                <p className="text-2xl font-bold text-blue-900">
                  {status?.metrics.emails_processed_today || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <ClipboardDocumentListIcon className="w-8 h-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-600">Tasks Created</p>
                <p className="text-2xl font-bold text-green-900">
                  {status?.metrics.tasks_created_today || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center">
              <CalendarIcon className="w-8 h-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-purple-600">Meetings Prepped</p>
                <p className="text-2xl font-bold text-purple-900">
                  {status?.metrics.meetings_prepared_today || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => triggerWorkflow('email-intelligence')}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Test Email AI
            </button>
            <button
              onClick={() => triggerWorkflow('calendar-prep')}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
            >
              Prep Meetings
            </button>
            <button
              onClick={() => triggerWorkflow('task-automation')}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
            >
              Optimize Tasks
            </button>
            <button
              onClick={() => window.open('https://n8n.aigrowthadvisors.cc', '_blank')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Open n8n
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};