import { GoogleGenerativeAI } from '@google/generative-ai'
import { ConversationContext, GeminiResponse, WorkflowMode, AgentStatus } from '../types/enhanced'

export class GeminiAPIClient {
  private genAI: GoogleGenerativeAI
  private model: any

  constructor() {
    // Use the API key from localStorage, environment, or default
    const apiKey = this.getApiKey()
    console.log('Initializing Gemini API with key:', apiKey.substring(0, 10) + '...')
    this.genAI = new GoogleGenerativeAI(apiKey)
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  }

  private getApiKey(): string {
    // Priority: localStorage > environment > default
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('gemini_api_key')
      if (savedKey) return savedKey
    }
    
    return process.env.NEXT_PUBLIC_GEMINI_API_KEY || 'AIzaSyC9HUwhTJvg828gaLS7sfcG1DB5fGoB0CA'
  }

  public refreshApiKey(): void {
    const newApiKey = this.getApiKey()
    console.log('Refreshing Gemini API with key:', newApiKey.substring(0, 10) + '...')
    this.genAI = new GoogleGenerativeAI(newApiKey)
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  }

  async generateResponse(
    userInput: string,
    context: ConversationContext,
    onStreamUpdate: (chunk: string) => void
  ): Promise<GeminiResponse> {
    try {
      const prompt = this.buildPrompt(userInput, context)
      const result = await this.model.generateContentStream(prompt)

      let text = ''
      for await (const chunk of result.stream) {
        const chunkText = chunk.text()
        text += chunkText
        onStreamUpdate(chunkText)
      }

      return this.parseResponse(text, context)
    } catch (error) {
      console.error('Gemini API error:', error)
      return this.getFallbackResponse(userInput, context)
    }
  }

  private buildPrompt(userInput: string, context: ConversationContext): string {
    const { messages, currentMode, workflowState, agentStatuses } = context

    // Build conversation history
    const conversationHistory = messages
      .slice(-5) // Last 5 messages for context
      .map(msg => `${msg.type}${msg.agentId ? ` (${msg.agentId})` : ''}: ${msg.content}`)
      .join('\n')

    // Build agent status summary
    const agentSummary = agentStatuses
      .map(agent => `${agent.name}: ${agent.status} - ${agent.currentTask || 'idle'}`)
      .join('\n')

    // Build workflow status
    const workflowSummary = workflowState 
      ? `Workflow: ${workflowState.status}, Current Step: ${workflowState.currentStep || 'none'}, Progress: ${workflowState.progress}%`
      : 'No active workflow'

    // Detect if this is a general question vs workflow command
    const isGeneralQuestion = !userInput.toLowerCase().match(/upload|demo|train|forecast|preprocess|analyze|model/)

    if (isGeneralQuestion) {
      return `You are an AI Forecasting Assistant. You can help with both general questions and time series forecasting tasks.

CURRENT CONTEXT:
- Mode: ${currentMode}
- ${workflowSummary}

RECENT CONVERSATION:
${conversationHistory}

USER QUESTION: "${userInput}"

INSTRUCTIONS:
1. Answer the user's question directly and helpfully
2. If it's about forecasting, provide expert knowledge on time series analysis
3. If it's a general question, answer naturally and conversationally
4. If they want to start forecasting, guide them to upload data or try demo
5. Keep responses concise and friendly
6. Use emojis appropriately

FORECASTING EXPERTISE:
- Time series analysis, seasonality, trends
- Algorithms: Prophet, XGBoost, ARIMA, LightGBM, CatBoost
- Metrics: MAPE, MAE, RMSE, R², directional accuracy
- Preprocessing: outlier detection, feature engineering, scaling
- Best practices for business forecasting

Provide a helpful, natural response to their question.`
    }

    return `You are an advanced AI Forecasting Assistant with a team of specialized agents. You help users create accurate time series forecasts through an intelligent, conversational interface.

SYSTEM CONTEXT:
- Current Mode: ${currentMode}
- ${workflowSummary}
- Agent Team Status:
${agentSummary}

CONVERSATION HISTORY:
${conversationHistory}

USER INPUT: "${userInput}"

INSTRUCTIONS:
1. You are the Supervisor Agent coordinating a team of specialized forecasting agents
2. Respond in a helpful, professional, and engaging manner
3. Use emojis appropriately to make the conversation friendly
4. Provide actionable next steps based on the current context
5. If in step-by-step mode, ask for user approval before proceeding
6. If in auto-execute mode, be more decisive and automated
7. Reference specific agents when discussing their capabilities
8. Maintain awareness of the workflow progress and current step

AGENT CAPABILITIES:
- Data Analyst: Data quality assessment, pattern detection, statistical analysis
- Preprocessing Specialist: Data cleaning, feature engineering, outlier detection  
- Model Trainer: Algorithm training, hyperparameter tuning, model evaluation
- Forecasting Specialist: Forecast generation, confidence intervals, result analysis

RESPONSE FORMAT:
Provide a natural, conversational response that:
- Acknowledges the user's input
- Explains what will happen next
- Mentions which agents will be involved
- Provides clear options for the user
- Maintains context of the current workflow state

Be specific about forecasting concepts when relevant:
- Time series analysis techniques
- Algorithm selection (Prophet, XGBoost, ARIMA, LightGBM, etc.)
- Data preprocessing methods
- Model evaluation metrics (MAPE, MAE, RMSE, R²)
- Forecasting best practices

Keep responses concise but informative. Focus on moving the conversation forward productively.`
  }

  private parseResponse(text: string, context: ConversationContext): GeminiResponse {
    // Extract structured information from the response
    const response: GeminiResponse = {
      content: text,
      confidence: 0.8,
      suggestions: [],
      options: []
    }

    // Analyze the response to suggest actions
    const lowerText = text.toLowerCase()

    // Determine if approval is required based on mode and content
    if (context.currentMode === 'step-by-step') {
      if (lowerText.includes('process') || lowerText.includes('train') || lowerText.includes('analyze')) {
        response.requiresApproval = true
      }
    }

    // Generate contextual options based on current state
    response.options = this.generateContextualOptions(context, lowerText)

    // Suggest actions based on content analysis
    if (lowerText.includes('upload') && !context.workflowState) {
      response.suggestedAction = 'prepare_upload'
    } else if (lowerText.includes('demo') && !context.workflowState) {
      response.suggestedAction = 'load_demo_data'
    } else if (lowerText.includes('train') && context.workflowState?.currentStep === 'data_analysis') {
      response.suggestedAction = 'start_training'
    }

    return response
  }

  private generateContextualOptions(context: ConversationContext, responseText: string): any[] {
    const options: any[] = []
    const { currentMode, workflowState, agentStatuses } = context

    // No active workflow - initial options
    if (!workflowState || workflowState.status === 'idle') {
      options.push(
        { id: 'upload', label: '📎 Upload Dataset', action: 'upload_data' },
        { id: 'demo', label: '🎯 Try Demo Data', action: 'load_demo' }
      )
      
      if (currentMode === 'step-by-step') {
        options.push({ id: 'workflow', label: '📋 Show Workflow', action: 'show_workflow' })
      }
    }

    // Data uploaded, ready for analysis
    else if (workflowState.currentStep === 'data_upload') {
      if (currentMode === 'auto-execute') {
        options.push({ id: 'auto_analyze', label: '⚡ Auto-Analyze', action: 'auto_analyze_data' })
      } else {
        options.push(
          { id: 'analyze', label: '🔍 Analyze Data', action: 'analyze_data' },
          { id: 'customize', label: '⚙️ Customize Analysis', action: 'customize_analysis' }
        )
      }
    }

    // Data analyzed, ready for preprocessing
    else if (workflowState.currentStep === 'data_analysis') {
      if (currentMode === 'auto-execute') {
        options.push({ id: 'auto_preprocess', label: '⚡ Auto-Preprocess', action: 'auto_preprocess' })
      } else {
        options.push(
          { id: 'preprocess', label: '🧹 Preprocess Data', action: 'preprocess_data' },
          { id: 'skip_preprocess', label: '⏭️ Skip Preprocessing', action: 'skip_preprocessing' },
          { id: 'customize_preprocess', label: '⚙️ Customize Preprocessing', action: 'customize_preprocessing' }
        )
      }
    }

    // Ready for model training
    else if (workflowState.currentStep === 'preprocessing') {
      if (currentMode === 'auto-execute') {
        options.push({ id: 'auto_train', label: '⚡ Auto-Train Models', action: 'auto_train' })
      } else {
        options.push(
          { id: 'train', label: '🚀 Train Models', action: 'train_models' },
          { id: 'select_algorithms', label: '🤖 Select Algorithms', action: 'select_algorithms' },
          { id: 'tune_params', label: '🎛️ Tune Parameters', action: 'tune_parameters' }
        )
      }
    }

    // Training complete, ready for results
    else if (workflowState.currentStep === 'training') {
      options.push(
        { id: 'view_results', label: '📊 View Results', action: 'view_results' },
        { id: 'generate_forecast', label: '📈 Generate Forecast', action: 'generate_forecast' },
        { id: 'export', label: '📋 Export Results', action: 'export_results' }
      )
    }

    // Always available options
    options.push({ id: 'help', label: '❓ Help', action: 'show_help' })

    return options
  }

  private getFallbackResponse(userInput: string, context: ConversationContext): GeminiResponse {
    const { currentMode, workflowState } = context

    let content = `I understand you said "${userInput}". `

    if (!workflowState || workflowState.status === 'idle') {
      content += `🚀 **Let's get started with your forecasting project!**

I'm your AI forecasting assistant with a team of specialized agents ready to help. Here's what I can do:

**📊 Data Analysis**: Upload your time series data and I'll analyze patterns, seasonality, and quality
**🧹 Preprocessing**: Clean your data and engineer optimal features for forecasting
**🤖 Model Training**: Train multiple algorithms (XGBoost, Prophet, LightGBM, etc.) and compare performance
**📈 Forecasting**: Generate accurate predictions with confidence intervals

**🎯 Choose your approach:**
- **Auto-Execute**: Let me handle everything automatically
- **Step-by-Step**: Review and customize each step

Ready to begin?`
    } else {
      content += `📋 **Current Progress Update**

${workflowState.currentStep ? `We're currently at: ${workflowState.currentStep}` : 'Workflow is ready to continue'}
Progress: ${Math.round(workflowState.progress)}%

Based on our current progress, here are your next options:`
    }

    return {
      content,
      confidence: 0.8,
      options: this.generateContextualOptions(context, userInput.toLowerCase())
    }
  }

  async analyzeData(data: any, analysisType: 'quality' | 'patterns' | 'recommendations'): Promise<any> {
    try {
      const prompt = `Analyze this time series data and provide ${analysisType} insights:
      
Data summary: ${JSON.stringify(data, null, 2)}

Provide specific insights about:
${analysisType === 'quality' ? '- Data completeness and accuracy\n- Missing values and outliers\n- Data type consistency' : ''}
${analysisType === 'patterns' ? '- Trend analysis\n- Seasonal patterns\n- Cyclical behavior\n- Stationarity' : ''}
${analysisType === 'recommendations' ? '- Preprocessing recommendations\n- Algorithm suggestions\n- Feature engineering ideas' : ''}

Format the response as actionable insights for a forecasting project.`

      const result = await this.model.generateContent(prompt)
      const response = await result.response
      return response.text()
    } catch (error) {
      console.error('Data analysis error:', error)
      return `Unable to analyze data: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }

  async generateWorkflow(
    dataCharacteristics: any,
    userPreferences: any
  ): Promise<any> {
    try {
      const prompt = `Generate an optimal forecasting workflow based on:

Data Characteristics:
${JSON.stringify(dataCharacteristics, null, 2)}

User Preferences:
${JSON.stringify(userPreferences, null, 2)}

Create a step-by-step workflow that includes:
1. Data preprocessing steps
2. Feature engineering recommendations
3. Algorithm selection rationale
4. Evaluation metrics
5. Expected timeline

Format as a structured workflow with clear steps, estimated times, and agent assignments.`

      const result = await this.model.generateContent(prompt)
      const response = await result.response
      return response.text()
    } catch (error) {
      console.error('Workflow generation error:', error)
      return null
    }
  }
}