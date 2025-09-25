import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request: NextRequest) {
  try {
    const { apiKey, model } = await request.json()
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 })
    }

    // Test the Gemini API connection
    const genAI = new GoogleGenerativeAI(apiKey)
    const geminiModel = genAI.getGenerativeModel({ model: model || 'gemini-1.5-pro' })
    
    // Send a simple test prompt
    const result = await geminiModel.generateContent('Hello, this is a connection test. Please respond with "Connection successful!"')
    const response = await result.response
    const text = response.text()
    
    if (text.toLowerCase().includes('connection successful') || text.toLowerCase().includes('hello')) {
      return NextResponse.json({ 
        success: true, 
        message: 'Connection successful',
        model: model || 'gemini-1.5-pro',
        response: text
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Unexpected response from API',
        response: text
      }, { status: 400 })
    }
    
  } catch (error: any) {
    console.error('Gemini API test error:', error)
    
    // Parse error message for better user feedback
    let errorMessage = 'Connection failed'
    if (error.message) {
      if (error.message.includes('API_KEY_INVALID')) {
        errorMessage = 'Invalid API key'
      } else if (error.message.includes('not found')) {
        errorMessage = 'Model not found or not supported'
      } else if (error.message.includes('quota')) {
        errorMessage = 'API quota exceeded'
      } else {
        errorMessage = error.message
      }
    }
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage,
      details: error.message
    }, { status: 400 })
  }
}