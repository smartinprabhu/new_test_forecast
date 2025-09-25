'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Settings, 
  Bot, 
  Brain, 
  Database, 
  Zap, 
  Save, 
  RotateCcw,
  Eye,
  EyeOff,
  Info,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'

interface ConfigurationModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (config: ConfigurationSettings) => void
}

interface ConfigurationSettings {
  // Gemini AI Configuration
  geminiApiKey: string
  geminiModel: string
  temperature: number
  maxTokens: number
  topP: number
  topK: number
  
  // Agent Configuration
  agentTimeout: number
  maxRetries: number
  concurrentTasks: number
  
  // Forecasting Parameters
  defaultHorizon: number
  confidenceIntervals: number[]
  algorithms: {
    prophet: boolean
    xgboost: boolean
    lightgbm: boolean
    catboost: boolean
    arima: boolean
  }
  
  // UI Preferences
  theme: 'light' | 'dark' | 'auto'
  animationsEnabled: boolean
  autoScroll: boolean
  showTechnicalDetails: boolean
  
  // Advanced Settings
  debugMode: boolean
  logLevel: 'error' | 'warn' | 'info' | 'debug'
  cacheEnabled: boolean
  sessionTimeout: number
}

const defaultConfig: ConfigurationSettings = {
  geminiApiKey: 'AIzaSyC9HUwhTJvg828gaLS7sfcG1DB5fGoB0CA',
  geminiModel: 'gemini-1.5-pro',
  temperature: 0.7,
  maxTokens: 2048,
  topP: 0.9,
  topK: 40,
  
  agentTimeout: 300,
  maxRetries: 3,
  concurrentTasks: 5,
  
  defaultHorizon: 30,
  confidenceIntervals: [0.8, 0.95],
  algorithms: {
    prophet: true,
    xgboost: true,
    lightgbm: true,
    catboost: false,
    arima: false
  },
  
  theme: 'light',
  animationsEnabled: true,
  autoScroll: true,
  showTechnicalDetails: false,
  
  debugMode: false,
  logLevel: 'info',
  cacheEnabled: true,
  sessionTimeout: 3600
}

const geminiModels = [
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (Recommended)', description: 'Best balance of performance and cost' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', description: 'Faster responses, lower cost' },
  { value: 'gemini-pro', label: 'Gemini Pro', description: 'Previous generation model' }
]

