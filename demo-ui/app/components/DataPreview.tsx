'use client'

import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, Calendar, AlertTriangle, CheckCircle, Info } from 'lucide-react'

export default function DataPreview() {
  // Mock data for demonstration
  const sampleData = [
    { Date: '2023-01-01', Sales: 1000, Temperature: 15.2, Marketing_Spend: 500 },
    { Date: '2023-01-02', Sales: 1200, Temperature: 16.1, Marketing_Spend: 600 },
    { Date: '2023-01-03', Sales: 950, Temperature: 14.8, Marketing_Spend: 450 },
    { Date: '2023-01-04', Sales: 1100, Temperature: 15.5, Marketing_Spend: 550 },
    { Date: '2023-01-05', Sales: 1350, Temperature: 17.2, Marketing_Spend: 700 }
  ]

  const statistics = {
    row_count: 1825,
    column_count: 3,
    missing_percentage: 0,
    date_range: {
      start: '2020-01-01',
      end: '2024-12-31'
    },
    frequency: 'Daily'
  }

  const issues = [
    {
      type: 'warning' as const,
      message: '3 potential outliers detected',
      suggestion: 'Consider outlier treatment'
    },
    {
      type: 'info' as const,
      message: 'Strong seasonal patterns found',
      suggestion: 'Weekly and yearly seasonality detected'
    }
  ]

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />
      default:
        return <CheckCircle className="w-4 h-4 text-green-500" />
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      {/* Dataset Overview */}
      <div className="chart-container">
        <div className="flex items-center space-x-2 mb-4">
          <BarChart3 className="w-5 h-5 text-blue-500" />
          <h4 className="font-semibold text-gray-900">Dataset Overview</h4>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{statistics.row_count.toLocaleString()}</div>
            <div className="text-sm text-gray-500">Rows</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{statistics.column_count}</div>
            <div className="text-sm text-gray-500">Columns</div>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Frequency:</span>
            <span className="font-medium">{statistics.frequency}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Date Range:</span>
            <span className="font-medium">{statistics.date_range.start} to {statistics.date_range.end}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Missing Values:</span>
            <span className="font-medium text-green-600">{statistics.missing_percentage}%</span>
          </div>
        </div>
      </div>

      {/* Sample Data */}
      <div className="chart-container">
        <div className="flex items-center space-x-2 mb-4">
          <Calendar className="w-5 h-5 text-blue-500" />
          <h4 className="font-semibold text-gray-900">Sample Data</h4>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                {Object.keys(sampleData[0]).map((column) => (
                  <th key={column} className="text-left py-2 px-1 font-medium text-gray-700">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sampleData.map((row, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-2 px-1 text-gray-600">{row.Date}</td>
                  <td className="py-2 px-1 font-medium">${row.Sales.toLocaleString()}</td>
                  <td className="py-2 px-1 text-gray-600">{row.Temperature}°C</td>
                  <td className="py-2 px-1 text-gray-600">${row.Marketing_Spend}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Quality Issues */}
      <div className="chart-container">
        <div className="flex items-center space-x-2 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          <h4 className="font-semibold text-gray-900">Data Quality</h4>
        </div>
        
        <div className="space-y-3">
          {issues.map((issue, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              {getIssueIcon(issue.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{issue.message}</p>
                <p className="text-xs text-gray-500 mt-1">{issue.suggestion}</p>
              </div>
            </div>
          ))}
          
          <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-900">No missing values</p>
              <p className="text-xs text-green-600 mt-1">Dataset is complete and ready for analysis</p>
            </div>
          </div>
        </div>
      </div>

      {/* Column Information */}
      <div className="chart-container">
        <h4 className="font-semibold text-gray-900 mb-4">Column Details</h4>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <div>
              <span className="font-medium text-sm">Date</span>
              <span className="ml-2 text-xs text-gray-500">DateTime</span>
            </div>
            <span className="text-xs text-green-600 font-medium">✓ Valid</span>
          </div>
          
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <div>
              <span className="font-medium text-sm">Sales</span>
              <span className="ml-2 text-xs text-gray-500">Numeric (Target)</span>
            </div>
            <span className="text-xs text-green-600 font-medium">✓ Valid</span>
          </div>
          
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <div>
              <span className="font-medium text-sm">Temperature</span>
              <span className="ml-2 text-xs text-gray-500">Numeric (Regressor)</span>
            </div>
            <span className="text-xs text-blue-600 font-medium">Corr: 0.34</span>
          </div>
          
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <div>
              <span className="font-medium text-sm">Marketing_Spend</span>
              <span className="ml-2 text-xs text-gray-500">Numeric (Regressor)</span>
            </div>
            <span className="text-xs text-blue-600 font-medium">Corr: 0.67</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}