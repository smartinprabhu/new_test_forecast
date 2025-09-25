'use client'

import { motion } from 'framer-motion'
import { CheckCircle, Clock, AlertCircle, Play, Pause, BarChart3, Wrench, Brain, TrendingUp, Upload, Bot, ChevronDown, ChevronRight } from 'lucide-react'
import { WorkflowState, AgentStatus, WorkflowMode } from '../../types/enhanced'
import { useState } from 'react'

interface EnhancedWorkflowVisualizationProps {
  workflowState: WorkflowState
  agentStatuses: AgentStatus[]
  mode: WorkflowMode
  onStepClick: (stepId: string) => void
  onStepEdit: (stepId: string, changes: any) => void
}

export default function EnhancedWorkflowVisualization({
  workflowState,
  agentStatuses,
  mode,
  onStepClick,
  onStepEdit
}: EnhancedWorkflowVisualizationProps) {
  const [expandedAgents, setExpandedAgents] = useState<Record<string, boolean>>({})

  const toggleAgentExpansion = (agentId: string) => {
    setExpandedAgents(prev => ({
      ...prev,
      [agentId]: !prev[agentId]
    }))
  }

  const getStepIcon = (agentType: string) => {
    switch (agentType) {
      case 'data-analyst':
        return <BarChart3 className="w-4 h-4" />
      case 'preprocessing':
        return <Wrench className="w-4 h-4" />
      case 'model-training':
        return <Brain className="w-4 h-4" />
      case 'forecasting':
        return <TrendingUp className="w-4 h-4" />
      default:
        return <Upload className="w-4 h-4" />
    }
  }

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 text-white'
      case 'in-progress':
        return 'bg-blue-500 text-white'
      case 'failed':
        return 'bg-red-500 text-white'
      case 'waiting-approval':
        return 'bg-yellow-500 text-white'
      case 'skipped':
        return 'bg-gray-400 text-white'
      default:
        return 'bg-gray-200 text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />
      case 'in-progress':
        return <Play className="w-4 h-4" />
      case 'failed':
        return <AlertCircle className="w-4 h-4" />
      case 'waiting-approval':
        return <Pause className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const getAgentStatus = (agentType: string) => {
    return agentStatuses.find(agent => agent.type === agentType)
  }

  const getAgentHierarchy = () => {
    return [
      {
        agent: agentStatuses.find(a => a.type === 'supervisor'),
        children: [
          {
            agent: agentStatuses.find(a => a.type === 'data-analyst'),
            tasks: workflowState.steps.filter(s => s.agentType === 'data-analyst'),
            currentProcesses: [
              'Data quality assessment using Shapiro-Wilk test',
              'Pattern detection with STL decomposition',
              'Seasonality identification via FFT analysis',
              'Trend analysis using Mann-Kendall test'
            ],
            technicalDetails: {
              methods: ['Statistical tests', 'Time series decomposition', 'Frequency analysis'],
              parameters: { 'confidence_level': 0.95, 'seasonal_periods': [7, 30, 365] },
              tools: ['Pandas', 'SciPy', 'Statsmodels']
            }
          },
          {
            agent: agentStatuses.find(a => a.type === 'preprocessing'),
            tasks: workflowState.steps.filter(s => s.agentType === 'preprocessing'),
            currentProcesses: [
              'Missing value imputation using KNN (k=5)',
              'Outlier detection with Isolation Forest (contamination=0.1)',
              'Feature engineering: lag features [1,7,14,30]',
              'Data scaling with RobustScaler (quantile_range=[25,75])'
            ],
            technicalDetails: {
              methods: ['KNN Imputation', 'Isolation Forest', 'Lag Features', 'RobustScaler'],
              parameters: { 
                'knn_neighbors': 5, 
                'isolation_contamination': 0.1,
                'lag_periods': [1, 7, 14, 30],
                'rolling_windows': [7, 14, 30],
                'quantile_range': [25, 75]
              },
              regressors: ['Temperature', 'Marketing_Spend', 'Holiday_Flag'],
              tools: ['Scikit-learn', 'Pandas', 'NumPy']
            }
          },
          {
            agent: agentStatuses.find(a => a.type === 'model-training'),
            tasks: workflowState.steps.filter(s => s.agentType === 'model-training'),
            currentProcesses: [
              'XGBoost training (n_estimators=100, max_depth=6, lr=0.1)',
              'Prophet training (seasonality_mode=additive, holidays=US)',
              'LightGBM training (num_leaves=31, learning_rate=0.1)',
              'Bayesian optimization with 50 iterations'
            ],
            technicalDetails: {
              methods: ['Gradient Boosting', 'Additive Regression', 'Bayesian Optimization'],
              parameters: {
                'xgboost': { n_estimators: 100, max_depth: 6, learning_rate: 0.1, subsample: 0.8 },
                'prophet': { seasonality_mode: 'additive', yearly_seasonality: true, weekly_seasonality: true },
                'lightgbm': { num_leaves: 31, learning_rate: 0.1, feature_fraction: 0.9 },
                'optimization': { n_trials: 50, metric: 'mape', cv_folds: 5 }
              },
              regressors: ['Temperature', 'Marketing_Spend', 'Holiday_Flag', 'DayOfWeek', 'Month'],
              tools: ['XGBoost', 'Prophet', 'LightGBM', 'Optuna']
            }
          },
          {
            agent: agentStatuses.find(a => a.type === 'forecasting'),
            tasks: workflowState.steps.filter(s => s.agentType === 'forecasting'),
            currentProcesses: [
              'Forecast generation for 30-day horizon',
              'Bootstrap confidence intervals (95% level, 1000 samples)',
              'Cross-validation with MAPE, MAE, RMSE metrics',
              'Business insights with trend & seasonality analysis'
            ],
            technicalDetails: {
              methods: ['Point Forecasting', 'Bootstrap Sampling', 'Cross-Validation', 'Statistical Analysis'],
              parameters: {
                'forecast_horizon': 30,
                'confidence_level': 0.95,
                'bootstrap_samples': 1000,
                'cv_folds': 5,
                'metrics': ['MAPE', 'MAE', 'RMSE', 'R²']
              },
              outputs: ['Point forecasts', 'Prediction intervals', 'Performance metrics', 'Feature importance'],
              tools: ['NumPy', 'SciPy', 'Matplotlib', 'Plotly']
            }
          }
        ]
      }
    ]
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Enhanced Workflow Progress</h3>
          <div className="flex items-center space-x-2">
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              workflowState.status === 'running' ? 'bg-blue-100 text-blue-800' :
              workflowState.status === 'completed' ? 'bg-green-100 text-green-800' :
              workflowState.status === 'failed' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {workflowState.status.toUpperCase()}
            </div>
          </div>
        </div>
        
        {/* Overall Progress */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
            <span>Overall Progress</span>
            <span>{Math.round(workflowState.progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${workflowState.progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>

      {/* Enhanced Hierarchical Workflow View */}
      <div className="flex-1 overflow-y-auto p-4">
        {getAgentHierarchy().map((supervisorNode, index) => (
          <div key={supervisorNode.agent?.id || index} className="space-y-4">
            {/* Supervisor Agent */}
            {supervisorNode.agent && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-4 shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                      <Bot className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{supervisorNode.agent.name}</h3>
                      <p className="text-sm opacity-90">{supervisorNode.agent.currentTask}</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    supervisorNode.agent.status === 'active' ? 'bg-green-500' :
                    supervisorNode.agent.status === 'busy' ? 'bg-orange-500' :
                    'bg-gray-500'
                  }`}>
                    {supervisorNode.agent.status.toUpperCase()}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Child Agents with Enhanced Details */}
            <div className="ml-6 space-y-6">
              {supervisorNode.children.map((childNode, childIndex) => {
                if (!childNode.agent) return null
                
                const isAgentActive = childNode.agent.status === 'busy' || childNode.agent.status === 'active'
                const hasActiveTasks = childNode.tasks.some(task => task.status === 'in-progress')
                const hasWaitingTasks = childNode.tasks.some(task => task.status === 'waiting-approval')
                const isExpanded = expandedAgents[childNode.agent.id]
                
                return (
                  <motion.div
                    key={childNode.agent.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: childIndex * 0.1 }}
                    className="relative"
                  >
                    {/* Connection Line */}
                    <div className="absolute -left-6 top-6 w-6 h-0.5 bg-gray-300"></div>
                    <div className="absolute -left-6 top-0 w-0.5 h-6 bg-gray-300"></div>
                    
                    {/* Enhanced Agent Card */}
                    <div className={`border-2 rounded-lg transition-all ${
                      isAgentActive ? 'border-blue-300 bg-blue-50 shadow-md' :
                      hasActiveTasks ? 'border-orange-300 bg-orange-50' :
                      hasWaitingTasks ? 'border-yellow-300 bg-yellow-50' :
                      'border-gray-200 bg-white'
                    }`}>
                      {/* Agent Header */}
                      <div 
                        className="p-4 cursor-pointer"
                        onClick={() => toggleAgentExpansion(childNode.agent!.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              isAgentActive ? 'bg-blue-500 text-white' :
                              hasActiveTasks ? 'bg-orange-500 text-white' :
                              hasWaitingTasks ? 'bg-yellow-500 text-white' :
                              'bg-gray-300 text-gray-600'
                            }`}>
                              {getStepIcon(childNode.agent.type)}
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900 flex items-center">
                                {childNode.agent.name}
                                {isExpanded ? 
                                  <ChevronDown className="w-4 h-4 ml-2" /> : 
                                  <ChevronRight className="w-4 h-4 ml-2" />
                                }
                              </h4>
                              <p className="text-sm text-gray-600">{childNode.agent.currentTask || 'Idle'}</p>
                            </div>
                          </div>
                          
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                            childNode.agent.status === 'busy' ? 'bg-orange-100 text-orange-800' :
                            childNode.agent.status === 'active' ? 'bg-blue-100 text-blue-800' :
                            childNode.agent.status === 'completed' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {childNode.agent.status.toUpperCase()}
                          </div>
                        </div>

                        {/* Agent Progress */}
                        {isAgentActive && childNode.agent.progress > 0 && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                              <span>Progress</span>
                              <span>{Math.round(childNode.agent.progress)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <motion.div
                                className="bg-blue-500 h-1.5 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${childNode.agent.progress}%` }}
                                transition={{ duration: 0.3 }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Expanded Agent Details */}
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="border-t border-gray-200 p-4 space-y-4"
                        >
                          {/* Current Processes */}
                          <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Current Processes</h5>
                            <div className="space-y-2">
                              {childNode.currentProcesses.map((process, idx) => (
                                <div key={idx} className="flex items-center space-x-2 text-sm">
                                  <div className={`w-2 h-2 rounded-full ${
                                    isAgentActive && idx === 0 ? 'bg-blue-500 animate-pulse' :
                                    isAgentActive && idx < 2 ? 'bg-orange-500' :
                                    'bg-gray-300'
                                  }`}></div>
                                  <span className={
                                    isAgentActive && idx === 0 ? 'text-blue-700 font-medium' :
                                    isAgentActive && idx < 2 ? 'text-orange-700' :
                                    'text-gray-600'
                                  }>
                                    {process}
                                  </span>
                                  {isAgentActive && idx === 0 && (
                                    <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                                      Processing...
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Agent Capabilities */}
                          <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Capabilities</h5>
                            <div className="flex flex-wrap gap-1">
                              {childNode.agent.capabilities.slice(0, 4).map((capability, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                                >
                                  {capability}
                                </span>
                              ))}
                              {childNode.agent.capabilities.length > 4 && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                                  +{childNode.agent.capabilities.length - 4} more
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Technical Details */}
                          {childNode.technicalDetails && (
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-2">Technical Configuration</h5>
                              <div className="space-y-3">
                                {/* Methods */}
                                <div>
                                  <div className="text-xs font-medium text-gray-600 mb-1">Methods & Techniques</div>
                                  <div className="flex flex-wrap gap-1">
                                    {childNode.technicalDetails.methods.map((method, idx) => (
                                      <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                        {method}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                {/* Parameters */}
                                <div>
                                  <div className="text-xs font-medium text-gray-600 mb-1">Key Parameters</div>
                                  <div className="bg-gray-50 rounded p-2 text-xs font-mono">
                                    {Object.entries(childNode.technicalDetails.parameters).slice(0, 3).map(([key, value]) => (
                                      <div key={key} className="flex justify-between">
                                        <span className="text-gray-600">{key}:</span>
                                        <span className="text-gray-900 font-semibold">
                                          {Array.isArray(value) ? `[${value.join(', ')}]` : 
                                           typeof value === 'object' ? JSON.stringify(value).slice(0, 20) + '...' :
                                           String(value)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Regressors */}
                                {childNode.technicalDetails.regressors && (
                                  <div>
                                    <div className="text-xs font-medium text-gray-600 mb-1">External Regressors</div>
                                    <div className="flex flex-wrap gap-1">
                                      {childNode.technicalDetails.regressors.map((regressor, idx) => (
                                        <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                          {regressor}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Tools */}
                                <div>
                                  <div className="text-xs font-medium text-gray-600 mb-1">Tools & Libraries</div>
                                  <div className="flex flex-wrap gap-1">
                                    {childNode.technicalDetails.tools.map((tool, idx) => (
                                      <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                                        {tool}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Performance Metrics */}
                          {childNode.agent.performance && (
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-2">Performance</h5>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-gray-50 rounded p-2">
                                  <div className="font-medium text-gray-700">Success Rate</div>
                                  <div className="text-green-600 font-semibold">
                                    {Math.round(childNode.agent.performance.successRate * 100)}%
                                  </div>
                                </div>
                                <div className="bg-gray-50 rounded p-2">
                                  <div className="font-medium text-gray-700">Avg Time</div>
                                  <div className="text-blue-600 font-semibold">
                                    {childNode.agent.performance.averageTaskTime}s
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Tasks */}
                          {childNode.tasks.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-2">Workflow Tasks</h5>
                              <div className="space-y-2">
                                {childNode.tasks.map((task) => (
                                  <div
                                    key={task.id}
                                    className={`p-2 rounded border text-sm cursor-pointer transition-colors ${
                                      task.status === 'in-progress' ? 'border-blue-200 bg-blue-50 hover:bg-blue-100' :
                                      task.status === 'completed' ? 'border-green-200 bg-green-50' :
                                      task.status === 'failed' ? 'border-red-200 bg-red-50' :
                                      task.status === 'waiting-approval' ? 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100' :
                                      'border-gray-200 bg-gray-50'
                                    }`}
                                    onClick={() => task.status === 'waiting-approval' && onStepClick(task.id)}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium">{task.name}</span>
                                      <div className="flex items-center space-x-2">
                                        {task.status === 'in-progress' && (
                                          <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                            className="w-3 h-3"
                                          >
                                            {getStatusIcon(task.status)}
                                          </motion.div>
                                        )}
                                        {task.status !== 'in-progress' && getStatusIcon(task.status)}
                                      </div>
                                    </div>
                                    
                                    {task.status === 'in-progress' && (
                                      <div className="mt-2">
                                        <div className="w-full bg-gray-200 rounded-full h-1">
                                          <motion.div
                                            className="bg-blue-500 h-1 rounded-full"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${task.progress}%` }}
                                            transition={{ duration: 0.3 }}
                                          />
                                        </div>
                                      </div>
                                    )}
                                    
                                    <p className="text-xs text-gray-600 mt-1">{task.description}</p>
                                    
                                    {task.status === 'waiting-approval' && mode === 'step-by-step' && (
                                      <div className="mt-2 p-2 bg-yellow-100 border border-yellow-200 rounded text-xs">
                                        <span className="font-medium text-yellow-800">⏸️ Click to approve and continue</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Workflow Summary */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Mode:</span>
            <span className="ml-2 text-gray-600">
              {mode === 'auto-execute' ? '⚡ Auto-Execute' : '👥 Step-by-Step'}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Started:</span>
            <span className="ml-2 text-gray-600">
              {workflowState.startTime?.toLocaleTimeString() || 'Not started'}
            </span>
          </div>
        </div>
        
        {workflowState.estimatedCompletion && (
          <div className="mt-2 text-sm">
            <span className="font-medium text-gray-700">Est. Completion:</span>
            <span className="ml-2 text-gray-600">
              {workflowState.estimatedCompletion.toLocaleTimeString()}
            </span>
          </div>
        )}
        
        <div className="mt-2 text-xs text-gray-500">
          💡 Click on agent names to expand details. Click on waiting tasks to approve them.
        </div>
      </div>
    </div>
  )
}