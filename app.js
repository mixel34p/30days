// =============================================================
// app.js — 30 Días de Videojuegos
// Main application logic
// =============================================================

// ─── Supabase config (set your values from environment or .env) ───
// In production these come from Vercel env vars injected at build
// or you can hardcode the PUBLIC anon key & URL here (safe to expose).
const SUPABASE_URL     = window.ENV_SUPABASE_URL     || '';
const SUPABASE_ANON_KEY = window.ENV_SUPABASE_ANON_KEY || '';

// ─── Day definitions ──────────────────────────────────────────────
// type: 'game' | 'character' | 'text'
// CHALLENGE START DATE — change this to the real start date
const CHALLENGE_START = new Date('2026-06-22T00:00:00');

const DAY_DATA = [
  { day: 1,  type: 'game',      title: 'PRIMER VIDEOJUEGO',   prompt: 'Tu primer videojuego' },
  { day: 2,  type: 'game',      title: 'MÁS HORAS',           prompt: 'El juego en el que más horas tienes' },
  { day: 3,  type: 'game',      title: 'BOSS MÁS DIFÍCIL',    prompt: 'El boss más difícil al que te has enfrentado' },
  { day: 4,  type: 'game',      title: 'JUGANDO AHORA',       prompt: 'Lo que estás jugando ahora mismo' },
  { day: 5,  type: 'game',      title: 'MERECE REMAKE',       prompt: 'Un juego que merece un remake' },
  { day: 6,  type: 'game',      title: 'MEJOR WORLDBUILDING', prompt: 'El mejor worldbuilding' },
  { day: 7,  type: 'game',      title: 'MULTIJUGADOR/MMO',    prompt: 'Tu multijugador o MMO favorito' },
  { day: 8,  type: 'character', title: 'PROTAGONISTA FAVORITO', prompt: 'Tu protagonista favorito' },
  { day: 9,  type: 'character', title: 'ANTAGONISTA FAVORITO', prompt: 'Tu antagonista favorito' },
  { day: 10, type: 'game',      title: 'INFRAVALORADO',       prompt: 'Un juego infravalorado' },
  { day: 11, type: 'game',      title: 'COMFORT GAME',        prompt: 'Tu juego de cabecera (comfort game)' },
  { day: 12, type: 'character', title: 'MÁS IRRITANTE',       prompt: 'El personaje más irritante' },
  { day: 13, type: 'character', title: 'MEJOR DOBLAJE',       prompt: 'El mejor doblaje o actuación de voz' },
  { day: 14, type: 'character', title: 'CLASE FAVORITA',      prompt: 'Tu clase o estilo de combate favorito' },
  { day: 15, type: 'game',      title: 'SOBREVALORADO',       prompt: 'Un juego sobrevalorado' },
  { day: 16, type: 'game',      title: 'GIRO DE GUIÓN',       prompt: 'El mejor giro de guión' },
  { day: 17, type: 'game',      title: 'CINEMÁTICA FAVORITA', prompt: 'Tu cinemática favorita' },
  { day: 18, type: 'game',      title: 'PEOR MINIJUEGO',      prompt: 'El peor minijuego' },
  { day: 19, type: 'game',      title: 'MECÁNICA FAVORITA',   prompt: 'Tu mecánica de juego favorita' },
  { day: 20, type: 'game',      title: 'BOSS MÁS FÁCIL',      prompt: 'El boss final más fácil' },
  { day: 21, type: 'game',      title: 'PERSONALIZACIÓN',     prompt: 'La mejor personalización de personaje' },
  { day: 22, type: 'game',      title: 'FRASE FAVORITA',      prompt: 'Tu frase favorita dentro de un juego' },
  { day: 23, type: 'game',      title: 'PRIMERA RESERVA',     prompt: 'Tu primer reserva de juego' },
  { day: 24, type: 'game',      title: 'MEJOR BANDA SONORA',  prompt: 'La mejor banda sonora' },
  { day: 25, type: 'character', title: 'SECUNDARIO FAVORITO', prompt: 'Tu personaje secundario favorito' },
  { day: 26, type: 'game',      title: 'SAGA FAVORITA',       prompt: 'Tu saga favorita' },
  { day: 27, type: 'character', title: 'ESPECIE EXCLUSIVA',   prompt: 'Tu especie exclusiva de saga favorita' },
  { day: 28, type: 'text',      title: 'GÉNERO FAVORITO',     prompt: 'Tu género favorito' },
  { day: 29, type: 'game',      title: 'MÁS ANTICIPADO',      prompt: 'El juego que más estás anticipando' },
  { day: 30, type: 'game',      title: 'FAVORITO DE SIEMPRE', prompt: 'Tu juego favorito de todos los tiempos (por consola)' },
];

