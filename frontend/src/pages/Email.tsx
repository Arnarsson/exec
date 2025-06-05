import { useState } from 'react'
import { 
  EnvelopeIcon,
  PaperAirplaneIcon,
  StarIcon,
  ArchiveBoxIcon,
  TrashIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { useQuery } from 'react-query'
import { executiveService } from '@/services/executiveService'
import { EmailSummary } from '@/types'
import { useAGUIToolCalls } from '@/hooks/useWebSocket'
import { format } from 'date-fns'

interface EmailMessage {
  id: string;
  subject: string;
  sender: string;
  senderEmail: string;
  preview: string;
  timestamp: string;
  isRead: boolean;
  isStarred: boolean;
  isImportant: boolean;
  category: 'primary' | 'social' | 'promotions' | 'updates';
  attachments?: number;
}

// Mock email data for demonstration
const mockEmails: EmailMessage[] = [
  {
    id: '1',
    subject: 'Q4 Board Meeting Preparation',
    sender: 'Sarah Johnson',
    senderEmail: 'sarah.johnson@company.com',
    preview: 'Hi, I wanted to discuss the agenda for our upcoming Q4 board meeting. We need to review the financial reports and...',
    timestamp: '2024-05-24T09:30:00Z',
    isRead: false,
    isStarred: true,
    isImportant: true,
    category: 'primary'
  },
  {
    id: '2',
    subject: 'Meeting Request: Strategic Planning Session',
    sender: 'Michael Chen',
    senderEmail: 'michael.chen@company.com',
    preview: 'Would you be available for a strategic planning session next Tuesday? I think we should align on the roadmap for...',
    timestamp: '2024-05-24T08:15:00Z',
    isRead: false,
    isStarred: false,
    isImportant: true,
    category: 'primary'
  },
  {
    id: '3',
    subject: 'Weekly Analytics Report',
    sender: 'Analytics Team',
    senderEmail: 'analytics@company.com',
    preview: 'Your weekly analytics summary is ready. Key highlights: 15% increase in user engagement, conversion rate up 3.2%...',
    timestamp: '2024-05-24T07:00:00Z',
    isRead: true,
    isStarred: false,
    isImportant: false,
    category: 'updates',
    attachments: 2
  },
  {
    id: '4',
    subject: 'Contract Review Required',
    sender: 'Legal Department',
    senderEmail: 'legal@company.com',
    preview: 'Please review the attached contract for the new vendor partnership. We need your approval by EOD Friday...',
    timestamp: '2024-05-23T16:45:00Z',
    isRead: true,
    isStarred: true,
    isImportant: true,
    category: 'primary',
    attachments: 1
  },
  {
    id: '5',
    subject: 'Industry Conference Invitation',
    sender: 'TechSummit 2024',
    senderEmail: 'invitations@techsummit.com',
    preview: 'You are cordially invited to speak at TechSummit 2024. This year\'s theme is "Innovation in the Digital Age"...',
    timestamp: '2024-05-23T14:20:00Z',
    isRead: false,
    isStarred: false,
    isImportant: false,
    category: 'promotions'
  }
]

export default function Email() {
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null)
  const [showCompose, setShowCompose] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const activeTool = useAGUIToolCalls()

  // Fetch email summary
  const { data: emailSummary, isLoading } = useQuery<EmailSummary>(
    'email-summary',
    executiveService.getEmailSummary,
    {
      retry: 1,
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  )

  // Filter emails based on search and category
  const filteredEmails = mockEmails.filter(email => {
    const matchesSearch = !searchQuery || 
      email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.preview.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = selectedCategory === 'all' || 
      selectedCategory === 'unread' && !email.isRead ||
      selectedCategory === 'starred' && email.isStarred ||
      selectedCategory === 'important' && email.isImportant ||
      email.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  const categories = [
    { id: 'all', label: 'All', count: mockEmails.length },
    { id: 'unread', label: 'Unread', count: mockEmails.filter(e => !e.isRead).length },
    { id: 'starred', label: 'Starred', count: mockEmails.filter(e => e.isStarred).length },
    { id: 'important', label: 'Important', count: mockEmails.filter(e => e.isImportant).length },
    { id: 'primary', label: 'Primary', count: mockEmails.filter(e => e.category === 'primary').length },
    { id: 'social', label: 'Social', count: mockEmails.filter(e => e.category === 'social').length },
    { id: 'promotions', label: 'Promotions', count: mockEmails.filter(e => e.category === 'promotions').length },
    { id: 'updates', label: 'Updates', count: mockEmails.filter(e => e.category === 'updates').length },
  ]

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="lg:col-span-3 h-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Email</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your inbox and communications
          </p>
        </div>
        <button
          onClick={() => setShowCompose(true)}
          className="ea-button-primary flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Compose
        </button>
      </div>

      {/* AG-UI Tool Status */}
      {activeTool && activeTool.toolName.includes('email') && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center">
            <div className="animate-spin h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full mr-3"></div>
            <span className="text-green-800 dark:text-green-200">
              {activeTool.toolName}: {activeTool.isComplete ? 'Completed' : 'Processing...'}
            </span>
          </div>
        </div>
      )}

      {/* Email Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="ea-card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <EnvelopeIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Emails</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {emailSummary?.totalEmails || mockEmails.length}
              </p>
            </div>
          </div>
        </div>

        <div className="ea-card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
              <ExclamationCircleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Unread</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {emailSummary?.unreadCount || mockEmails.filter(e => !e.isRead).length}
              </p>
            </div>
          </div>
        </div>

        <div className="ea-card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <StarIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Important</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {emailSummary?.importantCount || mockEmails.filter(e => e.isImportant).length}
              </p>
            </div>
          </div>
        </div>

        <div className="ea-card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <PaperAirplaneIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Response Rate</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">94%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Email List */}
        <div className="lg:col-span-1">
          <div className="ea-card">
            {/* Search and Filters */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative mb-4">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Quick Actions */}
              <div className="flex space-x-2">
                <button className="flex-1 text-xs py-2 px-3 bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors">
                  Summarize
                </button>
                <button className="flex-1 text-xs py-2 px-3 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                  Prioritize
                </button>
              </div>
            </div>

            {/* Categories */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="space-y-1">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="capitalize">{category.label}</span>
                      <span className="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded-full">
                        {category.count}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Email List */}
            <div className="max-h-96 overflow-y-auto">
              {filteredEmails.map(email => (
                <button
                  key={email.id}
                  onClick={() => setSelectedEmail(email)}
                  className={`w-full text-left p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    selectedEmail?.id === email.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {email.isStarred ? (
                        <StarIconSolid className="h-4 w-4 text-yellow-500" />
                      ) : (
                        <div className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-sm font-medium truncate ${
                          !email.isRead ? 'text-gray-900 dark:text-white font-semibold' : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {email.sender}
                        </p>
                        <div className="flex items-center space-x-1">
                          {email.isImportant && (
                            <ExclamationCircleIcon className="h-3 w-3 text-red-500" />
                          )}
                          {email.attachments && (
                            <span className="text-xs text-gray-500">📎</span>
                          )}
                        </div>
                      </div>
                      <p className={`text-sm truncate ${
                        !email.isRead ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {email.subject}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                        {email.preview}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {format(new Date(email.timestamp), 'MMM d, HH:mm')}
                      </p>
                    </div>
                  </div>
                  {!email.isRead && (
                    <div className="w-2 h-2 bg-primary-600 rounded-full absolute right-2 top-6"></div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Email Content */}
        <div className="lg:col-span-3">
          <div className="ea-card h-full">
            {selectedEmail ? (
              <>
                {/* Email Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        {selectedEmail.subject}
                      </h2>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>{selectedEmail.sender} &lt;{selectedEmail.senderEmail}&gt;</span>
                        <span>•</span>
                        <span>{format(new Date(selectedEmail.timestamp), 'MMM d, yyyy \'at\' HH:mm')}</span>
                        {selectedEmail.attachments && (
                          <>
                            <span>•</span>
                            <span>{selectedEmail.attachments} attachment{selectedEmail.attachments > 1 ? 's' : ''}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-gray-400 hover:text-yellow-500 transition-colors">
                        <StarIcon className="h-5 w-5" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        <ArchiveBoxIcon className="h-5 w-5" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Priority Indicators */}
                  <div className="flex items-center space-x-2">
                    {selectedEmail.isImportant && (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full">
                        Important
                      </span>
                    )}
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                      selectedEmail.category === 'primary' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                      selectedEmail.category === 'social' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      selectedEmail.category === 'promotions' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                    }`}>
                      {selectedEmail.category}
                    </span>
                  </div>
                </div>

                {/* Email Body */}
                <div className="p-6 flex-1">
                  <div className="prose dark:prose-invert max-w-none">
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {selectedEmail.preview}
                    </p>
                    <br />
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                    </p>
                    <br />
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                    </p>
                    <br />
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      Best regards,<br />
                      {selectedEmail.sender}
                    </p>
                  </div>
                </div>

                {/* Email Actions */}
                <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-3">
                    <button className="ea-button-primary">
                      Reply
                    </button>
                    <button className="ea-button-secondary">
                      Reply All
                    </button>
                    <button className="ea-button-secondary">
                      Forward
                    </button>
                    <button className="ea-button-secondary">
                      Draft Response
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <EnvelopeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Select an email to read
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Choose an email from the list to view its contents
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowCompose(false)} />
            
            <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Compose Email
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    To
                  </label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter recipient email"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter email subject"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Message
                  </label>
                  <textarea
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white resize-none"
                    placeholder="Type your message..."
                  />
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-6">
                <div className="flex items-center space-x-4">
                  <button className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                    Attach File
                  </button>
                  <button className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                    Schedule Send
                  </button>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowCompose(false)}
                    className="ea-button-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setShowCompose(false)}
                    className="ea-button-primary flex items-center"
                  >
                    <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
