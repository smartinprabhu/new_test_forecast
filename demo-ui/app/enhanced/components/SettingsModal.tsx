'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sun, Moon, Key, Save, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, toggleTheme } = useTheme()
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [apiKeyStatus, setApiKeyStatus] = useState<'valid' | 'invalid' | 'testing' | null>(null)
  const [savedMessage, setSavedMessage] = useState('')

  useEffect(() => {
    if (isOpen) {
      // Load current API key from localStorage or environment
      const savedApiKey = localStorage.getItem('gemini_api_key') || 
                         process.env.NEXT_PUBLIC_GEMINI_API_KEY || 
                         'AIzaSyC9HUwhTJvg828gaLS7sfcG1DB5fGoB0CA'
      setApiKey(savedApiKey)
    }
  }, [isOpen])

  const validateApiKey = async (key: string): Promise<boolean> => {
    if (!key || key.length < 20) return false
    
    try {
      // Test the API key with a simple request
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${key}`)
      return response.ok
    } catch (error) {
      return false
    }
  }

  const handleApiKeyTest = async () => {
    setApiKeyStatus('testing')
    
    const isValid = await validateApiKey(apiKey)
    setApiKeyStatus(isValid ? 'valid' : 'invalid')
    
    setTimeout(() => {
      setApiKeyStatus(null)
    }, 3000)
  }

  const handleSaveSettings = () => {
    // Save API key to localStorage
    localStorage.setItem('gemini_api_key', apiKey)
    
    // Update environment variable for current session
    if (typeof window !== 'undefined') {
      (window as any).NEXT_PUBLIC_GEMINI_API_KEY = apiKey
    }
    
    setSavedMessage('Settings saved successfully!')
    setTimeout(() => {
      setSavedMessage('')
      onClose()
    }, 2000)
  }

  const handleReset = () => {
    const defaultKey = 'AIzaSyC9HUwhTJvg828gaLS7sfcG1DB5fGoB0CA'
    setApiKey(defaultKey)
    setApiKeyStatus(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Key className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Settings</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Customize your experience</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Theme Settings */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Appearance</h3>
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                {theme === 'light' ? (
                  <Sun className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Moon className="w-5 h-5 text-blue-400" />
                )}
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Theme</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {theme === 'light' ? 'Light mode' : 'Dark mode'}
                  </p>
                </div>
              </div>
              
              <button
                onClick={toggleTheme}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* API Key Settings */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">API Configuration</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Gemini API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your Gemini API key"
                    className="w-full px-4 py-3 pr-20 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-12 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  
                  {/* API Key Status */}
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {apiKeyStatus === 'testing' && (
                      <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                    )}
                    {apiKeyStatus === 'valid' && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    {apiKeyStatus === 'invalid' && (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                </div>
                
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Get your API key from{' '}
                    <a 
                      href="https://makersuite.google.com/app/apikey" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600 underline"
                    >
                      Google AI Studio
                    </a>
                  </p>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={handleApiKeyTest}
                      disabled={!apiKey || apiKeyStatus === 'testing'}
                      className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Test
                    </button>
                    <button
                      onClick={handleReset}
                      className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Status Messages */}
                <AnimatePresence>
                  {apiKeyStatus === 'valid' && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-sm text-green-700 dark:text-green-400"
                    >
                      ✅ API key is valid and working
                    </motion.div>
                  )}
                  
                  {apiKeyStatus === 'invalid' && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400"
                    >
                      ❌ API key is invalid or expired
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Current Status */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-400 mb-1">Current Configuration</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  API Key: {apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` : 'Not set'}
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Theme: {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
                </p>
              </div>
            </div>
          </div>

          {/* Success Message */}
          <AnimatePresence>
            {savedMessage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-center"
              >
                <CheckCircle className="w-5 h-5 text-green-500 mx-auto mb-1" />
                <p className="text-sm text-green-700 dark:text-green-400">{savedMessage}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveSettings}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </motion.div>
    </div>
  )
}