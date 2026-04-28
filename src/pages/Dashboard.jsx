import { useMemo } from 'react'
import { useProduits, useVentes, useDepenses } from '../hooks/useFirebase'
import { StatCard, SCard, Spinner, Empty, ProgBar, BarChart } from '../components/UI'
import { fmt, today, currentMonth, monthKey } from '../lib/utils'

export default function Dashboard({ setPage }) {
  const { produits, loading: lP } = useProduits()
  const { ventes,   loading: lV } = useVentes()
  const { depenses, loading: lD } = useDepenses()

  const t = today(), m = currentMonth()

  const stats = useMemo(() => {
    const ts  = ventes.filter(v => v.date === t)
    const ms  = ventes.filter(v => (v.date || '').startsWith(m))
    const md  = depenses.filter(d => (d.date || '').startsWith(m))
    const tvT = ts.reduce((a, v) => a + (v.total || 0), 0)
    const tvM = ms.reduce((a, v) => a + (v.total || 0), 0)
    const tdM = md.reduce((a, d) => a + (d.montant || 0), 0)
    const low = produits.filter(p => p.stock <= p.seuil)

    // Top produits du mois
    const topMap = {}
    ms.forEach(v => { topMap[v.prodNom] = (topMap[v.prodNom] || 0) + (v.qty || 0) })
    const top = Object.entries(topMap).sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([label, value]) => ({ label, value }))

    return { ts, ms, tvT, tvM, ben: tvM - tdM, low, top }
  }, [ventes, depenses, produits, t, m])

  if (lP || lV || lD) return <Spinner />

  return (
    <div>
      <div className="topbar">
        <div className="page-title">Bonjour 👋</div>
        <div className="date-pill">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Alertes */}
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
                  {p.nom} — {p.stock} restant{p.stock > 1 ? 's' : ''}
                </span>
              ))}
            </div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => setPage('stocks')}>Voir stocks →</button>
        </div>
      )}

      {/* Stats */}
      <div className="stat-grid">
        <StatCard colorClass="c0" icon="💰" label="Ventes aujourd'hui"
          value={fmt(stats.tvT)} sub={`FCFA · ${stats.ts.length} vente${stats.ts.length > 1 ? 's' : ''}`} />
        <StatCard colorClass="c1" icon="📈" label="Revenus du mois"
          value={fmt(stats.tvM)} sub="FCFA" />
        <StatCard colorClass="c2" icon="📉" label="Dépenses du mois"
          value={fmt(depenses.filter(d => (d.date || '').startsWith(m)).reduce((a, d) => a + (d.montant || 0), 0))}
          sub="FCFA" />
        <StatCard colorClass="c3" icon={stats.ben >= 0 ? '🟢' : '🔴'} label="Bénéfice net"
          value={fmt(stats.ben)} sub="FCFA ce mois" />
        <StatCard colorClass="c4" icon="📦" label="Produits"
          value={produits.length} sub={`${stats.low.length} alerte${stats.low.length > 1 ? 's' : ''}`} />
      </div>

      {/* Grille basse */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="two-col">

        {/* Ventes du jour */}
        <SCard
          title="🧾 Ventes d'aujourd'hui"
          action={<button className="btn btn-outline btn-sm" onClick={() => setPage('ventes')}>Tout voir →</button>}
          style={{ gridColumn: '1/-1' }}
          noPad={false}
        >
          <div className="tw">
            <table>
              <thead><tr><th>Produit</th><th>Qté</th><th>Montant</th></tr></thead>
              <tbody>
                {stats.ts.length === 0
                  ? <tr><td colSpan={3}><Empty icon="🛒" text="Aucune vente aujourd'hui" /></td></tr>
                  : stats.ts.map(v => (
                    <tr key={v.id}>
                      <td><strong>{v.prodNom}</strong></td>
                      <td>{v.qty}</td>
                      <td><span style={{ color: 'var(--em)', fontWeight: 700 }}>{fmt(v.total)} FCFA</span></td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </SCard>

        {/* Top produits */}
        <SCard title="🏆 Top produits du mois">
          <BarChart data={stats.top} />
        </SCard>

        {/* Stocks faibles */}
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
                      {p.stock} restant{p.stock > 1 ? 's' : ''}
                    </span>
                  </div>
                  <ProgBar value={p.stock} max={p.seuil * 3} color={col} />
                </div>
              )
            })
          }
        </SCard>
      </div>
    </div>
  )
}
