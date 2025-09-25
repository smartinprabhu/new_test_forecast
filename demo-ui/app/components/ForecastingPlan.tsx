'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ChevronDown,
    ChevronRight,
    Edit3,
    Check,
    X,
    Settings,
    Database,
    Brain,
    BarChart3,
    Download,
    AlertCircle,
    CheckCircle,
    Clock,
    Play
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
        parameters?: { [key: string]: any }
        enabled?: boolean
    }
}

interface ForecastingPlanProps {
    onStartExecution: () => void
    onStepEdit: (stepId: number, changes: any) => void
    onClose?: () => void
}

export default function ForecastingPlan({ onStartExecution, onStepEdit, onClose }: ForecastingPlanProps) {
    const [steps, setSteps] = useState<PlanStep[]>([
        {
            id: 1,
            title: "Analyze Your Dataset",
            description: "I have reviewed your sales data (1,825 rows, daily frequency). The dataset contains sales, temperature, and marketing spend with strong seasonal patterns detected.",
            details: [
                "✅ Data Quality: Excellent (0% missing values)",
                "📊 Frequency: Daily (consistent intervals)",
                "📈 Patterns: Weekly seasonality + yearly trends",
                "🎯 Target Variable: Sales ($1,000 - $5,000 range)",
                "🌡️ External Variables: Temperature (correlation: 0.34), Marketing Spend (correlation: 0.67)"
            ],
            status: 'completed',
            editable: false,
            expanded: true
        },
        {
            id: 2,
            title: "Data Preprocessing & Feature Engineering",
            description: "I will clean your data and create optimal features for forecasting. This includes handling outliers, creating lag features, and adding time-based variables.",
            details: [
                "🔍 Outlier Detection: MAD method (3 outliers found)",
                "🧹 Outlier Treatment: Spline interpolation for holiday spikes",
                "⚙️ Feature Creation: Lag features (1, 7, 14, 30 days)",
                "📊 Rolling Statistics: 7-day and 14-day moving averages",
                "🗓️ Time Features: Day of week, month, quarter, holidays",
                "📏 Data Scaling: StandardScaler for all numeric features"
            ],
            status: 'current',
            editable: true,
            expanded: true,
            options: {
                methods: ['Auto (Recommended)', 'Custom Configuration', 'Skip Preprocessing'],
                selectedMethod: 'Auto (Recommended)',
                parameters: {
                    outlierMethod: 'MAD',
                    outlierTreatment: 'Spline Interpolation',
                    lagPeriods: [1, 7, 14, 30],
                    rollingWindows: [7, 14],
                    includeHolidays: true,
                    scaling: 'StandardScaler'
                },
                enabled: true
            }
        },
        {
            id: 3,
            title: "Algorithm Selection & Model Configuration",
            description: "Based on your data characteristics, I recommend training multiple algorithms and comparing their performance to find the best model.",
            details: [
                "🥇 XGBoost: Excellent for complex patterns with external variables",
                "🥈 Prophet: Perfect for trend + seasonality with holiday effects",
                "🥉 LightGBM: Fast and accurate for large datasets",
                "📊 CatBoost: Robust to outliers and missing values",
                "📈 ARIMA: Classical statistical approach (optional)",
                "🔧 External Regressors: Temperature and Marketing Spend included"
            ],
            status: 'pending',
            editable: true,
            expanded: false,
            options: {
                methods: ['Recommended Models (4)', 'Custom Selection', 'Quick Forecast (XGBoost only)'],
                selectedMethod: 'Recommended Models (4)',
                parameters: {
                    algorithms: ['XGBoost', 'Prophet', 'LightGBM', 'CatBoost'],
                    includeRegressors: true,
                    holidayEffects: true,
                    seasonalityMode: 'auto'
                },
                enabled: true
            }
        },
        {
            id: 4,
            title: "Model Training & Cross-Validation",
            description: "I will train each selected algorithm using time series cross-validation to ensure robust performance estimates and prevent overfitting.",
            details: [
                "🔄 Time Series CV: Expanding window validation",
                "📊 Performance Metrics: MAPE, MAE, RMSE, R², Directional Accuracy",
                "⏱️ Estimated Training Time: 5-10 minutes",
                "🎯 Hyperparameter Optimization: Auto-tuning for best performance",
                "📈 Model Comparison: Side-by-side performance analysis",
                "🏆 Champion Selection: Automatic best model identification"
            ],
            status: 'pending',
            editable: true,
            expanded: false,
            options: {
                methods: ['Auto Training', 'Custom Hyperparameters', 'Quick Training'],
                selectedMethod: 'Auto Training',
                parameters: {
                    cvFolds: 5,
                    optimizeHyperparameters: true,
                    earlyStoppingRounds: 50,
                    validationSplit: 0.2
                },
                enabled: true
            }
        },
        {
            id: 5,
            title: "Model Evaluation & Performance Analysis",
            description: "I will evaluate all trained models, compare their performance, and provide detailed analysis to help you choose the best approach.",
            details: [
                "📊 Performance Dashboard: Interactive model comparison",
                "🎯 Accuracy Metrics: MAPE, MAE, RMSE with confidence intervals",
                "📈 Forecast Visualization: Actual vs predicted with uncertainty bands",
                "🔍 Feature Importance: Which variables drive your forecasts",
                "📋 Model Diagnostics: Residual analysis and assumption checks",
                "🏆 Recommendation: Clear winner with performance justification"
            ],
            status: 'pending',
            editable: false,
            expanded: false
        },
        {
            id: 6,
            title: "Generate Forecasts & Confidence Intervals",
            description: "Using the best performing model, I will generate forecasts for your specified horizon with reliable confidence intervals.",
            details: [
                "🔮 Forecast Horizon: 30 days (customizable: 1-365 days)",
                "📊 Confidence Intervals: 80% and 95% prediction bands",
                "📈 Trend Analysis: Future trend direction and strength",
                "🎯 Point Forecasts: Daily predictions with exact values",
                "⚠️ Uncertainty Quantification: Forecast reliability assessment",
                "📋 Scenario Analysis: Best case, worst case, most likely outcomes"
            ],
            status: 'pending',
            editable: true,
            expanded: false,
            options: {
                methods: ['30 Days', '60 Days', '90 Days', 'Custom Horizon'],
                selectedMethod: '30 Days',
                parameters: {
                    forecastHorizon: 30,
                    confidenceLevels: [80, 95],
                    includeScenarios: true
                },
                enabled: true
            }
        },
        {
            id: 7,
            title: "Export Results & Model Deployment",
            description: "I will package your forecasts, trained models, and analysis reports in multiple formats for easy integration into your workflow.",
            details: [
                "📊 Forecast Data: CSV, Excel, JSON formats with metadata",
                "📈 Interactive Dashboard: HTML report with charts and insights",
                "🤖 Trained Models: Serialized models for future predictions",
                "📋 Analysis Report: Executive summary with key findings",
                "🔧 API Integration: REST endpoints for real-time predictions",
                "📚 Documentation: Model usage guide and best practices"
            ],
            status: 'pending',
            editable: true,
            expanded: false,
            options: {
                methods: ['Complete Package', 'Forecasts Only', 'Models Only', 'Custom Selection'],
                selectedMethod: 'Complete Package',
                parameters: {
                    includeForecasts: true,
                    includeModels: true,
                    includeReports: true,
                    includeAPI: false
                },
                enabled: true
            }
        }
    ])

    const [editingStep, setEditingStep] = useState<number | null>(null)

    const toggleStepExpansion = (stepId: number) => {
        setSteps(prev => prev.map(step =>
            step.id === stepId
                ? { ...step, expanded: !step.expanded }
                : step
        ))
    }

    const startEditing = (stepId: number) => {
        setEditingStep(stepId)
    }

    const saveEdit = (stepId: number) => {
        setEditingStep(null)
        // Here you would typically save the changes
        onStepEdit(stepId, steps.find(s => s.id === stepId))
    }

    const cancelEdit = () => {
        setEditingStep(null)
        // Reset any unsaved changes
    }

    const updateStepOption = (stepId: number, optionKey: string, value: any) => {
        setSteps(prev => prev.map(step =>
            step.id === stepId && step.options
                ? {
                    ...step,
                    options: {
                        ...step.options,
                        [optionKey]: value
                    }
                }
                : step
        ))
    }

    const getStepIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="w-5 h-5 text-green-500" />
            case 'current':
                return <Clock className="w-5 h-5 text-blue-500" />
            default:
                return <AlertCircle className="w-5 h-5 text-gray-400" />
        }
    }

    const getStepNumber = (id: number) => {
        return (
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${steps.find(s => s.id === id)?.status === 'completed'
                ? 'bg-green-500 text-white'
                : steps.find(s => s.id === id)?.status === 'current'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                {id}
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto p-6 bg-gray-900 text-white rounded-lg">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-white">📊 Forecasting Execution Plan</h2>
                    <div className="flex items-center space-x-3">
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                            >
                                <X className="w-4 h-4" />
                                <span>Close</span>
                            </button>
                        )}
                        <button
                            onClick={onStartExecution}
                            className="flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                        >
                            <Play className="w-5 h-5" />
                            <span>Execute Plan</span>
                        </button>
                    </div>
                </div>
                <p className="text-gray-300">
                    Based on your sales dataset analysis, here's the step-by-step plan I'll execute to create accurate forecasts.
                    You can customize any step by clicking the edit button.
                </p>
            </div>

            {/* Steps */}
            <div className="space-y-4">
                {steps.map((step, index) => (
                    <motion.div
                        key={step.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`border rounded-lg overflow-hidden ${step.status === 'completed'
                            ? 'border-green-500 bg-green-900/20'
                            : step.status === 'current'
                                ? 'border-blue-500 bg-blue-900/20'
                                : 'border-gray-600 bg-gray-800/50'
                            }`}
                    >
                        {/* Step Header */}
                        <div className="p-4">
                            <div className="flex items-start space-x-4">
                                {/* Step Number */}
                                {getStepNumber(step.id)}

                                {/* Step Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center space-x-3">
                                            <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                                            {getStepIcon(step.status)}
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            {step.editable && (
                                                <button
                                                    onClick={() => editingStep === step.id ? saveEdit(step.id) : startEditing(step.id)}
                                                    className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
                                                >
                                                    {editingStep === step.id ? <Check className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                                                </button>
                                            )}

                                            <button
                                                onClick={() => toggleStepExpansion(step.id)}
                                                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
                                            >
                                                {step.expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <p className="text-gray-300 text-sm leading-relaxed">
                                        {step.description}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Expanded Content */}
                        <AnimatePresence>
                            {step.expanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="border-t border-gray-600"
                                >
                                    <div className="p-4 space-y-4">
                                        {/* Step Details */}
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-300 mb-3">What I'll do:</h4>
                                            <div className="space-y-2">
                                                {step.details.map((detail, idx) => (
                                                    <div key={idx} className="flex items-start space-x-2 text-sm text-gray-400">
                                                        <span className="mt-1">•</span>
                                                        <span>{detail}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Editable Options */}
                                        {step.options && editingStep === step.id && (
                                            <div className="border-t border-gray-600 pt-4">
                                                <h4 className="text-sm font-medium text-gray-300 mb-3">Configuration Options:</h4>

                                                {/* Method Selection */}
                                                {step.options.methods && (
                                                    <div className="mb-4">
                                                        <label className="block text-xs text-gray-400 mb-2">Method:</label>
                                                        <select
                                                            value={step.options.selectedMethod}
                                                            onChange={(e) => updateStepOption(step.id, 'selectedMethod', e.target.value)}
                                                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        >
                                                            {step.options.methods.map((method) => (
                                                                <option key={method} value={method}>{method}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}

                                                {/* Parameters */}
                                                {step.options.parameters && (
                                                    <div className="grid grid-cols-2 gap-4">
                                                        {Object.entries(step.options.parameters).map(([key, value]) => (
                                                            <div key={key}>
                                                                <label className="block text-xs text-gray-400 mb-1 capitalize">
                                                                    {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                                                                </label>
                                                                {typeof value === 'boolean' ? (
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={value}
                                                                        onChange={(e) => updateStepOption(step.id, 'parameters', {
                                                                            ...step.options!.parameters,
                                                                            [key]: e.target.checked
                                                                        })}
                                                                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                                                                    />
                                                                ) : Array.isArray(value) ? (
                                                                    <input
                                                                        type="text"
                                                                        value={value.join(', ')}
                                                                        onChange={(e) => updateStepOption(step.id, 'parameters', {
                                                                            ...step.options!.parameters,
                                                                            [key]: e.target.value.split(', ').map(v => isNaN(Number(v)) ? v : Number(v))
                                                                        })}
                                                                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:ring-1 focus:ring-blue-500"
                                                                    />
                                                                ) : (
                                                                    <input
                                                                        type={typeof value === 'number' ? 'number' : 'text'}
                                                                        value={value}
                                                                        onChange={(e) => updateStepOption(step.id, 'parameters', {
                                                                            ...step.options!.parameters,
                                                                            [key]: typeof value === 'number' ? Number(e.target.value) : e.target.value
                                                                        })}
                                                                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:ring-1 focus:ring-blue-500"
                                                                    />
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Action Buttons */}
                                                <div className="flex items-center space-x-2 mt-4">
                                                    <button
                                                        onClick={() => saveEdit(step.id)}
                                                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                                                    >
                                                        Save Changes
                                                    </button>
                                                    <button
                                                        onClick={cancelEdit}
                                                        className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Show current configuration when not editing */}
                                        {step.options && editingStep !== step.id && (
                                            <div className="border-t border-gray-600 pt-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <span className="text-xs text-gray-400">Current method: </span>
                                                        <span className="text-sm text-white font-medium">{step.options.selectedMethod}</span>
                                                    </div>
                                                    {step.editable && (
                                                        <button
                                                            onClick={() => startEditing(step.id)}
                                                            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                                        >
                                                            Customize →
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                ))}
            </div>

            {/* Summary */}
            <div className="mt-8 p-4 bg-gray-800 rounded-lg border border-gray-600">
                <h3 className="text-lg font-semibold text-white mb-3">📋 Execution Summary</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <div className="text-2xl font-bold text-green-400">
                            {steps.filter(s => s.status === 'completed').length}
                        </div>
                        <div className="text-sm text-gray-400">Completed</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-blue-400">
                            {steps.filter(s => s.status === 'current').length}
                        </div>
                        <div className="text-sm text-gray-400">Current</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-gray-400">
                            {steps.filter(s => s.status === 'pending').length}
                        </div>
                        <div className="text-sm text-gray-400">Pending</div>
                    </div>
                </div>

                <div className="mt-4 text-sm text-gray-300">
                    <strong>Estimated Total Time:</strong> 15-25 minutes
                    <br />
                    <strong>Expected Accuracy:</strong> 8-12% MAPE (Excellent for sales forecasting)
                </div>
            </div>
        </div>
    )
}