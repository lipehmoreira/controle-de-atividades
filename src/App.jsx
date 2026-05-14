import React, { useState, useCallback } from 'react'
import {
  Upload, Trophy, Clock, Star, BookOpen,
  Gamepad2, Film, Tv, MonitorPlay, Book, ChevronDown,
  ChevronUp, X as XIcon, BarChart2, Layers, Activity, Calendar
} from 'lucide-react'
import {
  parseXLSX, parseCSV, normalizeKeys, autoMapColumns, normalizeRating,
  normalizeValue, normalizeStatus, formatHours, formatNumber,
  detectCategory, normalizeString
} from './utils/parsers'
import { generalStats, averageRating, countByStatus, topByRating, groupCount, groupByMonth, extractAvailableYears, filterDataByYear } from './utils/statistics'
import StatCard from './components/StatCard'
import ProgressBar from './components/ProgressBar'
import './index.css'

const CATEGORIES = [
  { key: 'all', label: '📊 Geral', icon: Layers },
  { key: 'jogos', label: '🎮 Jogos', icon: Gamepad2 },
  { key: 'filmes', label: '🎬 Filmes', icon: Film },
  { key: 'series', label: '📺 Séries', icon: Tv },
  { key: 'animes', label: '⭐ Animes', icon: MonitorPlay },
  { key: 'livros', label: '📚 Livros', icon: Book },
  { key: 'retrospectiva', label: '✨ Retrospectiva', icon: Trophy },
]

/* ============================================
   COMPONENTE DE UPLOAD
   ============================================ */
function WelcomeUpload({ onFileSelect, onDragOver, onDragLeave, onDrop }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-20 mx-8 my-6 rounded-3xl border-2 border-dashed border-slate-700/50 hover:border-purple-500/50 transition-colors cursor-pointer bg-slate-900/20 hover:bg-slate-900/40 fade-in"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => document.getElementById('fileInput')?.click()}
    >
      <input
        id="fileInput"
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFileSelect(file)
        }}
      />
      <div className="w-24 h-24 rounded-3xl bg-purple-500/10 flex items-center justify-center mb-6 border border-purple-500/20">
        <Upload className="w-12 h-12 text-purple-400" />
      </div>
      <h2 className="text-3xl font-bold text-white mb-3">Dashboard de Entretenimento</h2>
      <p className="text-slate-400 max-w-md text-center mb-8 leading-relaxed">
        Clique aqui ou arraste o arquivo da sua planilha para iniciar (.xlsx / .csv).
      </p>
    </div>
  )
}

/* ============================================
   TABELA DE DADOS BRUTOS
   ============================================ */
