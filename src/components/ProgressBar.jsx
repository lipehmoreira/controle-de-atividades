import React from 'react'

export default function ProgressBar({ percentage, color = 'purple', label }) {
  const colorMap = {
    purple: 'bg-purple-500',
    blue: 'bg-blue-400',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-400',
    rose: 'bg-rose-500',
    cyan: 'bg-cyan-500',
    gradient: 'bg-gradient-to-r from-purple-500 to-pink-500',
  }

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-400">{label}</span>
          <span className="text-white font-medium">{Math.round(percentage)}%</span>
        </div>
      )}
      <div className="progress-bar-bg">
        <div
          className={`progress-bar-fill ${colorMap[color] || colorMap.purple}`}
          style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%` }}
        />
      </div>
    </div>
  )
}