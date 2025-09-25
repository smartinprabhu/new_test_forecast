'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Download, BarChart3, TrendingUp, Eye, EyeOff } from 'lucide-react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface ModelResult {
  name: string
  mape: number
  mae: number
  rmse: number
  r2: number
  color: string
  visible: boolean
  actualData: number[]
  forecastData: number[]
  futureData: number[]
  confidenceUpper?: number[]
  confidenceLower?: number[]
}

interface ForecastResultsModalProps {
  isOpen: boolean
  onClose: () => void
  results: {
    models: ModelResult[]
    dates: string[]
    futureDates: string[]
    historicalDates: string[]
  }
}

export default function ForecastResultsModal({ isOpen, onClose, results }: ForecastResultsModalProps) {
  const [selectedModels, setSelectedModels] = useState<Record<string, boolean>>(
    results.models.reduce((acc, model) => ({ ...acc, [model.name]: true }), {})
  )
  const [showConfidenceIntervals, setShowConfidenceIntervals] = useState(true)

  if (!isOpen) return null

  const toggleModel = (modelName: string) => {
    setSelectedModels(prev => ({
      ...prev,
      [modelName]: !prev[modelName]
    }))
  }

  const exportToCSV = () => {
    const csvData = []
    
    // Headers
    const headers = ['Date', 'Actual']
    results.models.forEach(model => {
      if (selectedModels[model.name]) {
        headers.push(`${model.name}_Forecast`)
        if (model.confidenceUpper) {
          headers.push(`${model.name}_Upper`)
          headers.push(`${model.name}_Lower`)
        }
      }
    })
    csvData.push(headers.join(','))

    // Historical data
    results.historicalDates.forEach((date, index) => {
      const row = [date, results.models[0]?.actualData[index] || '']
      results.models.forEach(model => {
        if (selectedModels[model.name]) {
          row.push(model.forecastData[index] || '')
          if (model.confidenceUpper) {
            row.push(model.confidenceUpper[index] || '')
            row.push(model.confidenceLower?.[index] || '')
          }
        }
      })
      csvData.push(row.join(','))
    })

    // Future data
    results.futureDates.forEach((date, index) => {
      const row = [date, ''] // No actual data for future
      results.models.forEach(model => {
        if (selectedModels[model.name]) {
          row.push(model.futureData[index] || '')
          if (model.confidenceUpper) {
            row.push(model.confidenceUpper[results.historicalDates.length + index] || '')
            row.push(model.confidenceLower?.[results.historicalDates.length + index] || '')
          }
        }
      })
      csvData.push(row.join(','))
    })

    // Download
    const blob = new Blob([csvData.join('\n')], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `forecast_results_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  // Prepare chart data
  const allDates = [...results.historicalDates, ...results.futureDates]
  
  const chartData = {
    labels: allDates,
    datasets: [
      // Actual data
      {
        label: 'Actual Data',
        data: [...(results.models[0]?.actualData || []), ...new Array(results.futureDates.length).fill(null)],
        borderColor: '#1f2937',
        backgroundColor: '#1f2937',
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 4,
        tension: 0.1,
        spanGaps: false
      },
      // Model forecasts
      ...results.models
        .filter(model => selectedModels[model.name])
        .map(model => ({
          label: `${model.name} Forecast`,
          data: [...model.forecastData, ...model.futureData],
          borderColor: model.color,
          backgroundColor: model.color + '20',
          borderWidth: 2,
          pointRadius: 1,
          pointHoverRadius: 3,
          tension: 0.1,
          borderDash: model.name !== 'Actual' ? [5, 5] : undefined
        })),
      // Confidence intervals
      ...(showConfidenceIntervals ? results.models
        .filter(model => selectedModels[model.name] && model.confidenceUpper)
        .flatMap(model => [
          {
            label: `${model.name} Upper CI`,
            data: model.confidenceUpper,
            borderColor: model.color + '40',
            backgroundColor: 'transparent',
            borderWidth: 1,
            pointRadius: 0,
            tension: 0.1,
            fill: '+1'
          },
          {
            label: `${model.name} Lower CI`,
            data: model.confidenceLower,
            borderColor: model.color + '40',
            backgroundColor: model.color + '10',
            borderWidth: 1,
            pointRadius: 0,
            tension: 0.1,
            fill: false
          }
        ]) : [])
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          filter: (legendItem: any) => !legendItem.text.includes('CI') || showConfidenceIntervals
        }
      },
      title: {
        display: true,
        text: 'Forecast Results: Actual vs Predicted Data'
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          title: (context: any) => {
            const dateIndex = context[0].dataIndex
            return allDates[dateIndex]
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Date'
        },
        ticks: {
          maxTicksLimit: 10
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Value'
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Forecast Results</h2>
              <p className="text-sm text-gray-600">Actual vs Predicted Data with Future Forecasts</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={exportToCSV}
              className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chart Area */}
          <div className="flex-1 p-6">
            <div className="h-full">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>

          {/* Controls Sidebar */}
          <div className="w-80 border-l border-gray-200 p-6 overflow-y-auto">
            {/* Model Controls */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Model Visibility</h3>
              <div className="space-y-3">
                {results.models.map((model) => (
                  <div key={model.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: model.color }}
                      />
                      <span className="text-sm font-medium text-gray-700">{model.name}</span>
                    </div>
                    <button
                      onClick={() => toggleModel(model.name)}
                      className={`p-1 rounded ${
                        selectedModels[model.name] ? 'text-blue-600' : 'text-gray-400'
                      }`}
                    >
                      {selectedModels[model.name] ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart Options */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Chart Options</h3>
              <div className="space-y-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={showConfidenceIntervals}
                    onChange={(e) => setShowConfidenceIntervals(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Show Confidence Intervals</span>
                </label>
              </div>
            </div>

            {/* Model Performance */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Model Performance</h3>
              <div className="space-y-4">
                {results.models.map((model) => (
                  <div key={model.name} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: model.color }}
                      />
                      <span className="font-medium text-gray-900">{model.name}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">MAPE:</span>
                        <span className="ml-1 font-medium">{model.mape.toFixed(2)}%</span>
                      </div>
                      <div>
                        <span className="text-gray-600">MAE:</span>
                        <span className="ml-1 font-medium">{model.mae.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">RMSE:</span>
                        <span className="ml-1 font-medium">{model.rmse.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">R²:</span>
                        <span className="ml-1 font-medium">{model.r2.toFixed(3)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}