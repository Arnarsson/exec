import React, { useState } from 'react'
import { 
  ClipboardDocumentListIcon,
  PlusIcon,
  FunnelIcon,
  EllipsisVerticalIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  UserGroupIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid'
import { useActiveProjects } from '@/hooks/useExecutiveState'
import { useAGUIToolCalls } from '@/hooks/useWebSocket'
import { format, isOverdue, isBefore, addDays } from 'date-fns'

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'in-progress' | 'completed' | 'blocked';
  assignee?: string;
  deadline?: string;
  projectId?: string;
  tags?: string[];
  progress: number;
  createdAt: string;
  updatedAt: string;
}

// Mock tasks data
const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Prepare Q4 financial presentation',
    description: 'Create comprehensive slides for board meeting including revenue, expenses, and projections',
    priority: 'high',
    status: 'in-progress',
    assignee: 'John Doe',
    deadline: '2024-05-30T17:00:00Z',
    projectId: 'project_1',
    tags: ['finance', 'presentation'],
    progress: 65,
    createdAt: '2024-05-20T09:00:00Z',
    updatedAt: '2024-05-24T14:30:00Z'
  },
  {
    id: '2',
    title: 'Review vendor contracts',
    description: 'Review and approve pending vendor contracts for legal compliance',
    priority: 'high',
    status: 'todo',
    assignee: 'Sarah Johnson',
    deadline: '2024-05-25T23:59:00Z',
    projectId: 'project_2',
    tags: ['legal', 'contracts'],
    progress: 0,
    createdAt: '2024-05-22T11:00:00Z',
    updatedAt: '2024-05-22T11:00:00Z'
  },
  {
    id: '3',
    title: 'Team performance reviews',
    description: 'Complete quarterly performance reviews for direct reports',
    priority: 'medium',
    status: 'in-progress',
    assignee: 'Michael Chen',
    deadline: '2024-06-01T17:00:00Z',
    tags: ['hr', 'reviews'],
    progress: 40,
    createdAt: '2024-05-18T08:00:00Z',
    updatedAt: '2024-05-23T16:00:00Z'
  },
  {
    id: '4',
    title: 'Strategic planning workshop',
    description: 'Organize and facilitate next quarter strategic planning session',
    priority: 'medium',
    status: 'todo',
    deadline: '2024-06-05T10:00:00Z',
    tags: ['strategy', 'planning'],
    progress: 0,
    createdAt: '2024-05-21T10:00:00Z',
    updatedAt: '2024-05-21T10:00:00Z'
  },
  {
    id: '5',
    title: 'Update company website',
    description: 'Review and update company website content for accuracy',
    priority: 'low',
    status: 'completed',
    assignee: 'Marketing Team',
    deadline: '2024-05-23T17:00:00Z',
    tags: ['marketing', 'website'],
    progress: 100,
    createdAt: '2024-05-15T14:00:00Z',
    updatedAt: '2024-05-23T15:30:00Z'
  },
  {
    id: '6',
    title: 'Budget allocation review',
    description: 'Review and finalize budget allocations for next quarter',
    priority: 'high',
    status: 'blocked',
    assignee: 'Finance Team',
    deadline: '2024-05-28T17:00:00Z',
    projectId: 'project_1',
    tags: ['finance', 'budget'],
    progress: 20,
    createdAt: '2024-05-19T09:00:00Z',
    updatedAt: '2024-05-24T12:00:00Z'
  }
]

