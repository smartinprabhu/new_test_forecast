'use client'

import { motion } from 'framer-motion'
import { CheckCircle, Clock, AlertCircle, Play, Pause, BarChart3, Wrench, Brain, TrendingUp, Upload, Bot } from 'lucide-react'
import { WorkflowState, AgentStatus, WorkflowMode } from '../../types/enhanced'

interface WorkflowVisualizationProps {
  workflowState: WorkflowState
  agentStatuses: AgentStatus[]
  mode: WorkflowMode
  onStepClick: (stepId: string) => void
  onStepEdit: (stepId: string, changes: any) => void
}

export default function WorkflowVisualization({
  workflowState,
  agentStatuses,
  mode,
  onStepClick,
  onStepEdit
}: WorkflowVisualizationProps) {

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

  const getAgentHierarchy = () => {
    // Create hierarchical structure based on workflow
    const hierarchy = [
      {
        agent: agentStatuses.find(a => a.type === 'supervisor'),
        children: [
          {
            agent: agentStatuses.find(a => a.type === 'data-analyst'),
            tasks: workflowState.steps.filter(s => s.agentType === 'data-analyst')
          },
          {
            agent: agentStatuses.find(a => a.type === 'preprocessing'),
            tasks: workflowState.steps.filter(s => s.agentType === 'preprocessing')
          },
          {
            agent: agentStatuses.find(a => a.type === 'model-training'),
            tasks: workflowState.steps.filter(s => s.agentType === 'model-training')
          },
          {
            agent: agentStatuses.find(a => a.type === 'forecasting'),
            tasks: workflowState.steps.filter(s => s.agentType === 'forecasting')
          }
        ]
      }
    ]
    return hierarchy
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

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Workflow Progress</h3>
          <div className="flex items-center space-x-2">
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${workflowState.status === 'running' ? 'bg-blue-100 text-blue-800' :
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

      {/* Hierarchical Workflow View */}
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
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${supervisorNode.agent.status === 'active' ? 'bg-green-500' :
                    supervisorNode.agent.status === 'busy' ? 'bg-orange-500' :
                      'bg-gray-500'
                    }`}>
                    {supervisorNode.agent.status.toUpperCase()}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Child Agents with Tasks */}
            <div className="ml-6 space-y-6">
              {supervisorNode.children.map((childNode, childIndex) => {
                if (!childNode.agent) return null

                const isAgentActive = childNode.agent.status === 'busy' || childNode.agent.status === 'active'
                const hasActiveTasks = childNode.tasks.some(task => task.status === 'in-progress')

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

                    {/* Agent Card */}
                    <div className={`border-2 rounded-lg p-4 transition-all ${isAgentActive ? 'border-blue-300 bg-blue-50 shadow-md' :
                      hasActiveTasks ? 'border-orange-300 bg-orange-50' :
                        'border-gray-200 bg-white'
                      }`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isAgentActive ? 'bg-blue-500 text-white' :
                            hasActiveTasks ? 'bg-orange-500 text-white' :
                              'bg-gray-300 text-gray-600'
                            }`}>
                            {getStepIcon(childNode.agent.type)}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{childNode.agent.name}</h4>
                            <p className="text-sm text-gray-600">{childNode.agent.currentTask || 'Idle'}</p>
                          </div>
                        </div>

                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${childNode.agent.status === 'busy' ? 'bg-orange-100 text-orange-800' :
                          childNode.agent.status === 'active' ? 'bg-blue-100 text-blue-800' :
                            childNode.agent.status === 'completed' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-600'
                          }`}>
                          {childNode.agent.status.toUpperCase()}
                        </div>
                      </div>

                      {/* Agent Progress */}
                      {isAgentActive && childNode.agent.progress > 0 && (
                        <div className="mb-3">
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

                      {/* Tasks */}
                      {childNode.tasks.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="text-xs font-medium text-gray-700 uppercase tracking-wide">Tasks</h5>
                          {childNode.tasks.map((task) => (
                            <div
                              key={task.id}
                              className={`p-2 rounded border text-sm ${task.status === 'in-progress' ? 'border-blue-200 bg-blue-50' :
                                task.status === 'completed' ? 'border-green-200 bg-green-50' :
                                  task.status === 'failed' ? 'border-red-200 bg-red-50' :
                                    task.status === 'waiting-approval' ? 'border-yellow-200 bg-yellow-50' :
                                      'border-gray-200 bg-gray-50'
                                }`}
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
                                  <span className="font-medium text-yellow-800">⏸️ Awaiting User Approval</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
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
      </div>
    </div>
  )
}