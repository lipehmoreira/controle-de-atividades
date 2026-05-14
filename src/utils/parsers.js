// ===== UTILITÁRIOS DE PARSING =====
import * as XLSX from 'xlsx'
import Papa from 'papaparse'

/**
 * Normaliza valores: converte vírgula decimal para ponto,
 * remove R$, %, espaços extras, etc.
 */
export function normalizeValue(val) {
  if (val === null || val === undefined) return ''
  const str = String(val).trim()
  // Converte moeda "R$ 1.234,56" ou "1.234,56" para número
  const cleaned = str
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
  const num = parseFloat(cleaned)
  return isNaN(num) ? str : num
}

/**
 * Normaliza a nota: retorna vazio se for 0 ou inválido.
 */
export function normalizeRating(val) {
  const n = Number(val)
  if (isNaN(n) || n === 0) return null
  return n
}

/**
 * Normaliza string: capitalize cada palavra.
 */
export function normalizeString(str) {
  if (!str) return ''
  return String(str).trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Normaliza status para valores consistentes.
 */
export function normalizeStatus(val) {
  if (!val) return 'Em andamento'
  const s = String(val).trim().toLowerCase()
  if (s.includes('finaliz') || s.includes('complet') || s === 'concluído' || s === 'concluido') return 'Finalizado'
  if (s.includes('em and') || s.includes('jogan') || s.includes('assist') || s.includes('lendo') || s.includes('em progres')) return 'Em andamento'
  if (s.includes('abandon') || s.includes('drop')) return 'Abandonado'
  if (s.includes('pretend') || s.includes('quero') || s.includes('planej')) return 'Planejado'
  return String(val).trim()
}

/**
 * Converte duração de minutos para string legível.
 */
export function formatDuration(minutes) {
  const mins = Number(minutes)
  if (!mins || mins <= 0) return 'N/A'
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

/**
 * Converte horas para string legível.
 */
export function formatHours(hours) {
  const h = Number(hours)
  if (!h) return '0h'
  if (h < 1) return `${(h * 60).toFixed(0)} min`
  return `${h}h`
}

/**
 * Formata número com separador de milhar.
 */
export function formatNumber(n) {
  return Number(n).toLocaleString('pt-BR')
}

/**
 * Formata data curta.
 */
export function formatDate(d) {
  if (!d) return ''
  const date = new Date(d)
  if (isNaN(date.getTime())) return String(d)
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

/**
 * Extrai mês de uma data.
 */
export function getMonthYear(d) {
  if (!d) return 'Desconhecido'
  const date = new Date(d)
  if (isNaN(date.getTime())) return 'Desconhecido'
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

/**
 * Meses do ano em português.
 */
export const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

/**
 * ===== PARSERS DE ARQUIVO =====
 */

/**
 * Parse de arquivo XLSX (múltiplas abas).
 * Retorna { 'Nome da Aba': [Array de objetos], ... }
 */
export function parseXLSX(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const result = {}
        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName]
          const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
          result[sheetName] = json
        })
        resolve(result)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Parse de arquivo CSV.
 * Retorna { 'CSV': [Array de objetos] }.
 */
export function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      delimiter: '', // auto-detect
      complete: (results) => {
        resolve({ CSV: results.data })
      },
      error: reject
    })
  })
}

/**
 * Normaliza as chaves de um objeto para formato consistente.
 */
export function normalizeKeys(data) {
  if (!data || !Array.isArray(data)) return []
  return data.map((row) => {
    const obj = {}
    for (const key in row) {
      const cleanKey = key.trim().toLowerCase()
        .replace(/[áàâãä]/g, 'a')
        .replace(/[éèêë]/g, 'e')
        .replace(/[íìîï]/g, 'i')
        .replace(/[óòôõö]/g, 'o')
        .replace(/[úùûü]/g, 'u')
        .replace(/[ç]/g, 'c')
        .replace(/[^a-z0-9]/g, ' ')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
      obj[cleanKey] = row[key]
    }
    return obj
  })
}

/**
 * Tenta mapear automaticamente as colunas para a categoria.
 */
