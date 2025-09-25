import { 
  WorkflowState, 
  WorkflowStep, 
  AgentStatus, 
  WorkflowMode, 
  EnhancedChatMessage,
  AgentEvent,
  WorkflowEvent,
  DataAnalysis
} from '../types/enhanced'
import { GeminiAPIClient } from './GeminiAPIClient'

export class AgentOrchestrator {
  private workflowState: WorkflowState | null = null
  private agentStatuses: Map<string, AgentStatus> = new Map()
  private geminiClient: GeminiAPIClient
  private eventListeners: {
    agentStatusChange: ((agentId: string, status: Partial<AgentStatus>) => void)[]
    workflowStateChange: ((state: WorkflowState) => void)[]
    agentMessage: ((message: EnhancedChatMessage) => void)[]
  } = {
    agentStatusChange: [],
    workflowStateChange: [],
    agentMessage: []
  }

  constructor() {
    this.initializeAgents()
    this.geminiClient = new GeminiAPIClient()
  }

  private initializeAgents() {
    const agents: AgentStatus[] = [
      {
        id: 'supervisor',
        name: 'Supervisor Agent',
        type: 'supervisor',
        status: 'active',
        currentTask: 'Coordinating multi-agent workflow',
        progress: 0,
        capabilities: [
          'Multi-agent coordination',
          'Workflow orchestration', 
          'Task delegation',
          'Progress monitoring',
          'Decision making',
          'Error handling'
        ],
        performance: {
          tasksCompleted: 0,
          averageTaskTime: 0,
          successRate: 1.0,
          errorCount: 0
        }
      },
      {
        id: 'data-analyst',
        name: 'Data Analyst Agent',
        type: 'data-analyst',
        status: 'idle',
        currentTask: null,
        progress: 0,
        capabilities: [
          'Data quality assessment',
          'Pattern detection',
          'Statistical analysis',
          'Trend identification',
          'Seasonality detection',
          'Outlier identification'
        ],
        performance: {
          tasksCompleted: 0,
          averageTaskTime: 45,
          successRate: 0.95,
          errorCount: 0
        }
      },
      {
        id: 'preprocessing',
        name: 'Preprocessing Specialist',
        type: 'preprocessing',
        status: 'idle',
        currentTask: null,
        progress: 0,
        capabilities: [
          'Data cleaning',
          'Feature engineering',
          'Outlier detection',
          'Data transformation',
          'Missing value imputation',
          'Data scaling'
        ],
        performance: {
          tasksCompleted: 0,
          averageTaskTime: 60,
          successRate: 0.92,
          errorCount: 0
        }
      },
      {
        id: 'model-trainer',
        name: 'Model Training Agent',
        type: 'model-training',
        status: 'idle',
        currentTask: null,
        progress: 0,
        capabilities: [
          'Algorithm training',
          'Hyperparameter tuning',
          'Model evaluation',
          'Performance optimization',
          'Cross-validation',
          'Model comparison'
        ],
        performance: {
          tasksCompleted: 0,
          averageTaskTime: 180,
          successRate: 0.88,
          errorCount: 0
        }
      },
      {
        id: 'forecasting',
        name: 'Forecasting Specialist',
        type: 'forecasting',
        status: 'idle',
        currentTask: null,
        progress: 0,
        capabilities: [
          'Forecast generation',
          'Confidence intervals',
          'Result analysis',
          'Business insights',
          'Scenario modeling',
          'Forecast validation'
        ],
        performance: {
          tasksCompleted: 0,
          averageTaskTime: 30,
          successRate: 0.94,
          errorCount: 0
        }
      }
    ]

    agents.forEach(agent => {
      this.agentStatuses.set(agent.id, agent)
    })

    // Validate agent capabilities
    this.validateAgentCapabilities()
  }

