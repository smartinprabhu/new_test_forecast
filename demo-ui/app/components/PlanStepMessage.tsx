'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  ChevronRight,
  Edit3,
  Check,
  X,
  Play,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react'

interface PlanStep {
  id: number
  title: string
  description: string
  details: string[]
  status: 'pending' | 'current' | 'completed'
  editable: boolean
  expanded: boolean
  options?: {
    methods?: string[]
    selectedMethod?: string
    enabled?: boolean
  }
}

interface PlanStepMessageProps {
  onExecute: () => void
}

export default function PlanStepMessage({ onExecute }: PlanStepMessageProps) {
  const [steps, setSteps] = useState<PlanStep[]>([
    {
      id: 1,
      title: "Data Analysis Complete ✅",
      description: "Your sales dataset (1,825 rows, daily frequency) has been analyzed. Strong seasonal patterns detected with 3 minor outliers.",
      details: [
        "✅ Data Quality: Excellent (0% missing values)",
        "📊 Frequency: Daily (consistent intervals)",
        "📈 Patterns: Weekly seasonality + yearly trends",
        "🎯 Target: Sales ($1,000 - $5,000 range)",
        "🌡️ External: Temperature (corr: 0.34), Marketing (corr: 0.67)"
      ],
      status: 'completed',
      editable: false,
      expanded: false
    },
    {
      id: 2,
      title: "Data Preprocessing & Feature Engineering",
      description: "Clean data and create optimal features: handle 3 outliers with spline interpolation, create lag features (1,7,14,30 days), add rolling statistics and time features.",
      details: [
        "🔍 Outlier Detection: MAD method → 3 outliers found",
        "🧹 Treatment: Spline interpolation for holiday spikes",
        "⚙️ Lag Features: 1, 7, 14, 30 day lags",
        "📊 Rolling Stats: 7-day and 14-day moving averages",
        "🗓️ Time Features: Day of week, month, holidays",
        "📏 Scaling: StandardScaler for all features"
      ],
      status: 'current',
      editable: true,
      expanded: true,
      options: {
        methods: ['Auto (Recommended)', 'Custom', 'Skip'],
        selectedMethod: 'Auto (Recommended)',
        enabled: true
      }
    },
    {
      id: 3,
      title: "Multi-Algorithm Training",
      description: "Train and compare 4 algorithms: XGBoost (complex patterns), Prophet (seasonality), LightGBM (speed), CatBoost (robustness). Expected best: XGBoost ~8-12% MAPE.",
      details: [
        "🥇 XGBoost: Complex patterns + external variables",
        "🥈 Prophet: Trend + seasonality + holidays",
        "🥉 LightGBM: Fast training, good accuracy",
        "📊 CatBoost: Robust to outliers",
        "🔧 External Regressors: Temperature + Marketing",
        "⏱️ Training Time: ~5-8 minutes total"
      ],
      status: 'pending',
      editable: true,
      expanded: false,
      options: {
        methods: ['All 4 Models', 'XGBoost + Prophet', 'XGBoost Only'],
        selectedMethod: 'All 4 Models',
        enabled: true
      }
    },
    {
      id: 4,
      title: "Model Evaluation & Selection",
      description: "Compare performance using MAPE, MAE, RMSE, R². Generate forecasts with confidence intervals. Select champion model automatically.",
      details: [
        "📊 Metrics: MAPE, MAE, RMSE, R², Directional Accuracy",
        "📈 Visualization: Actual vs Predicted charts",
        "🔍 Feature Importance: Top driving variables",
        "🏆 Auto Selection: Best performing model",
        "📋 Diagnostics: Residual analysis",
        "⚡ Expected Winner: XGBoost (8-12% MAPE)"
      ],
      status: 'pending',
      editable: false,
      expanded: false
    },
    {
      id: 5,
      title: "Generate 30-Day Forecasts",
      description: "Create forecasts for next 30 days with 95% confidence intervals. Include trend analysis and scenario planning (best/worst/likely cases).",
      details: [
        "🔮 Horizon: 30 days (Jan 16 - Feb 15, 2024)",
        "📊 Confidence: 80% and 95% prediction bands",
        "📈 Trend: Future direction and strength",
        "🎯 Daily Values: Exact predictions with dates",
        "⚠️ Uncertainty: Reliability assessment",
        "📋 Scenarios: Best/worst/most likely outcomes"
      ],
      status: 'pending',
      editable: true,
      expanded: false,
      options: {
        methods: ['30 Days', '60 Days', '90 Days'],
        selectedMethod: '30 Days',
        enabled: true
      }
    },
    {
      id: 6,
      title: "Export Results & Documentation",
      description: "Package forecasts, models, and reports in multiple formats: CSV/Excel data, interactive charts, trained models, and executive summary.",
      details: [
        "📊 Data: CSV, Excel, JSON with metadata",
        "📈 Charts: Interactive HTML dashboard",
        "🤖 Models: Serialized for future use",
        "📋 Reports: Executive summary PDF",
        "🔧 API: REST endpoints ready",
        "📚 Docs: Usage guide and best practices"
      ],
      status: 'pending',
      editable: false,
      expanded: false
    }
  ])

  const [editingStep, setEditingStep] = useState<number | null>(null)

  const toggleExpand = (stepId: number) => {
    setSteps(prev => prev.map(step =>
      step.id === stepId ? { ...step, expanded: !step.expanded } : step
    ))
  }

  const startEdit = (stepId: number) => {
    setEditingStep(stepId)
  }

  const saveEdit = () => {
    setEditingStep(null)
  }

  const updateMethod = (stepId: number, method: string) => {
    setSteps(prev => prev.map(step =>
      step.id === stepId && step.options
        ? { ...step, options: { ...step.options, selectedMethod: method } }
        : step
    ))
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'current':
        return <Clock className="w-5 h-5 text-blue-500" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />
    }
  }

  const getStepNumber = (id: number, status: string) => {
    return (
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${status === 'completed'
        ? 'bg-green-500 text-white'
        : status === 'current'
          ? 'bg-blue-500 text-white'
          : 'bg-gray-200 text-gray-600'
        }`}>
        {status === 'completed' ? '✓' : id}
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">📊 Forecasting Execution Plan</h3>
            <p className="text-sm text-gray-600 mt-1">
              Step-by-step process to create accurate forecasts from your sales data
            </p>
          </div>
          <button
            onClick={onExecute}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            <Play className="w-4 h-4" />
            <span>Execute Plan</span>
          </button>
        </div>
      </div>

      {/* Steps */}
      <div className="divide-y divide-gray-100">
        {steps.map((step, index) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.1 }}
            className={`p-4 ${step.status === 'completed'
              ? 'bg-green-50/50'
              : step.status === 'current'
                ? 'bg-blue-50/50'
                : 'bg-white'
              }`}
          >
            {/* Step Header */}
            <div className="flex items-start space-x-3">
              {/* Step Number */}
              {getStepNumber(step.id, step.status)}

              {/* Step Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold text-gray-900">{step.title}</h4>
                    {getStatusIcon(step.status)}
                  </div>

                  <div className="flex items-center space-x-1">
                    {step.editable && (
                      <button
                        onClick={() => editingStep === step.id ? saveEdit() : startEdit(step.id)}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                      >
                        {editingStep === step.id ? <Check className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                      </button>
                    )}

                    <button
                      onClick={() => toggleExpand(step.id)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    >
                      {step.expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <p className="text-sm text-gray-700 leading-relaxed mb-2">
                  {step.description}
                </p>

                {/* Method Selection (when editing) */}
                {step.options && editingStep === step.id && (
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                    <label className="block text-xs font-medium text-gray-700 mb-2">Method:</label>
                    <select
                      value={step.options.selectedMethod}
                      onChange={(e) => updateMethod(step.id, e.target.value)}
                      className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {step.options.methods?.map((method) => (
                        <option key={method} value={method}>{method}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Current Method (when not editing) */}
                {step.options && editingStep !== step.id && (
                  <div className="mb-2">
                    <span className="text-xs text-gray-500">Method: </span>
                    <span className="text-xs font-medium text-blue-600">{step.options.selectedMethod}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Expanded Details */}
            <AnimatePresence>
              {step.expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="ml-11 mt-3 overflow-hidden"
                >
                  <div className="space-y-1">
                    {step.details.map((detail, idx) => (
                      <div key={idx} className="flex items-start space-x-2 text-xs text-gray-600">
                        <span className="text-gray-400 mt-1">•</span>
                        <span>{detail}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Summary Footer */}
      <div className="bg-gray-50 p-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">
              <strong>Total Time:</strong> ~15-20 minutes
            </span>
            <span className="text-gray-600">
              <strong>Expected Accuracy:</strong> 8-12% MAPE
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-green-600 font-medium">
              {steps.filter(s => s.status === 'completed').length} completed
            </span>
            <span className="text-blue-600 font-medium">
              {steps.filter(s => s.status === 'current').length} current
            </span>
            <span className="text-gray-500 font-medium">
              {steps.filter(s => s.status === 'pending').length} pending
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}