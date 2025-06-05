import express from 'express';

const router = express.Router();

// Mock data for demonstration - in production this would come from a database
const mockTasks = [
  {
    id: '1',
    title: 'Review Q1 Performance Metrics',
    description: 'Analyze revenue growth and team performance data',
    priority: 'high',
    status: 'in-progress',
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
    assignedTo: 'Executive',
    category: 'Performance Review',
    estimatedHours: 3,
    completedHours: 1,
    tags: ['performance', 'revenue', 'quarterly']
  },
  {
    id: '2',
    title: 'Strategic Planning Meeting Prep',
    description: 'Prepare agenda and materials for quarterly strategic planning session',
    priority: 'high',
    status: 'pending',
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
    assignedTo: 'Executive',
    category: 'Strategic Planning',
    estimatedHours: 4,
    completedHours: 0,
    tags: ['strategy', 'planning', 'quarterly']
  },
  {
    id: '3',
    title: 'Client Follow-up Calls',
    description: 'Reach out to key clients for feedback and relationship building',
    priority: 'medium',
    status: 'pending',
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
    assignedTo: 'Executive',
    category: 'Client Relations',
    estimatedHours: 2,
    completedHours: 0,
    tags: ['clients', 'relationships', 'feedback']
  },
  {
    id: '4',
    title: 'Budget Review and Adjustments',
    description: 'Review current budget allocations and make necessary adjustments',
    priority: 'medium',
    status: 'completed',
    dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    assignedTo: 'Executive',
    category: 'Financial Planning',
    estimatedHours: 2,
    completedHours: 2,
    tags: ['budget', 'finance', 'planning']
  }
];

const mockCalendarAgenda = [
  {
    id: 'cal-1',
    title: 'Team Leadership Meeting',
    description: 'Weekly leadership team sync',
    startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    endTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours from now
    location: 'Conference Room A',
    attendees: ['Executive', 'VP Operations', 'VP Sales', 'VP Marketing'],
    priority: 'high',
    type: 'meeting'
  },
  {
    id: 'cal-2',
    title: 'Client Presentation',
    description: 'Present Q1 results to key client',
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
    location: 'Client Office',
    attendees: ['Executive', 'Account Manager', 'Client Stakeholders'],
    priority: 'high',
    type: 'presentation'
  },
  {
    id: 'cal-3',
    title: 'Strategic Planning Session',
    description: 'Quarterly strategic planning and goal setting',
    startTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
    endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(), // 4-hour session
    location: 'Executive Boardroom',
    attendees: ['Executive', 'Leadership Team'],
    priority: 'high',
    type: 'planning'
  }
];

const mockEmailSummary = {
  totalEmails: 23,
  unreadCount: 7,
  importantCount: 3,
  recentEmails: [
    {
      id: 'email-1',
      from: 'john.doe@client.com',
      subject: 'Q1 Performance Discussion',
      preview: 'Thank you for the presentation. I have some questions about...',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
      priority: 'high',
      isRead: false
    },
    {
      id: 'email-2',
      from: 'marketing@company.com',
      subject: 'Campaign Results Update',
      preview: 'The latest marketing campaign has exceeded expectations...',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      priority: 'medium',
      isRead: true
    },
    {
      id: 'email-3',
      from: 'hr@company.com',
      subject: 'Team Performance Reviews Due',
      preview: 'Reminder: Performance reviews for your direct reports are due...',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
      priority: 'medium',
      isRead: false
    }
  ],
  categories: {
    clients: 8,
    internal: 12,
    vendors: 3
  }
};

