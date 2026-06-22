# 30 Días de Videojuegos 🎮

Reto gamer de 30 días con estética pixel art/retro. Cada día se desbloquea una nueva pregunta sobre videojuegos. Las respuestas se guardan en Supabase y se muestran en un muro comunitario.

## Estructura de archivos

```
30days/
├── index.html          ← Página principal (todo el UI)
├── style.css           ← Estilos retro / pixel art
├── app.js              ← Lógica de la aplicación
├── vercel.json         ← Configuración Vercel
├── README.md           ← Este archivo
└── api/
    └── igdb.js         ← Proxy serverless para IGDB API (Node.js/Vercel)
```

## Variables de entorno

Crea un archivo `.env` local para desarrollo, o añádelas en Vercel → Settings → Environment Variables:

| Variable | Descripción |
|---|---|
| `IGDB_CLIENT_ID` | Client ID de Twitch Developer Console |
| `IGDB_CLIENT_SECRET` | Client Secret de Twitch |
| `SUPABASE_URL` | URL de tu proyecto Supabase (ej: `https://xxxx.supabase.co`) |
| `SUPABASE_ANON_KEY` | Clave anon/pública de Supabase |

> **Nota:** `SUPABASE_URL` y `SUPABASE_ANON_KEY` son públicas y se pueden exponer en el frontend. Las de IGDB son privadas y solo van en el servidor (proxy).

## Configuración rápida

### 1. Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a **SQL Editor** y ejecuta el SQL de la pestaña ⚙️ Configuración dentro de la app (o cópialo de abajo)
3. Copia la URL y la anon key desde **Settings → API**

```sql
CREATE TABLE IF NOT EXISTS public.users (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nickname   TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read" ON public.users FOR SELECT USING (true);
CREATE POLICY "insert" ON public.users FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.responses (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_nickname  TEXT NOT NULL REFERENCES public.users(nickname) ON DELETE CASCADE,
  day_number     INTEGER NOT NULL CHECK (day_number BETWEEN 1 AND 30),
  game_id        INTEGER,
  game_name      TEXT,
  game_cover     TEXT,
  character_name TEXT,
  text_response  TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_nickname, day_number)
);

ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read"   ON public.responses FOR SELECT USING (true);
CREATE POLICY "insert" ON public.responses FOR INSERT WITH CHECK (true);
CREATE POLICY "update" ON public.responses FOR UPDATE USING (true);
```

### 2. IGDB (Twitch)

1. Ve a [dev.twitch.tv](https://dev.twitch.tv) → **Consola**
2. Registra una aplicación (Redirect URL: `http://localhost`)
3. Copia el **Client ID** y genera un **Client Secret**

### 3. Frontend (index.html)

Edita las líneas del script en `index.html`:

```html
<script>
  window.ENV_SUPABASE_URL      = 'https://xxxx.supabase.co';
  window.ENV_SUPABASE_ANON_KEY = 'eyJ...';
</script>
```

### 4. Despliegue en Vercel

```bash
# Instalar Vercel CLI (opcional, también puedes usar la web)
npm i -g vercel
vercel login
vercel --prod
```

O importa el repositorio desde [vercel.com/new](https://vercel.com/new) y añade las 4 variables de entorno.

## Desarrollo local

Para probar las serverless functions localmente necesitas Vercel CLI:

```bash
npm i -g vercel
vercel dev
```

Esto levanta el frontend y las API functions en `http://localhost:3000`.

## Fecha de inicio del reto

En `app.js`, busca esta línea y cambia la fecha:

```js
const CHALLENGE_START = new Date('2026-06-22T00:00:00');
```

## Características

- ✅ 30 tarjetas de días con desbloqueo progresivo real
- ✅ Modal de nickname obligatorio (localStorage)
- ✅ Búsqueda de juegos via IGDB API (proxy serverless)
- ✅ Búsqueda de personajes via IGDB characters endpoint
- ✅ Guardado en Supabase con upsert (editable)
- ✅ Muro comunitario con filtros por día
- ✅ Animación de celebración al completar los 30 días
- ✅ Checkmarks pixelados en tarjetas completadas
- ✅ Estética pixel art / retro con tipografías de Google Fonts
- ✅ Totalmente responsive (mobile-first)
- ✅ Accesibilidad: ARIA roles, live regions, keyboard navigation
