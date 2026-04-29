import { useState, useMemo } from 'react'
import { useProduits, useVentes, useDepenses, useCaisse } from '../hooks/useFirebase'
import { StatCard, SCard, Spinner, Empty, ProgBar, BarChart } from '../components/UI'
import { fmt, today, currentMonth, monthKey, fmtMonth } from '../lib/utils'

// ── Heatmap ──
function Heatmap({ days, top4, maxDay }) {
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {days.map(({ day, total }) => {
          const isTop = top4.includes(day)
          const intensity = total ? Math.max(0.15, total / maxDay) : 0
          const bg = total === 0 ? 'var(--bg)'
            : isTop ? `rgba(14,165,107,${intensity})`
            : `rgba(14,165,107,${intensity * 0.6})`
          const textColor = isTop && total > 0 ? 'var(--em-d)' : total > 0 ? 'var(--text2)' : 'var(--text3)'
          return (
            <div key={day} title={total > 0 ? fmt(total) + ' FCFA' : 'Aucune vente'} style={{
              width: 52, borderRadius: 10, background: bg,
              border: isTop ? '2px solid var(--em)' : '1.5px solid var(--border2)',
              padding: '8px 4px', textAlign: 'center', transition: 'all .2s',
              boxShadow: isTop ? '0 4px 12px rgba(14,165,107,.25)' : 'none', cursor: 'default',
            }}>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, marginBottom: 4 }}>{day}</div>
              <div style={{ fontSize: 10, fontWeight: 800, color: textColor, fontFamily: 'Nunito,sans-serif', lineHeight: 1.2 }}>
                {total > 0 ? fmt(total) : '—'}
              </div>
              {isTop && total > 0 && <div style={{ fontSize: 9, marginTop: 3 }}>🏆</div>}
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 14, fontSize: 11, color: 'var(--text3)', flexWrap: 'wrap', alignItems: 'center' }}>
        <span>🏆 Top 4 jours</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(14,165,107,.6)', display: 'inline-block' }} />
          Plus de ventes
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--bg)', border: '1px solid var(--border2)', display: 'inline-block' }} />
          Aucune vente
        </span>
      </div>
    </>
  )
}

// ── ReportBlock — DOIT être en dehors de Dashboard pour garder son state ──
function ReportBlock({ m, getReport, setReport, caisse }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal]         = useState('')
  const rep = getReport(m)

  return (
    <div style={{
      background: 'linear-gradient(135deg,#fff8e1,#fffde7)',
      border: '1.5px solid rgba(240,165,0,.3)',
      borderRadius: 14, padding: '14px 18px', marginBottom: 20,
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      boxShadow: '0 4px 16px rgba(240,165,0,.1)',
    }}>
      <div style={{ fontSize: 24 }}>💼</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#8a5c00', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>
          Report du mois précédent
        </div>
        {editing ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="number" value={val}
              onChange={e => setVal(e.target.value)}
              placeholder="Montant en FCFA" autoFocus
              style={{ width: 150, padding: '6px 10px', borderRadius: 8, border: '1.5px solid #f0a500', fontFamily: 'Lexend,sans-serif', fontSize: 13 }}
            />
            <button className="btn btn-gold btn-sm"
              onClick={async () => { await setReport(m, val); setEditing(false) }}>
              ✔ Enregistrer
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => setEditing(false)}>
              Annuler
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 900, fontSize: 20, color: rep > 0 ? '#8a5c00' : 'var(--text3)' }}>
              {rep > 0 ? fmt(rep) + ' FCFA' : 'Non défini'}
            </span>
            <button
              onClick={() => { setVal(rep); setEditing(true) }}
              style={{
                background: 'rgba(240,165,0,.15)', color: '#8a5c00',
                border: '1px solid rgba(240,165,0,.3)', borderRadius: 7,
                padding: '4px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer'
              }}
            >
              ✏️ Modifier
            </button>
          </div>
        )}
      </div>
      {rep > 0 && (
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: '#8a5c00', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>
            Caisse totale
          </div>
          <div style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 900, fontSize: 20, color: caisse >= 0 ? 'var(--em-d)' : 'var(--coral)' }}>
            {fmt(caisse)} FCFA
          </div>
          <div style={{ fontSize: 10, color: 'var(--text3)' }}>report + revenus - dépenses</div>
        </div>
      )}
    </div>
  )
}

