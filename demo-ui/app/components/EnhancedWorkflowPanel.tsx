'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, 
  Pause, 
  Square, 
  SkipForward, 
  Settings, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Edit3,
  Eye,
  Zap,
  Database,
  Brain,
  BarChart3,
  TrendingUp,
  FileText,
  Download
} from 'lucide-react'

interface WorkflowStep {
  id: string
  name: string
  description: string
  agent: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused'
  progress: number
  estimatedTime: number
  actualTime?: number
  dependencies: string[]
  parameters: Record<string, any>
  results?: any
  error?: string
}

interface WorkflowPanelProps {
  workflow: {
    id: string
    name: string
    status: 'idle' | 'running' | 'paused' | 'completed' | 'failed'
    progress: number
    steps: WorkflowStep[]
    currentStep?: string
  }
  onStepEdit: (stepId: string, parameters: Record<string, any>) => void
  onWorkflowControl: (action: 'start' | 'pause' | 'resume' | 'stop') => void
  onStepControl: (stepId: string, action: 'skip' | 'retry' | 'pause') => void
}

const agentIcons = {
  'data-analyst': Database,
  'preprocessing': Settings,
  'model-trainer': Brain,
  'evaluator': BarChart3,
  'forecaster': TrendingUp,
  'supervisor': Zap
}

const statusColors = {
  pending: 'text-gray-400 bg-gray-100',
  running: 'text-blue-600 bg-blue-100',
  completed: 'text-green-600 bg-green-100',
  failed: 'text-red-600 bg-red-100',
  paused: 'text-yellow-600 bg-yellow-100'
}

const statusIcons = {
  pending: Clock,
  running: Play,
  completed: CheckCircle,
  failed: AlertCircle,
  paused: Pause
}

