// ===== FUNÇÕES DE ESTATÍSTICA =====

/**
 * Calcula a média de notas, ignorando zeros e vazios.
 */
export function averageRating(items) {
  if (!items || items.length === 0) return 0
  const ratings = items
    .map(i => Number(i.nota || i.rating || i.score || i.avaliacao || i.Nota || 0))
    .filter(n => n > 0 && !isNaN(n))
  if (ratings.length === 0) return 0
  return ratings.reduce((a, b) => a + b, 0) / ratings.length
}

/**
 * Conta itens por status.
 */
export function countByStatus(items) {
  const counts = {}
  items.forEach(item => {
    const s = (item.status || 'Desconhecido').trim()
    counts[s] = (counts[s] || 0) + 1
  })
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Retorna top N por nota.
 */
export function topByRating(items, n = 5) {
  return [...items]
    .filter(i => {
      const r = Number(i.nota || i.rating || i.Nota || 0)
      return r > 0
    })
    .sort((a, b) => (Number(b.nota || b.rating || b.Nota || 0) - Number(a.nota || a.rating || a.Nota || 0)))
    .slice(0, n)
}

/**
 * Agrupa por campo e conta.
 */
export function groupCount(items, field) {
  const groups = {}
  items.forEach(item => {
    const key = (item[field] || 'Desconhecido').toString().trim()
    groups[key] = (groups[key] || 0) + 1
  })
  return Object.entries(groups)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Agrupa por campo e soma.
 */
export function groupSum(items, field, sumField) {
  const groups = {}
  items.forEach(item => {
    const key = (item[field] || 'Desconhecido').toString().trim()
    const val = Number(item[sumField] || 0)
    if (!groups[key]) groups[key] = { name: key, total: 0 }
    groups[key].total += val
  })
  return Object.values(groups).sort((a, b) => b.total - a.total)
}

/**
 * Agrupa por campo e calcula média.
 */
export function groupAvg(items, field, avgField) {
  const groups = {}
  items.forEach(item => {
    const key = (item[field] || 'Desconhecido').toString().trim()
    const val = Number(item[avgField] || 0)
    if (!groups[key]) groups[key] = { name: key, sum: 0, count: 0 }
    groups[key].sum += val
    groups[key].count ++
  })
  return Object.values(groups)
    .map(g => ({ name: g.name, average: g.count > 0 ? g.sum / g.count : 0 }))
    .sort((a, b) => b.average - a.average)
}

/**
 * Agrupa filmes/itens por mês.
 */
export function groupByMonth(items, dateField) {
  const months = {}
  items.forEach(item => {
    const dateStr = item[dateField] || item.data || item.assistido_em || item.date || ''
    const monthLabel = extractMonthYear(dateStr)
    months[monthLabel] = (months[monthLabel] || 0) + 1
  })
  return Object.entries(months)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => {
      // Ordena cronologicamente (básico)
      const ma = parseMonth(a.month)
      const mb = parseMonth(b.month)
      return ma - mb
    })
}

function extractMonthYear(d) {
  if (!d) return 'Desconhecido'
  const s = String(d).trim()
  // Tenta parsear "MM/YYYY", "YYYY-MM-DD", "DD/MM/YYYY", etc.
  let date = new Date(s)
  if (isNaN(date.getTime())) {
    // Tenta formato MM/YYYY
    const parts = s.split('/')
    if (parts.length === 2) {
      date = new Date(Number(parts[1]), Number(parts[0]) - 1)
    }
    if (isNaN(date.getTime())) return s
  }
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                   'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  return `${months[date.getMonth()]} ${date.getFullYear()}`
}

function parseMonth(monthLabel) {
  const months = {
    'janeiro':1,'fevereiro':2,'março':3,'marco':3,'abril':4,'maio':5,'junho':6,
    'julho':7,'agosto':8,'setembro':9,'outubro':10,'novembro':11,'dezembro':12
  }
  const parts = (monthLabel || '').toLowerCase().replace(/[ºª]/g, '').trim().split(' ')
  const m = months[parts[0]] || 0
  const y = Number(parts[1]) || 0
  return y * 12 + m
}

export function extractAvailableYears(data) {
  const years = new Set()
  for (const cat in data) {
    if (Array.isArray(data[cat])) {
      data[cat].forEach(item => {
        const dStr = item.data || item.assistido_em || item.date || item.terminado_em || item.concluido_em || ''
        if (dStr) {
          let date = new Date(dStr)
          if (!isNaN(date.getTime())) {
            years.add(date.getFullYear())
          } else {
            const parts = String(dStr).split('/')
            if (parts.length === 2) {
              years.add(Number(parts[1]))
            } else if (parts.length === 3) {
              years.add(Number(parts[2]))
            }
          }
        }
      })
    }
  }
  return Array.from(years).filter(y => !isNaN(y) && y > 1900 && y < 2100).sort((a,b) => b - a)
}

export function filterDataByYear(data, year) {
  const filtered = {}
  for (const cat in data) {
    if (Array.isArray(data[cat])) {
      filtered[cat] = data[cat].filter(item => {
        const dStr = item.data || item.assistido_em || item.date || item.terminado_em || item.concluido_em || ''
        if (!dStr) return false // se não tem data, não tem como filtrar, ou assume true? Vamos ocultar se não bate com o ano
        let itemYear = null
        let date = new Date(dStr)
        if (!isNaN(date.getTime())) {
          itemYear = date.getFullYear()
        } else {
          const parts = String(dStr).split('/')
          if (parts.length === 2) itemYear = Number(parts[1])
          else if (parts.length === 3) itemYear = Number(parts[2])
        }
        return itemYear === Number(year)
      })
    } else {
      filtered[cat] = data[cat]
    }
  }
  return filtered
}

/**
 * Estatísticas gerais combinadas de todas as categorias.
 */
export function generalStats(data) {
  let totalItems = 0
  let totalFinished = 0
  let allRatings = []

  for (const category in data) {
    const items = data[category]
    if (!Array.isArray(items)) continue
    totalItems += items.length
    items.forEach(i => {
      const s = String(i.status || '').toLowerCase()
      if (s.includes('finaliz') || s.includes('conclu')) totalFinished++
      const r = Number(i.nota || i.rating || i.Nota || 0)
      if (r > 0) allRatings.push(r)
    })
  }

  const avgRating = allRatings.length > 0
    ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length
    : 0

  return {
    totalItems,
    totalFinished,
    completionRate: totalItems > 0 ? (totalFinished / totalItems) * 100 : 0,
    avgRating: Math.round(avgRating * 10) / 10
  }
}