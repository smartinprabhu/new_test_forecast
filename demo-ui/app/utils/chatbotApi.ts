/**
 * API client for Enhanced Chatbot Backend
 * Handles communication with the Python FastAPI backend
 */

export interface ChatMessage {
  message: string
  session_id: string
  user_type?: string
  context?: Record<string, any>
}

export interface ChatResponse {
  response: string
  action_required?: string
  config?: Record<string, any>
  agent_status?: Array<any>
  next_steps?: string[]
  requires_approval?: boolean
  workflow_step?: string
  interactive_elements?: Array<{
    type: string
    id: string
    label: string
    action: string
  }>
  metadata?: Record<string, any>
}

export interface SessionCreateRequest {
  user_id?: string
  user_type?: string
}

export interface SessionResponse {
  session_id: string
  user_id?: string
  user_type: string
  created_at: string
  preferences: Record<string, any>
}

export class ChatbotAPIClient {
  private baseURL: string

  constructor(baseURL: string = 'http://localhost:8001') {
    this.baseURL = baseURL
  }

  /**
   * Create a new session
   */
  async createSession(request: SessionCreateRequest): Promise<SessionResponse> {
    const response = await fetch(`${this.baseURL}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Send a chat message
   */
  async sendMessage(message: ChatMessage): Promise<ChatResponse> {
    const response = await fetch(`${this.baseURL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message)
    })

    if (!response.ok) {
      throw new Error(`Chat request failed: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Upload a file
   */
  async uploadFile(file: File, sessionId: string): Promise<any> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('session_id', sessionId)

    const response = await fetch(`${this.baseURL}/upload`, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw new Error(`File upload failed: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get session information
   */
  async getSession(sessionId: string): Promise<any> {
    const response = await fetch(`${this.baseURL}/sessions/${sessionId}`)

    if (!response.ok) {
      throw new Error(`Failed to get session: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get agent statuses
   */
  async getAgentStatuses(): Promise<any[]> {
    const response = await fetch(`${this.baseURL}/agents`)

    if (!response.ok) {
      throw new Error(`Failed to get agent statuses: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get session tasks
   */
  async getSessionTasks(sessionId: string): Promise<any> {
    const response = await fetch(`${this.baseURL}/agents/${sessionId}/tasks`)

    if (!response.ok) {
      throw new Error(`Failed to get session tasks: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get system statistics
   */
  async getSystemStats(): Promise<any> {
    const response = await fetch(`${this.baseURL}/system/stats`)

    if (!response.ok) {
      throw new Error(`Failed to get system stats: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Pause an agent
   */
  async pauseAgent(agentId: string): Promise<any> {
    const response = await fetch(`${this.baseURL}/agents/${agentId}/pause`, {
      method: 'POST'
    })

    if (!response.ok) {
      throw new Error(`Failed to pause agent: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Resume an agent
   */
  async resumeAgent(agentId: string): Promise<any> {
    const response = await fetch(`${this.baseURL}/agents/${agentId}/resume`, {
      method: 'POST'
    })

    if (!response.ok) {
      throw new Error(`Failed to resume agent: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(sessionId: string, limit: number = 50): Promise<any> {
    const response = await fetch(`${this.baseURL}/sessions/${sessionId}/history?limit=${limit}`)

    if (!response.ok) {
      throw new Error(`Failed to get conversation history: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Update user preferences
   */
  async updatePreferences(sessionId: string, preferences: Record<string, any>): Promise<any> {
    const response = await fetch(`${this.baseURL}/sessions/${sessionId}/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ session_id: sessionId, preferences })
    })

    if (!response.ok) {
      throw new Error(`Failed to update preferences: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Create WebSocket connection
   */
  createWebSocket(sessionId: string): WebSocket {
    const wsURL = this.baseURL.replace('http', 'ws')
    return new WebSocket(`${wsURL}/ws/${sessionId}`)
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<any> {
    const response = await fetch(`${this.baseURL}/health`)

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`)
    }

    return response.json()
  }
}

// Export a default instance
export const chatbotAPI = new ChatbotAPIClient()

// Export utility functions
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export const isValidFileType = (file: File): boolean => {
  const validTypes = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/json',
    'application/octet-stream' // for .parquet files
  ]
  return validTypes.includes(file.type) || file.name.endsWith('.parquet')
}

export const getFileTypeIcon = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase()
  switch (extension) {
    case 'csv': return '📊'
    case 'xlsx': case 'xls': return '📈'
    case 'json': return '📋'
    case 'parquet': return '🗃️'
    default: return '📄'
  }
}