export default function ConfigurationModal({ isOpen, onClose, onSave }: ConfigurationModalProps) {
  const [config, setConfig] = useState<ConfigurationSettings>(defaultConfig)
  const [activeTab, setActiveTab] = useState<'ai' | 'agents' | 'forecasting' | 'ui' | 'advanced'>('ai')
  const [showApiKey, setShowApiKey] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    // Load configuration from localStorage
    const savedConfig = localStorage.getItem('chatbot_config')
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig)
        setConfig({ ...defaultConfig, ...parsed })
      } catch (error) {
        console.error('Failed to parse saved config:', error)
      }
    }
  }, [])

  const handleConfigChange = (key: string, value: any) => {
    setConfig(prev => {
      const newConfig = { ...prev }
      const keys = key.split('.')
      let current = newConfig as any
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]]
      }
      current[keys[keys.length - 1]] = value
      
      return newConfig
    })
    setHasChanges(true)
  }

  const handleSave = () => {
    localStorage.setItem('chatbot_config', JSON.stringify(config))
    onSave(config)
    setHasChanges(false)
    onClose()
  }

  const handleReset = () => {
    setConfig(defaultConfig)
    setHasChanges(true)
  }

  const testGeminiConnection = async () => {
    setTestingConnection(true)
    setConnectionStatus('testing')
    
    try {
      // Test the Gemini API connection
      const response = await fetch('/api/test-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: config.geminiApiKey,
          model: config.geminiModel
        })
      })
      
      if (response.ok) {
        setConnectionStatus('success')
      } else {
        setConnectionStatus('error')
      }
    } catch (error) {
      setConnectionStatus('error')
    } finally {
      setTestingConnection(false)
      setTimeout(() => setConnectionStatus('idle'), 3000)
    }
  }

  const tabs = [
    { id: 'ai', label: 'AI Configuration', icon: Brain },
    { id: 'agents', label: 'Agent Settings', icon: Bot },
    { id: 'forecasting', label: 'Forecasting', icon: Zap },
    { id: 'ui', label: 'Interface', icon: Settings },
    { id: 'advanced', label: 'Advanced', icon: Database }
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Configuration</h2>
                  <p className="text-sm text-gray-500">Customize your forecasting assistant</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {hasChanges && (
                  <span className="text-sm text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                    Unsaved changes
                  </span>
                )}
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex h-[600px]">
              {/* Sidebar */}
              <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
                <nav className="space-y-2">
                  {tabs.map((tab) => {
                    const Icon = tab.icon
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                          activeTab === tab.id
                            ? 'bg-blue-100 text-blue-700 border border-blue-200'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{tab.label}</span>
                      </button>
                    )
                  })}
                </nav>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* AI Configuration Tab */}
                {activeTab === 'ai' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Gemini AI Configuration</h3>
                      
                      {/* API Key */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          API Key
                        </label>
                        <div className="flex space-x-2">
                          <div className="flex-1 relative">
                            <input
                              type={showApiKey ? 'text' : 'password'}
                              value={config.geminiApiKey}
                              onChange={(e) => handleConfigChange('geminiApiKey', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Enter your Gemini API key"
                            />
                            <button
                              type="button"
                              onClick={() => setShowApiKey(!showApiKey)}
                              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                            >
                              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          <button
                            onClick={testGeminiConnection}
                            disabled={testingConnection || !config.geminiApiKey}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                          >
                            {connectionStatus === 'testing' && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                            {connectionStatus === 'success' && <CheckCircle className="w-4 h-4" />}
                            {connectionStatus === 'error' && <AlertTriangle className="w-4 h-4" />}
                            <span>Test</span>
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Get your API key from <a href="https://makersuite.google.com/app/apikey" target="_blank" className="text-blue-500 hover:underline">Google AI Studio</a>
                        </p>
                      </div>

                      {/* Model Selection */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Model
                        </label>
                        <select
                          value={config.geminiModel}
                          onChange={(e) => handleConfigChange('geminiModel', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {geminiModels.map((model) => (
                            <option key={model.value} value={model.value}>
                              {model.label}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          {geminiModels.find(m => m.value === config.geminiModel)?.description}
                        </p>
                      </div>

                      {/* Temperature */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Temperature: {config.temperature}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="2"
                          step="0.1"
                          value={config.temperature}
                          onChange={(e) => handleConfigChange('temperature', parseFloat(e.target.value))}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Conservative (0)</span>
                          <span>Creative (2)</span>
                        </div>
                      </div>

                      {/* Max Tokens */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Max Tokens
                        </label>
                        <input
                          type="number"
                          min="256"
                          max="8192"
                          value={config.maxTokens}
                          onChange={(e) => handleConfigChange('maxTokens', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      {/* Top P */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Top P: {config.topP}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={config.topP}
                          onChange={(e) => handleConfigChange('topP', parseFloat(e.target.value))}
                          className="w-full"
                        />
                      </div>

                      {/* Top K */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Top K
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={config.topK}
                          onChange={(e) => handleConfigChange('topK', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Agent Settings Tab */}
                {activeTab === 'agents' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Configuration</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Agent Timeout (seconds)
                          </label>
                          <input
                            type="number"
                            min="30"
                            max="3600"
                            value={config.agentTimeout}
                            onChange={(e) => handleConfigChange('agentTimeout', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Max Retries
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={config.maxRetries}
                            onChange={(e) => handleConfigChange('maxRetries', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Concurrent Tasks
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={config.concurrentTasks}
                            onChange={(e) => handleConfigChange('concurrentTasks', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Forecasting Tab */}
                {activeTab === 'forecasting' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Forecasting Parameters</h3>
                      
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Default Forecast Horizon (days)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="365"
                          value={config.defaultHorizon}
                          onChange={(e) => handleConfigChange('defaultHorizon', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Enabled Algorithms
                        </label>
                        <div className="space-y-3">
                          {Object.entries(config.algorithms).map(([algorithm, enabled]) => (
                            <label key={algorithm} className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={enabled}
                                onChange={(e) => handleConfigChange(`algorithms.${algorithm}`, e.target.checked)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700 capitalize">
                                {algorithm === 'xgboost' ? 'XGBoost' : 
                                 algorithm === 'lightgbm' ? 'LightGBM' : 
                                 algorithm === 'catboost' ? 'CatBoost' :
                                 algorithm === 'arima' ? 'ARIMA' :
                                 algorithm.charAt(0).toUpperCase() + algorithm.slice(1)}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Confidence Intervals
                        </label>
                        <div className="flex space-x-2">
                          {config.confidenceIntervals.map((interval, index) => (
                            <input
                              key={index}
                              type="number"
                              min="0.5"
                              max="0.99"
                              step="0.01"
                              value={interval}
                              onChange={(e) => {
                                const newIntervals = [...config.confidenceIntervals]
                                newIntervals[index] = parseFloat(e.target.value)
                                handleConfigChange('confidenceIntervals', newIntervals)
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* UI Tab */}
                {activeTab === 'ui' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Interface Preferences</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Theme
                          </label>
                          <select
                            value={config.theme}
                            onChange={(e) => handleConfigChange('theme', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                            <option value="auto">Auto (System)</option>
                          </select>
                        </div>

                        <div className="space-y-3">
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={config.animationsEnabled}
                              onChange={(e) => handleConfigChange('animationsEnabled', e.target.checked)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Enable animations</span>
                          </label>

                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={config.autoScroll}
                              onChange={(e) => handleConfigChange('autoScroll', e.target.checked)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Auto-scroll to new messages</span>
                          </label>

                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={config.showTechnicalDetails}
                              onChange={(e) => handleConfigChange('showTechnicalDetails', e.target.checked)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Show technical details</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Advanced Tab */}
                {activeTab === 'advanced' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Advanced Settings</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Log Level
                          </label>
                          <select
                            value={config.logLevel}
                            onChange={(e) => handleConfigChange('logLevel', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="error">Error</option>
                            <option value="warn">Warning</option>
                            <option value="info">Info</option>
                            <option value="debug">Debug</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Session Timeout (seconds)
                          </label>
                          <input
                            type="number"
                            min="300"
                            max="86400"
                            value={config.sessionTimeout}
                            onChange={(e) => handleConfigChange('sessionTimeout', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div className="space-y-3">
                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={config.debugMode}
                              onChange={(e) => handleConfigChange('debugMode', e.target.checked)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Debug mode</span>
                          </label>

                          <label className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={config.cacheEnabled}
                              onChange={(e) => handleConfigChange('cacheEnabled', e.target.checked)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Enable caching</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={handleReset}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset to Defaults</span>
              </button>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!hasChanges}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}