// ─── State ───────────────────────────────────────────────────────
let state = {
  nickname: '',
  responses: {}, // { dayNumber: responseObj }
  currentDayModal: null,
  searchDebounceTimer: null,
  selectedGame: null,
  selectedCharacter: null,
};

// ─── Supabase client ─────────────────────────────────────────────
let supabaseClient = null;

function initSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('Supabase not configured — responses will only be saved locally.');
    return;
  }
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.error('Supabase init error:', e);
  }
}

// ─── Day unlock logic ─────────────────────────────────────────────
function getDayStatus(dayNumber) {
  const now = new Date();
  const startDate = new Date(CHALLENGE_START);
  startDate.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diffMs = now - startDate;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const unlockedUpTo = diffDays + 1; // Day 1 = index 0

  if (dayNumber > unlockedUpTo) return 'locked';
  if (dayNumber === unlockedUpTo) return 'today';
  return 'available';
}

// ─── localStorage helpers ─────────────────────────────────────────
function loadFromStorage() {
  const nick = localStorage.getItem('30days_nickname');
  if (nick) state.nickname = nick;

  const saved = localStorage.getItem('30days_responses');
  if (saved) {
    try { state.responses = JSON.parse(saved); } catch (_) {}
  }
}

function saveToStorage() {
  localStorage.setItem('30days_responses', JSON.stringify(state.responses));
}

// ─── Supabase DB helpers ──────────────────────────────────────────
async function ensureUser(nickname) {
  if (!supabaseClient) return;
  try {
    await supabaseClient.from('users').upsert({ nickname }, { onConflict: 'nickname', ignoreDuplicates: true });
  } catch (e) { console.error('ensureUser:', e); }
}

async function saveResponse(dayNumber, data) {
  if (!supabaseClient) return;
  try {
    const payload = {
      user_nickname: state.nickname,
      day_number: dayNumber,
      game_id: data.gameId || null,
      game_name: data.gameName || null,
      game_cover: data.gameCover || null,
      character_name: data.characterName || null,
      text_response: data.textResponse || null,
    };
    await supabaseClient.from('responses').upsert(payload, {
      onConflict: 'user_nickname,day_number',
    });
  } catch (e) { console.error('saveResponse:', e); }
}

