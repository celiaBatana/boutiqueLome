import { fmt, CHART_COLORS } from '../lib/utils'

// ── Stat Card ──
export function StatCard({ icon, label, value, sub, colorClass = 'c0' }) {
  return (
    <div className={`stat-card ${colorClass}`}>
      {icon && <div className="stat-icon">{icon}</div>}
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

// ── Section Card ──
export function SCard({ title, action, children, noPad = false }) {
  return (
    <div className="scard" style={noPad ? { padding: 0, overflow: 'hidden' } : {}}>
      {title && (
        <div className="scard-head" style={noPad ? { padding: '16px 20px 0' } : {}}>
          <div className="scard-title">{title}</div>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

// ── Spinner ──
export function Spinner() {
  return <div className="spinner-wrap"><div className="spinner" /></div>
}

// ── Empty ──
export function Empty({ icon = '📭', text = 'Aucune donnée' }) {
  return (
    <div className="empty">
      <div className="ei">{icon}</div>
      <p>{text}</p>
    </div>
  )
}

// ── Progress Bar ──
export function ProgBar({ value, max, color }) {
  const pct = Math.min(100, Math.round((value / Math.max(max, 1)) * 100))
  return (
    <div className="prog-track">
      <div className="prog-fill" style={{ width: pct + '%', background: color }} />
    </div>
  )
}

// ── Bar Chart ──
export function BarChart({ data }) {
  // data = [{label, value}]
  const maxV = data.length ? Math.max(...data.map(d => d.value)) : 1
  if (!data.length) return <div style={{ color: 'var(--text3)', fontSize: 13, padding: '20px 0' }}>Aucune vente ce mois</div>
  return (
    <>
      <div className="chart-area">
        {data.map(({ label, value }, i) => (
          <div key={i} className="chart-col">
            <div
              className="chart-bar"
              data-v={value}
              style={{
                background: CHART_COLORS[i % CHART_COLORS.length],
                height: Math.round(value / maxV * 90) + 10 + 'px',
              }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        {data.map(({ label }, i) => (
          <div key={i} className="chart-lbl" style={{ flex: 1 }} title={label}>
            {label.split(' ')[0]}
          </div>
        ))}
      </div>
    </>
  )
}

// ── Modal ──
export function Modal({ id, icon, iconBg, title, children, footer, onClose }) {
  return (
    <div className="overlay" id={id}>
      <div className="modal">
        <div className="modal-head">
          <div className="modal-icon" style={{ background: iconBg }}>{icon}</div>
          <div className="modal-ttl">{title}</div>
          <button className="modal-x" onClick={onClose}>✕</button>
        </div>
        {children}
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

// ── Field ──
export function Field({ label, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  )
}
