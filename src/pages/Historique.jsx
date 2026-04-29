import { useState, useMemo } from 'react'
import { useVentes, useDepenses } from '../hooks/useFirebase'
import { StatCard, SCard, Spinner, Empty } from '../components/UI'
import { fmt, monthKey, currentMonth, fmtMonth, MEDALS } from '../lib/utils'

export default function Historique() {
  const { ventes, loading: lV } = useVentes()
  const { depenses, loading: lD } = useDepenses()

  const months = useMemo(() => {
    const s = new Set([
      ...ventes.map(v => monthKey(v.date)),
      ...depenses.map(d => monthKey(d.date)),
      currentMonth(),
    ])
    return [...s].filter(Boolean).sort().reverse()
  }, [ventes, depenses])

  const [mois, setMois] = useState(() => currentMonth())

  const { mv, md, tvM, tdM, ben, top } = useMemo(() => {
    const mv  = ventes.filter(v => (v.date || '').startsWith(mois))
    const md  = depenses.filter(d => (d.date || '').startsWith(mois))
    const tvM = mv.reduce((a, v) => a + (v.total || 0), 0)
    const tdM = md.reduce((a, d) => a + (d.montant || 0), 0)
    const topMap = {}
    mv.filter(v => !v.typeCredit).forEach(v => {
      if (!topMap[v.prodNom]) topMap[v.prodNom] = { qty: 0, rev: 0 }
      topMap[v.prodNom].qty += v.qty || 0
      topMap[v.prodNom].rev += v.total || 0
    })
    const top = Object.entries(topMap).sort((a, b) => b[1].qty - a[1].qty)
    return { mv, md, tvM, tdM, ben: tvM - tdM, top }
  }, [ventes, depenses, mois])

  if (lV || lD) return <Spinner />

  return (
    <div>
      <div className="topbar">
        <div className="page-title">Historique 📅</div>
        <div className="field" style={{ margin: 0, minWidth: 165 }}>
          <select value={mois} onChange={e => setMois(e.target.value)}>
            {months.map(m => <option key={m} value={m}>{fmtMonth(m)}</option>)}
          </select>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard colorClass="c0" label="Revenus"
          value={fmt(tvM)} sub={`FCFA · ${mv.length} vente(s)`} />
        <StatCard colorClass="c2" label="Dépenses"
          value={fmt(tdM)} sub="FCFA" />
        <StatCard colorClass={ben >= 0 ? 'c1' : 'c2'} label="Bénéfice"
          value={fmt(ben)} sub="FCFA" />
      </div>

      {/* Détail ventes */}
      <div className="scard" style={{ padding: 0, overflow: 'hidden', marginBottom: 18 }}>
        <div style={{ padding: '16px 20px 0' }}>
          <div className="scard-title">Détail des ventes</div>
        </div>
        <div className="tw">
          <table>
            <thead><tr><th>Date</th><th>Produit</th><th>Qté</th><th>Total</th></tr></thead>
            <tbody>
              {mv.length === 0
                ? <tr><td colSpan={4}><Empty icon="📅" text="Aucune vente ce mois" /></td></tr>
                : mv.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(v => (
                  <tr key={v.id}>
                    <td style={{ color: 'var(--text3)' }}>{v.date}</td>
                    <td><strong>{v.prodNom}</strong></td>
                    <td>{v.qty}</td>
                    <td><span style={{ color: 'var(--em)', fontWeight: 700 }}>{fmt(v.total)} FCFA</span></td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* Top produits */}
      <div className="scard" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px 0' }}>
          <div className="scard-title">🏆 Top produits du mois</div>
        </div>
        <div className="tw">
          <table>
            <thead><tr><th>Rang</th><th>Produit</th><th>Qté vendue</th><th>Revenus</th></tr></thead>
            <tbody>
              {top.length === 0
                ? <tr><td colSpan={4}><Empty icon="📊" text="Aucune donnée" /></td></tr>
                : top.map(([nom, d], i) => (
                  <tr key={nom}>
                    <td style={{ fontSize: 18 }}>{MEDALS[i] || '#' + (i + 1)}</td>
                    <td><strong>{nom}</strong></td>
                    <td>{d.qty}</td>
                    <td><span style={{ color: 'var(--em)', fontWeight: 700 }}>{fmt(d.rev)} FCFA</span></td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