async function loadAllResponses() {
  if (!supabaseClient) return [];
  try {
    const { data, error } = await supabaseClient
      .from('responses')
      .select('*')
      .order('day_number', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('loadAllResponses:', e);
    return [];
  }
}

// ─── IGDB proxy calls ─────────────────────────────────────────────
async function searchIGDB(endpoint, query) {
  try {
    const res = await fetch('/api/igdb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint, query }),
    });
    if (!res.ok) throw new Error(`Proxy error ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error('IGDB search error:', e);
    return null;
  }
}

async function searchGames(term) {
  const safe = term.replace(/"/g, '');
  const query = `search "${safe}"; fields id, name, first_release_date, cover.url; where version_parent = null; limit 8;`;
  return searchIGDB('games', query);
}

async function searchCharacters(term) {
  const safe = term.replace(/"/g, '');
  const query = `search "${safe}"; fields id, name, games.name, mug_shot.url; limit 8;`;
  return searchIGDB('characters', query);
}

function buildCoverUrl(url, size = 'cover_big') {
  if (!url) return null;
  // IGDB returns URLs like //images.igdb.com/igdb/image/upload/t_thumb/co1wyy.jpg
  // We replace the size token to get a larger image.
  const full = url.startsWith('//') ? `https:${url}` : url;
  return full.replace(/\/t_[a-z0-9_]+\//, `/t_${size}/`);
}

// ─── Toast ────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// ─── Stars background ─────────────────────────────────────────────
function generateStars() {
  const container = document.querySelector('.pixel-stars');
  if (!container) return;
  const count = 80;
  for (let i = 0; i < count; i++) {
    const star = document.createElement('div');
    star.className = 'pixel-star';
    star.style.left = Math.random() * 100 + '%';
    star.style.top  = Math.random() * 100 + '%';
    star.style.animationDelay = Math.random() * 4 + 's';
    container.appendChild(star);
  }
}

// ─── HTML escape helper (prevents XSS in wall cards) ────────────────
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Render helpers ───────────────────────────────────────────────
function getTypeIcon(type) {
  if (type === 'game') return '🎮';
  if (type === 'character') return '🧙';
  return '✏️';
}

function formatDate(isoStr) {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

// ─── Render Days Grid ─────────────────────────────────────────────
function renderDays() {
  const grid = document.getElementById('days-grid');
  if (!grid) return;

  const completed = Object.keys(state.responses).length;
  const totalCompleted = document.getElementById('progress-completed');
  const progressFill  = document.getElementById('progress-fill');
  const progressWrap  = progressFill?.closest('[role="progressbar"]');
  if (totalCompleted) totalCompleted.textContent = `${completed}/30`;
  if (progressFill) {
    progressFill.style.width = ((completed / 30) * 100).toFixed(1) + '%';
  }
  if (progressWrap) progressWrap.setAttribute('aria-valuenow', completed);

  grid.innerHTML = '';

  DAY_DATA.forEach(({ day, type, title, prompt }) => {
    const status   = getDayStatus(day);
    const response = state.responses[day];
    const isLocked = status === 'locked';
    const isToday  = status === 'today';

    const card = document.createElement('div');
    card.className = [
      'day-card',
      isLocked ? 'locked' : '',
      isToday  ? 'today'  : '',
      response ? 'completed' : '',
    ].filter(Boolean).join(' ');

    card.dataset.day = day;

    const checkMark = response ? '<span class="badge-check">✔</span>' : '';
    const lockMark  = isLocked ? '<span class="badge-lock">🔒</span>' : '';
    const todayBadge = isToday
      ? `<span style="font-family:var(--font-pixel);font-size:6px;color:var(--yellow-neon);text-shadow:0 0 6px var(--yellow-neon)">HOY</span>`
      : '';

    let previewHtml = '';
    if (response) {
      let previewInner = '';
      if (response.gameName) {
        const imgTag = response.gameCover
          ? `<img class="card-preview-cover" src="${response.gameCover}" alt="${response.gameName}" loading="lazy">`
          : `<span style="font-size:24px">🎮</span>`;
        previewInner = `<div class="card-preview-game">${imgTag}<span class="card-preview-name">${response.gameName}</span></div>`;
      } else if (response.characterName) {
        previewInner = `<div class="card-preview-game"><span style="font-size:24px">🧙</span><span class="card-preview-name">${response.characterName}</span></div>`;
      }
      if (response.textResponse) {
        const snippet = response.textResponse.substring(0, 80) + (response.textResponse.length > 80 ? '…' : '');
        previewInner += `<div class="card-preview-text">${snippet}</div>`;
      }
      previewHtml = `<div class="card-preview">${previewInner}</div>`;
    }

    card.innerHTML = `
      <div class="card-header">
        <span class="card-day-label">DÍA ${String(day).padStart(2, '0')}</span>
        <div class="card-badges">
          <span class="badge-type">${getTypeIcon(type)}</span>
          ${todayBadge}${checkMark}${lockMark}
        </div>
      </div>
      <div class="card-body">
        <div class="card-title">${title}</div>
        <div class="card-prompt">${prompt}</div>
        ${previewHtml}
      </div>
    `;

    if (!isLocked) {
      card.addEventListener('click', () => openDayModal(day));
    }

    grid.appendChild(card);
  });

  // Check if all 30 days are completed
  if (completed === 30) {
    setTimeout(showCelebration, 400);
  }
}

// ─── Nickname Modal ───────────────────────────────────────────────
function showNicknameModal() {
  const overlay = document.getElementById('nickname-modal');
  overlay.classList.remove('hidden');
}

function hideNicknameModal() {
  document.getElementById('nickname-modal').classList.add('hidden');
}

function handleNicknameSubmit() {
  const input = document.getElementById('nickname-input');
  const val = (input.value || '').trim();
  if (!val || val.length < 2) {
    showToast('Nickname demasiado corto. Mínimo 2 caracteres.', 'error');
    input.focus();
    return;
  }
  if (val.length > 20) {
    showToast('Nickname demasiado largo. Máximo 20 caracteres.', 'error');
    input.focus();
    return;
  }
  state.nickname = val;
  localStorage.setItem('30days_nickname', val);
  hideNicknameModal();
  updateHeaderUser();
  ensureUser(val);
  showToast(`¡Bienvenido/a, ${val}!`);
}

function updateHeaderUser() {
  const tag = document.getElementById('header-nickname');
  if (tag) tag.textContent = `JUGADOR: ${state.nickname.toUpperCase()}`;

  const stats = document.getElementById('header-stats');
  const completed = Object.keys(state.responses).length;
  if (stats) stats.textContent = `${completed}/30 días completados`;
}

// ─── Day Modal ────────────────────────────────────────────────────
function openDayModal(dayNumber) {
  const dayInfo = DAY_DATA.find(d => d.day === dayNumber);
  if (!dayInfo) return;

  state.currentDayModal = dayNumber;
  state.selectedGame = null;
  state.selectedCharacter = null;

  const overlay = document.getElementById('day-modal');
  overlay.classList.remove('hidden');

  // Header
  document.getElementById('dm-day').textContent = `DÍA ${String(dayNumber).padStart(2, '0')}`;
  document.getElementById('dm-title').textContent = dayInfo.title;
  document.getElementById('dm-prompt').textContent = dayInfo.prompt;

  // Build the form body
  const formEl = document.getElementById('dm-form');
  formEl.innerHTML = '';

  const existing = state.responses[dayNumber];

  if (dayInfo.type === 'game') {
    buildGameForm(formEl, existing);
  } else if (dayInfo.type === 'character') {
    buildCharacterForm(formEl, existing);
  } else {
    buildTextForm(formEl, existing);
  }

  // Restore existing selections
  if (existing) {
    if (dayInfo.type === 'game' && existing.gameName) {
      state.selectedGame = {
        id: existing.gameId,
        name: existing.gameName,
        cover: existing.gameCover,
      };
      renderSelectedGame();
    } else if (dayInfo.type === 'character' && existing.characterName) {
      state.selectedCharacter = { name: existing.characterName };
      renderSelectedCharacter();
    }
    const ta = document.getElementById('dm-text');
    if (ta && existing.textResponse) ta.value = existing.textResponse;
    const customChar = document.getElementById('dm-char-custom');
    if (customChar && existing.characterName) customChar.value = existing.characterName;
  }
}

function buildGameForm(container, existing) {
  container.innerHTML = `
    <label class="form-label blue">🎮 BUSCA UN JUEGO</label>
    <div id="game-selected-preview" class="hidden"></div>
    <div class="search-wrap" id="game-search-wrap">
      <input id="dm-game-search" class="pixel-input" type="text" placeholder="Escribe el nombre del juego..." autocomplete="off">
      <button class="pixel-btn btn-blue btn-sm" onclick="triggerGameSearch()">BUSCAR</button>
    </div>
    <div id="game-search-results" class="search-results"></div>
    <label class="form-label mt-16">✏️ AÑADE TU COMENTARIO (OBLIGATORIO)</label>
    <textarea id="dm-text" class="pixel-textarea" placeholder="¿Por qué elegiste este juego? Cuéntanos más..." rows="3"></textarea>
  `;

  const searchInput = document.getElementById('dm-game-search');
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') triggerGameSearch();
  });
  searchInput.addEventListener('input', () => {
    clearTimeout(state.searchDebounceTimer);
    state.searchDebounceTimer = setTimeout(triggerGameSearch, 600);
  });
}

function buildCharacterForm(container, existing) {
  container.innerHTML = `
    <label class="form-label blue">🧙 BUSCA UN PERSONAJE</label>
    <div id="char-selected-preview" class="hidden"></div>
    <div class="search-wrap" id="char-search-wrap">
      <input id="dm-char-search" class="pixel-input" type="text" placeholder="Escribe el nombre del personaje..." autocomplete="off">
      <button class="pixel-btn btn-blue btn-sm" onclick="triggerCharSearch()">BUSCAR</button>
    </div>
    <div id="char-search-results" class="search-results"></div>
    <div class="or-divider">— o escríbelo manualmente —</div>
    <label class="form-label">✏️ NOMBRE PERSONALIZADO</label>
    <input id="dm-char-custom" class="pixel-input purple-input" type="text" placeholder="Nombre del personaje..." autocomplete="off">
    <label class="form-label mt-16">✏️ AÑADE TU COMENTARIO (OBLIGATORIO)</label>
    <textarea id="dm-text" class="pixel-textarea" placeholder="¿Por qué este personaje? Cuéntanos..." rows="3"></textarea>
  `;

  const searchInput = document.getElementById('dm-char-search');
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') triggerCharSearch();
  });
  searchInput.addEventListener('input', () => {
    clearTimeout(state.searchDebounceTimer);
    state.searchDebounceTimer = setTimeout(triggerCharSearch, 600);
  });
}

function buildTextForm(container, existing) {
  container.innerHTML = `
    <label class="form-label">✏️ TU RESPUESTA</label>
    <textarea id="dm-text" class="pixel-textarea" placeholder="Escribe aquí tu respuesta..." rows="6" style="font-size:20px;"></textarea>
  `;
}

// ─── Game search flow ──────────────────────────────────────────────
async function triggerGameSearch() {
  const input = document.getElementById('dm-game-search');
  if (!input) return;
  const term = (input.value || '').trim();
  if (term.length < 2) return;

  const resultsEl = document.getElementById('game-search-results');
  resultsEl.innerHTML = '<div class="search-spinner">BUSCANDO... ⚡</div>';
  resultsEl.classList.add('visible');

  const results = await searchGames(term);

  if (!results || results.length === 0) {
    resultsEl.innerHTML = '<div class="search-empty">No se encontraron resultados 😞</div>';
    return;
  }

  resultsEl.innerHTML = '';
  results.forEach(game => {
    const coverRaw = game.cover?.url;
    const coverUrl = coverRaw ? buildCoverUrl(coverRaw) : null;

    const item = document.createElement('div');
    item.className = 'result-item';

    const imgEl = coverUrl
      ? `<img class="result-cover" src="${coverUrl}" alt="${game.name}" loading="lazy">`
      : `<div class="result-cover-placeholder">🎮</div>`;

    const year = game.first_release_date
      ? new Date(game.first_release_date * 1000).getFullYear()
      : '';

    item.innerHTML = `
      ${imgEl}
      <div class="result-info">
        <div class="result-name">${game.name}</div>
        <div class="result-meta">${year}</div>
      </div>
    `;

    item.addEventListener('click', () => {
      state.selectedGame = { id: game.id, name: game.name, cover: coverUrl };
      renderSelectedGame();
      resultsEl.classList.remove('visible');
    });

    resultsEl.appendChild(item);
  });
}

function renderSelectedGame() {
  const preview = document.getElementById('game-selected-preview');
  const wrap    = document.getElementById('game-search-wrap');
  const results = document.getElementById('game-search-results');
  if (!preview || !state.selectedGame) return;

  const { name, cover } = state.selectedGame;
  const imgEl = cover
    ? `<img src="${cover}" alt="${name}">`
    : `<span style="font-size:28px">🎮</span>`;

  preview.innerHTML = `
    <div class="selected-item-preview">
      ${imgEl}
      <div class="sel-name">${name}</div>
      <button class="sel-clear" onclick="clearGameSelection()">✕ CAMBIAR</button>
    </div>
  `;
  preview.classList.remove('hidden');
  if (wrap) wrap.classList.add('hidden');
  if (results) results.classList.remove('visible');
}

function clearGameSelection() {
  state.selectedGame = null;
  const preview = document.getElementById('game-selected-preview');
  const wrap    = document.getElementById('game-search-wrap');
  if (preview) { preview.innerHTML = ''; preview.classList.add('hidden'); }
  if (wrap) wrap.classList.remove('hidden');
}

// ─── Character search flow ─────────────────────────────────────────
async function triggerCharSearch() {
  const input = document.getElementById('dm-char-search');
  if (!input) return;
  const term = (input.value || '').trim();
  if (term.length < 2) return;

  const resultsEl = document.getElementById('char-search-results');
  resultsEl.innerHTML = '<div class="search-spinner">BUSCANDO... ⚡</div>';
  resultsEl.classList.add('visible');

  const results = await searchCharacters(term);

  if (!results || results.length === 0) {
    resultsEl.innerHTML = '<div class="search-empty">No encontrado — usa el campo manual ⬇️</div>';
    return;
  }

  resultsEl.innerHTML = '';
  results.forEach(char => {
    const mugRaw = char.mug_shot?.url;
    const mugUrl = mugRaw ? buildCoverUrl(mugRaw) : null;

    const item = document.createElement('div');
    item.className = 'result-item';

    const imgEl = mugUrl
      ? `<img class="result-cover" src="${mugUrl}" alt="${char.name}" loading="lazy">`
      : `<div class="result-cover-placeholder">🧙</div>`;

    const gameNames = char.games?.slice(0,2).map(g => g.name).join(', ') || '';

    item.innerHTML = `
      ${imgEl}
      <div class="result-info">
        <div class="result-name">${char.name}</div>
        <div class="result-meta">${gameNames}</div>
      </div>
    `;

    item.addEventListener('click', () => {
      state.selectedCharacter = { id: char.id, name: char.name, mug: mugUrl };
      renderSelectedCharacter();
      resultsEl.classList.remove('visible');
      // Also fill the manual field
      const customEl = document.getElementById('dm-char-custom');
      if (customEl) customEl.value = char.name;
    });

    resultsEl.appendChild(item);
  });
}

function renderSelectedCharacter() {
  const preview = document.getElementById('char-selected-preview');
  const wrap    = document.getElementById('char-search-wrap');
  const results = document.getElementById('char-search-results');
  if (!preview || !state.selectedCharacter) return;

  const { name, mug } = state.selectedCharacter;
  const imgEl = mug
    ? `<img src="${mug}" alt="${name}">`
    : `<span style="font-size:28px">🧙</span>`;

  preview.innerHTML = `
    <div class="selected-item-preview">
      ${imgEl}
      <div class="sel-name">${name}</div>
      <button class="sel-clear" onclick="clearCharSelection()">✕ CAMBIAR</button>
    </div>
  `;
  preview.classList.remove('hidden');
  if (wrap) wrap.classList.add('hidden');
  if (results) results.classList.remove('visible');
}

function clearCharSelection() {
  state.selectedCharacter = null;
  const preview = document.getElementById('char-selected-preview');
  const wrap    = document.getElementById('char-search-wrap');
  if (preview) { preview.innerHTML = ''; preview.classList.add('hidden'); }
  if (wrap) wrap.classList.remove('hidden');
}

// ─── Save day response ────────────────────────────────────────────
async function saveDayResponse() {
  const dayNumber = state.currentDayModal;
  if (!dayNumber) return;

  const dayInfo = DAY_DATA.find(d => d.day === dayNumber);
  const textEl = document.getElementById('dm-text');
  const textResponse = textEl ? textEl.value.trim() : '';

  if (!textResponse) {
    showToast('Añade un comentario (obligatorio) ✏️', 'error');
    return;
  }

  let responseData = {};

  if (dayInfo.type === 'game') {
    if (!state.selectedGame) {
      showToast('Debes seleccionar un juego primero 🎮', 'error');
      return;
    }
    responseData = {
      gameId:   state.selectedGame.id,
      gameName: state.selectedGame.name,
      gameCover: state.selectedGame.cover,
      textResponse,
    };
  } else if (dayInfo.type === 'character') {
    const customEl = document.getElementById('dm-char-custom');
    const customName = customEl ? customEl.value.trim() : '';
    const charName = (state.selectedCharacter?.name) || customName;

    if (!charName) {
      showToast('Debes seleccionar o escribir un personaje 🧙', 'error');
      return;
    }
    responseData = {
      characterName: charName,
      textResponse,
    };
  } else {
    responseData = { textResponse };
  }

  state.responses[dayNumber] = responseData;
  saveToStorage();

  // Save to Supabase (async, non-blocking)
  saveResponse(dayNumber, responseData);

  closeDayModal();
  renderDays();
  updateHeaderUser();
  showToast(`✔ Día ${dayNumber} guardado!`);
}

function closeDayModal() {
  document.getElementById('day-modal').classList.add('hidden');
  state.currentDayModal = null;
  state.selectedGame = null;
  state.selectedCharacter = null;
}

// ─── Community Wall ────────────────────────────────────────────────
async function renderWall(filterDay = null) {
  const wallEl = document.getElementById('wall-content');
  wallEl.innerHTML = '<div class="wall-loading">⚡ CARGANDO RESPUESTAS...</div>';

  let allResponses = await loadAllResponses();

  // If no Supabase, show local responses
  if (allResponses.length === 0 && Object.keys(state.responses).length > 0) {
    allResponses = Object.entries(state.responses).map(([day, r]) => ({
      user_nickname: state.nickname || 'TÚ',
      day_number: parseInt(day),
      game_id: r.gameId,
      game_name: r.gameName,
      game_cover: r.gameCover,
      character_name: r.characterName,
      text_response: r.textResponse,
      created_at: new Date().toISOString(),
    }));
  }

  if (allResponses.length === 0) {
    wallEl.innerHTML = '<div class="wall-empty">📭 Aún no hay respuestas.<br>¡Sé el primero!</div>';
    return;
  }

  // Group by day
  const byDay = {};
  allResponses.forEach(r => {
    const d = r.day_number;
    if (filterDay && d !== filterDay) return;
    if (!byDay[d]) byDay[d] = [];
    byDay[d].push(r);
  });

  if (Object.keys(byDay).length === 0) {
    wallEl.innerHTML = '<div class="wall-empty">📭 No hay respuestas para este día aún.</div>';
    return;
  }

  wallEl.innerHTML = '';
  const sortedDays = Object.keys(byDay).map(Number).sort((a, b) => a - b);

  sortedDays.forEach(day => {
    const dayInfo = DAY_DATA.find(d => d.day === day);
    const group = document.createElement('div');
    group.className = 'wall-day-group';

    group.innerHTML = `
      <div class="wall-day-header">
        ◆ DÍA ${String(day).padStart(2,'0')}: ${dayInfo?.title || ''} — ${dayInfo?.prompt || ''}
      </div>
      <div class="wall-cards-row" id="wall-day-${day}"></div>
    `;

    wallEl.appendChild(group);

    const rowEl = document.getElementById(`wall-day-${day}`);

    byDay[day].forEach(r => {
      const card = document.createElement('div');
      card.className = 'wall-card';

      const coverEl = r.game_cover
        ? `<img class="wall-card-cover" src="${r.game_cover}" alt="${r.game_name}" loading="lazy">`
        : (r.game_name
          ? `<div class="wall-card-cover-placeholder">🎮</div>`
          : (r.character_name
            ? `<div class="wall-card-cover-placeholder">🧙</div>`
            : `<div class="wall-card-cover-placeholder">✏️</div>`));

      const gameEl  = r.game_name      ? `<div class="wall-card-game">${esc(r.game_name)}</div>` : '';
      const charEl  = r.character_name ? `<div class="wall-card-character">🧙 ${esc(r.character_name)}</div>` : '';
      const textEl  = r.text_response  ? `<div class="wall-card-text">${esc(r.text_response)}</div>` : '';
      const dateEl  = `<div class="wall-card-date">${formatDate(r.created_at)}</div>`;

      card.innerHTML = `
        <div class="wall-card-top">
          ${coverEl}
          <div class="wall-card-meta">
            <div class="wall-card-nickname">◆ ${r.user_nickname}</div>
            ${gameEl}${charEl}${dateEl}
          </div>
        </div>
        ${textEl}
      `;

      rowEl.appendChild(card);
    });
  });
}

// ─── Wall filter buttons ───────────────────────────────────────────
function buildWallFilters() {
  const container = document.getElementById('wall-filters');
  if (!container) return;

  const allBtn = document.createElement('button');
  allBtn.className = 'wall-filter-btn active';
  allBtn.textContent = 'TODOS';
  allBtn.addEventListener('click', () => {
    document.querySelectorAll('.wall-filter-btn').forEach(b => b.classList.remove('active'));
    allBtn.classList.add('active');
    renderWall(null);
  });
  container.appendChild(allBtn);

  for (let d = 1; d <= 30; d++) {
    const btn = document.createElement('button');
    btn.className = 'wall-filter-btn';
    btn.textContent = `DÍA ${d}`;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.wall-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderWall(d);
    });
    container.appendChild(btn);
  }
}

// ─── Celebration ───────────────────────────────────────────────────
function showCelebration() {
  const overlay = document.getElementById('celebration-overlay');
  if (!overlay) return;
  overlay.classList.add('active');

  // Spawn pixel fireworks
  const colors = ['#ffe600','#ff6d00','#c800ff','#00ff88','#00e5ff'];
  for (let i = 0; i < 40; i++) {
    const fw = document.createElement('div');
    fw.className = 'pixel-firework';
    fw.style.background = colors[Math.floor(Math.random() * colors.length)];
    fw.style.left = Math.random() * 100 + '%';
    fw.style.top  = Math.random() * 100 + '%';
    const angle = Math.random() * 360;
    const dist  = 60 + Math.random() * 120;
    fw.style.setProperty('--fx', `${Math.cos(angle * Math.PI / 180) * dist}px`);
    fw.style.setProperty('--fy', `${Math.sin(angle * Math.PI / 180) * dist}px`);
    fw.style.animationDelay = Math.random() * 2 + 's';
    fw.style.animationDuration = (1 + Math.random()) + 's';
    overlay.appendChild(fw);
  }
}

// ─── Tab navigation ────────────────────────────────────────────────
function switchTab(tabId) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

  const tabBtn = document.querySelector(`[data-tab="${tabId}"]`);
  const view   = document.getElementById(`view-${tabId}`);
  if (tabBtn) tabBtn.classList.add('active');
  if (view) view.classList.add('active');

  // Wall is loaded on-demand when the tab becomes active
  if (tabId === 'wall') renderWall(null);
}

// ─── Init ──────────────────────────────────────────────────────────
function init() {
  initSupabase();
  loadFromStorage();
  generateStars();
  buildWallFilters();

  // ── Event: nickname modal submit
  const nickBtn = document.getElementById('nickname-submit');
  if (nickBtn) nickBtn.addEventListener('click', handleNicknameSubmit);
  const nickInput = document.getElementById('nickname-input');
  if (nickInput) {
    nickInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleNicknameSubmit();
    });
  }

  // ── Event: day modal close + save
  document.getElementById('dm-close')?.addEventListener('click', closeDayModal);
  document.getElementById('dm-save')?.addEventListener('click', saveDayResponse);

  // ── Event: close celebration
  document.getElementById('celebration-close')?.addEventListener('click', () => {
    document.getElementById('celebration-overlay').classList.remove('active');
  });

  // ── Tabs
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // ── Close modal on overlay click (day modal only)
  document.getElementById('day-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeDayModal();
  });

  // ── Escape key closes day modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.currentDayModal) closeDayModal();
  });

  // ── First render
  if (!state.nickname) {
    showNicknameModal();
    // Focus after short delay so animation finishes
    setTimeout(() => document.getElementById('nickname-input')?.focus(), 350);
  } else {
    updateHeaderUser();
  }

  renderDays();
  switchTab('days');
}

document.addEventListener('DOMContentLoaded', init);
