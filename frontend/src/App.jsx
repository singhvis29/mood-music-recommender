import { useState, useRef, useCallback, useEffect } from "react"

/* ─── Google Fonts ─────────────────────────────────────────────────────────── */
;(function () {
  const l = document.createElement("link")
  l.rel = "stylesheet"
  l.href =
    "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap"
  document.head.appendChild(l)
})()

/* ─── Design tokens ────────────────────────────────────────────────────────── */
const T = {
  bg:        "#09080a",
  surface:   "#131016",
  surfaceHi: "#1c1920",
  border:    "rgba(220,210,240,0.07)",
  borderHi:  "rgba(220,210,240,0.16)",
  accent:    "#c9a96e",
  accentLow: "rgba(201,169,110,0.12)",
  text:      "#ede8f5",
  textMid:   "#9a94a8",
  textDim:   "#524e5c",
  positive:  "#68b84a",
  negative:  "#d05858",
  calm:      "#4a8ec8",
  complex:   "#c89840",
}

const ZONE_COLOR = {
  positive: T.positive,
  negative: T.negative,
  calm:     T.calm,
  complex:  T.complex,
}

/* ─── Mood data ─────────────────────────────────────────────────────────────── */
const MOODS = [
  { id: "joyful",    label: "Joyful",    emoji: "☀️",  v: 0.92, e: 0.76, zone: "positive" },
  { id: "excited",   label: "Excited",   emoji: "⚡",   v: 0.84, e: 0.91, zone: "positive" },
  { id: "hopeful",   label: "Hopeful",   emoji: "🌱",  v: 0.70, e: 0.54, zone: "positive" },
  { id: "content",   label: "Content",   emoji: "😌",  v: 0.80, e: 0.36, zone: "calm"     },
  { id: "serene",    label: "Serene",    emoji: "🌊",  v: 0.74, e: 0.22, zone: "calm"     },
  { id: "romantic",  label: "Romantic",  emoji: "💫",  v: 0.72, e: 0.40, zone: "calm"     },
  { id: "nostalgic", label: "Nostalgic", emoji: "🌅",  v: 0.52, e: 0.32, zone: "complex"  },
  { id: "focused",   label: "Focused",   emoji: "🎯",  v: 0.54, e: 0.58, zone: "complex"  },
  { id: "dreamy",    label: "Dreamy",    emoji: "✨",  v: 0.62, e: 0.28, zone: "complex"  },
  { id: "anxious",   label: "Anxious",   emoji: "😰",  v: 0.28, e: 0.82, zone: "negative" },
  { id: "sad",       label: "Sad",       emoji: "🌧️",  v: 0.18, e: 0.22, zone: "negative" },
  { id: "angry",     label: "Angry",     emoji: "🔥",  v: 0.14, e: 0.90, zone: "negative" },
]

/* ─── Mock track results by zone ───────────────────────────────────────────── */
const MOCK_TRACKS = {
  positive: [
    { title: "Golden Hour",              artist: "JVKE",                     score: 0.04 },
    { title: "Happy",                    artist: "Pharrell Williams",         score: 0.06 },
    { title: "Walking on Sunshine",      artist: "Katrina & The Waves",       score: 0.09 },
    { title: "Can't Stop the Feeling",   artist: "Justin Timberlake",         score: 0.11 },
    { title: "Uptown Funk",              artist: "Mark Ronson ft. Bruno Mars", score: 0.14 },
  ],
  calm: [
    { title: "Holocene",                 artist: "Bon Iver",                  score: 0.04 },
    { title: "Such Great Heights",       artist: "Iron & Wine",               score: 0.07 },
    { title: "Bloom",                    artist: "The Paper Kites",           score: 0.09 },
    { title: "Make You Feel My Love",    artist: "Adele",                     score: 0.11 },
    { title: "The Lakes",                artist: "Taylor Swift",              score: 0.13 },
  ],
  negative: [
    { title: "In the End",               artist: "Linkin Park",               score: 0.05 },
    { title: "Numb",                     artist: "Linkin Park",               score: 0.08 },
    { title: "Boulevard of Broken Dreams", artist: "Green Day",              score: 0.10 },
    { title: "Bring Me to Life",         artist: "Evanescence",               score: 0.12 },
    { title: "The Sound of Silence",     artist: "Disturbed",                 score: 0.15 },
  ],
  complex: [
    { title: "Retrograde",               artist: "James Blake",               score: 0.05 },
    { title: "Motion Picture Soundtrack", artist: "Radiohead",                score: 0.07 },
    { title: "I Need My Girl",           artist: "The National",              score: 0.09 },
    { title: "Lost in the Light",        artist: "Bahamas",                   score: 0.11 },
    { title: "Beth/Rest",                artist: "Bon Iver",                  score: 0.14 },
  ],
}