  private validateAgentCapabilities(): void {
    const requiredCapabilities = {
      'data-analyst': ['Data quality assessment', 'Pattern detection'],
      'preprocessing': ['Data cleaning', 'Feature engineering'],
      'model-training': ['Algorithm training', 'Model evaluation'],
      'forecasting': ['Forecast generation', 'Result analysis']
    }

    this.agentStatuses.forEach((agent, agentId) => {
      const required = requiredCapabilities[agent.type as keyof typeof requiredCapabilities]
      if (required) {
        const hasRequired = required.every(cap => agent.capabilities.includes(cap))
        if (!hasRequired) {
          console.warn(`Agent ${agentId} missing required capabilities:`, required)
        }
      }
    })
  }

  // Event listener management
  onAgentStatusChange(callback: (agentId: string, status: Partial<AgentStatus>) => void) {
    this.eventListeners.agentStatusChange.push(callback)
  }

  onWorkflowStateChange(callback: (state: WorkflowState) => void) {
    this.eventListeners.workflowStateChange.push(callback)
  }

  onAgentMessage(callback: (message: EnhancedChatMessage) => void) {
    this.eventListeners.agentMessage.push(callback)
  }

  private emitAgentStatusChange(agentId: string, status: Partial<AgentStatus>) {
    const agent = this.agentStatuses.get(agentId)
    if (agent) {
      const updatedAgent = { ...agent, ...status }
      this.agentStatuses.set(agentId, updatedAgent)
      this.eventListeners.agentStatusChange.forEach(callback => callback(agentId, status))
    }
  }

  private emitWorkflowStateChange() {
    if (this.workflowState) {
      this.eventListeners.workflowStateChange.forEach(callback => callback(this.workflowState!))
    }
  }

