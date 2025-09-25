'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot,
  Settings,
  HelpCircle,
  BarChart3,
  Send,
  Paperclip,
  Zap,
  StepForward,
  Users,
  Activity,
  Sun,
  Moon
} from 'lucide-react'
import EnhancedChatInterface from './enhanced/components/EnhancedChatInterface'
import EnhancedWorkflowVisualization from './enhanced/components/EnhancedWorkflowVisualization'
import AgentStatusPanel from './enhanced/components/AgentStatusPanel'
import ModeSelector from './enhanced/components/ModeSelector'
import SettingsModal from './enhanced/components/SettingsModal'

import ForecastingPlan from './components/ForecastingPlan'
import { EnhancedChatMessage, WorkflowMode, AgentStatus, WorkflowState } from './types/enhanced'
import { AgentOrchestrator } from './services/AgentOrchestrator'
import { GeminiAPIClient } from './services/GeminiAPIClient'

import { useTheme } from './contexts/ThemeContext'

function EnhancedForecastingChatbotInner() {
  const { theme, toggleTheme } = useTheme()
  // Core state
  const [mode, setMode] = useState<WorkflowMode>('step-by-step')
  const [messages, setMessages] = useState<EnhancedChatMessage[]>([])
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null)
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  // UI state
  const [showWorkflowPanel, setShowWorkflowPanel] = useState(true)
  const [showAgentPanel, setShowAgentPanel] = useState(true)
  const [showPlan, setShowPlan] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [inputValue, setInputValue] = useState('')

  // Services
  const [orchestrator] = useState(() => new AgentOrchestrator())
  const [geminiClient] = useState(() => new GeminiAPIClient())

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    initializeChat()
    setupAgentListeners()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const initializeChat = async () => {
    const welcomeMessage: EnhancedChatMessage = {
      id: '1',
      type: 'assistant',
      content: `🚀 **Welcome to the Enhanced Agentic Forecasting Assistant!**

I'm your AI-powered forecasting companion with a team of specialized agents ready to help you create accurate predictions from your time series data.

**🎯 Choose Your Experience:**
- **Auto-Execute**: Let me handle everything automatically with intelligent defaults
- **Step-by-Step**: Review and approve each step for full control

**🤖 My Agent Team:**
- **Data Analyst**: Analyzes your data quality and patterns
- **Preprocessing Specialist**: Cleans and prepares your data
- **Model Trainer**: Trains and optimizes forecasting algorithms
- **Forecasting Specialist**: Generates predictions and insights

Ready to begin? Choose your preferred mode and let's create some amazing forecasts!

**🆕 Try the New Enhanced Chatbot:**
- Direct integration with Python backend
- Real-time agent coordination
- Gemini AI-powered conversations

[Click here to try the Enhanced Chatbot](/chatbot)`,
      timestamp: new Date(),
      agentId: 'supervisor',
      requiresApproval: false,
      options: [
        { id: 'auto', label: '⚡ Auto-Execute Mode', action: 'set_auto_mode' },
        { id: 'step', label: '👥 Step-by-Step Mode', action: 'set_step_mode' },
        { id: 'chatbot', label: '🤖 Enhanced Chatbot', action: 'open_chatbot' },
        { id: 'help', label: '❓ Learn More', action: 'show_help' }
      ]
    }

    setMessages([welcomeMessage])

    // Initialize agent statuses
    const initialAgents: AgentStatus[] = [
      {
        id: 'supervisor',
        name: 'Supervisor',
        type: 'supervisor',
        status: 'active',
        currentTask: 'Waiting for user input',
        progress: 0,
        capabilities: ['Workflow orchestration', 'Task delegation', 'Progress monitoring']
      },
      {
        id: 'data-analyst',
        name: 'Data Analyst',
        type: 'data-analyst',
        status: 'idle',
        currentTask: null,
        progress: 0,
        capabilities: ['Data quality assessment', 'Pattern detection', 'Statistical analysis']
      },
      {
        id: 'preprocessing',
        name: 'Preprocessing Specialist',
        type: 'preprocessing',
        status: 'idle',
        currentTask: null,
        progress: 0,
        capabilities: ['Data cleaning', 'Feature engineering', 'Outlier detection']
      },
      {
        id: 'model-trainer',
        name: 'Model Trainer',
        type: 'model-training',
        status: 'idle',
        currentTask: null,
        progress: 0,
        capabilities: ['Algorithm training', 'Hyperparameter tuning', 'Model evaluation']
      },
      {
        id: 'forecasting',
        name: 'Forecasting Specialist',
        type: 'forecasting',
        status: 'idle',
        currentTask: null,
        progress: 0,
        capabilities: ['Forecast generation', 'Confidence intervals', 'Result analysis']
      }
    ]

    setAgentStatuses(initialAgents)
  }

  const setupAgentListeners = () => {
    // Set up real-time agent status updates
    orchestrator.onAgentStatusChange((agentId: string, status: Partial<AgentStatus>) => {
      setAgentStatuses(prev => prev.map(agent =>
        agent.id === agentId ? { ...agent, ...status } : agent
      ))
    })

    // Set up workflow state updates
    orchestrator.onWorkflowStateChange((newState: WorkflowState) => {
      setWorkflowState(newState)
    })

    // Set up agent messages
    orchestrator.onAgentMessage((message: EnhancedChatMessage) => {
      addMessage(message)
    })
  }

  const addMessage = (message: Omit<EnhancedChatMessage, 'id' | 'timestamp'> & { id?: string }) => {
    const newMessage: EnhancedChatMessage = {
      ...message,
      id: message.id || Date.now().toString(),
      timestamp: new Date()
    }
    setMessages(prev => [...prev, newMessage])
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return

    // Add user message
    addMessage({
      type: 'user',
      content: inputValue
    })

    const userInput = inputValue
    setInputValue('')
    setIsProcessing(true)

    // Add an empty assistant message to stream into
    const assistantMessageId = Date.now().toString()
    addMessage({
      id: assistantMessageId,
      type: 'assistant',
      content: ''
    })

    try {
      // For general questions, use Gemini API directly
      await geminiClient.generateResponse(
        userInput,
        {
          messages,
          currentMode: mode,
          workflowState,
          agentStatuses
        },
        (chunk) => {
          setMessages(prev => prev.map(msg =>
            msg.id === assistantMessageId
              ? { ...msg, content: msg.content + chunk }
              : msg
          ))
        }
      )

    } catch (error) {
      addMessage({
        type: 'error',
        content: 'Sorry, I encountered an error processing your request. Please try again.'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleOptionClick = async (option: { id: string; label: string; action: string }) => {
    // Prevent duplication by checking if we're already processing
    if (isProcessing) return

    addMessage({
      type: 'user',
      content: option.label
    })

    await handleAction(option.action)
  }

  const handleAction = async (action: string, params?: any) => {
    setIsProcessing(true)

    try {
      switch (action) {
        case 'set_auto_mode':
          setMode('auto-execute')
          // Use a timeout to prevent duplication with orchestrator messages
          setTimeout(() => {
            addMessage({
              type: 'assistant',
              content: `⚡ **Auto-Execute Mode Activated!**

Perfect! I'll handle the entire forecasting process automatically using intelligent defaults and best practices. You can sit back and watch the magic happen!

**What happens next:**
- I'll analyze your data and make optimal preprocessing decisions
- Train multiple algorithms and select the best performer
- Generate forecasts with confidence intervals
- Provide comprehensive results and insights

Ready to upload your dataset and let me work my magic?`,
              agentId: 'supervisor',
              options: [
                { id: 'upload', label: '📎 Upload Dataset', action: 'upload_data' },
                { id: 'demo', label: '🎯 Try Demo Data', action: 'load_demo' }
              ]
            })
          }, 100)
          break

        case 'set_step_mode':
          setMode('step-by-step')
          // Use a timeout to prevent duplication with orchestrator messages
          setTimeout(() => {
            addMessage({
              type: 'assistant',
              content: `👥 **Step-by-Step Mode Activated!**

Excellent choice! I'll guide you through each step of the forecasting process, giving you full control and transparency. You'll be able to:

- Review and approve each processing step
- Customize parameters and methods
- See detailed explanations of what each agent is doing
- Make informed decisions at every stage

This mode is perfect for learning, experimentation, and when you need precise control over the process.

Ready to begin? Let's start by uploading your dataset!`,
              agentId: 'supervisor',
              options: [
                { id: 'upload', label: '📎 Upload Dataset', action: 'upload_data' },
                { id: 'demo', label: '🎯 Try Demo Data', action: 'load_demo' },
                { id: 'workflow', label: '📋 Show Workflow Plan', action: 'show_workflow' }
              ]
            })
          }, 100)
          break

        case 'upload_data':
          await handleDataUpload()
          break

        case 'load_demo':
          await handleDemoData()
          break

        case 'show_workflow':
          await handleShowWorkflow()
          break

        case 'show_plan':
          await handleShowPlan()
          break

        case 'show_help':
          await handleShowHelp()
          break

        case 'open_chatbot':
          window.open('/chatbot', '_blank')
          break

        case 'execute_plan':
          await handlePlanExecution()
          break

        case 'customize_all':
          await handleCustomizeAll()
          break

        default:
          // Delegate to orchestrator for complex actions
          await orchestrator.executeAction(action, params, mode)
      }
    } catch (error) {
      addMessage({
        type: 'error',
        content: `Failed to execute action: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDataUpload = async () => {
    addMessage({
      type: 'assistant',
      content: `📎 **Ready for Data Upload!**

Please upload your time series dataset. I support multiple formats and will analyze it immediately.

**Supported formats:** CSV, Excel (.xlsx), JSON, Parquet
**Maximum size:** 100MB
**Requirements:** Date column + numeric target variable

**Tips for best results:**
- Ensure your date column is clearly labeled
- Include any external variables (weather, marketing, etc.)
- Make sure data is in chronological order`,
      agentId: 'supervisor',
      showFileUpload: true
    })
  }

  const handleDemoData = async () => {
    addMessage({
      type: 'system',
      content: '🎯 Loading demo dataset...',
      agentId: 'data-analyst'
    })

    // Simulate demo data loading
    setTimeout(async () => {
      await orchestrator.loadDemoData(mode)
    }, 1000)
  }

  const handleShowWorkflow = async () => {
    setShowWorkflowPanel(true)
    addMessage({
      type: 'assistant',
      content: `📋 **Workflow Visualization Activated**

I've opened the workflow panel where you can see the complete forecasting process. Each step shows:

- Which agent will handle the task
- Estimated completion time
- Current status and progress
- Dependencies between steps

You can click on any step to see more details or customize parameters. The workflow adapts based on your data characteristics and preferences.`,
      agentId: 'supervisor'
    })
  }

  const handleShowPlan = async () => {
    setShowPlan(true)
    addMessage({
      type: 'assistant',
      content: `📋 **Detailed Execution Plan**

Perfect! I've opened the comprehensive execution plan where you can see every step in detail. This includes:

**🔧 Full Customization Options:**
- Algorithm selection (Prophet, XGBoost, LightGBM, CatBoost, ARIMA)
- Preprocessing methods and parameters
- Forecast horizons (1-365 days)
- Confidence intervals and scenarios
- Feature engineering options

**👥 Step-by-Step Control:**
- Review each step before execution
- Customize parameters for your specific needs
- Choose between different techniques
- Skip or modify any step

You can expand each step to see details and click the edit button to customize parameters. Ready to review the plan?`,
      agentId: 'supervisor',
      options: [
        { id: 'execute_plan', label: '🚀 Execute Plan', action: 'execute_plan' },
        { id: 'customize_all', label: '⚙️ Customize All Steps', action: 'customize_all' }
      ]
    })
  }

  const handleShowHelp = async () => {
    addMessage({
      type: 'assistant',
      content: `📚 **Enhanced Forecasting Assistant Guide**

**🎯 Two Powerful Modes:**

**⚡ Auto-Execute Mode:**
- Fully automated forecasting pipeline
- Intelligent parameter selection
- Best practices applied automatically
- Perfect for quick results and production workflows

**👥 Step-by-Step Mode:**
- Full control over every decision
- Review and approve each step
- Customize parameters and methods
- Ideal for learning and experimentation

**🤖 Your Agent Team:**

**🔍 Data Analyst:** Examines your data for quality, patterns, seasonality, and trends
**🧹 Preprocessing Specialist:** Cleans data, handles outliers, and engineers features
**🏋️ Model Trainer:** Trains multiple algorithms and optimizes performance
**📈 Forecasting Specialist:** Generates predictions with confidence intervals

**🔄 Real-Time Monitoring:**
- Watch agents work in real-time
- See progress bars and status updates
- Monitor workflow execution
- Get detailed insights at each step

Ready to experience the future of forecasting?`,
      agentId: 'supervisor',
      options: [
        { id: 'start_auto', label: '⚡ Start Auto Mode', action: 'set_auto_mode' },
        { id: 'start_step', label: '👥 Start Step Mode', action: 'set_step_mode' },
        { id: 'demo', label: '🎯 Try Demo', action: 'load_demo' }
      ]
    })
  }

  const handleFileUpload = async (file: File) => {
    addMessage({
      type: 'user',
      content: `📎 Uploaded: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`
    })

    // Start data analysis with the appropriate agent
    await orchestrator.analyzeUploadedData(file, mode)
  }

  const handleStepApproval = async (stepId: string, approved: boolean, customizations?: any) => {
    if (approved) {
      await orchestrator.executeStep(stepId, customizations)
    } else {
      await orchestrator.skipStep(stepId)
    }
  }

  const handleModeSwitch = (newMode: WorkflowMode) => {
    setMode(newMode)
    addMessage({
      type: 'system',
      content: `Switched to ${newMode === 'auto-execute' ? 'Auto-Execute' : 'Step-by-Step'} mode`
    })
  }

  const handlePlanExecution = async () => {
    addMessage({
      type: 'user',
      content: '🚀 Execute Plan'
    })

    setShowPlan(false)
    setIsProcessing(true)

    addMessage({
      type: 'assistant',
      content: `🚀 **Starting Plan Execution**

Excellent! I'll now execute the forecasting plan step by step. You can monitor the progress in real-time through the agent panel and workflow visualization.

Let's begin with data preprocessing...`,
      agentId: 'supervisor',
      options: [
        { id: 'continue_execution', label: '▶️ Continue', action: 'process_data' }
      ]
    })

    // Start the actual workflow execution
    setTimeout(async () => {
      await orchestrator.executeAction('preprocess_data', {}, mode)
      setIsProcessing(false)
    }, 1000)
  }

  const handleStepEdit = (stepId: number, changes: any) => {
    console.log(`Step ${stepId} updated:`, changes)

    addMessage({
      type: 'system',
      content: `✅ Step ${stepId} configuration updated successfully!`
    })
  }

  const handleClosePlan = () => {
    setShowPlan(false)

    addMessage({
      type: 'assistant',
      content: `📋 **Plan Review Complete**

Great! You've reviewed the execution plan. Would you like to proceed with the forecasting process or make any adjustments?`,
      agentId: 'supervisor',
      options: [
        { id: 'execute_plan', label: '🚀 Execute Plan', action: 'execute_plan' },
        { id: 'show_plan_again', label: '📋 Review Plan Again', action: 'show_plan' },
        { id: 'customize', label: '⚙️ Customize Settings', action: 'customize_preprocessing' }
      ]
    })
  }

  const handleCustomizeAll = async () => {
    addMessage({
      type: 'assistant',
      content: `⚙️ **Customization Mode Activated**

Perfect! You can now customize every aspect of the forecasting process. The detailed plan is open where you can:

**🔧 Algorithm Selection:**
- Choose specific models (Prophet, XGBoost, LightGBM, CatBoost, ARIMA)
- Configure hyperparameters
- Set training options

**📊 Preprocessing Options:**
- Outlier detection methods
- Feature engineering techniques
- Data scaling approaches

**📈 Forecasting Configuration:**
- Forecast horizon (1-365 days)
- Confidence intervals (80%, 95%)
- Scenario analysis options

Click the edit button (✏️) next to any step to customize its parameters. Each step shows you all available options and current settings.`,
      agentId: 'supervisor',
      options: [
        { id: 'execute_plan', label: '🚀 Execute When Ready', action: 'execute_plan' },
        { id: 'reset_defaults', label: '🔄 Reset to Defaults', action: 'reset_defaults' }
      ]
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors">
      {/* Enhanced Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Enhanced Forecasting Assistant</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">AI-powered agentic forecasting with real-time workflow</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Mode Indicator */}
            <div className="flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded-full">
              {mode === 'auto-execute' ? (
                <Zap className="w-4 h-4 text-orange-500" />
              ) : (
                <StepForward className="w-4 h-4 text-blue-500" />
              )}
              <span className="text-sm font-medium text-gray-700">
                {mode === 'auto-execute' ? 'Auto-Execute' : 'Step-by-Step'}
              </span>
            </div>

            {/* Panel Toggles */}
            <button
              onClick={() => setShowWorkflowPanel(!showWorkflowPanel)}
              className={`p-2 rounded-lg transition-colors ${showWorkflowPanel
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
            >
              <BarChart3 className="w-5 h-5" />
            </button>

            <button
              onClick={() => setShowAgentPanel(!showAgentPanel)}
              className={`p-2 rounded-lg transition-colors ${showAgentPanel
                ? 'bg-purple-100 text-purple-600'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
            >
              <Users className="w-5 h-5" />
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Settings className="w-5 h-5" />
            </button>

            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="mt-3">
          <ModeSelector
            currentMode={mode}
            onModeChange={handleModeSwitch}
            disabled={isProcessing}
          />
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Interface */}
        <div className={`${showPlan ? 'hidden lg:flex lg:w-1/3' : 'flex-1'} flex flex-col`}>
          <EnhancedChatInterface
            messages={messages}
            isProcessing={isProcessing}
            inputValue={inputValue}
            onInputChange={setInputValue}
            onSendMessage={handleSendMessage}
            onOptionClick={handleOptionClick}
            onFileUpload={handleFileUpload}
            onStepApproval={handleStepApproval}
            mode={mode}
          />
        </div>

        {/* Detailed Plan Panel */}
        {showPlan && (
          <div className={`${showPlan ? 'w-full lg:w-2/3' : 'w-96'} border-l border-gray-200 bg-white flex flex-col overflow-hidden`}>
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Detailed Execution Plan</h3>
              <p className="text-sm text-gray-600">Review and customize each step before execution</p>
            </div>

            <div className="flex-1 overflow-y-auto">
              <ForecastingPlan
                onStartExecution={handlePlanExecution}
                onStepEdit={handleStepEdit}
                onClose={handleClosePlan}
              />
            </div>
          </div>
        )}

        {/* Workflow Panel */}
        {showWorkflowPanel && workflowState && (
          <div className="w-96 border-l border-gray-200 bg-white">
            <EnhancedWorkflowVisualization
              workflowState={workflowState}
              agentStatuses={agentStatuses}
              mode={mode}
              onStepClick={(stepId) => handleStepApproval(stepId, true)}
              onStepEdit={(stepId, changes) => console.log('Step edited:', stepId, changes)}
            />
          </div>
        )}

        {/* Agent Status Panel */}
        {showAgentPanel && !showPlan && (
          <div className="w-72 border-l border-gray-200 bg-white">
            <AgentStatusPanel
              agents={agentStatuses}
              onAgentClick={(agentId) => console.log('Agent clicked:', agentId)}
            />
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </div>
  )
}

// Main component with theme provider
export default function EnhancedForecastingChatbot() {
  return <EnhancedForecastingChatbotInner />
}