/* ─── Shared styles ─────────────────────────────────────────────────────────── */
const centerColumn = {
  maxWidth: 520,
  margin: "0 auto",
  padding: "0 20px",
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SCREEN 1 — Mood Tile Grid
═══════════════════════════════════════════════════════════════════════════════ */
function TilesScreen({ onSelect }) {
  const [hovered, setHovered] = useState(null)
  const [pressed, setPressed]  = useState(null)

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px 0" }}>
      <div style={centerColumn}>

        {/* Header */}
        <div style={{ marginBottom: 40, textAlign: "center" }}>
          <p style={{ fontSize: 11, letterSpacing: "0.18em", color: T.accent, textTransform: "uppercase", marginBottom: 10, fontWeight: 400 }}>
            Mood Music
          </p>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 42, fontWeight: 400, color: T.text, lineHeight: 1.1, margin: "0 0 12px" }}>
            How are you<br />
            <em style={{ fontStyle: "italic", color: T.accent }}>feeling right now?</em>
          </h1>
          <p style={{ fontSize: 14, color: T.textMid, fontWeight: 300, lineHeight: 1.6 }}>
            Pick the mood that fits. We'll find music to match it.
          </p>
        </div>

        {/* Tile grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {MOODS.map((m) => {
            const isHovered = hovered === m.id
            const isPressed = pressed === m.id
            const zoneCol   = ZONE_COLOR[m.zone]
            return (
              <button
                key={m.id}
                onMouseEnter={() => setHovered(m.id)}
                onMouseLeave={() => setHovered(null)}
                onMouseDown={() => setPressed(m.id)}
                onMouseUp={() => setPressed(null)}
                onClick={() => onSelect(m)}
                style={{
                  background:   isHovered ? T.surfaceHi : T.surface,
                  border:       `0.5px solid ${isHovered ? zoneCol + "60" : T.border}`,
                  borderRadius: 12,
                  padding:      "16px 8px 14px",
                  cursor:       "pointer",
                  textAlign:    "center",
                  transition:   "all 0.15s ease",
                  transform:    isPressed ? "scale(0.96)" : isHovered ? "translateY(-2px)" : "none",
                  outline:      "none",
                  boxShadow:    isHovered ? `0 4px 20px ${zoneCol}20` : "none",
                  position:     "relative",
                  overflow:     "hidden",
                }}
              >
                {/* Zone dot */}
                <div style={{
                  position: "absolute", top: 8, right: 8,
                  width: 6, height: 6, borderRadius: "50%",
                  background: zoneCol, opacity: isHovered ? 1 : 0.4,
                  transition: "opacity 0.15s",
                }} />

                {/* Emoji */}
                <div style={{ fontSize: 24, marginBottom: 8, lineHeight: 1 }}>
                  {m.emoji}
                </div>

                {/* Label */}
                <div style={{
                  fontSize:   11,
                  fontWeight: 500,
                  color:      isHovered ? T.text : T.textMid,
                  letterSpacing: "0.02em",
                  transition: "color 0.15s",
                }}>
                  {m.label}
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer hint */}
        <p style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: T.textDim }}>
          You can refine on the next screen
        </p>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SCREEN 2 — Circumplex Plane Refiner
