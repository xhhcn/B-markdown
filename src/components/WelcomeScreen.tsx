import React from 'react'
import { FiFileText, FiFolder } from 'react-icons/fi'
import t from '../i18n'

interface WelcomeScreenProps {
  onNewFile: () => void
  onOpenFile: () => void
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onNewFile, onOpenFile }) => {
  const i18n = t()
  
  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <h1 className="welcome-title">{i18n.welcomeTitle}</h1>
        <p className="welcome-subtitle">{i18n.welcomeSubtitle}</p>
        
        <div className="welcome-actions">
          <button 
            className="welcome-button new-file-button"
            onClick={onNewFile}
          >
            <FiFileText className="welcome-icon" />
            <span className="welcome-text">{i18n.newFile}</span>
          </button>
          
          <button 
            className="welcome-button open-file-button"
            onClick={onOpenFile}
          >
            <FiFolder className="welcome-icon" />
            <span className="welcome-text">{i18n.openFile}</span>
          </button>
        </div>
        
        <div className="welcome-footer">
          <p>{i18n.welcomeShortcuts}</p>
        </div>
      </div>
    </div>
  )
}

export default WelcomeScreen
