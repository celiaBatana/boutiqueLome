import { useState, useMemo } from 'react'
import { useVentes, useDepenses, useProduits } from '../hooks/useFirebase'
import { StatCard, SCard, Spinner, Empty } from '../components/UI'
import { fmt, monthKey, currentMonth, fmtMonth, MEDALS } from '../lib/utils'

// ── Export CSV ──
function exportCSV(filename, headers, rows) {
  const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [
    headers.map(escape).join(','),
    ...rows.map(row => row.map(escape).join(','))
  ]
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function Historique() {
  const { ventes, loading: lV, deleteVente } = useVentes()
  const { depenses, loading: lD } = useDepenses()
  const { produits } = useProduits()

  const [mois, setMois]       = useState(() => currentMonth())
  const [search, setSearch]   = useState('')
  const [exporting, setExporting] = useState(false)

  const months = useMemo(() => {
    const s = new Set([
      ...ventes.map(v => monthKey(v.date)),
      ...depenses.map(d => monthKey(d.date)),
      currentMonth(),
    ])
    return [...s].filter(Boolean).sort().reverse()
  }, [ventes, depenses])

  const { mv, md, tvM, tdM, ben, top, mvFiltered } = useMemo(() => {
    const mv  = ventes.filter(v => (v.date || '').startsWith(mois))
    const md  = depenses.filter(d => (d.date || '').startsWith(mois))
    const tvM = mv.reduce((a, v) => a + (v.total || 0), 0)
    const tdM = md.reduce((a, d) => a + (d.montant || 0), 0)

    // Recherche
    const q = search.trim().toLowerCase()
    const mvFiltered = q
      ? mv.filter(v => v.prodNom?.toLowerCase().includes(q))
      : mv

    const topMap = {}
    mv.filter(v => !v.typeCredit).forEach(v => {
      if (!topMap[v.prodNom]) topMap[v.prodNom] = { qty: 0, rev: 0 }
      topMap[v.prodNom].qty += v.qty || 0
      topMap[v.prodNom].rev += v.total || 0
    })
    const top = Object.entries(topMap).sort((a, b) => b[1].qty - a[1].qty)
    return { mv, md, tvM, tdM, ben: tvM - tdM, top, mvFiltered }
  }, [ventes, depenses, mois, search])

  const handleDelete = async (v) => {
    if (!confirm(`Supprimer la vente "${v.prodNom}" du ${v.date} ?`)) return
    const { db, COLLECTIONS } = await import('../lib/firebase')
    const { doc, updateDoc, getDoc } = await import('firebase/firestore')
    const ref = doc(db, COLLECTIONS.PRODUITS, v.prodId)
    const snap = await getDoc(ref)
    if (snap.exists()) {
      await updateDoc(ref, { stock: (snap.data().stock || 0) + (v.typeCredit ? v.total : v.qty) })
    }
    await deleteVente(v.id)
  }

  const handleExportVentes = () => {
    setExporting(true)
    const sorted = mv.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    exportCSV(
      `ventes_${mois}.csv`,
      ['Date', 'Produit', 'Catégorie', 'Qté / Montant', 'Prix unitaire', 'Total (FCFA)', 'Type'],
      sorted.map(v => [
        v.date,
        v.prodNom,
        v.prodCat || '',
        v.typeCredit ? v.qty : v.qty,
        v.typeCredit ? '—' : v.prix,
        v.total,
        v.typeCredit ? 'Crédit' : 'Produit'
      ])
    )
    setExporting(false)
  }

  const handleExportDepenses = () => {
    const sorted = md.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    exportCSV(
      `depenses_${mois}.csv`,
      ['Date', 'Description', 'Catégorie', 'Montant (FCFA)'],
      sorted.map(d => [d.date, d.desc, d.cat, d.montant])
    )
  }

  const handleExportComplet = () => {
    const rows = []
    // Ventes
    mv.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).forEach(v => {
      rows.push([v.date, 'Vente', v.prodNom, v.typeCredit ? 'Crédit' : (v.prodCat || ''), v.total, ''])
    })
    // Dépenses
    md.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).forEach(d => {
      rows.push([d.date, 'Dépense', d.desc, d.cat, '', d.montant])
    })
    rows.sort((a, b) => b[0].localeCompare(a[0]))
    exportCSV(
      `rapport_complet_${mois}.csv`,
      ['Date', 'Type', 'Description', 'Catégorie', 'Revenus (FCFA)', 'Dépenses (FCFA)'],
      rows
    )
  }

  if (lV || lD) return <Spinner />

  return (
    <div>
      <div className="topbar">
        <div className="page-title">Historique 📅</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="field" style={{ margin: 0, minWidth: 165 }}>
            <select value={mois} onChange={e => { setMois(e.target.value); setSearch('') }}>
              {months.map(m => <option key={m} value={m}>{fmtMonth(m)}</option>)}
            </select>
          </div>
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

      {/* ── Export ── */}
      <div style={{
        background: 'linear-gradient(135deg,rgba(14,165,107,.06),rgba(14,165,107,.02))',
        border: '1.5px solid rgba(14,165,107,.2)',
        borderRadius: 14, padding: '14px 18px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 16 }}>📥</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--em-d)', flex: 1 }}>
          Exporter {fmtMonth(mois)}
        </span>
        <button className="btn btn-em btn-sm" onClick={handleExportVentes} disabled={exporting}>
          📊 Ventes CSV
        </button>
        <button className="btn btn-outline btn-sm" onClick={handleExportDepenses}>
          💸 Dépenses CSV
        </button>
        <button className="btn btn-gold btn-sm" onClick={handleExportComplet}>
          📋 Rapport complet
        </button>
      </div>

      {/* ── Détail ventes ── */}
      <div className="scard" style={{ padding: 0, overflow: 'hidden', marginBottom: 18 }}>
        <div style={{ padding: '16px 20px 12px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="scard-title" style={{ flex: 1 }}>Détail des ventes</div>
          <span className="live-dot">Temps réel</span>
        </div>

        {/* Barre de recherche */}
        <div style={{ padding: '0 20px 14px' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Rechercher un produit…"
            style={{
              width: '100%', padding: '8px 14px',
              borderRadius: 10, border: '1.5px solid var(--border)',
              background: 'var(--bg)', fontFamily: 'Lexend,sans-serif',
              fontSize: 13, outline: 'none', color: 'var(--text)',
              transition: 'border .2s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--em)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          {search && (
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
              {mvFiltered.length} résultat{mvFiltered.length > 1 ? 's' : ''} pour "{search}"
              <button onClick={() => setSearch('')}
                style={{ marginLeft: 8, background: 'none', border: 'none', color: 'var(--coral)', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                ✕ Effacer
              </button>
            </div>
          )}
        </div>

        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Produit</th>
                <th>Qté / Montant</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {mvFiltered.length === 0
                ? <tr><td colSpan={5}><Empty icon="📅" text={search ? 'Aucun résultat pour cette recherche' : 'Aucune vente ce mois'} /></td></tr>
                : mvFiltered.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(v => (
                  <tr key={v.id}>
                    <td style={{ color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                      {v.date.slice(8,10)}/{v.date.slice(5,7)}/{v.date.slice(0,4)}
                    </td>
                    <td>
                      <strong>{v.prodNom}</strong>
                      {v.typeCredit && <span className="badge b-sky" style={{ marginLeft: 6 }}>📱 Crédit</span>}
                    </td>
                    <td>{v.typeCredit ? `${fmt(v.qty)} FCFA` : v.qty}</td>
                    <td>
                      <span style={{ color: 'var(--em)', fontWeight: 700 }}>
                        {fmt(v.total)} FCFA
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-del btn-xs" onClick={() => handleDelete(v)} title="Supprimer">✕</button>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Top produits ── */}
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
