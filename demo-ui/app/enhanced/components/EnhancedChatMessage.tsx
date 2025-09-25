'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Bot, User, AlertCircle, CheckCircle, Clock, Zap, Brain, Wrench, BarChart3, TrendingUp } from 'lucide-react'
import { EnhancedChatMessage as EnhancedChatMessageType, WorkflowMode, MessageOption } from '../../types/enhanced'
import ReactMarkdown from 'react-markdown'
import ForecastResultsModal from './ForecastResultsModal'

interface EnhancedChatMessageProps {
    message: EnhancedChatMessageType
    onOptionClick: (option: MessageOption) => void
    onFileUpload: (file: File) => void
    onStepApproval: (stepId: string, approved: boolean, customizations?: any) => void
    mode: WorkflowMode
}

export default function EnhancedChatMessage({
    message,
    onOptionClick,
    onFileUpload,
    onStepApproval,
    mode
}: EnhancedChatMessageProps) {
    const [showForecastModal, setShowForecastModal] = useState(false)

    const getAgentIcon = (agentId?: string) => {
        switch (agentId) {
            case 'supervisor':
                return <Bot className="w-4 h-4 text-white" />
            case 'data-analyst':
                return <BarChart3 className="w-4 h-4 text-white" />
            case 'preprocessing':
                return <Wrench className="w-4 h-4 text-white" />
            case 'model-trainer':
                return <Brain className="w-4 h-4 text-white" />
            case 'forecasting':
                return <TrendingUp className="w-4 h-4 text-white" />
            default:
                return <Bot className="w-4 h-4 text-white" />
        }
    }

    const getAgentColor = (agentId?: string) => {
        switch (agentId) {
            case 'supervisor':
                return 'from-blue-500 to-purple-600'
            case 'data-analyst':
                return 'from-green-500 to-teal-600'
            case 'preprocessing':
                return 'from-orange-500 to-red-600'
            case 'model-trainer':
                return 'from-purple-500 to-pink-600'
            case 'forecasting':
                return 'from-indigo-500 to-blue-600'
            default:
                return 'from-gray-500 to-gray-600'
        }
    }

    const getAgentName = (agentId?: string) => {
        switch (agentId) {
            case 'supervisor':
                return 'Supervisor'
            case 'data-analyst':
                return 'Data Analyst'
            case 'preprocessing':
                return 'Preprocessing Specialist'
            case 'model-trainer':
                return 'Model Trainer'
            case 'forecasting':
                return 'Forecasting Specialist'
            default:
                return 'Assistant'
        }
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            onFileUpload(file)
        }
    }

    const renderMessageContent = () => {
        if (message.type === 'user') {
            return (
                <div className="flex items-start space-x-3 justify-end">
                    <div className="bg-blue-500 text-white rounded-2xl px-4 py-3 max-w-xs lg:max-w-md shadow-sm">
                        <ReactMarkdown className="text-sm">{message.content}</ReactMarkdown>
                    </div>
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-white" />
                    </div>
                </div>
            )
        }

        return (
            <div className="flex items-start space-x-3">
                {/* Agent Avatar */}
                <div className={`w-8 h-8 bg-gradient-to-r ${getAgentColor(message.agentId)} rounded-full flex items-center justify-center flex-shrink-0 shadow-sm`}>
                    {message.type === 'error' ? (
                        <AlertCircle className="w-4 h-4 text-white" />
                    ) : message.type === 'system' ? (
                        <Clock className="w-4 h-4 text-white" />
                    ) : (
                        getAgentIcon(message.agentId)
                    )}
                </div>

                <div className="flex-1 max-w-3xl">
                    {/* Agent Name Badge */}
                    {message.agentId && message.type !== 'system' && (
                        <div className="mb-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${getAgentColor(message.agentId)} text-white shadow-sm`}>
                                {getAgentIcon(message.agentId)}
                                <span className="ml-1">{getAgentName(message.agentId)}</span>
                            </span>
                        </div>
                    )}

                    {/* Message Bubble */}
                    <div className={`rounded-2xl px-4 py-3 shadow-sm border ${message.type === 'error'
                            ? 'bg-red-50 border-red-200 text-red-800'
                            : message.type === 'system'
                                ? 'bg-gray-50 border-gray-200 text-gray-700'
                                : 'bg-white border-gray-200 text-gray-800'
                        }`}>
                        <ReactMarkdown
                            className="prose prose-sm max-w-none"
                            components={{
                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                                ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>,
                                li: ({ children }) => <li className="text-sm">{children}</li>
                            }}
                        >
                            {message.content}
                        </ReactMarkdown>

                        {/* Approval Required Notice */}
                        {message.requiresApproval && mode === 'step-by-step' && (
                            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <div className="flex items-center space-x-2">
                                    <CheckCircle className="w-4 h-4 text-yellow-600" />
                                    <span className="text-sm font-medium text-yellow-800">Approval Required</span>
                                </div>
                                <p className="text-sm text-yellow-700 mt-1">
                                    This step requires your approval before proceeding. Review the details and choose your action.
                                </p>
                            </div>
                        )}

                        {/* File Upload Area */}
                        {message.showFileUpload && (
                            <div className="mt-4">
                                <label className="block">
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer">
                                        <div className="space-y-2">
                                            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                                <Zap className="w-6 h-6 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">Upload your dataset</p>
                                                <p className="text-xs text-gray-500">CSV, Excel, JSON, or Parquet files up to 100MB</p>
                                            </div>
                                        </div>
                                        <input
                                            type="file"
                                            accept=".csv,.xlsx,.xls,.json,.parquet"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                        />
                                    </div>
                                </label>
                            </div>
                        )}

                        {/* Action Options */}
                        {message.options && message.options.length > 0 && (
                            <div className="mt-4 space-y-2">
                                <div className="flex flex-wrap gap-2">
                                    {message.options.map((option) => (
                                        <button
                                            key={option.id}
                                            onClick={() => onOptionClick(option)}
                                            disabled={option.disabled}
                                            className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all ${option.variant === 'primary'
                                                    ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm'
                                                    : option.variant === 'danger'
                                                        ? 'bg-red-500 text-white hover:bg-red-600 shadow-sm'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                                                } ${option.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}`}
                                        >
                                            {option.icon && <span className="mr-1">{option.icon}</span>}
                                            {option.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Option Descriptions */}
                                {message.options.some(opt => opt.description) && (
                                    <div className="text-xs text-gray-500 space-y-1">
                                        {message.options
                                            .filter(opt => opt.description)
                                            .map(opt => (
                                                <div key={`${opt.id}-desc`}>
                                                    <strong>{opt.label}:</strong> {opt.description}
                                                </div>
                                            ))
                                        }
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Forecast Results Preview */}
                        {message.showForecastResults && message.forecastData && (
                            <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-semibold text-gray-900 flex items-center">
                                        <BarChart3 className="w-5 h-5 mr-2 text-green-600" />
                                        Forecast Results Ready
                                    </h4>
                                    <button
                                        onClick={() => setShowForecastModal(true)}
                                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                                    >
                                        📊 View Interactive Charts
                                    </button>
                                </div>
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                    {message.forecastData.models.slice(0, 4).map((model) => (
                                        <div key={model.name} className="bg-white rounded p-3 border">
                                            <div className="flex items-center space-x-2 mb-1">
                                                <div 
                                                    className="w-3 h-3 rounded" 
                                                    style={{ backgroundColor: model.color }}
                                                />
                                                <span className="font-medium text-gray-900">{model.name}</span>
                                            </div>
                                            <div className="text-xs text-gray-600">
                                                MAPE: <span className="font-medium">{model.mape.toFixed(1)}%</span>
                                            </div>
                                            <div className="text-xs text-gray-600">
                                                R²: <span className="font-medium">{model.r2.toFixed(3)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="mt-3 text-xs text-gray-600">
                                    📈 Historical data: {message.forecastData.historicalDates.length} days | 
                                    🔮 Future forecast: {message.forecastData.futureDates.length} days
                                </div>
                            </div>
                        )}

                        {/* Approval Buttons for Step-by-Step Mode */}
                        {message.requiresApproval && mode === 'step-by-step' && (
                            <div className="mt-4 flex space-x-2">
                                <button
                                    onClick={() => onStepApproval(message.workflowStep || 'current', true)}
                                    className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                                >
                                    ✅ Approve & Continue
                                </button>
                                <button
                                    onClick={() => onStepApproval(message.workflowStep || 'current', false)}
                                    className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
                                >
                                    ⏭️ Skip This Step
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Timestamp */}
                    <div className="mt-1 text-xs text-gray-400">
                        {message.timestamp.toLocaleTimeString()}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="w-full"
            >
                {renderMessageContent()}
            </motion.div>
            
            {/* Forecast Results Modal */}
            {message.showForecastResults && message.forecastData && (
                <ForecastResultsModal
                    isOpen={showForecastModal}
                    onClose={() => setShowForecastModal(false)}
                    results={message.forecastData}
                />
            )}
        </>
    )
}