'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Bot, 
  Send,
  Paperclip,
  Users,
  Activity,
  Settings,
  HelpCircle,
  Zap,
  StepForward,
  Upload,
  Play,
  Pause,
  BarChart3,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertCircle,
  Workflow,
  Sliders
} from 'lucide-react'
import { chatbotAPI, formatFileSize, isValidFileType, getFileTypeIcon } from '../utils/chatbotApi'
import ConfigurationModal from '../components/ConfigurationModal'
import EnhancedWorkflowPanel from '../components/EnhancedWorkflowPanel'
import SystemStatsPanel from '../components/SystemStatsPanel'

// Types for our enhanced chatbot
interface ChatMessage {
  id: string
  type: 'user' | 'assistant' | 'system' | 'agent' | 'error'
  content: string
  timestamp: Date
  agentId?: string
  workflowStep?: string
  requiresApproval?: boolean
  approved?: boolean
  options?: Array<{
    id: string
    label: string
    action: string
  }>
  showFileUpload?: boolean
  metadata?: Record<string, any>
}

interface AgentStatus {
  id: string
  name: string
  type: string
  status: 'idle' | 'busy' | 'completed' | 'error' | 'paused'
  currentTask?: string
  progress: number
  capabilities: string[]
  lastActivity?: string
}

interface SessionInfo {
  sessionId: string
  userId?: string
  userType: string
  createdAt: string
  preferences: Record<string, any>
}