export function autoMapColumns(rows, category) {
  if (!rows || rows.length === 0) return []

  const mappings = {
    jogos: {
      nome: ['nome', 'jogo', 'game', 'titulo', 'título', 'name', 'title', 'nome_do_jogo', 'obra'],
      plataforma: ['plataforma', 'plataformas', 'platform', 'console'],
      genero: ['genero', 'gênero', 'generos', 'gêneros', 'genero_principal', 'tipo', 'genre'],
      status: ['status', 'estado', 'situação', 'situacao', 'progresso'],
      tempo_h: ['tempo', 'horas', 'tempo_h', 'tempo_total', 'horas_jogadas', 'duration'],
      dificuldade: ['dificuldade', 'dificil', 'difficulty', 'hard'],
      nota: ['nota', 'rating', 'avaliação', 'avaliacao', 'score', 'nota_final', 'nota10'],
      data: ['data', 'ano', 'year', 'concluido', 'terminado', 'date', 'conclusao', 'finalizado']
    },
    filmes: {
      nome: ['nome', 'filme', 'movie', 'titulo', 'título', 'name', 'title', 'nome_do_filme', 'obra'],
      direcao: ['direção', 'direcao', 'diretor', 'direção', 'director', 'directed_by'],
      genero: ['genero', 'gênero', 'generos', 'gêneros', 'genre'],
      duracao: ['duração', 'duracao', 'duracao_min', 'duration', 'runtime', 'duração_minutos'],
      nota: ['nota', 'rating', 'avaliação', 'avaliacao', 'score', 'nota10'],
      assistido_em: ['assistido_em', 'assistido', 'data', 'date', 'watched_in', 'when', 'ano', 'mes', 'year']
    },
    series: {
      nome: ['nome', 'série', 'serie', 'series', 'titulo', 'título', 'name', 'title', 'nome_da_serie', 'obra'],
      temporada: ['temporada', 'season', 'temporada_num', 'num_temporada'],
      episodios: ['episódios', 'episodios', 'episodes', 'num_episodios', 'total_episodios'],
      genero: ['genero', 'gênero', 'generos', 'gêneros', 'genre'],
      status: ['status', 'estado', 'situação', 'situacao', 'progresso'],
      nota: ['nota', 'rating', 'avaliação', 'avaliacao', 'score', 'nota10'],
      data: ['data', 'ano', 'year', 'concluido', 'terminado', 'date', 'assistido']
    },
    animes: {
      nome: ['nome', 'anime', 'name', 'title', 'titulo', 'título', 'nome_do_anime', 'obra'],
      temporada: ['temporada', 'season', 'num_temporada'],
      episodios: ['episódios', 'episodios', 'episodes', 'total_episodios', 'num_episodios'],
      genero: ['genero', 'gênero', 'generos', 'gêneros', 'genre'],
      status: ['status', 'estado', 'situação', 'situacao', 'progresso'],
      nota: ['nota', 'rating', 'avaliação', 'avaliacao', 'score', 'nota10'],
      data: ['data', 'ano', 'year', 'concluido', 'terminado', 'date', 'assistido']
    },
    livros: {
      nome: ['nome', 'livro', 'book', 'titulo', 'título', 'name', 'title', 'nome_do_livro', 'obra'],
      autor: ['autor', 'autora', 'author', 'escritor'],
      paginas: ['páginas', 'paginas', 'pages', 'num_paginas', 'total_paginas'],
      modo_leitura: ['modo_leitura', 'modo', 'formato', 'leitura', 'reading_mode', 'format', 'tipo', 'mídia', 'midia'],
      genero: ['genero', 'gênero', 'generos', 'gêneros', 'genre', 'categoria'],
      status: ['status', 'estado', 'situação', 'situacao', 'progresso'],
      nota: ['nota', 'rating', 'avaliação', 'avaliacao', 'score', 'nota10'],
      data: ['data', 'ano', 'year', 'concluido', 'terminado', 'date', 'lido']
    }
  }

  const map = mappings[category]
  if (!map) return rows

  const keys = Object.keys(rows[0])
  const keyMap = {}

  for (const [target, candidates] of Object.entries(map)) {
    const found = keys.find(k => candidates.includes(k.toLowerCase()))
    if (found) keyMap[found] = target
  }

  return rows.map(row => {
    const mapped = {}
    for (const [orig, dest] of Object.entries(keyMap)) {
      mapped[dest] = row[orig]
    }
    // Preserva campos não mapeados
    for (const k of keys) {
      if (!keyMap[k]) mapped[k] = row[k]
    }
    return mapped
  })
}

export function detectCategory(rows) {
  if (!rows || rows.length === 0) return 'desconhecido'
  const keys = Object.keys(rows[0]).join(' ').toLowerCase()
  if (keys.includes('plataforma') || keys.includes('dificuldade') || keys.includes('horas') || keys.includes('jogo') || keys.includes('game')) return 'jogos'
  if (keys.includes('diretor') || keys.includes('direção') || keys.includes('duracao') || keys.includes('duração') || keys.includes('filme') || keys.includes('movie')) return 'filmes'
  if (keys.includes('autor') || keys.includes('paginas') || keys.includes('páginas') || keys.includes('modo_leitura') || keys.includes('livro') || keys.includes('book')) return 'livros'
  if (keys.includes('episodios') || keys.includes('episódios') || keys.includes('temporada')) {
    if (keys.includes('anime') || keys.includes('animê')) return 'animes'
    return 'series'
  }
  return 'desconhecido'
}