export default function Tasks() {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')
  
  const { projects } = useActiveProjects()
  const activeTool = useAGUIToolCalls()

  // Filter tasks
  const filteredTasks = mockTasks.filter(task => {
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority
    return matchesStatus && matchesPriority
  })

  // Group tasks by status for kanban view
  const tasksByStatus = {
    'todo': filteredTasks.filter(t => t.status === 'todo'),
    'in-progress': filteredTasks.filter(t => t.status === 'in-progress'),
    'completed': filteredTasks.filter(t => t.status === 'completed'),
    'blocked': filteredTasks.filter(t => t.status === 'blocked')
  }

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'todo': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
      case 'in-progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'blocked': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return 'text-red-600 dark:text-red-400'
      case 'medium': return 'text-yellow-600 dark:text-yellow-400'
      case 'low': return 'text-green-600 dark:text-green-400'
      default: return 'text-gray-600 dark:text-gray-400'
    }
  }

  const getPriorityIcon = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return <ExclamationTriangleIcon className="h-4 w-4" />
      case 'medium': return <ClockIcon className="h-4 w-4" />
      case 'low': return <CheckCircleIcon className="h-4 w-4" />
      default: return null
    }
  }

  const isTaskOverdue = (task: Task) => {
    return task.deadline && task.status !== 'completed' && isBefore(new Date(task.deadline), new Date())
  }

  const getTaskStats = () => {
    const total = mockTasks.length
    const completed = mockTasks.filter(t => t.status === 'completed').length
    const overdue = mockTasks.filter(t => isTaskOverdue(t)).length
    const dueToday = mockTasks.filter(t => 
      t.deadline && format(new Date(t.deadline), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
    ).length

    return { total, completed, overdue, dueToday }
  }

  const stats = getTaskStats()

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tasks</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your projects and tasks
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                  : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                  : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              Kanban
            </button>
          </div>
          <button
            onClick={() => setShowCreateTask(true)}
            className="ea-button-primary flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            New Task
          </button>
        </div>
      </div>

      {/* AG-UI Tool Status */}
      {activeTool && activeTool.toolName.includes('task') && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
          <div className="flex items-center">
            <div className="animate-spin h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full mr-3"></div>
            <span className="text-purple-800 dark:text-purple-200">
              {activeTool.toolName}: {activeTool.isComplete ? 'Completed' : 'Processing...'}
            </span>
          </div>
        </div>
      )}

      {/* Task Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="ea-card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <ClipboardDocumentListIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Tasks</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="ea-card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <CheckCircleIconSolid className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.completed}</p>
            </div>
          </div>
        </div>

        <div className="ea-card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Overdue</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.overdue}</p>
            </div>
          </div>
        </div>

        <div className="ea-card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <CalendarIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Due Today</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.dueToday}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <FunnelIcon className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
        </div>
        
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
        >
          <option value="all">All Status</option>
          <option value="todo">To Do</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="blocked">Blocked</option>
        </select>

        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
        >
          <option value="all">All Priority</option>
          <option value="high">High Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="low">Low Priority</option>
        </select>
      </div>

      {/* Task Content */}
      {viewMode === 'list' ? (
        /* List View */
        <div className="ea-card">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Task List ({filteredTasks.length} tasks)
            </h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredTasks.map(task => (
              <div
                key={task.id}
                className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                onClick={() => setSelectedTask(task)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <button
                      className={`mt-1 flex-shrink-0 ${
                        task.status === 'completed' ? 'text-green-600' : 'text-gray-400'
                      }`}
                    >
                      {task.status === 'completed' ? (
                        <CheckCircleIconSolid className="h-5 w-5" />
                      ) : (
                        <CheckCircleIcon className="h-5 w-5" />
                      )}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className={`text-sm font-medium ${
                          task.status === 'completed' 
                            ? 'text-gray-500 dark:text-gray-400 line-through' 
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {task.title}
                        </h4>
                        
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(task.status)}`}>
                            {task.status.replace('-', ' ')}
                          </span>
                          
                          <div className={`flex items-center ${getPriorityColor(task.priority)}`}>
                            {getPriorityIcon(task.priority)}
                          </div>
                          
                          {isTaskOverdue(task) && (
                            <span className="inline-flex items-center text-xs px-2 py-1 rounded-full font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                              Overdue
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {task.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {task.description}
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                        {task.assignee && (
                          <div className="flex items-center">
                            <UserGroupIcon className="h-4 w-4 mr-1" />
                            {task.assignee}
                          </div>
                        )}
                        
                        {task.deadline && (
                          <div className="flex items-center">
                            <CalendarIcon className="h-4 w-4 mr-1" />
                            Due {format(new Date(task.deadline), 'MMM d, yyyy')}
                          </div>
                        )}
                        
                        {task.tags && task.tags.length > 0 && (
                          <div className="flex items-center space-x-1">
                            {task.tags.map(tag => (
                              <span key={tag} className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      {task.status === 'in-progress' && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                            <span>Progress</span>
                            <span>{task.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <EllipsisVerticalIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Kanban View */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Object.entries(tasksByStatus).map(([status, tasks]) => (
            <div key={status} className="ea-card">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                    {status.replace('-', ' ')}
                  </h3>
                  <span className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs px-2 py-1 rounded-full">
                    {tasks.length}
                  </span>
                </div>
              </div>
              
              <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                {tasks.map(task => (
                  <div
                    key={task.id}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    onClick={() => setSelectedTask(task)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {task.title}
                      </h4>
                      <div className={`flex items-center ${getPriorityColor(task.priority)}`}>
                        {getPriorityIcon(task.priority)}
                      </div>
                    </div>
                    
                    {task.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    
                    <div className="space-y-2">
                      {task.assignee && (
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <UserGroupIcon className="h-3 w-3 mr-1" />
                          {task.assignee}
                        </div>
                      )}
                      
                      {task.deadline && (
                        <div className={`flex items-center text-xs ${
                          isTaskOverdue(task) ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          {format(new Date(task.deadline), 'MMM d')}
                        </div>
                      )}
                      
                      {task.status === 'in-progress' && (
                        <div>
                          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                            <span>Progress</span>
                            <span>{task.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1">
                            <div
                              className="bg-primary-600 h-1 rounded-full"
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateTask && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowCreateTask(false)} />
            
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Create New Task
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Task Title
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter task title"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white resize-none"
                    placeholder="Enter task description"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Priority
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Deadline
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Assignee
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter assignee name"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateTask(false)}
                  className="ea-button-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowCreateTask(false)}
                  className="ea-button-primary"
                >
                  Create Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