// ── Dashboard principal ──
export default function Dashboard({ setPage }) {
  const { produits, loading: lP } = useProduits()
  const { ventes,   loading: lV } = useVentes()
  const { depenses, loading: lD } = useDepenses()
  const { getReport, setReport }  = useCaisse()

  const t = today()
  const [onglet, setOnglet]   = useState('today')
  const [moisSel, setMoisSel] = useState(currentMonth())

  // Mois disponibles
  const moisDispos = useMemo(() => {
    const s = new Set([...ventes.map(v => monthKey(v.date)), currentMonth()])
    return [...s].filter(Boolean).sort().reverse()
  }, [ventes])

  // Stats calculées
  const stats = useMemo(() => {
    const m = onglet === 'today' ? currentMonth() : moisSel
    const ts  = ventes.filter(v => v.date === t)
    const ms  = ventes.filter(v => (v.date || '').startsWith(m))
    const md  = depenses.filter(d => (d.date || '').startsWith(m))
    const tvT = ts.reduce((a, v) => a + (v.total || 0), 0)
    const tvM = ms.reduce((a, v) => a + (v.total || 0), 0)
    const tdM = md.reduce((a, d) => a + (d.montant || 0), 0)
    const low = produits.filter(p => p.stock <= p.seuil)
    const report = getReport(m)
    const caisse = tvM - tdM + report

    const topMap = {}
    ms.filter(v => !v.typeCredit).forEach(v => {
      topMap[v.prodNom] = (topMap[v.prodNom] || 0) + (v.qty || 0)
    })
    const top = Object.entries(topMap).sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([label, value]) => ({ label, value }))

    const dayMap = {}
    ms.forEach(v => {
      const day = (v.date || '').slice(8, 10)
      if (day) dayMap[day] = (dayMap[day] || 0) + (v.total || 0)
    })
    const days = Array.from({ length: 31 }, (_, i) => {
      const d = String(i + 1).padStart(2, '0')
      return { day: d, total: dayMap[d] || 0 }
    }).filter(d => (m + '-' + d.day) <= today())
    const maxDay = Math.max(...days.map(d => d.total), 1)
    const top4 = [...days].sort((a, b) => b.total - a.total).slice(0, 4).map(d => d.day)

    return { ts, ms, tvT, tvM, tdM, ben: tvM - tdM, caisse, report, low, top, days, top4, maxDay, m }
  }, [ventes, depenses, produits, t, onglet, moisSel, getReport])

  if (lP || lV || lD) return <Spinner />

  const tabBtn = (active) => ({
    padding: '8px 18px', borderRadius: 10, cursor: 'pointer',
    fontFamily: 'Lexend,sans-serif', fontSize: 13, fontWeight: 600,
    transition: 'all .18s',
    background: active ? 'linear-gradient(135deg,var(--em),var(--em2))' : 'var(--bg)',
    color: active ? '#fff' : 'var(--text2)',
    boxShadow: active ? '0 4px 14px var(--em-g)' : 'none',
    border: active ? 'none' : '1.5px solid var(--border)',
  })

  const StocksFaibles = () => (
    <SCard title="⚠️ Stocks faibles">
      {stats.low.length === 0
        ? <Empty icon="✅" text="Tous les stocks sont OK !" />
        : stats.low.slice(0, 6).map(p => {
          const col = p.stock === 0 ? 'var(--coral)' : 'var(--gold)'
          return (
            <div key={p.id} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{p.nom}</span>
                <span className={p.stock === 0 ? 'badge b-red' : 'badge b-gold'}>
                  {p.cat === 'Crédit téléphonique'
                    ? fmt(p.stock) + ' FCFA'
                    : p.stock + ' restant' + (p.stock > 1 ? 's' : '')}
                </span>
              </div>
              <ProgBar value={p.stock} max={Math.max(p.seuil * 3, 1)} color={col} />
            </div>
          )
        })
      }
    </SCard>
  )

  return (
    <div>
      <div className="topbar">
        <div className="page-title">
          {onglet === 'today' ? 'Bonjour 👋' : `📅 ${fmtMonth(moisSel)}`}
        </div>
        <div className="date-pill">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <button style={tabBtn(onglet === 'today')} onClick={() => setOnglet('today')}>🌅 Aujourd'hui</button>
        <button style={tabBtn(onglet === 'mois')} onClick={() => setOnglet('mois')}>📅 Par mois</button>
        {onglet === 'mois' && (
          <select value={moisSel} onChange={e => setMoisSel(e.target.value)}
            style={{ padding: '8px 30px 8px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg)', fontFamily: 'Lexend,sans-serif', fontSize: 13, color: 'var(--text)' }}>
            {moisDispos.map(m => <option key={m} value={m}>{fmtMonth(m)}</option>)}
          </select>
        )}
      </div>

      {/* Alertes stocks */}
      {stats.low.length > 0 && (
        <div className="alert-strip">
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <strong style={{ color: 'var(--coral)', fontSize: 13 }}>
              {stats.low.length} produit{stats.low.length > 1 ? 's' : ''} presque épuisé{stats.low.length > 1 ? 's' : ''} !
            </strong>
            <div className="alert-pills">
              {stats.low.map(p => (
                <span key={p.id} className="alert-pill">
                  {p.nom} — {p.cat === 'Crédit téléphonique' ? fmt(p.stock) + ' FCFA' : p.stock + ' restant' + (p.stock > 1 ? 's' : '')}
                </span>
              ))}
            </div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => setPage('stocks')}>Voir stocks →</button>
        </div>
      )}

      {/* ══ ONGLET AUJOURD'HUI ══ */}
      {onglet === 'today' && (
        <>
          <ReportBlock
            m={currentMonth()}
            getReport={getReport}
            setReport={setReport}
            caisse={stats.caisse}
          />

          <div className="stat-grid">
            <StatCard colorClass="c0" icon="💰" label="Ventes aujourd'hui"
              value={fmt(stats.tvT)} sub={`FCFA · ${stats.ts.length} vente${stats.ts.length > 1 ? 's' : ''}`} />
            <StatCard colorClass="c1" icon="📈" label="Revenus du mois"
              value={fmt(stats.tvM)} sub="FCFA" />
            <StatCard colorClass="c2" icon="📉" label="Dépenses du mois"
              value={fmt(stats.tdM)} sub="FCFA" />
            <StatCard colorClass="c3" icon="💼" label="Caisse"
              value={fmt(stats.caisse)}
              sub={stats.report > 0 ? `dont report ${fmt(stats.report)} FCFA` : 'FCFA ce mois'} />
            <StatCard colorClass="c4" icon="📦" label="Produits"
              value={produits.length} sub={`${stats.low.length} alerte${stats.low.length > 1 ? 's' : ''}`} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="two-col">
            <SCard title="🧾 Ventes d'aujourd'hui"
              action={<button className="btn btn-outline btn-sm" onClick={() => setPage('ventes')}>Tout voir →</button>}>
              <div className="tw">
                <table>
                  <thead><tr><th>Produit</th><th>Qté</th><th>Montant</th></tr></thead>
                  <tbody>
                    {stats.ts.length === 0
                      ? <tr><td colSpan={3}><Empty icon="🛒" text="Aucune vente aujourd'hui" /></td></tr>
                      : stats.ts.map(v => (
                        <tr key={v.id}>
                          <td><strong>{v.prodNom}</strong></td>
                          <td>{v.typeCredit ? `${fmt(v.qty)} FCFA` : v.qty}</td>
                          <td><span style={{ color: 'var(--em)', fontWeight: 700 }}>{fmt(v.total)} FCFA</span></td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            </SCard>

            <SCard title="🏆 Top produits du mois">
              <BarChart data={stats.top} />
            </SCard>

            <StocksFaibles />

            <SCard title={`📆 Ventes par jour — ${fmtMonth(stats.m)}`}>
              <Heatmap days={stats.days} top4={stats.top4} maxDay={stats.maxDay} />
            </SCard>
          </div>
        </>
      )}

      {/* ══ ONGLET PAR MOIS ══ */}
      {onglet === 'mois' && (
        <>
          <ReportBlock
            m={moisSel}
            getReport={getReport}
            setReport={setReport}
            caisse={stats.caisse}
          />

          <div className="stat-grid">
            <StatCard colorClass="c0" icon="💰" label="Revenus"
              value={fmt(stats.tvM)} sub={`FCFA · ${stats.ms.length} vente${stats.ms.length > 1 ? 's' : ''}`} />
            <StatCard colorClass="c2" icon="📉" label="Dépenses"
              value={fmt(stats.tdM)} sub="FCFA" />
            <StatCard colorClass="c3" icon="💼" label="Caisse"
              value={fmt(stats.caisse)}
              sub={stats.report > 0 ? `dont report ${fmt(stats.report)} FCFA` : 'FCFA'} />
            <StatCard colorClass="c4" icon="🛒" label="Nb ventes"
              value={stats.ms.length} sub="transactions" />
            <StatCard colorClass="c1" icon="📦" label="Stocks faibles"
              value={stats.low.length} sub="alerte(s)" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="two-col">
            <SCard title="🏆 Top produits du mois">
              <BarChart data={stats.top} />
            </SCard>

            <SCard title={`📆 Ventes par jour — ${fmtMonth(stats.m)}`}>
              <Heatmap days={stats.days} top4={stats.top4} maxDay={stats.maxDay} />
            </SCard>

            <StocksFaibles />

            <SCard title="🧾 Toutes les ventes du mois"
              action={<button className="btn btn-outline btn-sm" onClick={() => setPage('ventes')}>Gérer →</button>}>
              <div className="tw">
                <table>
                  <thead><tr><th>Date</th><th>Produit</th><th>Total</th></tr></thead>
                  <tbody>
                    {stats.ms.length === 0
                      ? <tr><td colSpan={3}><Empty icon="🛒" text="Aucune vente ce mois" /></td></tr>
                      : stats.ms.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(v => (
                        <tr key={v.id}>
                          <td style={{ color: 'var(--text3)', fontSize: 11, whiteSpace: 'nowrap' }}>
                            {v.date.slice(8, 10)}/{v.date.slice(5, 7)}
                          </td>
                          <td>
                            <strong>{v.prodNom}</strong>
                            {v.typeCredit && <span className="badge b-sky" style={{ marginLeft: 6, fontSize: 9 }}>📱</span>}
                          </td>
                          <td><span style={{ color: 'var(--em)', fontWeight: 700 }}>{fmt(v.total)} FCFA</span></td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            </SCard>
          </div>
        </>
      )}
    </div>
  )
}
