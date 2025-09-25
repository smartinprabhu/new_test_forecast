'use client'

import { motion } from 'framer-motion'
import { Bot, User, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { ChatMessageType, MessageOption } from '../types'
import FileUpload from './FileUpload'
import ReactMarkdown from 'react-markdown'

interface ChatMessageProps {
  message: ChatMessageType
  onOptionClick: (option: MessageOption) => void
  onFileUpload: (file: File) => void
  planSteps?: any[]
  expandedSteps?: Set<number>
  onStepEdit?: (stepId: number, changes: any) => void
  onToggleStepExpand?: (stepId: number) => void
}

export default function ChatMessage({ 
  message, 
  onOptionClick, 
  onFileUpload, 
  planSteps = [], 
  expandedSteps = new Set(), 
  onStepEdit, 
  onToggleStepExpand 
}: ChatMessageProps) {
  const getMessageIcon = () => {
    switch (message.type) {
      case 'assistant':
        return <Bot className="w-4 h-4 text-white" />
      case 'user':
        return <User className="w-4 h-4 text-white" />
      case 'system':
        return <Clock className="w-4 h-4 text-blue-600 dark:text-blue-300" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-300" />
      default:
        return <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-300" />
    }
  }

  const getMessageStyles = () => {
    switch (message.type) {
      case 'assistant':
        return 'assistant-message'
      case 'user':
        return 'user-message'
      case 'system':
        return 'system-message'
      case 'error':
        return 'error-message'
      default:
        return 'assistant-message'
    }
  }

  const getIconBgColor = () => {
    switch (message.type) {
      case 'assistant':
        return 'bg-blue-500'
      case 'user':
        return 'bg-gray-600'
      case 'system':
        return 'bg-blue-100 dark:bg-blue-900/50'
      case 'error':
        return 'bg-red-100 dark:bg-red-900/50'
      default:
        return 'bg-green-100 dark:bg-green-900/50'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="chat-message"
    >
      <div className={`flex items-start space-x-3 ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
        {/* Avatar */}
        <div className={`w-8 h-8 ${getIconBgColor()} rounded-full flex items-center justify-center flex-shrink-0`}>
          {getMessageIcon()}
        </div>

        {/* Message Content */}
        <div className={`message-bubble ${getMessageStyles()}`}>
          {/* Message Text */}
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown
              components={{
                // Custom components for better styling
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="text-sm">{children}</li>,
                table: ({ children }) => (
                  <div className="overflow-x-auto my-4">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => <thead className="bg-gray-50 dark:bg-gray-700">{children}</thead>,
                tbody: ({ children }) => <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">{children}</tbody>,
                th: ({ children }) => (
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                    {children}
                  </td>
                ),
                code: ({ children }) => (
                  <code className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-xs font-mono dark:bg-gray-700 dark:text-gray-200">
                    {children}
                  </code>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-blue-200 dark:border-blue-700 pl-4 italic text-gray-600 dark:text-gray-400 my-2">
                    {children}
                  </blockquote>
                )
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>

          {/* File Upload Component */}
          {message.showFileUpload && (
            <div className="mt-4">
              <FileUpload onFileUpload={onFileUpload} />
            </div>
          )}

          {/* Options */}
          {message.options && message.options.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {message.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => onOptionClick(option)}
                  className="option-button"
                  title={option.description}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          {/* Timestamp */}
          <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            {message.timestamp.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>
      </div>
    </motion.div>
  )
}