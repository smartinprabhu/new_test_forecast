'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface FileUploadProps {
  onFileUpload: (file: File) => void
}

export default function FileUpload({ onFileUpload }: FileUploadProps) {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    // Validate file
    const maxSize = 100 * 1024 * 1024 // 100MB
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json',
      'application/octet-stream' // for .parquet files
    ]

    if (file.size > maxSize) {
      setErrorMessage('File size must be less than 100MB')
      setUploadStatus('error')
      return
    }

    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.parquet')) {
      setErrorMessage('Please upload a CSV, Excel, JSON, or Parquet file')
      setUploadStatus('error')
      return
    }

    // Simulate upload process
    setUploadStatus('uploading')
    setUploadedFile(file)
    setErrorMessage('')

    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 2000))

    setUploadStatus('success')
    onFileUpload(file)
  }, [onFileUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/json': ['.json'],
      'application/octet-stream': ['.parquet']
    },
    multiple: false
  })

  const resetUpload = () => {
    setUploadStatus('idle')
    setUploadedFile(null)
    setErrorMessage('')
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {uploadStatus === 'idle' && (
          <motion.div
            key="upload-area"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className={`w-8 h-8 mx-auto mb-3 ${isDragActive ? 'text-blue-500' : 'text-gray-400'}`} />
            <p className="text-sm font-medium text-gray-900 mb-1">
              {isDragActive ? 'Drop your file here' : 'Upload your dataset'}
            </p>
            <p className="text-xs text-gray-500 mb-3">
              Drag & drop or click to browse
            </p>
            <div className="text-xs text-gray-400 space-y-1">
              <p><strong>Supported formats:</strong> CSV, Excel (.xlsx, .xls), JSON, Parquet</p>
              <p><strong>Maximum size:</strong> 100MB</p>
            </div>
          </motion.div>
        )}

        {uploadStatus === 'uploading' && uploadedFile && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border border-gray-200 rounded-lg p-4"
          >
            <div className="flex items-center space-x-3">
              <File className="w-8 h-8 text-blue-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {uploadedFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(uploadedFile.size)}
                </p>
              </div>
              <div className="flex-shrink-0">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>
            <div className="mt-3">
              <div className="progress-bar">
                <motion.div
                  className="progress-fill"
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 2, ease: 'easeInOut' }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Uploading and validating...</p>
            </div>
          </motion.div>
        )}

        {uploadStatus === 'success' && uploadedFile && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border border-green-200 bg-green-50 rounded-lg p-4"
          >
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-8 h-8 text-green-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-900 truncate">
                  {uploadedFile.name}
                </p>
                <p className="text-xs text-green-600">
                  {formatFileSize(uploadedFile.size)} • Upload successful
                </p>
              </div>
              <button
                onClick={resetUpload}
                className="flex-shrink-0 p-1 text-green-400 hover:text-green-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {uploadStatus === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border border-red-200 bg-red-50 rounded-lg p-4"
          >
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-8 h-8 text-red-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-900">Upload failed</p>
                <p className="text-xs text-red-600">{errorMessage}</p>
              </div>
              <button
                onClick={resetUpload}
                className="flex-shrink-0 p-1 text-red-400 hover:text-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={resetUpload}
              className="mt-3 text-xs text-red-600 hover:text-red-800 font-medium"
            >
              Try again
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}