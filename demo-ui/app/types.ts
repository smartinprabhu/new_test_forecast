export interface ChatMessageType {
  id: string
  type: 'user' | 'assistant' | 'system' | 'error'
  content: string
  timestamp: Date
  options?: MessageOption[]
  showFileUpload?: boolean
  attachments?: Attachment[]
}

export interface MessageOption {
  id: string
  label: string
  action: string
  description?: string
}

export interface Attachment {
  id: string
  name: string
  type: string
  size: number
  url?: string
}

export type ProcessingStep = 
  | 'welcome'
  | 'data_upload'
  | 'data_analysis'
  | 'preprocessing'
  | 'model_selection'
  | 'training'
  | 'results'
  | 'export'

export interface ProgressStep {
  id: string
  label: string
  status: 'completed' | 'current' | 'pending'
  progress?: number
}

export interface DataPreviewType {
  columns: ColumnInfo[]
  sampleRows: any[]
  statistics: DataStatistics
  issues: DataIssue[]
}

export interface ColumnInfo {
  name: string
  type: 'numeric' | 'categorical' | 'datetime' | 'text'
  missing_count: number
  unique_count: number
}

export interface DataStatistics {
  row_count: number
  column_count: number
  missing_percentage: number
  date_range: {
    start: string
    end: string
  }
  frequency: string
}

export interface DataIssue {
  type: 'warning' | 'error' | 'info'
  message: string
  column?: string
  suggestion?: string
}

export interface ForecastData {
  date: string
  actual?: number
  predicted: number
  lower_bound: number
  upper_bound: number
}

export interface ModelPerformance {
  model_name: string
  mape: number
  mae: number
  rmse: number
  r_squared: number
  rank: number
  status: 'completed' | 'training' | 'pending' | 'failed'
}

export interface AIResponse {
  content: string
  options?: MessageOption[]
  nextStep?: ProcessingStep
  showFileUpload?: boolean
}