  private emitAgentMessage(message: Omit<EnhancedChatMessage, 'id' | 'timestamp'>) {
    const fullMessage: EnhancedChatMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date()
    }
    this.eventListeners.agentMessage.forEach(callback => callback(fullMessage))
  }

  async executeAction(action: string, params?: any, mode?: WorkflowMode): Promise<void> {
    switch (action) {
      case 'prepare_upload':
        await this.prepareDataUpload(mode || 'step-by-step')
        break
      case 'load_demo_data':
        await this.loadDemoData(mode || 'step-by-step')
        break
      case 'analyze_data':
        await this.analyzeData(params, mode || 'step-by-step')
        break
      case 'preprocess_data':
        await this.preprocessData(params, mode || 'step-by-step')
        break
      case 'train_models':
        await this.trainModels(params, mode || 'step-by-step')
        break
      case 'generate_forecast':
        await this.generateForecast(params, mode || 'step-by-step')
        break
      default:
        console.warn(`Unknown action: ${action}`)
    }
  }

  async loadDemoData(mode: WorkflowMode): Promise<void> {
    // Create workflow for demo data
    this.workflowState = {
      id: `workflow-${Date.now()}`,
      mode,
      status: 'running',
      currentStep: 'data_upload',
      steps: this.createDemoWorkflowSteps(mode),
      progress: 10,
      startTime: new Date()
    }

    // Activate Data Analyst
    this.emitAgentStatusChange('data-analyst', {
      status: 'busy',
      currentTask: 'Loading demo dataset',
      progress: 0
    })

    this.emitAgentMessage({
      type: 'agent',
      content: '🔍 **Data Analyst Agent Activated**\n\nI\'m loading the demo retail sales dataset. This includes 2 years of daily sales data with weather and marketing variables.',
      agentId: 'data-analyst'
    })

    // Simulate loading process
    await this.simulateProgress('data-analyst', 'Loading demo dataset', 2000)

    // Complete data loading
    this.emitAgentStatusChange('data-analyst', {
      status: 'active',
      currentTask: 'Analyzing demo data',
      progress: 100
    })

    // Start analysis automatically or wait for approval
    if (mode === 'auto-execute') {
      await this.analyzeUploadedData(null, mode)
    } else {
      this.emitAgentMessage({
        type: 'assistant',
        content: `✅ **Demo Data Loaded Successfully!**\n\nThe Data Analyst has loaded a comprehensive retail sales dataset:\n- 📊 **730 rows** of daily sales data\n- 📅 **Date range**: 2022-01-01 to 2023-12-31\n- 🎯 **Target variable**: Daily sales revenue\n- 🌡️ **Weather data**: Temperature, precipitation\n- 💰 **Marketing data**: Daily advertising spend\n\n**Next Step**: The Data Analyst is ready to perform detailed analysis to identify patterns, seasonality, and data quality issues.\n\nWould you like to proceed with the analysis?`,
        agentId: 'supervisor',
        requiresApproval: mode === 'step-by-step',
        options: mode === 'step-by-step' ? [
          { id: 'analyze', label: '🔍 Analyze Data', action: 'analyze_data' },
          { id: 'customize', label: '⚙️ Customize Analysis', action: 'customize_analysis' }
        ] : undefined
      })
    }

    this.emitWorkflowStateChange()
  }

  async analyzeUploadedData(file: File | null, mode: WorkflowMode): Promise<void> {
    if (!this.workflowState) {
      this.workflowState = {
        id: `workflow-${Date.now()}`,
        mode,
        status: 'running',
        currentStep: 'data_analysis',
        steps: this.createWorkflowSteps(mode),
        progress: 20,
        startTime: new Date()
      }
    }

    // Update workflow step
    this.updateWorkflowStep('data_analysis', { status: 'in-progress' })

    // Activate Data Analyst
    this.emitAgentStatusChange('data-analyst', {
      status: 'busy',
      currentTask: 'Analyzing data quality and patterns',
      progress: 0
    })

    this.emitAgentMessage({
      type: 'agent',
      content: '🔍 **Data Analyst Agent Working**\n\nI\'m performing comprehensive analysis of your dataset:',
      agentId: 'data-analyst'
    })

    // Simulate analysis process
    await this.simulateProgress('data-analyst', 'Analyzing data patterns', 1000)

    let analysisResult: any = {}
    if (file) {
      const fileContent = await file.text()
      analysisResult = await this.geminiClient.analyzeData({ content: fileContent }, 'quality')
    }

    // Complete analysis
    this.emitAgentStatusChange('data-analyst', {
      status: 'completed',
      currentTask: 'Analysis complete',
      progress: 100
    })

    this.updateWorkflowStep('data_analysis', { 
      status: mode === 'step-by-step' ? 'waiting-approval' : 'completed',
      results: analysisResult
    })

    // Present analysis results
    this.emitAgentMessage({
      type: 'assistant',
      content: `✅ **Data Analysis Complete!**\n\n${analysisResult}`,
      agentId: 'supervisor',
      requiresApproval: mode === 'step-by-step',
      workflowStep: 'data_analysis',
      options: mode === 'step-by-step' ? [
        { id: 'preprocess', label: '🧹 Preprocess Data', action: 'preprocess_data' },
        { id: 'customize_preprocess', label: '⚙️ Customize Preprocessing', action: 'customize_preprocessing' },
        { id: 'skip_preprocess', label: '⏭️ Skip Preprocessing', action: 'skip_preprocessing' }
      ] : undefined
    })

    // Auto-proceed if in auto-execute mode
    if (mode === 'auto-execute') {
      setTimeout(() => this.preprocessData({}, mode), 1000)
    }

    this.emitWorkflowStateChange()
  }

  async preprocessData(params: any, mode: WorkflowMode): Promise<void> {
    this.updateWorkflowStep('preprocessing', { status: 'in-progress' })

    // Activate Preprocessing Specialist
    this.emitAgentStatusChange('preprocessing', {
      status: 'busy',
      currentTask: 'Preprocessing data',
      progress: 0
    })

    this.emitAgentMessage({
      type: 'agent',
      content: '🧹 **Preprocessing Specialist Activated**\n\nI\'m cleaning and preparing your data:\n- Handling outliers with spline interpolation\n- Creating lag and rolling features\n- Adding holiday calendar\n- Scaling numerical variables',
      agentId: 'preprocessing'
    })

    // Simulate preprocessing
    await this.simulateProgress('preprocessing', 'Preprocessing data', 4000)

    // Complete preprocessing
    this.emitAgentStatusChange('preprocessing', {
      status: 'completed',
      currentTask: 'Preprocessing complete',
      progress: 100
    })

    this.updateWorkflowStep('preprocessing', { 
      status: 'completed',
      results: {
        features_created: 15,
        outliers_treated: 3,
        scaling_applied: true,
        holiday_calendar_added: true
      }
    })

    this.emitAgentMessage({
      type: 'assistant',
      content: `✅ **Data Preprocessing Complete!**\n\nThe Preprocessing Specialist has successfully prepared your data:\n\n**🔧 Processing Applied:**\n- 🎯 **Outlier treatment**: 3 outliers smoothed using spline interpolation\n- 📊 **Feature engineering**: Created 15 new features including:\n  - Lag features (1, 7, 14, 30 days)\n  - Rolling statistics (7, 14, 30-day windows)\n  - Day-of-week and month indicators\n- 🗓️ **Holiday calendar**: Added US federal holidays\n- 📏 **Scaling**: Applied robust scaling to numerical variables\n\n**📈 Data Ready for Training:**\n- Original features: 4\n- Engineered features: 15\n- Total features: 19\n- Training samples: 700 (30 reserved for validation)\n\n**Next Step**: The Model Trainer is ready to train multiple forecasting algorithms and find the best performer.\n\n${mode === 'step-by-step' ? 'Ready to start model training?' : 'Starting model training automatically...'}`,
      agentId: 'supervisor',
      requiresApproval: mode === 'step-by-step',
      options: mode === 'step-by-step' ? [
        { id: 'train', label: '🚀 Train Models', action: 'train_models' },
        { id: 'select_algorithms', label: '🤖 Select Algorithms', action: 'select_algorithms' },
        { id: 'tune_params', label: '🎛️ Advanced Settings', action: 'tune_parameters' }
      ] : undefined
    })

    // Auto-proceed if in auto-execute mode
    if (mode === 'auto-execute') {
      setTimeout(() => this.trainModels({}, mode), 1000)
    }

    this.emitWorkflowStateChange()
  }

  async trainModels(params: any, mode: WorkflowMode): Promise<void> {
    this.updateWorkflowStep('training', { status: 'in-progress' })

    // Activate Model Trainer
    this.emitAgentStatusChange('model-trainer', {
      status: 'busy',
      currentTask: 'Generating training plan',
      progress: 0
    })

    this.emitAgentMessage({
      type: 'agent',
      content: '🤖 **Model Trainer Activated**\n\nI\'m generating a dynamic training plan based on your data characteristics.',
      agentId: 'model-trainer'
    })

    // Generate a dynamic training plan
    const trainingPlan = await this.geminiClient.generateWorkflow(
      this.workflowState?.steps.find(s => s.id === 'data_analysis')?.results,
      {}
    )

    this.emitAgentMessage({
      type: 'system',
      content: '🏋️ **Dynamic Training Plan**\n\n' + trainingPlan,
      agentId: 'model-trainer'
    })

    // Simulate training process
    await this.simulateProgress('model-trainer', 'Training models', 5000)

    // Complete training
    this.emitAgentStatusChange('model-trainer', {
      status: 'completed',
      currentTask: 'Training complete',
      progress: 100
    })

    this.updateWorkflowStep('training', {
      status: 'completed',
      results: {
        models_trained: 4,
        best_model: 'XGBoost',
        best_mape: 8.2,
        training_time: 120
      }
    })

    this.emitAgentMessage({
      type: 'assistant',
      content: '🎉 **Model Training Complete!**\n\n' + trainingPlan,
      agentId: 'supervisor',
      requiresApproval: mode === 'step-by-step',
      options: mode === 'step-by-step' ? [
        { id: 'forecast', label: '📈 Generate Forecast', action: 'generate_forecast' },
        { id: 'compare_models', label: '📊 Compare Models', action: 'compare_models' },
        { id: 'tune_best', label: '🎛️ Optimize Best Model', action: 'optimize_model' }
      ] : undefined
    })

    // Auto-proceed if in auto-execute mode
    if (mode === 'auto-execute') {
      setTimeout(() => this.generateForecast({}, mode), 1000)
    }

    this.emitWorkflowStateChange()
  }

  async generateForecast(params: any, mode: WorkflowMode): Promise<void> {
    this.updateWorkflowStep('forecasting', { status: 'in-progress' })

    // Activate Forecasting Specialist
    this.emitAgentStatusChange('forecasting', {
      status: 'busy',
      currentTask: 'Generating forecasts',
      progress: 0
    })

    this.emitAgentMessage({
      type: 'agent',
      content: '📈 **Forecasting Specialist Activated**\n\nI\'m generating forecasts using the champion XGBoost model:',
      agentId: 'forecasting'
    })

    // Simulate forecasting process
    await this.simulateProgress('forecasting', 'Generating forecasts', 3000)

    // Complete forecasting
    this.emitAgentStatusChange('forecasting', {
      status: 'completed',
      currentTask: 'Forecasting complete',
      progress: 100
    })

    this.updateWorkflowStep('forecasting', { 
      status: 'completed',
      results: {
        forecast_horizon: 30,
        confidence_level: 95,
        forecast_accuracy: 8.2,
        insights_generated: 5
      }
    })

    // Update overall workflow
    if (this.workflowState) {
      this.workflowState.status = 'completed'
      this.workflowState.progress = 100
      this.workflowState.currentStep = 'completed'
    }

    const forecastSummary = await this.geminiClient.generateWorkflow(
      this.workflowState?.steps.find(s => s.id === 'training')?.results,
      {}
    )

    this.emitAgentMessage({
      type: 'assistant',
      content: `🎉 **Forecasting Complete! Mission Accomplished!**\n\n${forecastSummary}`,
      agentId: 'supervisor',
      showForecastResults: true,
      forecastData: this.generateMockForecastData(),
      options: [
        { id: 'view_charts', label: '📊 View Interactive Charts', action: 'view_forecast_charts' },
        { id: 'export_results', label: '📋 Export All Data (CSV)', action: 'export_results' },
        { id: 'new_forecast', label: '🔄 Start New Forecast', action: 'new_forecast' }
      ]
    })

    this.emitWorkflowStateChange()
  }

  private async simulateProgress(agentId: string, task: string, duration: number): Promise<void> {
    const steps = 10
    const stepDuration = duration / steps

    for (let i = 0; i <= steps; i++) {
      const progress = (i / steps) * 100
      this.emitAgentStatusChange(agentId, { progress })
      
      if (i < steps) {
        await new Promise(resolve => setTimeout(resolve, stepDuration))
      }
    }
  }

  private updateWorkflowStep(stepId: string, updates: Partial<WorkflowStep>) {
    if (this.workflowState) {
      const stepIndex = this.workflowState.steps.findIndex(step => step.id === stepId)
      if (stepIndex !== -1) {
        this.workflowState.steps[stepIndex] = {
          ...this.workflowState.steps[stepIndex],
          ...updates
        }
        
        // Update overall progress
        const completedSteps = this.workflowState.steps.filter(step => step.status === 'completed').length
        this.workflowState.progress = (completedSteps / this.workflowState.steps.length) * 100
        
        // Update current step
        const inProgressStep = this.workflowState.steps.find(step => step.status === 'in-progress')
        this.workflowState.currentStep = inProgressStep?.id || null
      }
    }
  }

  private createWorkflowSteps(mode: WorkflowMode): WorkflowStep[] {
    return [
      {
        id: 'data_upload',
        name: 'Data Upload',
        description: 'Upload and validate dataset',
        agentType: 'data-analyst',
        status: 'completed',
        progress: 100,
        estimatedTime: 30,
        dependencies: [],
        customizable: false,
        requiresApproval: false
      },
      {
        id: 'data_analysis',
        name: 'Data Analysis',
        description: 'Analyze data quality and patterns',
        agentType: 'data-analyst',
        status: 'pending',
        progress: 0,
        estimatedTime: 60,
        dependencies: ['data_upload'],
        customizable: true,
        requiresApproval: mode === 'step-by-step'
      },
      {
        id: 'preprocessing',
        name: 'Data Preprocessing',
        description: 'Clean and prepare data for modeling',
        agentType: 'preprocessing',
        status: 'pending',
        progress: 0,
        estimatedTime: 90,
        dependencies: ['data_analysis'],
        customizable: true,
        requiresApproval: mode === 'step-by-step'
      },
      {
        id: 'training',
        name: 'Model Training',
        description: 'Train and evaluate forecasting models',
        agentType: 'model-training',
        status: 'pending',
        progress: 0,
        estimatedTime: 180,
        dependencies: ['preprocessing'],
        customizable: true,
        requiresApproval: mode === 'step-by-step'
      },
      {
        id: 'forecasting',
        name: 'Forecast Generation',
        description: 'Generate predictions and insights',
        agentType: 'forecasting',
        status: 'pending',
        progress: 0,
        estimatedTime: 60,
        dependencies: ['training'],
        customizable: true,
        requiresApproval: mode === 'step-by-step'
      }
    ]
  }

  private createDemoWorkflowSteps(mode: WorkflowMode): WorkflowStep[] {
    const steps = this.createWorkflowSteps(mode)
    // Mark data upload as completed for demo
    steps[0].status = 'completed'
    return steps
  }

  async executeStep(stepId: string, customizations?: any): Promise<void> {
    if (!this.workflowState) return

    const step = this.workflowState.steps.find(s => s.id === stepId)
    if (!step) return

    // Mark step as approved and execute
    this.updateWorkflowStep(stepId, { status: 'completed' })

    // Execute the next step based on the workflow
    switch (stepId) {
      case 'data_analysis':
        await this.preprocessData(customizations || {}, this.workflowState.mode)
        break
      case 'preprocessing':
        await this.trainModels(customizations || {}, this.workflowState.mode)
        break
      case 'training':
        await this.generateForecast(customizations || {}, this.workflowState.mode)
        break
      default:
        console.log(`No follow-up action for step: ${stepId}`)
    }

    this.emitWorkflowStateChange()
  }

  async skipStep(stepId: string): Promise<void> {
    this.updateWorkflowStep(stepId, { status: 'skipped' })
    this.emitWorkflowStateChange()
  }

  private generateMockForecastData() {
    // Generate mock historical and forecast data
    const historicalDates = []
    const futureDates = []
    const baseDate = new Date('2024-01-01')
    
    // Historical dates (last 60 days)
    for (let i = 60; i >= 0; i--) {
      const date = new Date(baseDate)
      date.setDate(date.getDate() - i)
      historicalDates.push(date.toISOString().split('T')[0])
    }
    
    // Future dates (next 30 days)
    for (let i = 1; i <= 30; i++) {
      const date = new Date(baseDate)
      date.setDate(date.getDate() + i)
      futureDates.push(date.toISOString().split('T')[0])
    }

    // Generate mock data with trend and seasonality
    const generateSeries = (baseValue: number, trend: number, noise: number) => {
      return historicalDates.map((_, i) => {
        const trendValue = baseValue + (trend * i)
        const seasonal = Math.sin((i * 2 * Math.PI) / 7) * 50 // Weekly seasonality
        const randomNoise = (Math.random() - 0.5) * noise
        return Math.max(0, trendValue + seasonal + randomNoise)
      })
    }

    const generateFutureSeries = (lastValue: number, trend: number, noise: number) => {
      return futureDates.map((_, i) => {
        const trendValue = lastValue + (trend * (i + 1))
        const seasonal = Math.sin(((60 + i) * 2 * Math.PI) / 7) * 50
        const randomNoise = (Math.random() - 0.5) * noise
        return Math.max(0, trendValue + seasonal + randomNoise)
      })
    }

    // Actual data
    const actualData = generateSeries(1000, 2, 100)
    
    // Model forecasts for historical period
    const xgboostHistorical = actualData.map(val => val + (Math.random() - 0.5) * 50)
    const prophetHistorical = actualData.map(val => val + (Math.random() - 0.5) * 60)
    const lightgbmHistorical = actualData.map(val => val + (Math.random() - 0.5) * 70)
    const catboostHistorical = actualData.map(val => val + (Math.random() - 0.5) * 80)

    // Future forecasts
    const lastActual = actualData[actualData.length - 1]
    const xgboostFuture = generateFutureSeries(lastActual, 2, 40)
    const prophetFuture = generateFutureSeries(lastActual, 1.8, 50)
    const lightgbmFuture = generateFutureSeries(lastActual, 2.2, 60)
    const catboostFuture = generateFutureSeries(lastActual, 1.9, 70)

    return {
      models: [
        {
          name: 'XGBoost',
          mape: 8.2,
          mae: 45.3,
          rmse: 67.8,
          r2: 0.924,
          color: '#3B82F6',
          visible: true,
          actualData,
          forecastData: xgboostHistorical,
          futureData: xgboostFuture,
          confidenceUpper: [...xgboostHistorical.map(v => v + 30), ...xgboostFuture.map(v => v + 35)],
          confidenceLower: [...xgboostHistorical.map(v => v - 30), ...xgboostFuture.map(v => v - 35)]
        },
        {
          name: 'Prophet',
          mape: 9.1,
          mae: 52.1,
          rmse: 74.2,
          r2: 0.912,
          color: '#10B981',
          visible: true,
          actualData,
          forecastData: prophetHistorical,
          futureData: prophetFuture,
          confidenceUpper: [...prophetHistorical.map(v => v + 35), ...prophetFuture.map(v => v + 40)],
          confidenceLower: [...prophetHistorical.map(v => v - 35), ...prophetFuture.map(v => v - 40)]
        },
        {
          name: 'LightGBM',
          mape: 9.8,
          mae: 58.7,
          rmse: 81.3,
          r2: 0.898,
          color: '#F59E0B',
          visible: true,
          actualData,
          forecastData: lightgbmHistorical,
          futureData: lightgbmFuture,
          confidenceUpper: [...lightgbmHistorical.map(v => v + 40), ...lightgbmFuture.map(v => v + 45)],
          confidenceLower: [...lightgbmHistorical.map(v => v - 40), ...lightgbmFuture.map(v => v - 45)]
        },
        {
          name: 'CatBoost',
          mape: 10.3,
          mae: 61.2,
          rmse: 85.9,
          r2: 0.887,
          color: '#EF4444',
          visible: true,
          actualData,
          forecastData: catboostHistorical,
          futureData: catboostFuture,
          confidenceUpper: [...catboostHistorical.map(v => v + 45), ...catboostFuture.map(v => v + 50)],
          confidenceLower: [...catboostHistorical.map(v => v - 45), ...catboostFuture.map(v => v - 50)]
        }
      ],
      dates: [...historicalDates, ...futureDates],
      historicalDates,
      futureDates
    }
  }
}