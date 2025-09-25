'use client'

import { motion } from 'framer-motion'
import { Bot, BarChart3, Wrench, Brain, TrendingUp, CheckCircle, Clock, AlertCircle, Play, Pause } from 'lucide-react'
import { WorkflowState, AgentStatus, WorkflowMode } from '../../types/enhanced'

interface NodeEdgeWorkflowProps {
  workflowState: WorkflowState
  agentStatuses: AgentStatus[]
  mode: WorkflowMode
  onStepClick: (stepId: string) => void
  onStepEdit: (stepId: string, changes: any) => void
}

interface WorkflowNode {
  id: string
  type: 'agent' | 'task' | 'supervisor'
  name: string
  status: 'idle' | 'active' | 'completed' | 'failed' | 'waiting'
  progress: number
  position: { x: number; y: number }
  agent?: AgentStatus
  task?: any
  children?: string[]
}

export default function NodeEdgeWorkflow({
  workflowState,
  agentStatuses,
  mode,
  onStepClick,
  onStepEdit
}: NodeEdgeWorkflowProps) {

  const getAgentIcon = (agentType: string) => {
    switch (agentType) {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'active':
        return <Play className="w-4 h-4 text-blue-600" />
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      case 'waiting':
        return <Pause className="w-4 h-4 text-yellow-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getNodeColor = (status: string, type: string) => {
    if (type === 'supervisor') {
      return status === 'active' ? 'from-blue-500 to-purple-600' : 'from-gray-400 to-gray-500'
    }
    
    switch (status) {
      case 'active':
        return 'from-blue-500 to-blue-600'
      case 'completed':
        return 'from-green-500 to-green-600'
      case 'failed':
        return 'from-red-500 to-red-600'
      case 'waiting':
        return 'from-yellow-500 to-yellow-600'
      default:
        return 'from-gray-300 to-gray-400'
    }
  }

  // Create workflow nodes based on current state
  const createWorkflowNodes = (): WorkflowNode[] => {
    const nodes: WorkflowNode[] = []
    
    // Supervisor node at the top
    const supervisor = agentStatuses.find(a => a.type === 'supervisor')
    if (supervisor) {
      nodes.push({
        id: 'supervisor',
        type: 'supervisor',
        name: supervisor.name,
        status: supervisor.status === 'busy' ? 'active' : supervisor.status as any,
        progress: supervisor.progress || 0,
        position: { x: 400, y: 50 },
        agent: supervisor,
        children: ['data-analyst', 'preprocessing', 'model-training', 'forecasting']
      })
    }

    // Agent nodes in a grid layout
    const agentPositions = [
      { x: 150, y: 200 }, // Data Analyst
      { x: 350, y: 200 }, // Preprocessing
      { x: 550, y: 200 }, // Model Training
      { x: 750, y: 200 }  // Forecasting
    ]

    const agentTypes = ['data-analyst', 'preprocessing', 'model-training', 'forecasting']
    
    agentTypes.forEach((agentType, index) => {
      const agent = agentStatuses.find(a => a.type === agentType)
      if (agent) {
        const relatedSteps = workflowState.steps.filter(s => s.agentType === agentType)
        const hasActiveStep = relatedSteps.some(s => s.status === 'in-progress')
        const hasCompletedStep = relatedSteps.some(s => s.status === 'completed')
        const hasWaitingStep = relatedSteps.some(s => s.status === 'waiting-approval')
        
        let nodeStatus = 'idle'
        if (hasActiveStep || agent.status === 'busy') nodeStatus = 'active'
        else if (hasWaitingStep) nodeStatus = 'waiting'
        else if (hasCompletedStep) nodeStatus = 'completed'

        nodes.push({
          id: agentType,
          type: 'agent',
          name: agent.name,
          status: nodeStatus as any,
          progress: agent.progress || 0,
          position: agentPositions[index],
          agent,
          children: relatedSteps.map(s => s.id)
        })

        // Add task nodes below each agent
        relatedSteps.forEach((step, stepIndex) => {
          nodes.push({
            id: step.id,
            type: 'task',
            name: step.name,
            status: step.status === 'in-progress' ? 'active' : 
                   step.status === 'completed' ? 'completed' :
                   step.status === 'waiting-approval' ? 'waiting' :
                   step.status === 'failed' ? 'failed' : 'idle',
            progress: step.progress,
            position: { 
              x: agentPositions[index].x, 
              y: 320 + (stepIndex * 80) 
            },
            task: step
          })
        })
      }
    })

    return nodes
  }

  const nodes = createWorkflowNodes()

  // Create edges between nodes
  const createEdges = () => {
    const edges: Array<{from: string, to: string, type: 'hierarchy' | 'flow'}> = []
    
    // Supervisor to agents
    const supervisor = nodes.find(n => n.type === 'supervisor')
    if (supervisor && supervisor.children) {
      supervisor.children.forEach(childId => {
        edges.push({ from: supervisor.id, to: childId, type: 'hierarchy' })
      })
    }

    // Agents to their tasks
    nodes.filter(n => n.type === 'agent').forEach(agent => {
      if (agent.children) {
        agent.children.forEach(taskId => {
          edges.push({ from: agent.id, to: taskId, type: 'hierarchy' })
        })
      }
    })

    // Flow between workflow steps
    const workflowSteps = workflowState.steps
    for (let i = 0; i < workflowSteps.length - 1; i++) {
      edges.push({ 
        from: workflowSteps[i].id, 
        to: workflowSteps[i + 1].id, 
        type: 'flow' 
      })
    }

    return edges
  }

  const edges = createEdges()

  const renderEdge = (edge: {from: string, to: string, type: 'hierarchy' | 'flow'}) => {
    const fromNode = nodes.find(n => n.id === edge.from)
    const toNode = nodes.find(n => n.id === edge.to)
    
    if (!fromNode || !toNode) return null

    const isActive = fromNode.status === 'active' || toNode.status === 'active'
    const isCompleted = fromNode.status === 'completed' && toNode.status === 'completed'

    return (
      <motion.line
        key={`${edge.from}-${edge.to}`}
        x1={fromNode.position.x + 50}
        y1={fromNode.position.y + 50}
        x2={toNode.position.x + 50}
        y2={toNode.position.y + 50}
        stroke={
          isActive ? '#3B82F6' :
          isCompleted ? '#10B981' :
          edge.type === 'hierarchy' ? '#9CA3AF' : '#D1D5DB'
        }
        strokeWidth={isActive ? 3 : edge.type === 'hierarchy' ? 2 : 1}
        strokeDasharray={edge.type === 'flow' ? '5,5' : 'none'}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      />
    )
  }

  const renderNode = (node: WorkflowNode) => {
    const isActive = node.status === 'active'
    const isCompleted = node.status === 'completed'
    const isWaiting = node.status === 'waiting'

    return (
      <motion.g
        key={node.id}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        style={{ cursor: 'pointer' }}
        onClick={() => node.task && onStepClick(node.task.id)}
      >
        {/* Node Background */}
        <motion.rect
          x={node.position.x}
          y={node.position.y}
          width={100}
          height={node.type === 'supervisor' ? 80 : node.type === 'agent' ? 70 : 60}
          rx={node.type === 'supervisor' ? 15 : 10}
          fill="url(#gradient-bg)"
          stroke={
            isActive ? '#3B82F6' :
            isCompleted ? '#10B981' :
            isWaiting ? '#F59E0B' :
            '#E5E7EB'
          }
          strokeWidth={isActive ? 3 : 2}
          className="drop-shadow-md"
          animate={{
            scale: isActive ? [1, 1.05, 1] : 1
          }}
          transition={{
            duration: 2,
            repeat: isActive ? Infinity : 0
          }}
        />

        {/* Gradient Definitions */}
        <defs>
          <linearGradient id="gradient-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={
              node.type === 'supervisor' ? '#EBF4FF' :
              isActive ? '#DBEAFE' :
              isCompleted ? '#D1FAE5' :
              isWaiting ? '#FEF3C7' :
              '#F9FAFB'
            } />
            <stop offset="100%" stopColor={
              node.type === 'supervisor' ? '#DBEAFE' :
              isActive ? '#BFDBFE' :
              isCompleted ? '#A7F3D0' :
              isWaiting ? '#FDE68A' :
              '#F3F4F6'
            } />
          </linearGradient>
        </defs>

        {/* Node Icon */}
        <foreignObject
          x={node.position.x + 10}
          y={node.position.y + 10}
          width={30}
          height={30}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-r ${getNodeColor(node.status, node.type)} text-white`}>
            {node.agent ? getAgentIcon(node.agent.type) : getAgentIcon('supervisor')}
          </div>
        </foreignObject>

        {/* Node Title */}
        <text
          x={node.position.x + 50}
          y={node.position.y + 25}
          textAnchor="middle"
          className="text-sm font-semibold fill-gray-900"
        >
          {node.name.length > 12 ? node.name.substring(0, 12) + '...' : node.name}
        </text>

        {/* Status Icon */}
        <foreignObject
          x={node.position.x + 75}
          y={node.position.y + 10}
          width={20}
          height={20}
        >
          <div className="flex items-center justify-center">
            {getStatusIcon(node.status)}
          </div>
        </foreignObject>

        {/* Progress Bar for Active Nodes */}
        {isActive && node.progress > 0 && (
          <>
            <rect
              x={node.position.x + 10}
              y={node.position.y + (node.type === 'supervisor' ? 65 : node.type === 'agent' ? 55 : 45)}
              width={80}
              height={4}
              rx={2}
              fill="#E5E7EB"
            />
            <motion.rect
              x={node.position.x + 10}
              y={node.position.y + (node.type === 'supervisor' ? 65 : node.type === 'agent' ? 55 : 45)}
              width={80 * (node.progress / 100)}
              height={4}
              rx={2}
              fill="#3B82F6"
              initial={{ width: 0 }}
              animate={{ width: 80 * (node.progress / 100) }}
              transition={{ duration: 0.5 }}
            />
          </>
        )}

        {/* Current Task Text for Agents */}
        {node.type === 'agent' && node.agent?.currentTask && (
          <text
            x={node.position.x + 50}
            y={node.position.y + 45}
            textAnchor="middle"
            className="text-xs fill-gray-600"
          >
            {node.agent.currentTask.length > 15 
              ? node.agent.currentTask.substring(0, 15) + '...' 
              : node.agent.currentTask
            }
          </text>
        )}

        {/* Waiting Approval Badge */}
        {isWaiting && mode === 'step-by-step' && (
          <foreignObject
            x={node.position.x + 20}
            y={node.position.y - 15}
            width={60}
            height={20}
          >
            <div className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full text-center">
              Approval
            </div>
          </foreignObject>
        )}
      </motion.g>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Workflow Visualization</h3>
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

      {/* Workflow Graph */}
      <div className="flex-1 overflow-auto p-4">
        <div className="relative w-full h-full min-h-[600px]">
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 900 600"
            className="border border-gray-200 rounded-lg bg-gray-50"
          >
            {/* Render Edges */}
            <g>
              {edges.map(edge => renderEdge(edge))}
            </g>
            
            {/* Render Nodes */}
            <g>
              {nodes.map(node => renderNode(node))}
            </g>
          </svg>
        </div>
      </div>

      {/* Legend */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Active</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Completed</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span>Waiting Approval</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-400 rounded"></div>
            <span>Idle</span>
          </div>
        </div>
        
        <div className="mt-2 text-xs text-gray-600">
          <span className="font-medium">Mode:</span> {mode === 'auto-execute' ? '⚡ Auto-Execute' : '👥 Step-by-Step'}
          {mode === 'step-by-step' && (
            <span className="ml-4">💡 Click on waiting tasks to approve them</span>
          )}
        </div>
      </div>
    </div>
  )
}