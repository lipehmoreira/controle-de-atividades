import React from 'react'

export default function StatCard({ icon: Icon, label, value, subtext, color = 'purple', trend }) {
  const colorMap = {
    purple: 'from-purple-500/20 to-purple-500/0 border-purple-500/20',
    blue: 'from-blue-500/20 to-blue-500/0 border-blue-500/20',
    emerald: 'from-emerald-500/20 to-emerald-500/0 border-emerald-500/20',
    amber: 'from-amber-500/20 to-amber-500/0 border-amber-500/20',
    rose: 'from-rose-500/20 to-rose-500/0 border-rose-500/20',
    cyan: 'from-cyan-500/20 to-cyan-500/0 border-cyan-500/20',
  }

  const textColor = {
    purple: 'text-purple-400',
    blue: 'text-blue-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    rose: 'text-rose-400',
    cyan: 'text-cyan-400',
  }

  return (
    <div className={`stat-card border ${colorMap[color] || colorMap.purple}`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-sm font-medium ${textColor[color] || textColor.purple} opacity-70`}>
          {label}
        </span>
        {Icon && <Icon className={`w-5 h-5 ${textColor[color] || textColor.purple}`} />}
      </div>
      <div className="text-2xl font-bold text-white mb-1">
        {value}
      </div>
      {subtext && (
        <div className="text-xs opacity-50 text-slate-400">{subtext}</div>
      )}
      {trend !== undefined && (
        <div className={`text-xs mt-2 ${trend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% vs média
        </div>
      )}
    </div>
  )
}