import { useState } from 'react'
import { 
  CalendarIcon, 
  ClockIcon,
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UserGroupIcon,
  MapPinIcon
} from '@heroicons/react/24/outline'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths } from 'date-fns'
import { useQuery } from 'react-query'
import { executiveService } from '@/services/executiveService'
import { CalendarEvent } from '@/types'
import { useAGUIToolCalls } from '@/hooks/useWebSocket'

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showEventModal, setShowEventModal] = useState(false)
  const activeTool = useAGUIToolCalls()

  // Fetch calendar events for current month
  const { data: events = [], isLoading, refetch } = useQuery<CalendarEvent[]>(
    ['calendar-events', format(currentDate, 'yyyy-MM')],
    () => executiveService.getCalendarAgenda(format(currentDate, 'yyyy-MM-dd')),
    {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  )

  // Get days for calendar grid
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Filter events for selected date
  const selectedDateEvents = events.filter(event => 
    isSameDay(new Date(event.start.dateTime), selectedDate)
  )

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => 
      direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1)
    )
  }

  const getEventsForDay = (day: Date) => {
    return events.filter(event => 
      isSameDay(new Date(event.start.dateTime), day)
    )
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-7 gap-4">
            {[...Array(35)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your schedule and meetings
          </p>
        </div>
        <button
          onClick={() => setShowEventModal(true)}
          className="ea-button-primary flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Schedule Meeting
        </button>
      </div>

      {/* AG-UI Tool Status */}
      {activeTool && activeTool.toolName.includes('calendar') && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center">
            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full mr-3"></div>
            <span className="text-blue-800 dark:text-blue-200">
              {activeTool.toolName}: {activeTool.isComplete ? 'Completed' : 'Processing...'}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-3">
          <div className="ea-card">
            {/* Calendar Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {format(currentDate, 'MMMM yyyy')}
                </h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => navigateMonth('prev')}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <ChevronLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </button>
                  <button
                    onClick={() => setCurrentDate(new Date())}
                    className="px-3 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => navigateMonth('next')}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <ChevronRightIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="p-6">
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map(day => {
                  const dayEvents = getEventsForDay(day)
                  const isSelected = isSameDay(day, selectedDate)
                  const isCurrentMonth = isSameMonth(day, currentDate)
                  const isDayToday = isToday(day)

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={`
                        h-24 p-2 border rounded-lg text-left transition-all
                        ${isSelected 
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }
                        ${!isCurrentMonth && 'text-gray-400 dark:text-gray-600'}
                        ${isDayToday && 'ring-2 ring-primary-500'}
                      `}
                    >
                      <div className={`text-sm font-medium ${
                        isDayToday 
                          ? 'text-primary-600 dark:text-primary-400' 
                          : isCurrentMonth 
                            ? 'text-gray-900 dark:text-white' 
                            : 'text-gray-400 dark:text-gray-600'
                      }`}>
                        {format(day, 'd')}
                      </div>
                      <div className="mt-1 space-y-1">
                        {dayEvents.slice(0, 2).map(event => (
                          <div
                            key={event.id}
                            className="text-xs bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 px-2 py-1 rounded truncate"
                          >
                            {event.summary}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            +{dayEvents.length - 2} more
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Selected Date Events */}
          <div className="ea-card">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {format(selectedDate, 'EEEE, MMMM d')}
              </h3>
            </div>
            <div className="p-6">
              {selectedDateEvents.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No events scheduled</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    Your calendar is free this day
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedDateEvents.map(event => (
                    <div key={event.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                        {event.summary}
                      </h4>
                      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-2" />
                          {format(new Date(event.start.dateTime), 'HH:mm')} - {format(new Date(event.end.dateTime), 'HH:mm')}
                        </div>
                        {event.location && (
                          <div className="flex items-center">
                            <MapPinIcon className="h-4 w-4 mr-2" />
                            {event.location}
                          </div>
                        )}
                        {event.attendees && event.attendees.length > 0 && (
                          <div className="flex items-center">
                            <UserGroupIcon className="h-4 w-4 mr-2" />
                            {event.attendees.length} attendee{event.attendees.length > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                      {event.description && (
                        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                          {event.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="ea-card">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
            </div>
            <div className="p-6 space-y-3">
              <button 
                onClick={() => setShowEventModal(true)}
                className="w-full ea-button-primary"
              >
                Schedule Meeting
              </button>
              <button className="w-full ea-button-secondary">
                Check Availability
              </button>
              <button className="w-full ea-button-secondary">
                Find Meeting Time
              </button>
              <button className="w-full ea-button-secondary">
                View Week
              </button>
            </div>
          </div>

          {/* Calendar Stats */}
          <div className="ea-card">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">This Month</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Events</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{events.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">This Week</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {events.filter(event => {
                      const eventDate = new Date(event.start.dateTime)
                      const now = new Date()
                      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
                      const weekEnd = new Date(now.setDate(now.getDate() - now.getDay() + 6))
                      return eventDate >= weekStart && eventDate <= weekEnd
                    }).length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Today</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {events.filter(event => isToday(new Date(event.start.dateTime))).length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Meeting Modal */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowEventModal(false)} />
            
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Schedule New Meeting
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Meeting Title
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter meeting title"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      defaultValue={format(selectedDate, 'yyyy-MM-dd')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Time
                    </label>
                    <input
                      type="time"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Attendees
                  </label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter email addresses"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowEventModal(false)}
                  className="ea-button-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowEventModal(false)
                    refetch()
                  }}
                  className="ea-button-primary"
                >
                  Schedule Meeting
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
