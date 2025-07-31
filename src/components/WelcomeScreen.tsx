import React from 'react'
import { FiFileText, FiFolder } from 'react-icons/fi'

interface WelcomeScreenProps {
  onNewFile: () => void
  onOpenFile: () => void
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onNewFile, onOpenFile }) => {
  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <h1 className="welcome-title">Markdown Editor</h1>
        <p className="welcome-subtitle">开始您的Markdown创作之旅</p>
        
        <div className="welcome-actions">
          <button 
            className="welcome-button new-file-button"
            onClick={onNewFile}
          >
            <FiFileText className="welcome-icon" />
            <span className="welcome-text">新建文件</span>
          </button>
          
          <button 
            className="welcome-button open-file-button"
            onClick={onOpenFile}
          >
            <FiFolder className="welcome-icon" />
            <span className="welcome-text">打开文件</span>
          </button>
        </div>
        
        <div className="welcome-footer">
          <p>快捷键: Cmd/Ctrl+N 新建 • Cmd/Ctrl+O 打开</p>
        </div>
      </div>
    </div>
  )
}

export default WelcomeScreen
