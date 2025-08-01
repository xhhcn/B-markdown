import React from 'react'
import t from '../i18n'

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
  const i18n = t() // 获取国际化文本
  
  if (!isVisible) return null

  return (
    <div className="progress-overlay">
      <div className="progress-dialog">
        <h3>{i18n.exportPdf}</h3>
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