export default function EnhancedChatbotPage() {
  // Core state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null)
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>([])
  
  // UI state
  const [showAgentPanel, setShowAgentPanel] = useState(true)
  const [showWorkflowPanel, setShowWorkflowPanel] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [showSystemStats, setShowSystemStats] = useState(false)
  const [userType, setUserType] = useState<'business' | 'analyst' | 'data_scientist' | 'developer'>('business')
  const [workflowData, setWorkflowData] = useState<any>(null)
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  
  // Use the API client
  const apiClient = chatbotAPI

  useEffect(() => {
    initializeSession()
    setupWebSocket()
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const initializeSession = async () => {
    try {
      // Create a new session using API client
      const sessionData = await apiClient.createSession({
        user_type: userType
      })
      
      setSessionInfo(sessionData)
        
        // Add welcome message
        addMessage({
          type: 'assistant',
          content: `🚀 **Welcome to the Enhanced Agentic Forecasting Assistant!**

I'm your AI-powered forecasting companion with a team of specialized agents ready to help you create accurate predictions from your time series data.

**🤖 My Agent Team:**
- **Data Analyst**: Analyzes your data quality and patterns
- **Preprocessing Specialist**: Cleans and prepares your data
- **Model Trainer**: Trains and optimizes forecasting algorithms
- **Model Evaluator**: Evaluates performance and compares models
- **Forecasting Specialist**: Generates predictions and insights

**🎯 What would you like to do?**
- Upload your dataset for analysis
- Ask questions about forecasting
- Learn about time series analysis
- Get help with data preparation

Just type your question or request, and I'll coordinate with my agent team to help you!`,
          agentId: 'supervisor',
          options: [
            { id: 'upload', label: '📎 Upload Dataset', action: 'upload_data' },
            { id: 'demo', label: '🎯 Try Demo Data', action: 'load_demo' },
            { id: 'help', label: '❓ Learn More', action: 'show_help' },
            { id: 'question', label: '💬 Ask a Question', action: 'ask_question' }
          ]
        })

      // Load agent statuses
      loadAgentStatuses()
    } catch (error) {
      console.error('Failed to initialize session:', error)
      addMessage({
        type: 'error',
        content: 'Failed to connect to the forecasting service. Please refresh the page and try again.'
      })
    }
  }

  const setupWebSocket = () => {
    if (!sessionInfo?.sessionId) return

    try {
      const ws = apiClient.createWebSocket(sessionInfo.sessionId)
      
      ws.onopen = () => {
        console.log('WebSocket connected')
      }
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        handleWebSocketMessage(data)
      }
      
      ws.onclose = () => {
        console.log('WebSocket disconnected')
        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          if (sessionInfo?.sessionId) {
            setupWebSocket()
          }
        }, 3000)
      }
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }
      
      wsRef.current = ws
    } catch (error) {
      console.error('Failed to setup WebSocket:', error)
    }
  }

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'chat_response':
        // Handle real-time chat responses
        break
      case 'agent_status_update':
        updateAgentStatus(data.agentId, data.status)
        break
      case 'task_progress':
        updateTaskProgress(data.taskId, data.progress)
        break
      case 'workflow_update':
        handleWorkflowUpdate(data.workflow)
        break
    }
  }

  const loadAgentStatuses = async () => {
    try {
      const agents = await apiClient.getAgentStatuses()
      setAgentStatuses(agents)
    } catch (error) {
      console.error('Failed to load agent statuses:', error)
    }
  }

  const updateAgentStatus = (agentId: string, status: Partial<AgentStatus>) => {
    setAgentStatuses(prev => prev.map(agent => 
      agent.id === agentId ? { ...agent, ...status } : agent
    ))
  }

  const updateTaskProgress = (taskId: string, progress: number) => {
    // Update UI with task progress
    console.log(`Task ${taskId} progress: ${progress}%`)
  }

  const handleWorkflowUpdate = (workflow: any) => {
    // Handle workflow state updates
    console.log('Workflow update:', workflow)
  }

  const addMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'> & { id?: string }) => {
    const newMessage: ChatMessage = {
      ...message,
      id: message.id || Date.now().toString(),
      timestamp: new Date()
    }
    setMessages(prev => [...prev, newMessage])
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing || !sessionInfo) return

    // Add user message
    addMessage({
      type: 'user',
      content: inputValue
    })

    const userInput = inputValue
    setInputValue('')
    setIsProcessing(true)

    try {
      // Send message to backend using API client
      const chatResponse = await apiClient.sendMessage({
        message: userInput,
        session_id: sessionInfo.sessionId,
        user_type: userType
      })
        
        // Add assistant response
        addMessage({
          type: 'assistant',
          content: chatResponse.response,
          agentId: chatResponse.agent_id,
          workflowStep: chatResponse.workflow_step,
          requiresApproval: chatResponse.requires_approval,
          options: chatResponse.interactive_elements?.filter((el: any) => el.type === 'button')
            .map((el: any) => ({
              id: el.id,
              label: el.label,
              action: el.action
            })),
          showFileUpload: chatResponse.interactive_elements?.some((el: any) => el.type === 'file_upload'),
          metadata: chatResponse.metadata
        })

      // Update agent statuses if provided
      if (chatResponse.agent_status && chatResponse.agent_status.length > 0) {
        setAgentStatuses(chatResponse.agent_status)
      }
    } catch (error) {
      console.error('Chat error:', error)
      addMessage({
        type: 'error',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleOptionClick = async (option: { id: string; label: string; action: string }) => {
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
        case 'upload_data':
          fileInputRef.current?.click()
          break
        case 'load_demo':
          await handleDemoData()
          break
        case 'show_help':
          await handleShowHelp()
          break
        case 'ask_question':
          addMessage({
            type: 'assistant',
            content: `💬 **Ask Me Anything!**

I'm here to help with all your forecasting questions. You can ask me about:

**📊 Time Series Analysis:**
- Trend analysis and seasonality detection
- Data preprocessing and feature engineering
- Handling missing values and outliers

**🤖 Machine Learning:**
- Algorithm selection (Prophet, XGBoost, ARIMA, LightGBM)
- Model evaluation and comparison
- Hyperparameter tuning strategies

**📈 Business Forecasting:**
- Demand forecasting best practices
- Sales prediction techniques
- Inventory planning and optimization

**🔧 Technical Implementation:**
- Data format requirements
- API integration
- Model deployment strategies

Just type your question and I'll provide detailed, expert guidance!`,
            agentId: 'supervisor'
          })
          break

        case 'start_workflow':
          if (workflowData) {
            setWorkflowData({
              ...workflowData,
              status: 'running',
              currentStep: 'preprocessing'
            })
            addMessage({
              type: 'assistant',
              content: `🚀 **Workflow Started!**

I've initiated the forecasting workflow. You can monitor the progress in the workflow panel on the right.

**Current Status:**
- ✅ Data Analysis: Complete
- 🔄 Preprocessing: Starting now
- ⏳ Model Training: Queued
- ⏳ Evaluation: Queued  
- ⏳ Forecasting: Queued

The preprocessing agent is now cleaning your data and engineering features. This should take about 2 minutes.`,
              agentId: 'supervisor'
            })
          }
          break

        case 'customize_workflow':
          addMessage({
            type: 'assistant',
            content: `⚙️ **Workflow Customization**

Great! You can now customize each step in the workflow panel. Here's what you can adjust:

**🔍 Data Analysis:**
- Analysis depth (basic, comprehensive, detailed)
- Pattern detection sensitivity
- Statistical confidence levels

**🧹 Preprocessing:**
- Outlier detection methods (IQR, Isolation Forest, Z-score)
- Feature engineering options
- Scaling techniques (Standard, Robust, MinMax)

**🤖 Model Training:**
- Algorithm selection (Prophet, XGBoost, LightGBM, CatBoost, ARIMA)
- Cross-validation strategy
- Hyperparameter tuning intensity

**📊 Evaluation:**
- Metrics to calculate (MAPE, MAE, RMSE, R²)
- Confidence levels
- Validation methods

**📈 Forecasting:**
- Forecast horizon (1-365 days)
- Confidence intervals (80%, 90%, 95%)
- Component decomposition

Click the edit button (✏️) next to any step to customize its parameters!`,
              agentId: 'supervisor'
            })
          break
        default:
          // Send action to backend using API client
          const result = await apiClient.sendMessage({
            message: `Execute action: ${action}`,
            session_id: sessionInfo?.sessionId || '',
            user_type: userType,
            context: { action, params }
          })
          
          addMessage({
            type: 'assistant',
            content: result.response,
            agentId: result.metadata?.agent_id,
            metadata: result.metadata
          })
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !sessionInfo) return

    // Validate file type
    if (!isValidFileType(file)) {
      addMessage({
        type: 'error',
        content: 'Please upload a valid file format: CSV, Excel (.xlsx), JSON, or Parquet'
      })
      return
    }

    addMessage({
      type: 'user',
      content: `${getFileTypeIcon(file.name)} Uploaded: ${file.name} (${formatFileSize(file.size)})`
    })

    setIsProcessing(true)

    try {
      const result = await apiClient.uploadFile(file, sessionInfo.sessionId)
      
      addMessage({
        type: 'assistant',
        content: result.message || 'File uploaded successfully! Let me analyze your data...',
        agentId: 'data-analyst'
      })

      // Trigger data analysis
      setTimeout(() => {
        handleAction('analyze_uploaded_data')
      }, 1000)
    } catch (error) {
      addMessage({
        type: 'error',
        content: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    } finally {
      setIsProcessing(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDemoData = async () => {
    addMessage({
      type: 'system',
      content: '🎯 Loading demo dataset...',
      agentId: 'data-analyst'
    })

    // Create mock workflow data
    const mockWorkflow = {
      id: 'demo-workflow-001',
      name: 'Demo Forecasting Workflow',
      status: 'idle' as const,
      progress: 0,
      currentStep: undefined,
      steps: [
        {
          id: 'data-analysis',
          name: 'Data Quality Analysis',
          description: 'Analyze data quality, patterns, and characteristics',
          agent: 'data-analyst',
          status: 'completed' as const,
          progress: 100,
          estimatedTime: 45,
          actualTime: 38,
          dependencies: [],
          parameters: {
            analysis_depth: 'comprehensive',
            include_patterns: true,
            detect_seasonality: true
          },
          results: {
            quality_score: 0.95,
            patterns_found: ['weekly_seasonality', 'upward_trend'],
            recommendations: ['No preprocessing needed', 'Ready for modeling']
          }
        },
        {
          id: 'preprocessing',
          name: 'Data Preprocessing',
          description: 'Clean data and engineer features',
          agent: 'preprocessing',
          status: 'pending' as const,
          progress: 0,
          estimatedTime: 120,
          dependencies: ['data-analysis'],
          parameters: {
            handle_outliers: true,
            create_features: true,
            scaling_method: 'robust'
          }
        },
        {
          id: 'model-training',
          name: 'Model Training',
          description: 'Train multiple forecasting algorithms',
          agent: 'model-trainer',
          status: 'pending' as const,
          progress: 0,
          estimatedTime: 300,
          dependencies: ['preprocessing'],
          parameters: {
            algorithms: ['prophet', 'xgboost', 'lightgbm'],
            cross_validation: true,
            hyperparameter_tuning: true
          }
        },
        {
          id: 'evaluation',
          name: 'Model Evaluation',
          description: 'Evaluate and compare model performance',
          agent: 'evaluator',
          status: 'pending' as const,
          progress: 0,
          estimatedTime: 90,
          dependencies: ['model-training'],
          parameters: {
            metrics: ['mape', 'mae', 'rmse'],
            confidence_level: 0.95
          }
        },
        {
          id: 'forecasting',
          name: 'Generate Forecast',
          description: 'Create forecasts with confidence intervals',
          agent: 'forecaster',
          status: 'pending' as const,
          progress: 0,
          estimatedTime: 60,
          dependencies: ['evaluation'],
          parameters: {
            horizon: 30,
            confidence_intervals: [0.8, 0.95],
            include_components: true
          }
        }
      ]
    }

    setWorkflowData(mockWorkflow)
    setShowWorkflowPanel(true)

    // Simulate demo data loading
    setTimeout(() => {
      addMessage({
        type: 'assistant',
        content: `📊 **Demo Dataset Loaded Successfully!**

I've loaded a sample retail sales dataset and created a comprehensive forecasting workflow for you.

**📈 Data Overview:**
- **Time Range**: 2 years of daily sales data
- **Records**: 730 data points
- **Features**: Date, Sales, Promotions, Weather, Holidays
- **Patterns**: Strong weekly seasonality, holiday effects, weather correlation

**🔍 Initial Analysis Complete:**
- **Trend**: Steady upward growth (~5% annually)
- **Seasonality**: Clear weekly patterns (weekends higher)
- **Quality**: No missing values, minimal outliers
- **Stationarity**: Non-stationary (trending)

**🚀 Workflow Created:**
I've set up a complete 5-step workflow in the workflow panel. You can:
- View detailed step parameters
- Customize each step before execution
- Monitor real-time progress
- Control workflow execution

What would you like to do next?`,
        agentId: 'data-analyst',
        options: [
          { id: 'start_workflow', label: '🚀 Start Workflow', action: 'start_workflow' },
          { id: 'customize_workflow', label: '⚙️ Customize Steps', action: 'customize_workflow' },
          { id: 'analyze_more', label: '🔍 Detailed Analysis', action: 'detailed_analysis' }
        ]
      })
    }, 2000)
  }

  const handleShowHelp = async () => {
    addMessage({
      type: 'assistant',
      content: `📚 **Enhanced Forecasting Assistant Guide**

**🎯 What I Can Do:**

**📊 Data Analysis & Preparation:**
- Upload and analyze your time series data
- Detect patterns, trends, and seasonality
- Clean data and handle missing values
- Engineer features for better predictions

**🤖 Model Training & Evaluation:**
- Train multiple algorithms (Prophet, XGBoost, LightGBM, ARIMA)
- Compare model performance automatically
- Tune hyperparameters for optimal results
- Provide detailed evaluation metrics

**📈 Forecasting & Insights:**
- Generate accurate predictions with confidence intervals
- Create scenario-based forecasts
- Explain forecast drivers and key factors
- Export results in multiple formats

**🔄 Real-Time Monitoring:**
- Watch my agent team work in real-time
- See progress updates and status changes
- Monitor workflow execution
- Get detailed insights at each step

**💬 Natural Conversation:**
- Ask questions in plain English
- Get expert guidance on forecasting topics
- Receive personalized recommendations
- Interactive step-by-step guidance

**🚀 Getting Started:**
1. Upload your time series data (CSV, Excel, JSON)
2. Let me analyze patterns and quality
3. Choose preprocessing options
4. Train and compare multiple models
5. Generate forecasts and insights

Ready to create amazing forecasts together?`,
      agentId: 'supervisor',
      options: [
        { id: 'upload', label: '📎 Upload Data', action: 'upload_data' },
        { id: 'demo', label: '🎯 Try Demo', action: 'load_demo' },
        { id: 'question', label: '💬 Ask Question', action: 'ask_question' }
      ]
    })
  }

  const handleApproval = async (messageId: string, approved: boolean) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, approved } : msg
    ))

    if (approved) {
      addMessage({
        type: 'system',
        content: '✅ Step approved - proceeding with execution...'
      })
    } else {
      addMessage({
        type: 'system',
        content: '❌ Step declined - workflow paused'
      })
    }
  }

  const getAgentStatusIcon = (status: string) => {
    switch (status) {
      case 'busy': return <Activity className="w-4 h-4 text-blue-500 animate-pulse" />
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'paused': return <Pause className="w-4 h-4 text-yellow-500" />
      default: return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Enhanced Forecasting Assistant</h1>
                <p className="text-sm text-gray-500">AI-powered agentic forecasting with real-time workflow</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {sessionInfo && (
                <div className="text-sm text-gray-500">
                  Session: {sessionInfo.sessionId.substring(0, 8)}...
                </div>
              )}
              
              <button
                onClick={() => setShowAgentPanel(!showAgentPanel)}
                className={`p-2 rounded-lg transition-colors ${
                  showAgentPanel 
                    ? 'bg-purple-100 text-purple-600' 
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Users className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => setShowWorkflowPanel(!showWorkflowPanel)}
                className={`p-2 rounded-lg transition-colors ${
                  showWorkflowPanel 
                    ? 'bg-green-100 text-green-600' 
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Workflow className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => setShowSystemStats(!showSystemStats)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <BarChart3 className="w-5 h-5" />
              </button>
              
              <button 
                onClick={() => setShowConfigModal(true)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <Settings className="w-5 h-5" />
              </button>
              
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-3xl ${message.type === 'user' ? 'ml-12' : 'mr-12'}`}>
                  {/* Message Header */}
                  {message.type !== 'user' && (
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {message.agentId ? message.agentId.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Assistant'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>
                  )}

                  {/* Message Content */}
                  <div className={`rounded-lg p-4 ${
                    message.type === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : message.type === 'error'
                      ? 'bg-red-50 text-red-800 border border-red-200'
                      : message.type === 'system'
                      ? 'bg-gray-100 text-gray-700'
                      : 'bg-white border border-gray-200'
                  }`}>
                    <div className="prose prose-sm max-w-none">
                      {message.content.split('\n').map((line, index) => (
                        <div key={index} className={message.type === 'user' ? 'text-white' : ''}>
                          {line.startsWith('**') && line.endsWith('**') ? (
                            <strong>{line.slice(2, -2)}</strong>
                          ) : line.startsWith('- ') ? (
                            <div className="ml-4">• {line.slice(2)}</div>
                          ) : (
                            line
                          )}
                        </div>
                      ))}
                    </div>

                    {/* File Upload */}
                    {message.showFileUpload && (
                      <div className="mt-4">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv,.xlsx,.json,.parquet"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          <Upload className="w-4 h-4" />
                          <span>Choose File</span>
                        </button>
                      </div>
                    )}

                    {/* Options */}
                    {message.options && message.options.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {message.options.map((option) => (
                          <button
                            key={option.id}
                            onClick={() => handleOptionClick(option)}
                            disabled={isProcessing}
                            className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Approval Buttons */}
                    {message.requiresApproval && message.approved === undefined && (
                      <div className="mt-4 flex space-x-2">
                        <button
                          onClick={() => handleApproval(message.id, true)}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                        >
                          ✅ Approve
                        </button>
                        <button
                          onClick={() => handleApproval(message.id, false)}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        >
                          ❌ Decline
                        </button>
                      </div>
                    )}
                  </div>

                  {/* User message timestamp */}
                  {message.type === 'user' && (
                    <div className="text-right mt-1">
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="max-w-3xl mr-12">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Assistant</span>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <span className="text-sm text-gray-500 ml-2">Processing...</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask me anything about forecasting..."
                disabled={isProcessing}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isProcessing}
              className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Workflow Panel */}
      {showWorkflowPanel && workflowData && (
        <EnhancedWorkflowPanel
          workflow={workflowData}
          onStepEdit={(stepId, parameters) => {
            console.log('Step edited:', stepId, parameters)
            // Handle step parameter updates
          }}
          onWorkflowControl={(action) => {
            console.log('Workflow control:', action)
            // Handle workflow control actions
          }}
          onStepControl={(stepId, action) => {
            console.log('Step control:', stepId, action)
            // Handle individual step control
          }}
        />
      )}

      {/* Agent Status Panel */}
      {showAgentPanel && !showWorkflowPanel && (
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Agent Team Status</h3>
            <p className="text-sm text-gray-600">Real-time agent monitoring</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {agentStatuses.map((agent) => (
              <div key={agent.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getAgentStatusIcon(agent.status)}
                    <span className="font-medium text-gray-900">{agent.name}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    agent.status === 'busy' ? 'bg-blue-100 text-blue-700' :
                    agent.status === 'completed' ? 'bg-green-100 text-green-700' :
                    agent.status === 'error' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {agent.status}
                  </span>
                </div>
                
                {agent.currentTask && (
                  <div className="text-sm text-gray-600 mb-2">
                    {agent.currentTask}
                  </div>
                )}
                
                {agent.progress > 0 && (
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progress</span>
                      <span>{agent.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${agent.progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                
                <div className="text-xs text-gray-500">
                  <div className="font-medium mb-1">Capabilities:</div>
                  <ul className="space-y-1">
                    {agent.capabilities.slice(0, 3).map((capability, index) => (
                      <li key={index}>• {capability}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Stats Panel */}
      <SystemStatsPanel
        isOpen={showSystemStats}
        onClose={() => setShowSystemStats(false)}
      />

      {/* Configuration Modal */}
      <ConfigurationModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onSave={(config) => {
          console.log('Configuration saved:', config)
          // Apply configuration changes
          if (config.geminiApiKey) {
            localStorage.setItem('gemini_api_key', config.geminiApiKey)
          }
        }}
      />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.json,.parquet"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  )
}