// Enhanced types for the agentic forecasting UI

export type WorkflowMode = 'auto-execute' | 'step-by-step'

export type AgentType = 'supervisor' | 'data-analyst' | 'preprocessing' | 'model-training' | 'forecasting'

export type AgentStatusType = 'idle' | 'active' | 'busy' | 'completed' | 'error' | 'offline'

export type WorkflowStepStatus = 'pending' | 'in-progress' | 'completed' | 'failed' | 'skipped' | 'waiting-approval'

export interface EnhancedChatMessage {
  id: string
  type: 'user' | 'assistant' | 'system' | 'error' | 'agent'
  content: string
  timestamp: Date
  agentId?: string
  workflowStep?: string
  options?: MessageOption[]
  attachments?: Attachment[]
  requiresApproval?: boolean
  customizationOptions?: CustomizationOption[]
  showFileUpload?: boolean
  showForecastResults?: boolean
  forecastData?: ForecastResultsData
}

export interface ForecastResultsData {
  models: ModelResult[]
  dates: string[]
  historicalDates: string[]
  futureDates: string[]
}

export interface ModelResult {
  name: string
  mape: number
  mae: number
  rmse: number
  r2: number
  color: string
  visible: boolean
  actualData: number[]
  forecastData: number[]
  futureData: number[]
  confidenceUpper?: number[]
  confidenceLower?: number[]
}

export interface MessageOption {
  id: string
  label: string
  action: string
  icon?: string
  variant?: 'primary' | 'secondary' | 'danger'
  disabled?: boolean
  description?: string
}

export interface Attachment {
  id: string
  name: string
  type: string
  size: number
  url?: string
  preview?: string
}

export interface CustomizationOption {
  key: string
  label: string
  description: string
  type: 'select' | 'multiselect' | 'range' | 'boolean' | 'text' | 'number'
  options?: SelectOption[]
  defaultValue: any
  validation?: ValidationRule[]
  dependencies?: string[]
  advanced?: boolean
}

export interface SelectOption {
  value: string
  label: string
  description?: string
  recommended?: boolean
}

export interface ValidationRule {
  type: 'required' | 'format' | 'range' | 'custom'
  message: string
  validator?: (value: any) => boolean
  parameters?: any
}

export interface AgentStatus {
  id: string
  name: string
  type: AgentType
  status: AgentStatusType
  currentTask: string | null
  progress: number
  capabilities: string[]
  performance?: AgentPerformance
  lastActive?: Date
  workload?: number
  queuedTasks?: number
}

export interface AgentPerformance {
  tasksCompleted: number
  averageTaskTime: number
  successRate: number
  errorCount: number
  lastError?: string
}

export interface WorkflowState {
  id: string
  mode: WorkflowMode
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed'
  currentStep: string | null
  steps: WorkflowStep[]
  progress: number
  startTime?: Date
  estimatedCompletion?: Date
  sessionId?: string
}

export interface WorkflowStep {
  id: string
  name: string
  description: string
  agentType: AgentType
  status: WorkflowStepStatus
  progress: number
  estimatedTime: number
  actualTime?: number
  startTime?: Date
  endTime?: Date
  dependencies: string[]
  customizable: boolean
  configuration?: any
  results?: any
  error?: string
  requiresApproval: boolean
}

export interface AgentActivity {
  agentId: string
  taskId: string
  taskName: string
  progress: number
  startTime: Date
  estimatedCompletion: Date
  details: string
  status: 'running' | 'paused' | 'completed' | 'failed'
}

export interface QueuedTask {
  id: string
  name: string
  type: string
  priority: number
  requiredAgent: AgentType
  estimatedDuration: number
  dependencies: string[]
  payload: any
  createdAt: Date
}

export interface ConversationContext {
  messages: EnhancedChatMessage[]
  currentMode: WorkflowMode
  workflowState: WorkflowState | null
  agentStatuses: AgentStatus[]
  sessionId?: string
  userPreferences?: UserPreferences
}

export interface UserPreferences {
  expertiseLevel: 'beginner' | 'intermediate' | 'advanced'
  preferredAlgorithms: string[]
  defaultMode: WorkflowMode
  notificationLevel: 'minimal' | 'normal' | 'detailed'
  autoApprove: boolean
}