// GET /api/tasks - Get all tasks for the executive
router.get('/tasks', (req, res) => {
  try {
    const { status, priority, limit } = req.query;
    
    let filteredTasks = [...mockTasks];
    
    // Apply filters
    if (status && typeof status === 'string') {
      filteredTasks = filteredTasks.filter(task => task.status === status);
    }
    
    if (priority && typeof priority === 'string') {
      filteredTasks = filteredTasks.filter(task => task.priority === priority);
    }
    
    // Apply limit
    if (limit && typeof limit === 'string') {
      const limitNum = parseInt(limit, 10);
      if (!isNaN(limitNum)) {
        filteredTasks = filteredTasks.slice(0, limitNum);
      }
    }
    
    // Calculate summary statistics
    const summary = {
      total: mockTasks.length,
      pending: mockTasks.filter(t => t.status === 'pending').length,
      inProgress: mockTasks.filter(t => t.status === 'in-progress').length,
      completed: mockTasks.filter(t => t.status === 'completed').length,
      highPriority: mockTasks.filter(t => t.priority === 'high').length
    };
    
    res.json({
      success: true,
      tasks: filteredTasks,
      summary,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/calendar/agenda - Get calendar agenda for the executive
router.get('/calendar/agenda', (req, res) => {
  try {
    const { days, priority } = req.query;
    
    let filteredAgenda = [...mockCalendarAgenda];
    
    // Apply priority filter
    if (priority && typeof priority === 'string') {
      filteredAgenda = filteredAgenda.filter(event => event.priority === priority);
    }
    
    // Apply days filter (limit to next N days)
    if (days && typeof days === 'string') {
      const daysNum = parseInt(days, 10);
      if (!isNaN(daysNum)) {
        const cutoffDate = new Date(Date.now() + daysNum * 24 * 60 * 60 * 1000);
        filteredAgenda = filteredAgenda.filter(event => 
          new Date(event.startTime) <= cutoffDate
        );
      }
    }
    
    // Sort by start time
    filteredAgenda.sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
    
    // Calculate summary
    const summary = {
      totalEvents: mockCalendarAgenda.length,
      todayEvents: mockCalendarAgenda.filter(event => {
        const eventDate = new Date(event.startTime);
        const today = new Date();
        return eventDate.toDateString() === today.toDateString();
      }).length,
      highPriorityEvents: mockCalendarAgenda.filter(e => e.priority === 'high').length,
      nextEvent: filteredAgenda.find(event => 
        new Date(event.startTime) > new Date()
      )
    };
    
    res.json({
      success: true,
      agenda: filteredAgenda,
      summary,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/email/summary - Get email summary for the executive
router.get('/email/summary', (req, res) => {
  try {
    const { includePreview, limit } = req.query;
    
    let emailData = { ...mockEmailSummary };
    
    // Limit recent emails if specified
    if (limit && typeof limit === 'string') {
      const limitNum = parseInt(limit, 10);
      if (!isNaN(limitNum)) {
        emailData.recentEmails = emailData.recentEmails.slice(0, limitNum);
      }
    }
    
    // Handle preview content
    let processedEmails;
    if (includePreview === 'true') {
      processedEmails = emailData.recentEmails;
    } else {
      processedEmails = emailData.recentEmails.map(email => ({
        id: email.id,
        from: email.from,
        subject: email.subject,
        timestamp: email.timestamp,
        priority: email.priority,
        isRead: email.isRead
      }));
    }
    
    res.json({
      success: true,
      summary: {
        ...emailData,
        recentEmails: processedEmails
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/tasks - Create a new task
router.post('/tasks', (req, res) => {
  try {
    const { title, description, priority = 'medium', dueDate, category, estimatedHours } = req.body;
    
    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Title is required',
        timestamp: new Date().toISOString()
      });
    }
    
    const newTask = {
      id: `task-${Date.now()}`,
      title,
      description: description || '',
      priority,
      status: 'pending',
      dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Default: 7 days
      assignedTo: 'Executive',
      category: category || 'General',
      estimatedHours: estimatedHours || 1,
      completedHours: 0,
      tags: []
    };
    
    mockTasks.push(newTask);
    
    res.status(201).json({
      success: true,
      task: newTask,
      message: 'Task created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// PUT /api/tasks/:id - Update a task
router.put('/tasks/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const taskIndex = mockTasks.findIndex(task => task.id === id);
    
    if (taskIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        timestamp: new Date().toISOString()
      });
    }
    
    // Update the task
    mockTasks[taskIndex] = { ...mockTasks[taskIndex], ...updates };
    
    res.json({
      success: true,
      task: mockTasks[taskIndex],
      message: 'Task updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;