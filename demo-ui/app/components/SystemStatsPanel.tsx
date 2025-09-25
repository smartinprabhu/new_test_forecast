'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Activity, 
  Cpu, 
  Database, 
  Network, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp,
  Users,
  Zap,
  RefreshCw
} from 'lucide-react'

interface SystemStats {
  agents: {
    total: number
    idle: number
    busy: number
    utilization: number
  }
  tasks: {
    total: number
    pending: number
    completed: number
    completion_rate: number
  }
  workflows: {
    active: number
    total: number
  }
  performance: {
    total_tasks_completed: number
    total_tasks_failed: number
    overall_success_rate: number
    active_tasks: number
  }
  system: {
    total_agents: number
    total_tasks: number
    total_workflows: number
    uptime: number
  }
}

interface SystemStatsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export default function SystemStatsPanel({ isOpen, onClose }: SystemStatsPanelProps) {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchStats = async () => {
    setLoading(true)
    try {
      const response = await fetch('http://localhost:8001/system/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
        setLastUpdated(new Date())
      }
    } catch (error) {
      console.error('Failed to fetch system stats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchStats()
      const interval = setInterval(fetchStats, 5000) // Update every 5 seconds
      return () => clearInterval(interval)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed right-0 top-0 h-full w-80 bg-white border-l border-gray-200 shadow-lg z-40 overflow-y-auto"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">System Stats</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchStats}
              disabled={loading}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
            >
              ×
            </button>
          </div>
        </div>
        {lastUpdated && (
          <p className="text-xs text-gray-500 mt-1">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {loading && !stats ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : stats ? (
          <>
            {/* Agent Statistics */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <Users className="w-4 h-4 mr-2 text-purple-600" />
                Agent Performance
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {stats.agents.total}
                  </div>
                  <div className="text-xs text-purple-700">Total Agents</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {stats.agents.utilization.toFixed(1)}%
                  </div>
                  <div className="text-xs text-green-700">Utilization</div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.agents.busy}
                  </div>
                  <div className="text-xs text-blue-700">Active</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-gray-600">
                    {stats.agents.idle}
                  </div>
                  <div className="text-xs text-gray-700">Idle</div>
                </div>
              </div>
            </div>

            {/* Task Statistics */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <Zap className="w-4 h-4 mr-2 text-orange-600" />
                Task Metrics
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Completion Rate</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {stats.tasks.completion_rate.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${stats.tasks.completion_rate}%` }}
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold text-gray-900">
                      {stats.tasks.total}
                    </div>
                    <div className="text-xs text-gray-600">Total</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-orange-600">
                      {stats.tasks.pending}
                    </div>
                    <div className="text-xs text-gray-600">Pending</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-600">
                      {stats.tasks.completed}
                    </div>
                    <div className="text-xs text-gray-600">Done</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <TrendingUp className="w-4 h-4 mr-2 text-green-600" />
                Performance
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-800">Success Rate</span>
                  </div>
                  <span className="text-sm font-bold text-green-800">
                    {(stats.performance.overall_success_rate * 100).toFixed(1)}%
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-800">Active Tasks</span>
                  </div>
                  <span className="text-sm font-bold text-blue-800">
                    {stats.performance.active_tasks}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-lg font-bold text-gray-900">
                      {stats.performance.total_tasks_completed}
                    </div>
                    <div className="text-xs text-gray-600">Completed</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="text-lg font-bold text-red-600">
                      {stats.performance.total_tasks_failed}
                    </div>
                    <div className="text-xs text-gray-600">Failed</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Workflow Statistics */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <Database className="w-4 h-4 mr-2 text-indigo-600" />
                Workflows
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-indigo-50 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-indigo-600">
                    {stats.workflows.active}
                  </div>
                  <div className="text-xs text-indigo-700">Active</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    {stats.workflows.total}
                  </div>
                  <div className="text-xs text-gray-700">Total</div>
                </div>
              </div>
            </div>

            {/* System Health */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <Cpu className="w-4 h-4 mr-2 text-red-600" />
                System Health
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-800">Backend</span>
                  </div>
                  <span className="text-xs text-green-600 font-medium">Healthy</span>
                </div>
                
                <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-800">Agents</span>
                  </div>
                  <span className="text-xs text-green-600 font-medium">Online</span>
                </div>
                
                <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-800">Database</span>
                  </div>
                  <span className="text-xs text-green-600 font-medium">Connected</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h4>
              <div className="space-y-2">
                <button className="w-full p-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded">
                  Reset All Agents
                </button>
                <button className="w-full p-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded">
                  Clear Task Queue
                </button>
                <button className="w-full p-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded">
                  Export System Logs
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
            <p>Failed to load system statistics</p>
            <button
              onClick={fetchStats}
              className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}