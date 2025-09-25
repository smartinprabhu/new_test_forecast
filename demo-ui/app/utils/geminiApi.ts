import { GoogleGenerativeAI } from '@google/generative-ai'
import { ChatMessageType, ProcessingStep, AIResponse } from '../types'

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || 'AIzaSyBKhmdhjHa1dtbVeYOGdydzyK6Iq1-cfWY')

export async function generateAIResponse(
  userInput: string,
  currentStep: ProcessingStep,
  chatHistory: ChatMessageType[]
): Promise<AIResponse> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

    // Create context from chat history
    const context = chatHistory
      .slice(-5) // Last 5 messages for context
      .map(msg => `${msg.type}: ${msg.content}`)
      .join('\n')

    const prompt = `You are an AI forecasting assistant helping users with time series forecasting. 

Current step: ${currentStep}
Recent conversation context:
${context}

User input: "${userInput}"

Based on the current step and user input, provide a helpful response that:
1. Acknowledges their input
2. Provides relevant information about forecasting
3. Guides them to the next step
4. Maintains a conversational, helpful tone

Keep responses concise but informative. Use emojis sparingly and focus on being helpful.

If the user asks technical questions about forecasting, provide accurate information about:
- Time series analysis
- Model selection (XGBoost, Prophet, ARIMA, etc.)
- Data preprocessing
- Model evaluation metrics (MAPE, MAE, RMSE, R²)
- Best practices

Response:`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Determine next step and options based on current step and user input
    let nextStep: ProcessingStep | undefined
    let options: { id: string; label: string; action: string }[] = []

    // Simple logic to determine next steps (in a real app, this would be more sophisticated)
    if (currentStep === 'welcome' && userInput.toLowerCase().includes('upload')) {
      nextStep = 'data_upload'
      options = [
        { id: 'upload', label: '📎 Upload File', action: 'upload' },
        { id: 'demo', label: '🎯 Try Demo', action: 'demo' }
      ]
    } else if (currentStep === 'data_analysis' && userInput.toLowerCase().includes('process')) {
      nextStep = 'preprocessing'
      options = [
        { id: 'train', label: '🚀 Train Models', action: 'train_models' },
        { id: 'customize', label: '⚙️ Customize', action: 'customize_preprocessing' }
      ]
    } else if (userInput.toLowerCase().includes('help') || userInput.toLowerCase().includes('explain')) {
      options = [
        { id: 'continue', label: '▶️ Continue Process', action: 'continue' },
        { id: 'more_help', label: '❓ More Help', action: 'help' }
      ]
    }

    return {
      content: text,
      options: options.length > 0 ? options : undefined,
      nextStep
    }

  } catch (error) {
    console.error('Error generating AI response:', error)

    // Fallback response
    return {
      content: `I understand you said "${userInput}". Let me help you with that! 

Based on where we are in the forecasting process, here are some suggestions:

${currentStep === 'welcome' ? '• Upload your dataset to get started\n• Try our demo data to see how it works' : ''}
${currentStep === 'data_analysis' ? '• Process your data with recommended settings\n• Customize preprocessing options' : ''}
${currentStep === 'model_selection' ? '• Train recommended models (XGBoost, Prophet)\n• Customize model parameters' : ''}
${currentStep === 'training' ? '• Review model performance\n• Optimize hyperparameters if needed' : ''}
${currentStep === 'results' ? '• Export your forecasts\n• Save the trained model' : ''}

What would you like to do next?`,
      options: [
        { id: 'continue', label: '▶️ Continue', action: 'continue' },
        { id: 'help', label: '❓ Get Help', action: 'help' }
      ]
    }
  }
}