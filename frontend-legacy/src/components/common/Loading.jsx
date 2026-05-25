import React from 'react'

const Loading = ({ size = 'medium', text = 'Cargando...' }) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  }

  return (
    <div className="flex items-center justify-center p-4">
      <div className="flex items-center space-x-3">
        <div className={`${sizeClasses[size]} border-4 border-gray-200 border-t-primary rounded-full animate-spin`}></div>
        {text && <span className="text-gray-600">{text}</span>}
      </div>
    </div>
  )
}

export default Loading