import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { ExecutiveState } from '@/types'
import { executiveService } from '@/services/executiveService'
import { useAGUIEvent } from './useWebSocket'

export interface UseExecutiveStateReturn {
  state: ExecutiveState | null;
  isLoading: boolean;
  error: string | null;
  updateState: (updates: Partial<ExecutiveState>) => Promise<void>;
  refetch: () => void;
}

export function useExecutiveState(): UseExecutiveStateReturn {
  const queryClient = useQueryClient()
  
  // Fetch executive state from backend
  const {
    data: state,
    isLoading,
    error: queryError,
    refetch
  } = useQuery<ExecutiveState>(
    'executive-state',
    executiveService.getState,
    {
      retry: 2,
      refetchInterval: 30000, // Refetch every 30 seconds
      staleTime: 10000, // Consider data stale after 10 seconds
      onError: (error: any) => {
        console.error('Failed to load executive state:', error)
      },
      // Add fallback data if query fails
      placeholderData: {
        profile: {
          name: 'Executive User',
          email: 'executive@company.com',
          timezone: 'UTC',
          preferences: {
            workingHours: { start: '09:00', end: '17:00' },
            communicationStyle: 'formal' as const,
            priorityLevel: 'high' as const,
            autoApprovalLimits: {
              calendar: false,
              email: false,
              documents: false
            }
          }
        },
        activeContexts: {
          currentProjects: [],
          urgentItems: [],
          pendingDecisions: []
        },
        integrations: {
          calendarAccounts: [],
          emailAccounts: [],
          connectedTools: []
        }
      }
    }
  )

  // Mutation for updating state
  const updateMutation = useMutation(
    (updates: Partial<ExecutiveState>) => executiveService.updateState(updates),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('executive-state')
      }
    }
  )

  // Listen for AG-UI state updates
  useAGUIEvent('StateSnapshot', (event: any) => {
    console.log('📊 State snapshot received:', event.snapshot)
    queryClient.setQueryData('executive-state', event.snapshot)
  })

  useAGUIEvent('StateDelta', (event: any) => {
    console.log('🔄 State delta received:', event.delta)
    // Apply delta changes to current state
    queryClient.setQueryData('executive-state', (currentState: any) => {
      if (!currentState) return currentState
      
      // Simple delta application - in production, use a library like immer
      let newState = { ...currentState }
      
      event.delta.forEach((change: any) => {
        if (change.op === 'add' && change.path && change.value) {
          // Simple path-based state updates
          const pathParts = change.path.split('/').filter(Boolean)
          if (pathParts.length > 0) {
            // For now, handle specific known paths
            if (pathParts.join('.') === 'activeContexts.currentProjects.-') {
              newState.activeContexts.currentProjects.push(change.value)
            }
          }
        }
      })
      
      return newState
    })
  })

  const error = queryError ? 
    (typeof queryError === 'string' ? queryError : 'Failed to load executive state') : 
    null

  return {
    state: state as ExecutiveState | null,
    isLoading,
    error,
    updateState: updateMutation.mutateAsync,
    refetch
  }
}

// Hook for managing specific aspects of executive state
export function useExecutiveProfile() {
  const { state, updateState } = useExecutiveState()
  
  const updateProfile = async (updates: Partial<ExecutiveState['profile']>) => {
    if (state) {
      await updateState({
        profile: { ...state.profile, ...updates }
      })
    }
  }

  return {
    profile: state?.profile || null,
    updateProfile
  }
}

export function useActiveProjects() {
  const { state, updateState } = useExecutiveState()
  
  const addProject = async (project: Omit<ExecutiveState['activeContexts']['currentProjects'][0], 'id'>) => {
    if (state) {
      const newProject = {
        ...project,
        id: `project_${Date.now()}`
      }
      
      await updateState({
        activeContexts: {
          ...state.activeContexts,
          currentProjects: [...state.activeContexts.currentProjects, newProject]
        }
      })
    }
  }

  const updateProject = async (projectId: string, updates: Partial<ExecutiveState['activeContexts']['currentProjects'][0]>) => {
    if (state) {
      const updatedProjects = state.activeContexts.currentProjects.map(project =>
        project.id === projectId ? { ...project, ...updates } : project
      )
      
      await updateState({
        activeContexts: {
          ...state.activeContexts,
          currentProjects: updatedProjects
        }
      })
    }
  }

  const deleteProject = async (projectId: string) => {
    if (state) {
      const filteredProjects = state.activeContexts.currentProjects.filter(
        project => project.id !== projectId
      )
      
      await updateState({
        activeContexts: {
          ...state.activeContexts,
          currentProjects: filteredProjects
        }
      })
    }
  }

  return {
    projects: state?.activeContexts.currentProjects || [],
    addProject,
    updateProject,
    deleteProject
  }
}

export function useUrgentItems() {
  const { state, updateState } = useExecutiveState()
  
  const addUrgentItem = async (item: Omit<ExecutiveState['activeContexts']['urgentItems'][0], 'id'>) => {
    if (state) {
      const newItem = {
        ...item,
        id: `urgent_${Date.now()}`
      }
      
      await updateState({
        activeContexts: {
          ...state.activeContexts,
          urgentItems: [...state.activeContexts.urgentItems, newItem]
        }
      })
    }
  }

  const removeUrgentItem = async (itemId: string) => {
    if (state) {
      const filteredItems = state.activeContexts.urgentItems.filter(
        item => item.id !== itemId
      )
      
      await updateState({
        activeContexts: {
          ...state.activeContexts,
          urgentItems: filteredItems
        }
      })
    }
  }

  return {
    urgentItems: state?.activeContexts.urgentItems || [],
    addUrgentItem,
    removeUrgentItem
  }
}

export function useIntegrations() {
  const { state, updateState } = useExecutiveState()
  
  const updateCalendarAccount = async (accountId: string, updates: Partial<ExecutiveState['integrations']['calendarAccounts'][0]>) => {
    if (state) {
      const updatedAccounts = state.integrations.calendarAccounts.map(account =>
        account.id === accountId ? { ...account, ...updates } : account
      )
      
      await updateState({
        integrations: {
          ...state.integrations,
          calendarAccounts: updatedAccounts
        }
      })
    }
  }

  const updateEmailAccount = async (accountId: string, updates: Partial<ExecutiveState['integrations']['emailAccounts'][0]>) => {
    if (state) {
      const updatedAccounts = state.integrations.emailAccounts.map(account =>
        account.id === accountId ? { ...account, ...updates } : account
      )
      
      await updateState({
        integrations: {
          ...state.integrations,
          emailAccounts: updatedAccounts
        }
      })
    }
  }

  return {
    integrations: state?.integrations || null,
    updateCalendarAccount,
    updateEmailAccount
  }
}

// Hook for real-time state synchronization
export function useStateSynchronization() {
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null)
  const [pendingChanges, setPendingChanges] = useState<any[]>([])
  
  useAGUIEvent('StateSnapshot', () => {
    setLastSyncTime(new Date())
    setPendingChanges([])
  })

  useAGUIEvent('StateDelta', (event: any) => {
    setLastSyncTime(new Date())
    setPendingChanges(prev => [...prev, event.delta])
  })

  return {
    lastSyncTime,
    pendingChanges,
    isInSync: pendingChanges.length === 0
  }
}
