import { useState, useEffect, useCallback } from 'react'
import { format, isBefore, addDays } from 'date-fns'

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'in-progress' | 'completed' | 'blocked';
  assignee?: string;
  deadline?: string;
  tags?: string[];
  progress: number;
  sourceMemory?: string;
}

interface MemoryResult {
  id: string;
  title: string;
  snippet: string;
  ts_start: string;
  _score: number;
}

// Local storage key for persisting tasks
const TASKS_STORAGE_KEY = 'exec-assistant-tasks'

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [showNewTaskForm, setShowNewTaskForm] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<'high' | 'medium' | 'low'>('medium')

  // Load tasks from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(TASKS_STORAGE_KEY)
    if (saved) {
      try {
        setTasks(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load tasks:', e)
      }
    }
  }, [])

  // Save tasks to localStorage when they change
  useEffect(() => {
    if (tasks.length > 0) {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks))
    }
  }, [tasks])

  const filteredTasks = tasks.filter(task => {
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority
    return matchesStatus && matchesPriority
  })

  const isTaskOverdue = (task: Task) => {
    return task.deadline && task.status !== 'completed' && isBefore(new Date(task.deadline), new Date())
  }

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(t => isTaskOverdue(t)).length,
    dueToday: tasks.filter(t =>
      t.deadline && format(new Date(t.deadline), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
    ).length
  }

  // Extract actionable items from memory text
  const extractTasksFromMemory = (memories: MemoryResult[]): Task[] => {
    const extractedTasks: Task[] = []
    const actionKeywords = [
      'need to', 'should', 'must', 'have to', 'will', 'going to',
      'todo', 'task', 'action item', 'follow up', 'remember to',
      'don\'t forget', 'make sure', 'ensure', 'implement', 'create',
      'build', 'fix', 'update', 'review', 'schedule', 'plan'
    ]

    memories.forEach((memory, idx) => {
      const text = memory.snippet.toLowerCase()
      const title = memory.title

      // Check if memory contains actionable content
      const hasAction = actionKeywords.some(kw => text.includes(kw))

      if (hasAction && memory._score > 0.2) {
        // Extract a task title from the memory
        let taskTitle = title
        if (title.length > 60) {
          taskTitle = title.substring(0, 57) + '...'
        }

        // Determine priority based on keywords
        let priority: 'high' | 'medium' | 'low' = 'medium'
        if (text.includes('urgent') || text.includes('asap') || text.includes('critical') || text.includes('important')) {
          priority = 'high'
        } else if (text.includes('when you have time') || text.includes('eventually') || text.includes('nice to have')) {
          priority = 'low'
        }

        // Create deadline (default: 7 days from now for high, 14 for medium, 30 for low)
        const daysToDeadline = priority === 'high' ? 7 : priority === 'medium' ? 14 : 30
        const deadline = addDays(new Date(), daysToDeadline).toISOString()

        // Extract tags from memory
        const tags: string[] = []
        if (text.includes('code') || text.includes('develop') || text.includes('implement')) tags.push('development')
        if (text.includes('meeting') || text.includes('call') || text.includes('discuss')) tags.push('meeting')
        if (text.includes('review') || text.includes('feedback')) tags.push('review')
        if (text.includes('design') || text.includes('ui') || text.includes('ux')) tags.push('design')
        if (text.includes('research') || text.includes('investigate')) tags.push('research')

        extractedTasks.push({
          id: `task_${Date.now()}_${idx}`,
          title: `From: ${taskTitle}`,
          description: memory.snippet.substring(0, 200),
          priority,
          status: 'todo',
          deadline,
          tags: tags.length > 0 ? tags : ['from-memory'],
          progress: 0,
          sourceMemory: memory.id
        })
      }
    })

    return extractedTasks
  }

  // Generate tasks from conversation history
  const generateTasksFromMemory = useCallback(async () => {
    setIsGenerating(true)
    setGenerateError(null)

    try {
      // Search for actionable memories
      const queries = [
        'todo action items tasks',
        'need to implement build create',
        'follow up schedule meeting',
        'urgent important deadline'
      ]

      const allMemories: MemoryResult[] = []

      for (const query of queries) {
        const response = await fetch(`http://localhost:8765/search?q=${encodeURIComponent(query)}&limit=5`)
        if (response.ok) {
          const data = await response.json()
          allMemories.push(...(data.results || []))
        }
      }

      // Deduplicate by id
      const uniqueMemories = Array.from(
        new Map(allMemories.map(m => [m.id, m])).values()
      )

      // Extract tasks from memories
      const newTasks = extractTasksFromMemory(uniqueMemories)

      if (newTasks.length === 0) {
        setGenerateError('No actionable items found in recent conversations')
      } else {
        // Add new tasks (avoiding duplicates by sourceMemory)
        const existingSourceIds = new Set(tasks.map(t => t.sourceMemory).filter(Boolean))
        const trulyNewTasks = newTasks.filter(t => !existingSourceIds.has(t.sourceMemory))

        if (trulyNewTasks.length > 0) {
          setTasks(prev => [...trulyNewTasks, ...prev])
        } else {
          setGenerateError('All found tasks already exist')
        }
      }
    } catch (error) {
      console.error('Failed to generate tasks:', error)
      setGenerateError('Failed to connect to memory service')
    } finally {
      setIsGenerating(false)
    }
  }, [tasks])

  // Add new task manually
  const addNewTask = () => {
    if (!newTaskTitle.trim()) return

    const newTask: Task = {
      id: `task_${Date.now()}`,
      title: newTaskTitle.trim(),
      description: newTaskDescription.trim() || undefined,
      priority: newTaskPriority,
      status: 'todo',
      deadline: addDays(new Date(), newTaskPriority === 'high' ? 7 : 14).toISOString(),
      tags: [],
      progress: 0
    }

    setTasks(prev => [newTask, ...prev])
    setNewTaskTitle('')
    setNewTaskDescription('')
    setNewTaskPriority('medium')
    setShowNewTaskForm(false)
  }

  // Update task status
  const updateTaskStatus = (taskId: string, newStatus: Task['status']) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, status: newStatus, progress: newStatus === 'completed' ? 100 : t.progress }
        : t
    ))
  }

  // Delete task
  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }

  return (
    <div>
      {/* Header */}
      <header className="swiss-hero" style={{ marginBottom: '2rem', paddingBottom: '1.5rem' }}>
        <div>
          <p className="swiss-hero-subtitle">Task Management</p>
          <h1 style={{ fontSize: '2rem' }}>Active Tasks</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={generateTasksFromMemory}
            disabled={isGenerating}
            className="swiss-btn"
            style={{
              padding: '0.75rem 1.5rem',
              opacity: isGenerating ? 0.6 : 1
            }}
          >
            {isGenerating ? 'ANALYZING...' : 'GENERATE FROM MEMORY'}
          </button>
          <button
            onClick={() => setShowNewTaskForm(true)}
            className="swiss-btn swiss-btn-primary"
            style={{ padding: '0.75rem 1.5rem' }}
          >
            + NEW TASK
          </button>
        </div>
      </header>

      {/* Generate Error */}
      {generateError && (
        <div style={{
          padding: '1rem',
          marginBottom: '2rem',
          background: '#f2f2f2',
          borderLeft: '2px solid #ff0000',
          fontSize: '0.85rem'
        }}>
          {generateError}
        </div>
      )}

      {/* New Task Form */}
      {showNewTaskForm && (
        <div style={{
          padding: '1.5rem',
          marginBottom: '2rem',
          border: '2px solid #000',
          background: '#fafafa'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}>
              New Task
            </span>
            <button
              onClick={() => setShowNewTaskForm(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem' }}
            >
              ×
            </button>
          </div>
          <input
            type="text"
            placeholder="Task title..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="swiss-input"
            style={{ marginBottom: '1rem' }}
          />
          <textarea
            placeholder="Description (optional)..."
            value={newTaskDescription}
            onChange={(e) => setNewTaskDescription(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              border: '1px solid #000',
              background: 'transparent',
              fontSize: '0.9rem',
              fontFamily: 'inherit',
              resize: 'vertical',
              minHeight: '80px',
              marginBottom: '1rem'
            }}
          />
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <select
              value={newTaskPriority}
              onChange={(e) => setNewTaskPriority(e.target.value as 'high' | 'medium' | 'low')}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #000',
                background: 'transparent',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase'
              }}
            >
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
            <button
              onClick={addNewTask}
              disabled={!newTaskTitle.trim()}
              className="swiss-btn swiss-btn-primary"
              style={{ padding: '0.5rem 1.5rem' }}
            >
              ADD TASK
            </button>
          </div>
        </div>
      )}

      {/* Metrics */}
      <section className="swiss-metric-grid" style={{ marginBottom: '3rem' }}>
        <div className="swiss-metric">
          <span className="swiss-metric-label">Total</span>
          <span className="swiss-metric-value">{String(stats.total).padStart(2, '0')}</span>
        </div>
        <div className="swiss-metric">
          <span className="swiss-metric-label">Completed</span>
          <span className="swiss-metric-value">{String(stats.completed).padStart(2, '0')}</span>
        </div>
        <div className="swiss-metric">
          <span className="swiss-metric-label">Overdue</span>
          <span className="swiss-metric-value" style={{ color: stats.overdue > 0 ? '#ff0000' : undefined }}>
            {String(stats.overdue).padStart(2, '0')}
          </span>
        </div>
        <div className="swiss-metric">
          <span className="swiss-metric-label">Due Today</span>
          <span className="swiss-metric-value">{String(stats.dueToday).padStart(2, '0')}</span>
        </div>
      </section>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#666' }}>
          Filters:
        </span>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #000',
            background: 'transparent',
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
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
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #000',
            background: 'transparent',
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          <option value="all">All Priority</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Task List */}
      <section>
        <h2 className="swiss-section-title">Task List ({filteredTasks.length} tasks)</h2>

        {filteredTasks.length === 0 ? (
          <div style={{
            padding: '3rem',
            textAlign: 'center',
            color: '#666',
            border: '1px dashed #ccc'
          }}>
            <p style={{ marginBottom: '1rem' }}>No tasks yet</p>
            <p style={{ fontSize: '0.85rem' }}>
              Click "GENERATE FROM MEMORY" to create tasks from your conversation history,
              or "+ NEW TASK" to add one manually.
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div key={task.id} className="swiss-item" style={{ alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                  <strong className="swiss-item-title" style={{
                    textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                    color: task.status === 'completed' ? '#666' : '#000'
                  }}>
                    {task.title}
                  </strong>

                  <span className={`swiss-badge ${task.priority === 'high' ? 'swiss-badge-high' : ''}`}>
                    {task.priority}
                  </span>

                  <span style={{
                    fontSize: '0.6rem',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    padding: '2px 6px',
                    border: '1px solid',
                    borderColor: task.status === 'blocked' ? '#ff0000' : task.status === 'completed' ? '#16a34a' : '#000',
                    color: task.status === 'blocked' ? '#ff0000' : task.status === 'completed' ? '#16a34a' : '#000',
                    background: task.status === 'completed' ? '#dcfce7' : 'transparent'
                  }}>
                    {task.status.replace('-', ' ')}
                  </span>

                  {isTaskOverdue(task) && (
                    <span className="swiss-urgent">OVERDUE</span>
                  )}

                  {task.sourceMemory && (
                    <span style={{
                      fontSize: '0.6rem',
                      fontWeight: 600,
                      padding: '2px 6px',
                      background: '#e5e5e5',
                      color: '#666'
                    }}>
                      FROM MEMORY
                    </span>
                  )}
                </div>

                {task.description && (
                  <div className="swiss-item-meta" style={{ marginBottom: '0.5rem' }}>
                    {task.description}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem', color: '#666' }}>
                  {task.assignee && (
                    <span>Assignee: {task.assignee}</span>
                  )}
                  {task.deadline && (
                    <span>Due: {format(new Date(task.deadline), 'MMM d, yyyy')}</span>
                  )}
                  {task.tags && task.tags.length > 0 && (
                    <span>Tags: {task.tags.join(', ')}</span>
                  )}
                </div>

                {/* Quick Actions */}
                <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                  {task.status !== 'completed' && (
                    <button
                      onClick={() => updateTaskStatus(task.id, 'completed')}
                      style={{
                        padding: '0.25rem 0.75rem',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        border: '1px solid #16a34a',
                        background: 'transparent',
                        color: '#16a34a',
                        cursor: 'pointer'
                      }}
                    >
                      Complete
                    </button>
                  )}
                  {task.status === 'todo' && (
                    <button
                      onClick={() => updateTaskStatus(task.id, 'in-progress')}
                      style={{
                        padding: '0.25rem 0.75rem',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        border: '1px solid #000',
                        background: 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      Start
                    </button>
                  )}
                  <button
                    onClick={() => deleteTask(task.id)}
                    style={{
                      padding: '0.25rem 0.75rem',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      border: '1px solid #ff0000',
                      background: 'transparent',
                      color: '#ff0000',
                      cursor: 'pointer'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  )
}