export default function EnhancedWorkflowPanel({ workflow, onStepEdit, onWorkflowControl, onStepControl }: WorkflowPanelProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set())
  const [editingStep, setEditingStep] = useState<string | null>(null)
  const [stepParameters, setStepParameters] = useState<Record<string, any>>({})

  const toggleStepExpansion = (stepId: string) => {
    const newExpanded = new Set(expandedSteps)
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId)
    } else {
      newExpanded.add(stepId)
    }
    setExpandedSteps(newExpanded)
  }

  const handleStepEdit = (step: WorkflowStep) => {
    setEditingStep(step.id)
    setStepParameters(step.parameters)
  }

  const saveStepEdit = () => {
    if (editingStep) {
      onStepEdit(editingStep, stepParameters)
      setEditingStep(null)
    }
  }

  const getStepIcon = (agent: string) => {
    const Icon = agentIcons[agent as keyof typeof agentIcons] || Settings
    return Icon
  }

  const getStatusIcon = (status: string) => {
    const Icon = statusIcons[status as keyof typeof statusIcons] || Clock
    return Icon
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  }

  const completedSteps = workflow.steps.filter(step => step.status === 'completed').length
  const totalSteps = workflow.steps.length

  return (
    <div className="bg-white border-l border-gray-200 w-96 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Workflow</h3>
          <div className="flex items-center space-x-2">
            {workflow.status === 'running' && (
              <button
                onClick={() => onWorkflowControl('pause')}
                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"
              >
                <Pause className="w-4 h-4" />
              </button>
            )}
            {workflow.status === 'paused' && (
              <button
                onClick={() => onWorkflowControl('resume')}
                className="p-1.5 text-green-600 hover:bg-green-100 rounded"
              >
                <Play className="w-4 h-4" />
              </button>
            )}
            {workflow.status === 'idle' && (
              <button
                onClick={() => onWorkflowControl('start')}
                className="p-1.5 text-green-600 hover:bg-green-100 rounded"
              >
                <Play className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onWorkflowControl('stop')}
              className="p-1.5 text-red-600 hover:bg-red-100 rounded"
            >
              <Square className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mb-3">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>{completedSteps}/{totalSteps} steps</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${workflow.progress}%` }}
            />
          </div>
        </div>

        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
          workflow.status === 'running' ? 'bg-blue-100 text-blue-700' :
          workflow.status === 'completed' ? 'bg-green-100 text-green-700' :
          workflow.status === 'failed' ? 'bg-red-100 text-red-700' :
          workflow.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {workflow.status.charAt(0).toUpperCase() + workflow.status.slice(1)}
        </div>
      </div>

      {/* Steps */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-3">
          {workflow.steps.map((step, index) => {
            const Icon = getStepIcon(step.agent)
            const StatusIcon = getStatusIcon(step.status)
            const isExpanded = expandedSteps.has(step.id)
            const isEditing = editingStep === step.id
            const isCurrent = workflow.currentStep === step.id

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`border rounded-lg ${
                  isCurrent ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <button
                        onClick={() => toggleStepExpansion(step.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>

                      <div className={`p-1.5 rounded ${statusColors[step.status]}`}>
                        <StatusIcon className="w-3 h-3" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <Icon className="w-4 h-4 text-gray-500" />
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {step.name}
                          </h4>
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {step.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      {step.status === 'running' && (
                        <button
                          onClick={() => onStepControl(step.id, 'pause')}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <Pause className="w-3 h-3" />
                        </button>
                      )}
                      {step.status === 'failed' && (
                        <button
                          onClick={() => onStepControl(step.id, 'retry')}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <Play className="w-3 h-3" />
                        </button>
                      )}
                      {step.status === 'pending' && (
                        <button
                          onClick={() => onStepControl(step.id, 'skip')}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <SkipForward className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={() => handleStepEdit(step)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {step.status === 'running' && step.progress > 0 && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-1">
                        <div 
                          className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${step.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Expanded Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-gray-200 overflow-hidden"
                    >
                      <div className="p-3 space-y-3">
                        {/* Step Details */}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-gray-500">Agent:</span>
                            <span className="ml-1 font-medium capitalize">
                              {step.agent.replace('-', ' ')}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Est. Time:</span>
                            <span className="ml-1 font-medium">
                              {formatTime(step.estimatedTime)}
                            </span>
                          </div>
                          {step.actualTime && (
                            <div>
                              <span className="text-gray-500">Actual Time:</span>
                              <span className="ml-1 font-medium">
                                {formatTime(step.actualTime)}
                              </span>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-500">Progress:</span>
                            <span className="ml-1 font-medium">{step.progress}%</span>
                          </div>
                        </div>

                        {/* Dependencies */}
                        {step.dependencies.length > 0 && (
                          <div>
                            <h5 className="text-xs font-medium text-gray-700 mb-1">Dependencies:</h5>
                            <div className="flex flex-wrap gap-1">
                              {step.dependencies.map((dep) => (
                                <span
                                  key={dep}
                                  className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                                >
                                  {dep}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Parameters */}
                        {Object.keys(step.parameters).length > 0 && (
                          <div>
                            <h5 className="text-xs font-medium text-gray-700 mb-1">Parameters:</h5>
                            {isEditing ? (
                              <div className="space-y-2">
                                {Object.entries(step.parameters).map(([key, value]) => (
                                  <div key={key} className="flex items-center space-x-2">
                                    <label className="text-xs text-gray-600 w-20 truncate">
                                      {key}:
                                    </label>
                                    <input
                                      type="text"
                                      value={stepParameters[key] || value}
                                      onChange={(e) => setStepParameters(prev => ({
                                        ...prev,
                                        [key]: e.target.value
                                      }))}
                                      className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                                    />
                                  </div>
                                ))}
                                <div className="flex space-x-2">
                                  <button
                                    onClick={saveStepEdit}
                                    className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingStep(null)}
                                    className="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                {Object.entries(step.parameters).map(([key, value]) => (
                                  <div key={key} className="flex justify-between text-xs">
                                    <span className="text-gray-600">{key}:</span>
                                    <span className="font-medium text-gray-900">
                                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Results */}
                        {step.results && (
                          <div>
                            <h5 className="text-xs font-medium text-gray-700 mb-1">Results:</h5>
                            <div className="bg-gray-50 p-2 rounded text-xs">
                              <pre className="whitespace-pre-wrap text-gray-800">
                                {typeof step.results === 'object' 
                                  ? JSON.stringify(step.results, null, 2)
                                  : String(step.results)
                                }
                              </pre>
                            </div>
                          </div>
                        )}

                        {/* Error */}
                        {step.error && (
                          <div>
                            <h5 className="text-xs font-medium text-red-700 mb-1">Error:</h5>
                            <div className="bg-red-50 p-2 rounded text-xs text-red-800">
                              {step.error}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>Total Steps: {totalSteps}</span>
          <span>Completed: {completedSteps}</span>
        </div>
        
        {workflow.status === 'completed' && (
          <button className="w-full mt-2 flex items-center justify-center space-x-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
            <Download className="w-4 h-4" />
            <span>Export Results</span>
          </button>
        )}
      </div>
    </div>
  )
}