═══════════════════════════════════════════════════════════════════════════════ */
function PlaneScreen({ mood, coords, onCoordsChange, onConfirm, onBack }) {
  const svgRef    = useRef(null)
  const isDragging = useRef(false)

  const getCoords = useCallback((e) => {
    const rect = svgRef.current.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const v = Math.max(0.02, Math.min(0.98, (clientX - rect.left) / rect.width))
    const en = Math.max(0.02, Math.min(0.98, 1 - (clientY - rect.top) / rect.height))
    onCoordsChange({ v, e: en })
  }, [onCoordsChange])

  const dotX = coords.v * 280
  const dotY = (1 - coords.e) * 280
  const zoneCol = ZONE_COLOR[mood.zone]

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px 0" }}>
      <div style={centerColumn}>

        {/* Back */}
        <button
          onClick={onBack}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: T.textMid, fontSize: 13, padding: "0 0 28px",
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          ← back
        </button>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 22 }}>{mood.emoji}</span>
            <span style={{
              fontSize: 12, padding: "3px 10px", borderRadius: 20,
              background: zoneCol + "20", color: zoneCol,
              border: `0.5px solid ${zoneCol}50`, fontWeight: 500,
            }}>
              {mood.label}
            </span>
          </div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 400, color: T.text, margin: "0 0 8px" }}>
            Refine your mood
          </h2>
          <p style={{ fontSize: 13, color: T.textMid, fontWeight: 300 }}>
            Tap anywhere on the plane to adjust the exact feeling.
          </p>
        </div>

        {/* Plane */}
        <div style={{ position: "relative", width: "100%" }}>
          <svg
            ref={svgRef}
            viewBox="0 0 280 280"
            width="100%"
            style={{ display: "block", cursor: "crosshair", borderRadius: 12, touchAction: "none" }}
            onMouseDown={(e) => { isDragging.current = true; getCoords(e) }}
            onMouseMove={(e) => { if (isDragging.current) getCoords(e) }}
            onMouseUp={() => { isDragging.current = false }}
            onMouseLeave={() => { isDragging.current = false }}
            onTouchStart={(e) => { isDragging.current = true; getCoords(e) }}
            onTouchMove={(e) => { if (isDragging.current) getCoords(e) }}
            onTouchEnd={() => { isDragging.current = false }}
            onClick={getCoords}
          >
            {/* Quadrant fills */}
            <rect x="0"   y="0"   width="140" height="140" fill="#d05858" opacity="0.06" />
            <rect x="140" y="0"   width="140" height="140" fill="#68b84a" opacity="0.06" />
            <rect x="0"   y="140" width="140" height="140" fill="#524e5c" opacity="0.06" />
            <rect x="140" y="140" width="140" height="140" fill="#4a8ec8" opacity="0.06" />

            {/* Border */}
            <rect x="0.5" y="0.5" width="279" height="279" fill="none" stroke="rgba(220,210,240,0.10)" strokeWidth="0.5" rx="11" />

            {/* Axes */}
            <line x1="140" y1="0" x2="140" y2="280" stroke="rgba(220,210,240,0.12)" strokeWidth="0.5" />
            <line x1="0" y1="140" x2="280" y2="140" stroke="rgba(220,210,240,0.12)" strokeWidth="0.5" />

            {/* Corner labels */}
            <text x="8"   y="16"  fontSize="9" fill="rgba(208,88,88,0.7)"  fontFamily="DM Sans, sans-serif">tense</text>
            <text x="272" y="16"  fontSize="9" fill="rgba(104,184,74,0.7)" fontFamily="DM Sans, sans-serif" textAnchor="end">excited</text>
            <text x="8"   y="276" fontSize="9" fill="rgba(82,78,92,0.7)"   fontFamily="DM Sans, sans-serif">sad</text>
            <text x="272" y="276" fontSize="9" fill="rgba(74,142,200,0.7)" fontFamily="DM Sans, sans-serif" textAnchor="end">calm</text>

            {/* Mood dot ring */}
            <circle cx={dotX} cy={dotY} r="18" fill={zoneCol} opacity="0.08" />
            <circle cx={dotX} cy={dotY} r="12" fill={zoneCol} opacity="0.12" />

            {/* Mood dot */}
            <circle cx={dotX} cy={dotY} r="7" fill={zoneCol} />
            <circle cx={dotX} cy={dotY} r="7" fill="none" stroke="white" strokeWidth="1.5" opacity="0.6" />
          </svg>

          {/* Axis labels outside */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <span style={{ fontSize: 11, color: T.textDim }}>← negative</span>
            <span style={{ fontSize: 11, color: T.textDim, fontWeight: 500, color: T.accent }}>
              valence axis
            </span>
            <span style={{ fontSize: 11, color: T.textDim }}>positive →</span>
          </div>
        </div>

        {/* Live readouts */}
        <div style={{ display: "flex", gap: 10, margin: "16px 0 24px" }}>
          {[
            { label: "valence", val: coords.v, col: T.positive },
            { label: "energy",  val: coords.e, col: "#e87050" },
          ].map(({ label, val, col }) => (
            <div key={label} style={{
              flex: 1, background: T.surface,
              border: `0.5px solid ${T.border}`,
              borderRadius: 10, padding: "12px 14px",
            }}>
              <div style={{ fontSize: 10, color: T.textDim, marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                {label}
              </div>
              <div style={{ fontSize: 22, fontWeight: 500, color: T.text, fontFamily: "'Cormorant Garamond', serif", marginBottom: 6 }}>
                {val.toFixed(2)}
              </div>
              <div style={{ height: 3, background: T.border, borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${val * 100}%`, background: col, borderRadius: 2, transition: "width 0.1s" }} />
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={onConfirm}
          style={{
            width: "100%", padding: "16px 24px",
            background: T.accent, color: "#09080a",
            border: "none", borderRadius: 12,
            fontSize: 15, fontWeight: 500, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
            letterSpacing: "0.01em",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={e => e.target.style.opacity = "0.88"}
          onMouseLeave={e => e.target.style.opacity = "1"}
        >
          Find my music →
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SCREEN 3 — Results
═══════════════════════════════════════════════════════════════════════════════ */
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000"

function ResultsScreen({ mood, coords, onReset }) {
  const [tracks,  setTracks]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const zoneCol = ZONE_COLOR[mood.zone]

  // Fetch real tracks from the FastAPI backend on mount
  useEffect(() => {
    console.log("useEffect fired, mood:", mood.id)
    console.log("API_BASE:", API_BASE)
    setLoading(true)
    setError(null)
  
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      console.log("TIMEOUT fired — aborting")
      controller.abort()
    }, 60000)
  
    fetch(`${API_BASE}/recommend/${mood.id}`, { signal: controller.signal })
      .then((res) => {
        console.log("fetch response status:", res.status)
        clearTimeout(timeout)
        if (!res.ok) {
          return res.json().then((body) => {
            throw new Error(body.detail || `Server error ${res.status}`)
          })
        }
        return res.json()
      })
      .then((data) => {
        console.log("tracks received:", data.tracks.length)
        setTracks(data.tracks)
        setLoading(false)
      })
      .catch((err) => {
        console.log("fetch error:", err.name, err.message)
        clearTimeout(timeout)
        if (err.name === "AbortError") {
          setError("Server is waking up — please try again in 30 seconds.")
        } else {
          setError(err.message)
        }
        setLoading(false)
      })
  }, [mood.id])

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 16 }}>
        <div style={{ fontSize: 32 }}>{mood.emoji}</div>
        <p style={{ fontSize: 14, color: T.textMid, fontWeight: 300 }}>
          Finding music for <em style={{ color: T.accent }}>{mood.label.toLowerCase()}</em>…
        </p>
        {/* Simple animated dots */}
        <div style={{ display: "flex", gap: 6 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 6, height: 6, borderRadius: "50%",
                background: T.accent, opacity: 0.3,
                animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.3; transform: scale(1); }
            50%       { opacity: 1;   transform: scale(1.3); }
          }
        `}</style>
      </div>
    )
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px 0" }}>
        <div style={{ ...centerColumn }}>
          <div style={{
            background: T.surface, border: `0.5px solid ${T.border}`,
            borderRadius: 12, padding: "20px 20px", marginBottom: 20,
          }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: T.text, marginBottom: 6 }}>
              Could not fetch recommendations
            </p>
            <p style={{ fontSize: 12, color: T.textMid, lineHeight: 1.6 }}>{error}</p>
            <p style={{ fontSize: 11, color: T.textDim, marginTop: 10, lineHeight: 1.6 }}>
              Make sure the Python backend is running:<br />
              <code style={{ fontFamily: "monospace", color: T.accent }}>
                uvicorn backend.api:app --reload --port 8000
              </code>
            </p>
          </div>
          <button
            onClick={onReset}
            style={{
              width: "100%", padding: "13px 24px", background: "none",
              border: `0.5px solid ${T.borderHi}`, borderRadius: 12,
              color: T.textMid, fontSize: 14, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            ← Start over
          </button>
        </div>
      </div>
    )
  }

  // ── Results ────────────────────────────────────────────────────────────────
  const maxScore = tracks.length > 0 ? Math.max(...tracks.map((t) => t.score)) : 1

  return (
    <div style={{ minHeight: "100vh", padding: "48px 0" }}>
      <div style={centerColumn}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, letterSpacing: "0.18em", color: T.accent, textTransform: "uppercase", marginBottom: 10 }}>
            Recommendations
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 24 }}>{mood.emoji}</span>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, fontWeight: 400, color: T.text, margin: 0 }}>
              Feeling {mood.label.toLowerCase()}
            </h2>
          </div>

          {/* Feature chips */}
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            {[
              { label: `valence ${coords.v.toFixed(2)}`, col: T.positive },
              { label: `energy ${coords.e.toFixed(2)}`,  col: "#e87050"  },
              { label: mood.zone,                         col: zoneCol    },
            ].map(({ label, col }) => (
              <span key={label} style={{
                fontSize: 11, padding: "3px 10px", borderRadius: 20,
                background: col + "18", color: col, border: `0.5px solid ${col}40`,
              }}>
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Track list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
          {tracks.map((track, i) => {
            const matchPct = Math.round((1 - track.score / (maxScore * 1.5)) * 100)
            return (
              <div
                key={i}
                style={{
                  background: T.surface, border: `0.5px solid ${T.border}`,
                  borderRadius: 12, padding: "14px 16px",
                  display: "flex", alignItems: "center", gap: 14,
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = T.borderHi)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = T.border)}
              >
                {/* Rank */}
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: i === 0 ? T.accentLow : T.surfaceHi,
                  border: `0.5px solid ${i === 0 ? T.accent + "40" : T.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 500,
                  color: i === 0 ? T.accent : T.textDim,
                  flexShrink: 0,
                }}>
                  {track.rank}
                </div>

                {/* Title & artist */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: T.text, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {track.title}
                  </div>
                  <div style={{ fontSize: 12, color: T.textMid }}>{track.artist}</div>
                </div>

                {/* Match score */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: i === 0 ? T.accent : T.textMid, marginBottom: 4 }}>
                    {matchPct}%
                  </div>
                  <div style={{ width: 48, height: 3, background: T.border, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: `${matchPct}%`,
                      background: i === 0 ? T.accent : zoneCol,
                      borderRadius: 2, opacity: i === 0 ? 1 : 0.6,
                    }} />
                  </div>
                </div>

                {/* Spotify link */}
                <a
                  href={track.spotify_url || `https://open.spotify.com/search/${encodeURIComponent(track.title + " " + track.artist)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    width: 30, height: 30, borderRadius: "50%",
                    background: "#1DB954",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, textDecoration: "none", transition: "opacity 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                  title="Open on Spotify"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                </a>
              </div>
            )
          })}
        </div>

        {/* Reset */}
        <button
          onClick={onReset}
          style={{
            width: "100%", padding: "14px 24px", background: "none",
            border: `0.5px solid ${T.borderHi}`, borderRadius: 12,
            color: T.textMid, fontSize: 14, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { e.target.style.background = T.surface; e.target.style.color = T.text }}
          onMouseLeave={(e) => { e.target.style.background = "none";    e.target.style.color = T.textMid }}
        >
          ← Start over
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   ROOT APP
═══════════════════════════════════════════════════════════════════════════════ */
export default function App() {
  const [screen, setScreen] = useState("tiles")
  const [mood,   setMood]   = useState(null)
  const [coords, setCoords] = useState({ v: 0.5, e: 0.5 })

  function handleTileSelect(m) {
    setMood(m)
    setCoords({ v: m.v, e: m.e })
    setScreen("plane")
  }

  function handleConfirm() {
    setScreen("results")
  }

  function handleReset() {
    setMood(null)
    setCoords({ v: 0.5, e: 0.5 })
    setScreen("tiles")
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: T.bg,
      color: T.text,
      fontFamily: "'DM Sans', sans-serif",
      WebkitFontSmoothing: "antialiased",
    }}>
      {screen === "tiles" && (
        <TilesScreen onSelect={handleTileSelect} />
      )}
      {screen === "plane" && mood && (
        <PlaneScreen
          mood={mood}
          coords={coords}
          onCoordsChange={setCoords}
          onConfirm={handleConfirm}
          onBack={() => setScreen("tiles")}
        />
      )}
      {screen === "results" && mood && (
        <ResultsScreen
          mood={mood}
          coords={coords}
          onReset={handleReset}
        />
      )}
    </div>
  )
}
