'use client'

import { motion } from 'framer-motion'
import { Zap, StepForward, Info } from 'lucide-react'
import { WorkflowMode } from '../../types/enhanced'

interface ModeSelectorProps {
  currentMode: WorkflowMode
  onModeChange: (mode: WorkflowMode) => void
  disabled?: boolean
}

export default function ModeSelector({ currentMode, onModeChange, disabled }: ModeSelectorProps) {
  return (
    <div className="flex items-center space-x-4">
      {/* Mode Toggle */}
      <div className="flex bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => onModeChange('auto-execute')}
          disabled={disabled}
          className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
            currentMode === 'auto-execute'
              ? 'bg-white text-orange-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Zap className="w-4 h-4" />
          <span>Auto-Execute</span>
        </button>
        
        <button
          onClick={() => onModeChange('step-by-step')}
          disabled={disabled}
          className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
            currentMode === 'step-by-step'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <StepForward className="w-4 h-4" />
          <span>Step-by-Step</span>
        </button>
      </div>

      {/* Mode Description */}
      <motion.div
        key={currentMode}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-center space-x-2 text-sm text-gray-600"
      >
        <Info className="w-4 h-4" />
        <span>
          {currentMode === 'auto-execute'
            ? 'Fully automated workflow with intelligent defaults'
            : 'Review and approve each step for full control'
          }
        </span>
      </motion.div>
    </div>
  )
}