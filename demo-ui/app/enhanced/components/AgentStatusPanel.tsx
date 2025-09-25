'use client'

import { motion } from 'framer-motion'
import { Bot, BarChart3, Wrench, Brain, TrendingUp, Activity, Clock, CheckCircle, AlertCircle, Zap } from 'lucide-react'
import { AgentStatus } from '../../types/enhanced'

interface AgentStatusPanelProps {
  agents: AgentStatus[]
  onAgentClick: (agentId: string) => void
}

export default function AgentStatusPanel({ agents, onAgentClick }: AgentStatusPanelProps) {
  
  const getAgentIcon = (type: string) => {
    switch (type) {
      case 'supervisor':
        return <Bot className="w-5 h-5" />
      case 'data-analyst':
        return <BarChart3 className="w-5 h-5" />
      case 'preprocessing':
        return <Wrench className="w-5 h-5" />
      case 'model-training':
        return <Brain className="w-5 h-5" />
      case 'forecasting':
        return <TrendingUp className="w-5 h-5" />
      default:
        return <Bot className="w-5 h-5" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-500'
      case 'busy':
        return 'bg-orange-500'
      case 'completed':
        return 'bg-green-500'
      case 'error':
        return 'bg-red-500'
      case 'offline':
        return 'bg-gray-400'
      default:
        return 'bg-gray-300'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Activity className="w-3 h-3" />
      case 'busy':
        return <Zap className="w-3 h-3" />
      case 'completed':
        return <CheckCircle className="w-3 h-3" />
      case 'error':
        return <AlertCircle className="w-3 h-3" />
      default:
        return <Clock className="w-3 h-3" />
    }
  }

  const getAgentGradient = (type: string) => {
    switch (type) {
      case 'supervisor':
        return 'from-blue-500 to-purple-600'
      case 'data-analyst':
        return 'from-green-500 to-teal-600'
      case 'preprocessing':
        return 'from-orange-500 to-red-600'
      case 'model-training':
        return 'from-purple-500 to-pink-600'
      case 'forecasting':
        return 'from-indigo-500 to-blue-600'
      default:
        return 'from-gray-500 to-gray-600'
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Agent Team</h3>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-xs text-gray-600">
              {agents.filter(a => a.status === 'active' || a.status === 'busy').length} active
            </span>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Specialized AI agents working on your forecasting project
        </p>
      </div>

      {/* Agent List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {agents.map((agent, index) => (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onAgentClick(agent.id)}
            className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
              agent.status === 'busy' ? 'border-orange-300 bg-orange-50 shadow-sm' :
              agent.status === 'active' ? 'border-blue-300 bg-blue-50' :
              agent.status === 'completed' ? 'border-green-300 bg-green-50' :
              agent.status === 'error' ? 'border-red-300 bg-red-50' :
              'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            {/* Agent Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {/* Agent Avatar */}
                <div className={`w-10 h-10 bg-gradient-to-r ${getAgentGradient(agent.type)} rounded-full flex items-center justify-center text-white shadow-sm`}>
                  {getAgentIcon(agent.type)}
                </div>

                {/* Agent Info */}
                <div>
                  <h4 className="font-medium text-gray-900">{agent.name}</h4>
                  <p className="text-sm text-gray-600 capitalize">{agent.type.replace('-', ' ')}</p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center space-x-2">
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-white text-xs font-medium ${getStatusColor(agent.status)}`}>
                  {getStatusIcon(agent.status)}
                  <span className="capitalize">{agent.status}</span>
                </div>
              </div>
            </div>

            {/* Current Task */}
            {agent.currentTask && (
              <div className="mt-3">
                <div className="text-sm font-medium text-gray-700 mb-1">Current Task:</div>
                <div className="text-sm text-gray-600">{agent.currentTask}</div>
                
                {/* Progress Bar */}
                {agent.status === 'busy' && agent.progress > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{Math.round(agent.progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <motion.div
                        className="bg-orange-500 h-1.5 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${agent.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Capabilities */}
            <div className="mt-3">
              <div className="text-sm font-medium text-gray-700 mb-2">Capabilities:</div>
              <div className="flex flex-wrap gap-1">
                {agent.capabilities.slice(0, 3).map((capability, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                  >
                    {capability}
                  </span>
                ))}
                {agent.capabilities.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                    +{agent.capabilities.length - 3} more
                  </span>
                )}
              </div>
            </div>

            {/* Performance Metrics */}
            {agent.performance && (
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-50 rounded p-2">
                  <div className="font-medium text-gray-700">Tasks</div>
                  <div className="text-gray-600">{agent.performance.tasksCompleted}</div>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <div className="font-medium text-gray-700">Success Rate</div>
                  <div className="text-gray-600">{Math.round(agent.performance.successRate * 100)}%</div>
                </div>
              </div>
            )}

            {/* Workload Indicator */}
            {agent.workload !== undefined && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>Workload</span>
                  <span>{agent.workload}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div
                    className={`h-1 rounded-full ${
                      agent.workload > 80 ? 'bg-red-500' :
                      agent.workload > 60 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${agent.workload}%` }}
                  />
                </div>
              </div>
            )}

            {/* Last Active */}
            {agent.lastActive && (
              <div className="mt-2 text-xs text-gray-500">
                Last active: {agent.lastActive.toLocaleTimeString()}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Team Summary */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="text-sm">
          <div className="font-medium text-gray-700 mb-2">Team Status</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Active: {agents.filter(a => a.status === 'active').length}</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span>Busy: {agents.filter(a => a.status === 'busy').length}</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span>Idle: {agents.filter(a => a.status === 'idle').length}</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Total: {agents.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}