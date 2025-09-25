'use client'

import { motion } from 'framer-motion'
import { CheckCircle, Circle, Clock } from 'lucide-react'
import { ProcessingStep } from '../types'

interface ProgressTrackerProps {
  currentStep: ProcessingStep
  progress: number
  stepLabel: string
}

const steps = [
  { id: 'welcome', label: 'Welcome', icon: '👋' },
  { id: 'data_upload', label: 'Data Upload', icon: '📁' },
  { id: 'data_analysis', label: 'Analysis', icon: '🔍' },
  { id: 'preprocessing', label: 'Processing', icon: '🧹' },
  { id: 'model_selection', label: 'Models', icon: '🤖' },
  { id: 'training', label: 'Training', icon: '🏋️' },
  { id: 'results', label: 'Results', icon: '📊' },
  { id: 'export', label: 'Export', icon: '📋' }
]

export default function ProgressTracker({ currentStep, progress, stepLabel }: ProgressTrackerProps) {
  const getCurrentStepIndex = () => {
    return steps.findIndex(step => step.id === currentStep)
  }

  const getStepStatus = (stepIndex: number) => {
    const currentIndex = getCurrentStepIndex()
    if (stepIndex < currentIndex) return 'completed'
    if (stepIndex === currentIndex) return 'current'
    return 'pending'
  }

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-4xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                Step {getCurrentStepIndex() + 1} of {steps.length}: {stepLabel}
              </span>
            </div>
            <span className="text-sm text-gray-500">{progress}% complete</span>
          </div>
          
          <div className="progress-bar">
            <motion.div
              className="progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const status = getStepStatus(index)
            
            return (
              <div key={step.id} className="flex flex-col items-center space-y-1">
                {/* Step Circle */}
                <motion.div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                    status === 'completed'
                      ? 'bg-green-500 text-white'
                      : status === 'current'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                  initial={false}
                  animate={{
                    scale: status === 'current' ? 1.1 : 1,
                  }}
                  transition={{ duration: 0.2 }}
                >
                  {status === 'completed' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : status === 'current' ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    >
                      <Circle className="w-4 h-4" />
                    </motion.div>
                  ) : (
                    <span>{step.icon}</span>
                  )}
                </motion.div>

                {/* Step Label */}
                <span
                  className={`text-xs font-medium ${
                    status === 'completed' || status === 'current'
                      ? 'text-gray-900'
                      : 'text-gray-500'
                  }`}
                >
                  {step.label}
                </span>

                {/* Connection Line */}
                {index < steps.length - 1 && (
                  <div
                    className={`absolute h-0.5 w-12 mt-4 ${
                      status === 'completed' ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                    style={{
                      left: `${((index + 1) / steps.length) * 100}%`,
                      transform: 'translateX(-50%)'
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}