export interface GeminiResponse {
  content: string
  suggestions?: string[]
  options?: MessageOption[]
  confidence: number
  reasoning?: string
  suggestedAction?: string
  actionParams?: any
  requiresApproval?: boolean
}

export interface DataAnalysis {
  summary: DataSummary
  quality: DataQuality
  patterns: DataPatterns
  recommendations: string[]
  issues: DataIssue[]
}

export interface DataSummary {
  rows: number
  columns: string[]
  dateRange: {
    start: string
    end: string
  }
  frequency: string
  targetColumn: string
  regressorColumns: string[]
}

export interface DataQuality {
  score: number
  missingValues: Record<string, number>
  outliers: OutlierInfo[]
  duplicates: number
  dataTypes: Record<string, string>
}

export interface DataPatterns {
  trend: 'increasing' | 'decreasing' | 'stable' | 'mixed'
  seasonality: SeasonalityInfo[]
  stationarity: boolean
  autocorrelation: number
  volatility: number
}

export interface SeasonalityInfo {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly'
  strength: number
  detected: boolean
}

export interface OutlierInfo {
  index: number
  value: number
  zscore: number
  type: 'mild' | 'extreme'
  column: string
}

export interface DataIssue {
  type: 'warning' | 'error' | 'info'
  message: string
  column?: string
  suggestion?: string
  severity: 'low' | 'medium' | 'high'
}

export interface ModelTrainingResult {
  algorithm: string
  status: 'completed' | 'failed' | 'training'
  metrics?: ModelMetrics
  parameters: any
  trainingTime: number
  error?: string
}

export interface ModelMetrics {
  mape: number
  mae: number
  rmse: number
  r2: number
  directionalAccuracy: number
  bias: number
}

export interface ForecastResult {
  algorithm: string
  forecastDates: string[]
  forecastValues: number[]
  lowerBound?: number[]
  upperBound?: number[]
  confidence: number
  insights: string[]
}

export interface WorkflowDefinition {
  id: string
  name: string
  description: string
  steps: WorkflowStepDefinition[]
  estimatedDuration: number
  mode: WorkflowMode
}

export interface WorkflowStepDefinition {
  id: string
  name: string
  description: string
  agentType: AgentType
  estimatedTime: number
  dependencies: string[]
  customizable: boolean
  requiresApproval: boolean
  defaultConfiguration?: any
}

export interface NotificationConfig {
  enabled: boolean
  types: ('progress' | 'completion' | 'error' | 'approval')[]
  channels: ('ui' | 'email' | 'webhook')[]
}

export interface SessionData {
  sessionId: string
  userId?: string
  createdAt: Date
  lastActive: Date
  workflowState?: WorkflowState
  uploadedFiles: FileInfo[]
  results: any[]
  preferences: UserPreferences
}

export interface FileInfo {
  id: string
  name: string
  size: number
  type: string
  uploadedAt: Date
  processed: boolean
  analysis?: DataAnalysis
}

// API Response types
export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface UploadResponse extends APIResponse {
  data: {
    fileId: string
    analysis: DataAnalysis
  }
}

export interface TrainingResponse extends APIResponse {
  data: {
    results: ModelTrainingResult[]
    bestModel: string
    comparison: any
  }
}

export interface ForecastResponse extends APIResponse {
  data: ForecastResult
}

// Event types for real-time updates
export interface AgentEvent {
  type: 'status_change' | 'task_start' | 'task_complete' | 'task_error' | 'message'
  agentId: string
  timestamp: Date
  data: any
}

export interface WorkflowEvent {
  type: 'step_start' | 'step_complete' | 'step_error' | 'workflow_complete' | 'approval_required'
  workflowId: string
  stepId?: string
  timestamp: Date
  data: any
}

// Configuration presets
export interface ConfigurationPreset {
  id: string
  name: string
  description: string
  configuration: any
  tags: string[]
  recommended?: boolean
  applicableSteps: string[]
}

// Error types
export interface EnhancedError {
  code: string
  message: string
  details?: any
  recoverable: boolean
  suggestions: string[]
  agentId?: string
  stepId?: string
}