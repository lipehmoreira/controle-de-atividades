# 🎮 Entertainment Dashboard

Dashboard interativa para visualizar estatísticas de entretenimento (Jogos, Filmes, Séries, Animes e Livros).

## 🚀 Como Rodar

```bash
# 1. Instale as dependências
npm install

# 2. Rode o servidor de desenvolvimento
npm run dev
```

O app estará disponível em `http://localhost:3000`.

## 📋 Funcionalidades

- **Upload** de arquivos `.xlsx` (múltiplas abas) ou `.csv`
- **Detecção automática** de colunas por categoria
- **Dashboard Geral** com KPIs consolidados
- **Dashboards específicos** para Jogos, Filmes, Séries, Animes e Livros
- Gráficos de barras e pizza interativos
- Tabela de dados brutos expansível

## 📊 Formato da Planilha

### Abas suportadas (nomes sugeridos):
- **Jogos** → Nome, Plataforma, Gênero, Status, Tempo (h), Dificuldade, Nota
- **Filmes** → Nome, Direção, Gênero, Duração, Nota, Assistido em
- **Séries** → Nome, Temporada, Episódios, Gênero, Status, Nota
- **Animes** → Nome, Temporada, Episódios, Gênero, Status, Nota
- **Livros** → Nome, Autor, Páginas, Modo de Leitura, Gênero, Status, Nota

## 🛠️ Stack

- React 18 + Vite
- Tailwind CSS
- Lucide Icons
- SheetJS (xlsx)
- PapaParse (csv)
- Recharts (gráficos)

## 📁 Estrutura

```
src/
  App.jsx             → Componente principal com navegação por tabs
  index.css            → Estilos globais + Tailwind
  main.jsx             → Entry point
  components/
    StatCard.jsx       → Card de KPI reutilizável
    ProgressBar.jsx    → Barra de progresso reutilizável
  utils/
    parsers.js         → Parse de XLSX/CSV + normalização
    statistics.js      → Funções de agregação e cálculos
```

## 🎨 Tema

Dark Mode com paleta:
- Fundo: `slate-950`
- Cards: `slate-900`
- Acentos: `purple-500`, `blue-400`, `emerald-500`, `amber-400`