function RawDataTable({ data, onClose }) {
  if (!data || data.length === 0) return null

  const keys = Object.keys(data[0]).filter(k => k !== '__rowNum__' && k !== '__category__')

  return (
    <div className="mt-4 fade-in">
      <button
        onClick={onClose}
        className="text-xs text-slate-400 hover:text-slate-200 mb-2 flex items-center gap-1 transition-colors"
      >
        <XIcon className="w-3 h-3" /> Fechar dados brutos
      </button>
      <div className="rounded-xl overflow-hidden border border-slate-700">
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-800 z-10">
              <tr>
                {keys.map((k) => (
                  <th key={k} className="px-4 py-3 text-left text-slate-400 font-semibold border-b border-slate-700 whitespace-nowrap">
                    {k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 100).map((row, i) => (
                <tr key={i} className={`border-b border-slate-700/50 ${i % 2 === 0 ? 'bg-slate-900/50' : 'bg-transparent'} hover:bg-purple-500/5`}>
                  {keys.map((k) => (
                    <td key={k} className="px-4 py-2 text-slate-300 whitespace-nowrap">
                      {String(row[k] ?? '').substring(0, 80)}
                    </td>
                  ))}
                </tr>
              ))}
              {data.length > 100 && (
                <tr>
                  <td colSpan={keys.length} className="px-4 py-3 text-center text-slate-500 text-xs">
                    Exibindo primeiros 100 de {data.length} linhas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ============================================
   BOTÃO DE MOSTRAR/ESCONDER DADOS BRUTOS
   ============================================ */
function ToggleRawData({ data }) {
  const [show, setShow] = useState(false)
  if (!data || data.length === 0) return null
  return (
    <div>
      <button
        onClick={() => setShow(!show)}
        className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
      >
        {show ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {show ? 'Ocultar' : 'Exibir'} Dados Brutos ({data.length} itens)
      </button>
      {show && <RawDataTable data={data} onClose={() => setShow(false)} />}
    </div>
  )
}

/* ============================================
   GRÁFICO DE BARRAS HORIZONTAL
   ============================================ */
function BarChartWidget({ data, dataKey, labelKey, title, color = '#a78bfa', maxItems = 10, formatLabel }) {
  if (!data || data.length === 0) return <p className="text-slate-500 text-sm">Sem dados disponíveis</p>
  const items = data.slice(0, maxItems)
  const max = Math.max(...items.map(d => Number(d[dataKey] || 0))) || 1

  return (
    <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
      <h4 className="text-sm font-semibold text-white mb-4">{title}</h4>
      <div className="space-y-2.5">
        {items.map((item, idx) => {
          const val = Number(item[dataKey] || 0)
          const pct = (val / max) * 100
          return (
            <div key={idx} className="flex items-center gap-3 group">
              <span
                className="text-xs text-slate-400 min-w-[120px] truncate group-hover:text-white transition-colors"
                title={formatLabel ? formatLabel(item) : item[labelKey]}
              >
                {formatLabel ? formatLabel(item) : item[labelKey]?.toString().substring(0, 18)}
              </span>
              <div className="flex-1">
                <div className="progress-bar-bg h-6">
                  <div
                    className="progress-bar-fill flex items-center justify-end pr-2"
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${color}cc, ${color}66)`,
                    }}
                  >
                    <span className="text-xs font-medium text-white">{val}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ============================================
   GRÁFICO DE PIZZA (SVG)
   ============================================ */
function PieChartWidget({ data, dataKey, labelKey, title, maxItems = 8 }) {
  if (!data || data.length === 0) return <p className="text-slate-500 text-sm">Sem dados disponíveis</p>

  const items = data.slice(0, maxItems)
  const total = items.reduce((s, d) => s + Number(d[dataKey] || 0), 0)
  if (total === 0) return <p className="text-slate-500 text-sm">Total zero</p>

  const size = 180
  const cx = size / 2
  const cy = size / 2
  const r = 70
  const colors = ['#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#f87171', '#fb923c', '#22d3ee', '#c084fc']

  let accumulated = 0

  return (
    <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 flex flex-col items-center">
      <h4 className="text-sm font-semibold text-white mb-3">{title}</h4>
      <div style={{ width: size, height: size }} className="relative">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
          {items.map((item, idx) => {
            const val = Number(item[dataKey] || 0)
            const pct = val / total
            const startAngle = accumulated * 2 * Math.PI
            const endAngle = (accumulated + pct) * 2 * Math.PI
            const largeArc = pct > 0.5 ? 1 : 0

            const x1 = cx + r * Math.cos(startAngle - Math.PI / 2)
            const y1 = cy + r * Math.sin(startAngle - Math.PI / 2)
            const x2 = cx + r * Math.cos(endAngle - Math.PI / 2)
            const y2 = cy + r * Math.sin(endAngle - Math.PI / 2)

            const path = [
              `M ${cx} ${cy}`,
              `L ${x1} ${y1}`,
              `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
              'Z'
            ].join(' ')

            accumulated += pct
            const gap = pct * 2 * Math.PI * r
            const strokeWidth = gap < 3 ? gap : 2

            return (
              <path
                key={idx}
                d={path}
                fill={colors[idx % colors.length]}
                stroke="#0f172a"
                strokeWidth={strokeWidth}
                className="transition-all duration-500 hover:opacity-80"
                style={{ animationDelay: `${idx * 0.1}s` }}
              />
            )
          })}
          <circle cx={cx} cy={cy} r={45} fill="#1e293b" />
          <text x={cx} y={cy - 6} textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">
            {total}
          </text>
          <text x={cx} y={cy + 12} textAnchor="middle" fill="#94a3b8" fontSize="9">
            TOTAL
          </text>
        </svg>
      </div>
      <div className="flex flex-wrap justify-center gap-2 mt-3">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-300">
            <div style={{ backgroundColor: colors[idx % colors.length] }} className="w-2.5 h-2.5 rounded-sm" />
            <span className="max-w-[100px] truncate">{item[labelKey]?.toString().substring(0, 14)}</span>
            <span className="text-slate-500">({Number(item[dataKey] || 0)})</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ============================================
   FUNÇÃO AUXILIAR PARA ENCONTRAR CATEGORIA
   ============================================ */
function findCategoryData(data, categoryNames, detectionFn) {
  // Tenta por nome exato (case-insensitive)
  for (const k in data) {
    if (categoryNames.includes(k.toLowerCase())) return data[k]
  }
  // Tenta por detecção heurística do conteúdo
  for (const k in data) {
    if (Array.isArray(data[k]) && data[k].length > 0) {
      if (detectionFn(data[k]) === categoryNames[0]) return data[k]
    }
  }
  return null
}

/* ============================================
   DASHBOARD GERAL
   ============================================ */
function DashboardGeneral({ data }) {
  const stats = generalStats(data)
  const categories = Object.keys(data).filter(k => Array.isArray(data[k]) && data[k].length > 0)

  const itemsPerCategory = categories.map(cat => ({
    name: cat.charAt(0).toUpperCase() + cat.slice(1),
    count: data[cat].length
  })).sort((a, b) => b.count - a.count)

  const allRatings = []
  for (const cat in data) {
    if (Array.isArray(data[cat])) {
      data[cat].forEach(i => {
        const r = normalizeRating(i.nota || i.rating || i.Nota || i.ranking || 0)
        if (r) allRatings.push(r)
      })
    }
  }

  const ratingCounts = {}
  allRatings.forEach(r => {
    const key = Math.round(r)
    ratingCounts[key] = (ratingCounts[key] || 0) + 1
  })
  const ratingDist = Object.entries(ratingCounts)
    .map(([k, v]) => ({ nota: Number(k), count: v }))
    .sort((a, b) => a.nota - b.nota)

  return (
    <div className="space-y-8 fade-in">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={Trophy} label="Total de Itens" value={stats.totalItems} color="purple" />
        <StatCard icon={BarChart2} label="Concluídos" value={stats.totalFinished} color="emerald" />
        <StatCard icon={Star} label="Média de Notas" value={stats.avgRating.toFixed(1)} color="amber" />
        <StatCard icon={Activity} label="% Conclusão" value={stats.completionRate.toFixed(1) + '%'} color="blue" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BarChartWidget data={itemsPerCategory} dataKey="count" labelKey="name" title="📦 Itens por Categoria" color="#a78bfa" />
        <BarChartWidget data={ratingDist} dataKey="count" labelKey="nota" title="⭐ Distribuição de Notas" color="#fbbf24" formatLabel={(d) => `${d.nota} ⭐`} />
      </div>

      <ToggleRawData data={getAllItems(data)} />
    </div>
  )
}

function getAllItems(data) {
  const all = []
  for (const cat in data) {
    if (Array.isArray(data[cat])) {
      data[cat].forEach(item => all.push({ ...item, __category__: cat }))
    }
  }
  return all
}

/* ============================================
   DASHBOARD DE JOGOS
   ============================================ */
function JogosDashboard({ data }) {
  const items = findCategoryData(data, ['jogos', 'games', 'jogando'], (rows) => {
    const sample = rows[0]
    if (sample && (sample.plataforma || sample.plataformas || sample.dificuldade || sample.tempo_h || sample.tempo)) return 'jogos'
    return 'desconhecido'
  })

  if (!items || items.length === 0) {
    return <p className="text-slate-500 text-center py-10">Nenhum dado de jogos encontrado. Verifique se a aba existe na planilha.</p>
  }

  const normalizedItems = items.map(item => ({
    ...item,
    nota: normalizeRating(item.nota || item.rating || item.Nota),
    tempo_h: Number(normalizeValue(item.tempo_h || item.tempo || item.horas_jogadas || item.horas || item.Tempo || 0)),
    status: normalizeStatus(item.status || item.estado),
    nome: normalizeString(item.nome || item.jogo || item.name || item.titulo || item.Jogo || Object.values(item)[0] || 'Sem nome'),
    plataforma: normalizeString(item.plataforma || item.plataformas || item.Plataforma || item.Platform || 'N/A'),
    genero: normalizeString(item.genero || item.generos || item.gênero || item.gêneros || item.Gênero || 'N/A'),
    dificuldade: normalizeString(item.dificuldade || item.Dificuldade || 'N/A'),
  }))

  const totalHoras = normalizedItems.reduce((s, i) => s + (i.tempo_h || 0), 0)
  const finishedCount = normalizedItems.filter(i => i.status === 'Finalizado').length
  const avgNota = averageRating(normalizedItems)
  const generos = groupCount(normalizedItems, 'genero')
  const plataformas = groupCount(normalizedItems, 'plataforma')
  const topJogos = topByRating(normalizedItems, 5)

  return (
    <div className="space-y-8 fade-in">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={Gamepad2} label="Total de Jogos" value={normalizedItems.length} color="purple" />
        <StatCard icon={Trophy} label="Finalizados" value={finishedCount} color="emerald" />
        <StatCard icon={Star} label="Média de Nota" value={avgNota.toFixed(1)} color="amber" />
        <StatCard icon={Clock} label="Horas Totais" value={totalHoras > 0 ? formatHours(totalHoras) : '0h'} color="blue" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <BarChartWidget data={generos} dataKey="count" labelKey="name" title="🎭 Gêneros Mais Jogados" color="#a78bfa" />
        </div>
        <div>
          <PieChartWidget data={groupCount(normalizedItems, 'status')} dataKey="count" labelKey="name" title="📊 Status" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-semibold text-white mb-4">🏆 Top 5 Jogos por Nota</h4>
          <div className="space-y-2">
            {topJogos.map((jogo, idx) => (
              <div key={idx} className="flex items-center justify-between bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
                <div>
                  <span className="text-sm text-white font-medium">{jogo.nome?.toString().substring(0, 35)}</span>
                  <div className="text-xs text-slate-400">{jogo.plataforma?.toString().substring(0, 25)} • {jogo.genero?.toString().substring(0, 20)}</div>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-amber-400 fill-current" />
                  <span className="text-sm font-bold text-amber-400">{jogo.nota}</span>
                </div>
              </div>
            ))}
            {topJogos.length === 0 && <p className="text-slate-500 text-sm">Nenhum jogo com nota registrada.</p>}
          </div>
        </div>
        <div>
          <BarChartWidget data={plataformas.slice(0, 10)} dataKey="count" labelKey="name" title="🕹️ Plataformas" color="#60a5fa" />
        </div>
      </div>

      <ToggleRawData data={normalizedItems} />
    </div>
  )
}

/* ============================================
   DASHBOARD DE FILMES
   ============================================ */
function FilmesDashboard({ data }) {
  const items = findCategoryData(data, ['filmes', 'films', 'movies'], (rows) => {
    const sample = rows[0]
    if (sample && (sample.direcao || sample.diretor || sample['direção'] || sample.duracao)) return 'filmes'
    return 'desconhecido'
  })

  if (!items || items.length === 0) {
    return <p className="text-slate-500 text-center py-10">Nenhum dado de filmes encontrado. Verifique se a aba existe na planilha.</p>
  }

  const normalizedItems = items.map(item => ({
    ...item,
    nota: normalizeRating(item.nota || item.rating || item.Nota),
    nome: normalizeString(item.nome || item.filme || item.name || item.titulo || 'Sem nome'),
    direcao: normalizeString(item.direcao || item.diretor || item.Direção || item.Diretor || 'N/A'),
    genero: normalizeString(item.genero || item.generos || item.Gênero || 'N/A'),
    duracao: Number(normalizeValue(item.duracao || item.duração || item.Duração || item.duracao_min || 0)),
    assistido_em: item.assistido_em || item.data || item.Assistido_em || item.date || '',
  }))

  const totalDuracao = normalizedItems.reduce((s, i) => s + (i.duracao || 0), 0)
  const finishedCount = normalizedItems.filter(i => normalizeStatus(i.status) === 'Finalizado').length
  const avgNota = averageRating(normalizedItems)
  const diretores = groupCount(normalizedItems, 'direcao')
  const generos = groupCount(normalizedItems, 'genero')
  const topFilmes = topByRating(normalizedItems, 5)
  const porMes = groupByMonth(normalizedItems, 'assistido_em')

  return (
    <div className="space-y-8 fade-in">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={Film} label="Total de Filmes" value={normalizedItems.length} color="purple" />
        <StatCard icon={Trophy} label="Assistidos" value={finishedCount} color="emerald" />
        <StatCard icon={Star} label="Média de Nota" value={avgNota.toFixed(1)} color="amber" />
        <StatCard icon={Clock} label="Duração Total" value={totalDuracao > 0 ? `${(totalDuracao / 60).toFixed(1)}h` : '0h'} color="blue" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <BarChartWidget data={diretores.slice(0, 10)} dataKey="count" labelKey="name" title="🎬 Diretores Favoritos" color="#a78bfa" />
        </div>
        <div>
          <PieChartWidget data={countByStatus(normalizedItems)} dataKey="count" labelKey="name" title="📊 Status" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BarChartWidget data={generos.slice(0, 10)} dataKey="count" labelKey="name" title="🎭 Gêneros Predominantes" color="#22d3ee" />
        {porMes.length > 0 && <BarChartWidget data={porMes} dataKey="count" labelKey="month" title="📅 Filmes por Mês" color="#fb923c" formatLabel={(d) => d.month} />}
      </div>

      <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
        <h4 className="text-sm font-semibold text-white mb-4">🏆 Top 5 Filmes por Nota</h4>
        <div className="space-y-2">
          {topFilmes.map((filme, idx) => (
            <div key={idx} className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
              <div>
                <span className="text-sm text-white font-medium">{filme.nome?.toString().substring(0, 40)}</span>
                <div className="text-xs text-slate-400">{filme.direcao?.toString().substring(0, 30)} • {filme.duracao} min</div>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-amber-400 fill-current" />
                <span className="text-sm font-bold text-amber-400">{filme.nota}</span>
              </div>
            </div>
          ))}
          {topFilmes.length === 0 && <p className="text-slate-500 text-sm">Nenhum filme com nota registrada.</p>}
        </div>
      </div>

      <ToggleRawData data={normalizedItems} />
    </div>
  )
}

/* ============================================
   DASHBOARD DE SÉRIES
   ============================================ */
function SeriesDashboard({ data }) {
  const items = findCategoryData(data, ['series', 'séries', 'serie'], (rows) => {
    const sample = rows[0]
    if (sample && (sample.episodios || sample.episódios || sample.temporada) && !(sample.duracao || sample.duração)) return 'series'
    return 'desconhecido'
  })

  if (!items || items.length === 0) {
    return <p className="text-slate-500 text-center py-10">Nenhum dado de séries encontrado. Verifique se a aba existe na planilha.</p>
  }

  const normalizedItems = items.map(item => ({
    ...item,
    nota: normalizeRating(item.nota || item.rating || item.Nota),
    nome: normalizeString(item.nome || item.name || item.titulo || 'Sem nome'),
    temporada: Number(normalizeValue(item.temporada || item.Temporada || item.season || 0)),
    episodios: Number(normalizeValue(item.episodios || item.episódios || item.num_episodios || item.total_episodios || 0)),
    genero: normalizeString(item.genero || item.generos || item.Gênero || 'N/A'),
    status: normalizeStatus(item.status || item.estado),
  }))

  const totalEpisodios = normalizedItems.reduce((s, i) => s + (i.episodios || 0), 0)
  const finishedCount = normalizedItems.filter(i => i.status === 'Finalizado').length
  const avgNota = averageRating(normalizedItems)
  const generos = groupCount(normalizedItems, 'genero')
  const topSeries = topByRating(normalizedItems, 5)
  const maratonadas = normalizedItems.filter(i => i.status === 'Finalizado' && i.episodios > 0).sort((a, b) => (b.episodios || 0) - (a.episodios || 0)).slice(0, 5)

  return (
    <div className="space-y-8 fade-in">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={Tv} label="Total de Séries" value={normalizedItems.length} color="purple" />
        <StatCard icon={Trophy} label="Finalizadas (Maratonadas)" value={finishedCount} color="emerald" />
        <StatCard icon={Star} label="Média de Nota" value={avgNota.toFixed(1)} color="amber" />
        <StatCard icon={Clock} label="Episódios Totais" value={formatNumber(totalEpisodios)} color="cyan" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <BarChartWidget data={generos.slice(0, 10)} dataKey="count" labelKey="name" title="🎭 Gêneros Mais Assistidos" color="#22d3ee" />
        </div>
        <div>
          <PieChartWidget data={countByStatus(normalizedItems)} dataKey="count" labelKey="name" title="📊 Status" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
          <h4 className="text-sm font-semibold text-white mb-4">🏆 Top 5 Séries por Nota</h4>
          <div className="space-y-2">
            {topSeries.map((s, idx) => (
              <div key={idx} className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
                <div>
                  <span className="text-sm text-white font-medium">{s.nome?.toString().substring(0, 35)}</span>
                  <div className="text-xs text-slate-400">T{s.temporada} • {s.episodios} episódios</div>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-amber-400 fill-current" />
                  <span className="text-sm font-bold text-amber-400">{s.nota}</span>
                </div>
              </div>
            ))}
            {topSeries.length === 0 && <p className="text-slate-500 text-sm">Nenhuma série com nota.</p>}
          </div>
        </div>
        <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
          <h4 className="text-sm font-semibold text-white mb-4">🎬 Maratonadas (Finalizadas)</h4>
          <div className="space-y-2">
            {maratonadas.map((s, idx) => (
              <div key={idx} className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
                <div>
                  <span className="text-sm text-white font-medium">{s.nome?.toString().substring(0, 30)}</span>
                  <div className="text-xs text-slate-400">{s.genero?.toString().substring(0, 20)}</div>
                </div>
                <span className="text-sm font-bold text-cyan-400">{s.episodios} eps</span>
              </div>
            ))}
            {maratonadas.length === 0 && <p className="text-slate-500 text-sm">Nenhuma série finalizada.</p>}
          </div>
        </div>
      </div>

      <ToggleRawData data={normalizedItems} />
    </div>
  )
}

/* ============================================
   DASHBOARD DE ANIMES
   ============================================ */
function AnimesDashboard({ data }) {
  const items = findCategoryData(data, ['animes', 'animê', 'anime'], (rows) => {
    const sample = rows[0]
    if (sample && sample.episodios && sample.genero && !(sample.duracao || sample.duração)) return 'animes'
    return 'desconhecido'
  })

  if (!items || items.length === 0) {
    return <p className="text-slate-500 text-center py-10">Nenhum dado de animes encontrado. Verifique se a aba existe na planilha.</p>
  }

  const normalizedItems = items.map(item => ({
    ...item,
    nota: normalizeRating(item.nota || item.rating || item.Nota),
    nome: normalizeString(item.nome || item.name || item.titulo || 'Sem nome'),
    temporada: Number(normalizeValue(item.temporada || item.Temporada || item.season || 0)),
    episodios: Number(normalizeValue(item.episodios || item.episódios || item.num_episodios || item.total_episodios || 0)),
    genero: normalizeString(item.genero || item.generos || item.Gênero || 'N/A'),
    status: normalizeStatus(item.status || item.estado),
  }))

  const totalEpisodios = normalizedItems.reduce((s, i) => s + (i.episodios || 0), 0)
  const finishedCount = normalizedItems.filter(i => i.status === 'Finalizado').length
  const avgNota = averageRating(normalizedItems)
  const generos = groupCount(normalizedItems, 'genero')
  const topAnimes = topByRating(normalizedItems, 5)

  return (
    <div className="space-y-8 fade-in">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={MonitorPlay} label="Total de Animes" value={normalizedItems.length} color="purple" />
        <StatCard icon={Trophy} label="Finalizados" value={finishedCount} color="emerald" />
        <StatCard icon={Star} label="Média de Nota" value={avgNota.toFixed(1)} color="amber" />
        <StatCard icon={Clock} label="Episódios Totais" value={formatNumber(totalEpisodios)} color="cyan" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <BarChartWidget data={generos.slice(0, 10)} dataKey="count" labelKey="name" title="🎭 Gêneros Mais Assistidos" color="#a78bfa" />
        </div>
        <div>
          <PieChartWidget data={countByStatus(normalizedItems)} dataKey="count" labelKey="name" title="📊 Status" />
        </div>
      </div>

      <h4 className="text-sm font-semibold text-white mb-3">🏆 Top 5 Animes por Nota</h4>
      <div className="space-y-2">
        {topAnimes.map((anime, idx) => (
          <div key={idx} className="flex items-center justify-between bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
            <div>
              <span className="text-sm text-white font-medium">{anime.nome?.toString().substring(0, 40)}</span>
              <div className="text-xs text-slate-400">T{anime.temporada} • {anime.episodios} eps • {anime.genero?.toString().substring(0, 30)}</div>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-amber-400 fill-current" />
              <span className="text-sm font-bold text-amber-400">{anime.nota}</span>
            </div>
          </div>
        ))}
        {topAnimes.length === 0 && <p className="text-slate-500 text-sm">Nenhum anime com nota.</p>}
      </div>

      <ToggleRawData data={normalizedItems} />
    </div>
  )
}

/* ============================================
   DASHBOARD DE LIVROS
   ============================================ */
function LivrosDashboard({ data }) {
  const items = findCategoryData(data, ['livros', 'books', 'livro'], (rows) => {
    const sample = rows[0]
    if (sample && (sample.autor || sample.paginas || sample.páginas || sample.modo_leitura)) return 'livros'
    return 'desconhecido'
  })

  if (!items || items.length === 0) {
    return <p className="text-slate-500 text-center py-10">Nenhum dado de livros encontrado. Verifique se a aba existe na planilha.</p>
  }

  const normalizedItems = items.map(item => ({
    ...item,
    nota: normalizeRating(item.nota || item.rating || item.Nota),
    nome: normalizeString(item.nome || item.filme || item.serie || item.anime || item.livro || item.name || item.titulo || Object.values(item)[0] || 'Sem nome'),
    autor: normalizeString(item.autor || item.autora || item.Author || 'N/A'),
    paginas: Number(normalizeValue(item.paginas || item.páginas || item.Pages || item.num_paginas || item.total_paginas || 0)),
    modo_leitura: normalizeString(item.modo_leitura || item.modo || item.formato || item.Leitura || item.format || item['Mídia'] || item.midia || 'N/A'),
    genero: normalizeString(item.genero || item.generos || item.Gênero || item.categoria || 'N/A'),
    status: normalizeStatus(item.status || item.estado),
  }))

  const totalPaginas = normalizedItems.reduce((s, i) => s + (i.paginas || 0), 0)
  const finishedCount = normalizedItems.filter(i => i.status === 'Finalizado').length
  const avgNota = averageRating(normalizedItems)
  const autores = groupCount(normalizedItems, 'autor')
  const modosLeitura = groupCount(normalizedItems, 'modo_leitura')
  const generos = groupCount(normalizedItems, 'genero')
  const topLivros = topByRating(normalizedItems, 5)

  return (
    <div className="space-y-8 fade-in">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={Book} label="Total de Livros" value={normalizedItems.length} color="purple" />
        <StatCard icon={Trophy} label="Finalizados" value={finishedCount} color="emerald" />
        <StatCard icon={Star} label="Média de Nota" value={avgNota.toFixed(1)} color="amber" />
        <StatCard icon={BookOpen} label="Páginas Totais" value={formatNumber(totalPaginas)} color="cyan" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <BarChartWidget data={autores.slice(0, 10)} dataKey="count" labelKey="name" title="✍️ Autores Mais Lidos" color="#a78bfa" />
        </div>
        <div>
          <PieChartWidget data={modosLeitura} dataKey="count" labelKey="name" title="📖 Modo de Leitura" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BarChartWidget data={generos.slice(0, 10)} dataKey="count" labelKey="name" title="🎭 Gêneros Mais Lidos" color="#34d399" />
        <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
          <h4 className="text-sm font-semibold text-white mb-4">🏆 Top 5 Livros por Nota</h4>
          <div className="space-y-2">
            {topLivros.map((livro, idx) => (
              <div key={idx} className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
                <div>
                  <span className="text-sm text-white font-medium">{livro.nome?.toString().substring(0, 38)}</span>
                  <div className="text-xs text-slate-400">{livro.autor?.toString().substring(0, 30)} • {livro.paginas} págs</div>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-amber-400 fill-current" />
                  <span className="text-sm font-bold text-amber-400">{livro.nota}</span>
                </div>
              </div>
            ))}
            {topLivros.length === 0 && <p className="text-slate-500 text-sm">Nenhum livro com nota.</p>}
          </div>
        </div>
      </div>

      <ToggleRawData data={normalizedItems} />
    </div>
  )
}

/* ============================================
   RETROSPECTIVA (YEAR IN REVIEW)
   ============================================ */
function Retrospectiva({ data, year }) {
  const stats = generalStats(data)
  
  // Aggregate genre data across all categories
  const allGenres = []
  let totalHorasJogadas = 0
  let totalMinutosFilmes = 0
  let totalEpisodiosSeries = 0
  let totalEpisodiosAnimes = 0
  let totalPaginasLivros = 0

  let jogosData = []
  let filmesData = []
  let seriesData = []
  let animesData = []
  let livrosData = []

  for (const cat in data) {
    if (Array.isArray(data[cat])) {
      data[cat].forEach(item => {
        if (item.genero && item.genero !== 'N/A') allGenres.push({ genero: item.genero })
        if (cat === 'jogos') { totalHorasJogadas += Number(normalizeValue(item.tempo_h || item.tempo || item.horas_jogadas || item.horas || 0)); jogosData.push(item) }
        if (cat === 'filmes') { totalMinutosFilmes += Number(normalizeValue(item.duracao || item.duracao_min || 0)); filmesData.push(item) }
        if (cat === 'series') { totalEpisodiosSeries += Number(normalizeValue(item.episodios || 0)); seriesData.push(item) }
        if (cat === 'animes') { totalEpisodiosAnimes += Number(normalizeValue(item.episodios || 0)); animesData.push(item) }
        if (cat === 'livros') { totalPaginasLivros += Number(normalizeValue(item.paginas || 0)); livrosData.push(item) }
      })
    }
  }

  const topGenres = groupCount(allGenres, 'genero').slice(0, 5)

  const renderTopObras = (items, title, Icon, colorClass) => {
    const top = topByRating(items, 5)
    if (top.length === 0) return null
    return (
      <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-700/50">
        <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Icon className={`w-5 h-5 ${colorClass}`} /> {title}
        </h4>
        <div className="space-y-3">
          {top.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center border-b border-slate-800/50 pb-2 last:border-0 last:pb-0">
              <span className="text-slate-300 font-medium truncate pr-2" title={item.nome || item.titulo || item.name || Object.values(item)[0]}>
                {normalizeString(item.nome || item.titulo || item.name || Object.values(item)[0] || 'Sem Nome').substring(0, 30)}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <Star className="w-4 h-4 text-amber-400 fill-current" />
                <span className="text-amber-400 font-bold">{normalizeRating(item.nota || item.rating || item.Nota)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-12 fade-in pb-12">
      <div className="text-center py-12 px-4 bg-gradient-to-br from-purple-900/40 to-slate-900 rounded-3xl border border-purple-500/20 shadow-xl shadow-purple-900/20">
        <h2 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-4 tracking-tight">
          Retrospectiva {year === 'all' ? 'Geral' : year}
        </h2>
        <p className="text-slate-400 max-w-2xl mx-auto text-lg">
          Um resumo épico de tudo que você consumiu e as estatísticas que definiram o seu ano de entretenimento.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {totalHorasJogadas > 0 && (
          <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-700/50 flex flex-col items-center justify-center text-center">
            <Gamepad2 className="w-10 h-10 text-purple-400 mb-3" />
            <span className="text-3xl font-bold text-white mb-1">{formatHours(totalHorasJogadas)}</span>
            <span className="text-sm text-slate-400">Horas Jogadas</span>
          </div>
        )}
        {totalMinutosFilmes > 0 && (
          <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-700/50 flex flex-col items-center justify-center text-center">
            <Film className="w-10 h-10 text-pink-400 mb-3" />
            <span className="text-3xl font-bold text-white mb-1">{(totalMinutosFilmes / 60).toFixed(1)}h</span>
            <span className="text-sm text-slate-400">Filmes Assistidos</span>
          </div>
        )}
        {(totalEpisodiosSeries + totalEpisodiosAnimes) > 0 && (
          <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-700/50 flex flex-col items-center justify-center text-center">
            <Tv className="w-10 h-10 text-cyan-400 mb-3" />
            <span className="text-3xl font-bold text-white mb-1">{formatNumber(totalEpisodiosSeries + totalEpisodiosAnimes)}</span>
            <span className="text-sm text-slate-400">Eps. de Séries/Animes</span>
          </div>
        )}
        {totalPaginasLivros > 0 && (
          <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-700/50 flex flex-col items-center justify-center text-center">
            <BookOpen className="w-10 h-10 text-emerald-400 mb-3" />
            <span className="text-3xl font-bold text-white mb-1">{formatNumber(totalPaginasLivros)}</span>
            <span className="text-sm text-slate-400">Páginas Lidas</span>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <h3 className="text-2xl font-bold text-white border-b border-slate-800 pb-2">Melhores do Ano por Categoria</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {renderTopObras(jogosData, "Top Jogos", Gamepad2, "text-purple-400")}
          {renderTopObras(filmesData, "Top Filmes", Film, "text-pink-400")}
          {renderTopObras(seriesData, "Top Séries", Tv, "text-cyan-400")}
          {renderTopObras(animesData, "Top Animes", MonitorPlay, "text-indigo-400")}
          {renderTopObras(livrosData, "Top Livros", Book, "text-emerald-400")}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BarChartWidget data={topGenres} dataKey="count" labelKey="name" title="🌌 Gêneros Mais Consumidos" color="#a78bfa" />
        <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-700/50 flex flex-col justify-center">
           <h4 className="text-lg font-bold text-white mb-4 text-center">Resumo da Obra</h4>
           <div className="space-y-4">
             <div className="flex justify-between items-center border-b border-slate-800 pb-2">
               <span className="text-slate-400">Total de Obras Consumidas</span>
               <span className="text-white font-bold">{stats.totalItems}</span>
             </div>
             <div className="flex justify-between items-center border-b border-slate-800 pb-2">
               <span className="text-slate-400">Obras Finalizadas</span>
               <span className="text-emerald-400 font-bold">{stats.totalFinished}</span>
             </div>
             <div className="flex justify-between items-center border-b border-slate-800 pb-2">
               <span className="text-slate-400">Taxa de Conclusão</span>
               <span className="text-blue-400 font-bold">{stats.completionRate.toFixed(1)}%</span>
             </div>
             <div className="flex justify-between items-center pb-2">
               <span className="text-slate-400">Média Geral de Notas</span>
               <div className="flex items-center gap-1">
                 <Star className="w-4 h-4 text-amber-400 fill-current" />
                 <span className="text-amber-400 font-bold">{stats.avgRating.toFixed(1)}</span>
               </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  )
}

/* ============================================
   COMPONENTE PRINCIPAL APP
   ============================================ */
export default function App() {
  const [activeTab, setActiveTab] = useState('all')
  const [selectedYear, setSelectedYear] = useState('all')
  const [fileData, setFileData] = useState(null)
  const [fileName, setFileName] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)

  const handleFileSelect = useCallback(async (file) => {
    try {
      let parsed
      const ext = file.name.toLowerCase().split('.').pop()

      if (ext === 'xlsx' || ext === 'xls') {
        parsed = await parseXLSX(file)
      } else if (ext === 'csv') {
        parsed = await parseCSV(file)
      } else {
        alert('Formato não suportado. Use .xlsx ou .csv')
        return
      }

      // Normaliza chaves e auto-mapeia
      const finalData = {}
      for (const sheet in parsed) {
        const normalized = normalizeKeys(parsed[sheet])
        let detectedCat = detectCategory(normalized)
        
        // Se a detecção falhar, tenta pelo nome da aba
        if (detectedCat === 'desconhecido') {
          const s = sheet.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          if (s.includes('jogo') || s.includes('game')) detectedCat = 'jogos'
          else if (s.includes('filme') || s.includes('movie')) detectedCat = 'filmes'
          else if (s.includes('serie')) detectedCat = 'series'
          else if (s.includes('anime')) detectedCat = 'animes'
          else if (s.includes('livro') || s.includes('book')) detectedCat = 'livros'
        }

        const mappedData = autoMapColumns(normalized, detectedCat)
        
        let finalKey = (detectedCat !== 'desconhecido') ? detectedCat : sheet.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '')
        
        // Merge data if the key already exists (e.g., two sheets mapping to the same category)
        if (finalData[finalKey]) {
          finalData[finalKey] = [...finalData[finalKey], ...mappedData]
        } else {
          finalData[finalKey] = mappedData
        }
      }

      setFileData(finalData)
      setFileName(file.name)
      setActiveTab('all')
      setSelectedYear('all')
    } catch (err) {
      console.error(err)
      alert('Erro ao processar arquivo: ' + err.message)
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelect(file)
  }, [handleFileSelect])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  if (!fileData) {
    return (
      <div className="min-h-screen bg-slate-950">
        <nav className="bg-slate-900/80 border-b border-slate-800 px-6 py-4 flex items-center justify-between backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-purple-400" />
            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Entertainment Dashboard
            </span>
          </div>
        </nav>
        <WelcomeUpload
          onFileSelect={handleFileSelect}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        />
      </div>
    )
  }

  const availableYears = extractAvailableYears(fileData)
  const filteredData = selectedYear === 'all' ? fileData : filterDataByYear(fileData, selectedYear)

  const currentTabContent = () => {
    if (activeTab === 'all') return <DashboardGeneral data={filteredData} />
    if (activeTab === 'jogos') return <JogosDashboard data={filteredData} />
    if (activeTab === 'filmes') return <FilmesDashboard data={filteredData} />
    if (activeTab === 'series') return <SeriesDashboard data={filteredData} />
    if (activeTab === 'animes') return <AnimesDashboard data={filteredData} />
    if (activeTab === 'livros') return <LivrosDashboard data={filteredData} />
    if (activeTab === 'retrospectiva') return <Retrospectiva data={filteredData} year={selectedYear} />
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* NAVBAR */}
      <nav className="bg-slate-900/80 border-b border-slate-800 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-3">
            <div className="flex items-center justify-between w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-purple-400" />
                <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Entertainment Dashboard
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4">
              {availableYears.length > 0 && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="bg-slate-800 text-white text-sm rounded-lg border border-slate-700 px-3 py-1.5 focus:outline-none focus:border-purple-500"
                  >
                    <option value="all">Todos os Anos</option>
                    {availableYears.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 hidden md:inline max-w-[200px] truncate" title={fileName}>
                  {fileName}
                </span>
                <button
                  onClick={() => { setFileData(null); setFileName(''); setActiveTab('all'); setSelectedYear('all') }}
                  className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-sm bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50 hover:bg-slate-800"
                >
                  <XIcon className="w-4 h-4" /> Novo
                </button>
              </div>
            </div>
          </div>
          {/* TABS */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 hide-scrollbar">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon
              const hasData = cat.key === 'all' || cat.key === 'retrospectiva' || fileData[cat.key]
              return (
                <button
                  key={cat.key}
                  onClick={() => hasData && setActiveTab(cat.key)}
                  disabled={!hasData}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-200
                    ${activeTab === cat.key
                      ? (cat.key === 'retrospectiva' ? 'text-amber-400 border-amber-400' : 'text-purple-400 border-purple-400')
                      : hasData
                        ? 'text-slate-400 border-transparent hover:text-slate-200'
                        : 'text-slate-600 border-transparent cursor-not-allowed opacity-40'
                    }`}
                >
                  <Icon className={`w-4 h-4 ${activeTab === cat.key && cat.key === 'retrospectiva' ? 'text-amber-400' : ''}`} />
                  {cat.label}
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {currentTabContent()}
      </main>
    </div>
  )
}