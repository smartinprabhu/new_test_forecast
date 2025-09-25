'use client'

import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, ComposedChart } from 'recharts'
import { TrendingUp, Award, BarChart3 } from 'lucide-react'

export default function ForecastChart() {
  // Mock forecast data for demonstration
  const forecastData = [
    { date: '2024-01-10', actual: 1200, predicted: null, lower: null, upper: null },
    { date: '2024-01-11', actual: 1150, predicted: null, lower: null, upper: null },
    { date: '2024-01-12', actual: 1300, predicted: null, lower: null, upper: null },
    { date: '2024-01-13', actual: 1250, predicted: null, lower: null, upper: null },
    { date: '2024-01-14', actual: 1180, predicted: null, lower: null, upper: null },
    { date: '2024-01-15', actual: 1220, predicted: null, lower: null, upper: null },
    { date: '2024-01-16', actual: null, predicted: 1245, lower: 1156, upper: 1334 },
    { date: '2024-01-17', actual: null, predicted: 1289, lower: 1198, upper: 1380 },
    { date: '2024-01-18', actual: null, predicted: 1198, lower: 1109, upper: 1287 },
    { date: '2024-01-19', actual: null, predicted: 1267, lower: 1176, upper: 1358 },
    { date: '2024-01-20', actual: null, predicted: 1334, lower: 1241, upper: 1427 },
    { date: '2024-01-21', actual: null, predicted: 1298, lower: 1203, upper: 1393 },
    { date: '2024-01-22', actual: null, predicted: 1356, lower: 1259, upper: 1453 }
  ]

  const modelPerformance = [
    { model: 'XGBoost', mape: 8.2, mae: 142, rmse: 189, r2: 0.89, rank: 1, color: '#10b981' },
    { model: 'Prophet', mape: 12.1, mae: 167, rmse: 223, r2: 0.82, rank: 2, color: '#3b82f6' },
    { model: 'LightGBM', mape: 13.4, mae: 178, rmse: 241, r2: 0.79, rank: 3, color: '#f59e0b' },
    { model: 'CatBoost', mape: 14.7, mae: 189, rmse: 256, r2: 0.76, rank: 4, color: '#ef4444' }
  ]

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{formatDate(label)}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: ${entry.value?.toLocaleString()}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      {/* Forecast Chart */}
      <div className="chart-container">
        <div className="flex items-center space-x-2 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          <h4 className="font-semibold text-gray-900">Sales Forecast</h4>
        </div>
        
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={forecastData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              {/* Confidence Interval */}
              <Area
                type="monotone"
                dataKey="upper"
                stackId="1"
                stroke="none"
                fill="#3b82f6"
                fillOpacity={0.1}
                name="Upper Bound"
              />
              <Area
                type="monotone"
                dataKey="lower"
                stackId="1"
                stroke="none"
                fill="#ffffff"
                fillOpacity={1}
                name="Lower Bound"
              />
              
              {/* Actual Data */}
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#1f2937"
                strokeWidth={2}
                dot={{ fill: '#1f2937', strokeWidth: 2, r: 3 }}
                name="Actual Sales"
                connectNulls={false}
              />
              
              {/* Predicted Data */}
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                name="Predicted Sales"
                connectNulls={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Forecast Period:</strong> Jan 16-22, 2024 (7 days)
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Shaded area represents 95% confidence interval
          </p>
        </div>
      </div>

      {/* Model Performance */}
      <div className="chart-container">
        <div className="flex items-center space-x-2 mb-4">
          <Award className="w-5 h-5 text-blue-500" />
          <h4 className="font-semibold text-gray-900">Model Performance</h4>
        </div>
        
        <div className="space-y-3">
          {modelPerformance.map((model, index) => (
            <div key={model.model} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  {index === 0 && <span className="text-lg">🥇</span>}
                  {index === 1 && <span className="text-lg">🥈</span>}
                  {index === 2 && <span className="text-lg">🥉</span>}
                  {index === 3 && <span className="text-lg">4️⃣</span>}
                  <span className="font-medium text-sm">{model.model}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 text-xs">
                <div className="text-center">
                  <div className="font-medium text-gray-900">{model.mape}%</div>
                  <div className="text-gray-500">MAPE</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-gray-900">{model.mae}</div>
                  <div className="text-gray-500">MAE</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-gray-900">{model.r2}</div>
                  <div className="text-gray-500">R²</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-green-50 rounded-lg">
          <p className="text-sm text-green-800">
            <strong>Winner:</strong> XGBoost with 8.2% MAPE
          </p>
          <p className="text-xs text-green-600 mt-1">
            Excellent accuracy - explains 89% of variance in your data
          </p>
        </div>
      </div>

      {/* Feature Importance */}
      <div className="chart-container">
        <div className="flex items-center space-x-2 mb-4">
          <BarChart3 className="w-5 h-5 text-blue-500" />
          <h4 className="font-semibold text-gray-900">Feature Importance</h4>
        </div>
        
        <div className="space-y-2">
          {[
            { feature: 'sales_lag_7', importance: 0.234, label: '7-day lag' },
            { feature: 'marketing_spend', importance: 0.187, label: 'Marketing spend' },
            { feature: 'day_of_week', importance: 0.156, label: 'Day of week' },
            { feature: 'sales_lag_1', importance: 0.143, label: '1-day lag' },
            { feature: 'temperature', importance: 0.098, label: 'Temperature' },
            { feature: 'rolling_mean_14', importance: 0.087, label: '14-day average' }
          ].map((item, index) => (
            <div key={item.feature} className="flex items-center space-x-3">
              <div className="w-24 text-xs text-gray-600 truncate">{item.label}</div>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <motion.div
                  className="bg-blue-500 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${item.importance * 100}%` }}
                  transition={{ duration: 1, delay: index * 0.1 }}
                />
              </div>
              <div className="w-12 text-xs text-gray-900 font-medium text-right">
                {(item.importance * 100).toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Next Steps */}
      <div className="chart-container">
        <h4 className="font-semibold text-gray-900 mb-4">Recommendations</h4>
        
        <div className="space-y-3">
          <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
            <div>
              <p className="text-sm font-medium text-green-900">Model Performance Excellent</p>
              <p className="text-xs text-green-600 mt-1">8.2% MAPE is considered excellent for sales forecasting</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
            <div>
              <p className="text-sm font-medium text-blue-900">Strong Feature Importance</p>
              <p className="text-xs text-blue-600 mt-1">Marketing spend and historical lags are key drivers</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
            <div>
              <p className="text-sm font-medium text-yellow-900">Consider Optimization</p>
              <p className="text-xs text-yellow-600 mt-1">Hyperparameter tuning could improve performance by 5-15%</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}