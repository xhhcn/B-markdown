import React from 'react'

interface ProgressDialogProps {
  isVisible: boolean
  progress: number
  message: string
}

const ProgressDialog: React.FC<ProgressDialogProps> = ({ 
  isVisible, 
  progress, 
  message 
}) => {
  if (!isVisible) return null

  return (
    <div className="progress-overlay">
      <div className="progress-dialog">
        <h3>导出PDF</h3>
        <div className="progress-bar-container">
          <div 
            className="progress-bar" 
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="progress-message">{message}</p>
        <div className="progress-percentage">{Math.round(progress)}%</div>
      </div>
    </div>
  )
}

export default ProgressDialog