'use client'

import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Send, Paperclip, Upload } from 'lucide-react'
import { EnhancedChatMessage as EnhancedChatMessageType, WorkflowMode, MessageOption } from '../../types/enhanced'
import EnhancedChatMessage from './EnhancedChatMessage'

interface EnhancedChatInterfaceProps {
  messages: EnhancedChatMessageType[]
  isProcessing: boolean
  inputValue: string
  onInputChange: (value: string) => void
  onSendMessage: () => void
  onOptionClick: (option: MessageOption) => void
  onFileUpload: (file: File) => void
  onStepApproval: (stepId: string, approved: boolean, customizations?: any) => void
  mode: WorkflowMode
}

export default function EnhancedChatInterface({
  messages,
  isProcessing,
  inputValue,
  onInputChange,
  onSendMessage,
  onOptionClick,
  onFileUpload,
  onStepApproval,
  mode
}: EnhancedChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSendMessage()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileUpload(file)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const triggerFileUpload = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          <AnimatePresence>
            {messages.map((message) => (
              <EnhancedChatMessage
                key={message.id}
                message={message}
                onOptionClick={onOptionClick}
                onFileUpload={onFileUpload}
                onStepApproval={onStepApproval}
                mode={mode}
              />
            ))}
          </AnimatePresence>

          {/* Typing Indicator */}
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-start space-x-3"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-200 max-w-xs">
                <div className="flex items-center space-x-1">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="ml-2 text-sm text-gray-500">AI is thinking...</span>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end space-x-3">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={
                  mode === 'auto-execute' 
                    ? "Ask me anything or let me handle everything automatically..."
                    : "Type your message or ask for help with any step..."
                }
                className="w-full px-4 py-3 pr-20 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all"
                disabled={isProcessing}
              />
              
              {/* File Upload Button */}
              <button
                onClick={triggerFileUpload}
                className="absolute right-12 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isProcessing}
              >
                <Paperclip className="w-5 h-5" />
              </button>

              {/* Upload Icon for Visual Feedback */}
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-300">
                <Upload className="w-4 h-4" />
              </div>
            </div>

            <button
              onClick={onSendMessage}
              disabled={!inputValue.trim() || isProcessing}
              className={`px-4 py-3 rounded-xl transition-all ${
                inputValue.trim() && !isProcessing
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Indicator */}
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <span>
              {mode === 'auto-execute' 
                ? '⚡ Auto-Execute Mode: I\'ll handle everything automatically'
                : '👥 Step-by-Step Mode: I\'ll ask for your approval at each step'
              }
            </span>
            <span>Press Enter to send</span>
          </div>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls,.json,.parquet"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}