import { useState } from 'react'
import { useMarges, useVentes, useProduits } from '../hooks/useFirebase'
import { SCard, Spinner } from '../components/UI'
import { fmt, currentMonth, fmtMonth, monthKey } from '../lib/utils'
import { CAT_PRODUITS } from '../lib/utils'

export default function Marges() {
 const { marges, loading, setMarge } = useMarges()
 const { ventes } = useVentes()
 const { produits } = useProduits()
  
  const [moisSel, setMoisSel] = useState(currentMonth())

  const moisDispos = [...new Set([
    ...ventes.map(v => monthKey(v.date || '')),
    currentMonth()
  ])].filter(Boolean).sort().reverse()

  // Calcul bénéfice estimé par catégorie pour le mois sélectionné
  const ms = ventes.filter(v => (v.date || '').startsWith(moisSel))

  const catRevMap = {}
  ms.forEach(v => {
  const cat = v.typeCredit ? 'Crédit téléphonique'
    : (produits.find(p => p.id === v.prodId)?.cat || v.prodCat || 'Autre')
    if (!catRevMap[cat]) catRevMap[cat] = 0
    catRevMap[cat] += v.total || 0
  })

  const benParCat = Object.entries(catRevMap).map(([cat, rev]) => ({
    cat,
    rev,
    pct: marges[cat] ?? 20,
    ben: Math.round(rev * (marges[cat] ?? 20) / 100),
  })).sort((a, b) => b.ben - a.ben)

  const totalBen = benParCat.reduce((a, c) => a + c.ben, 0)
  const totalRev = ms.reduce((a, v) => a + (v.total || 0), 0)

  if (loading) return <Spinner />

  return (
    <div>
      <div className="topbar">
        <div className="page-title">Marges & Bénéfices 💹</div>
      </div>

      {/* ── Résumé du mois ── */}
      <div style={{
        background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)',
        border: '1.5px solid rgba(14,165,107,.25)',
        borderRadius: 16, padding: '16px 20px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        boxShadow: '0 4px 16px rgba(14,165,107,.1)',
      }}>
        <div style={{ fontSize: 28 }}>💹</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--em-d)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
            Bénéfice estimé
          </div>
          <div style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 900, fontSize: 28, color: 'var(--em-d)' }}>
            {fmt(totalBen)} FCFA
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
            sur {fmt(totalRev)} FCFA de revenus
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: 'var(--em-d)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Marge moyenne</div>
          <div style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 900, fontSize: 22, color: 'var(--em)' }}>
            {totalRev > 0 ? Math.round(totalBen / totalRev * 100) : 0}%
          </div>
        </div>
        <div style={{ minWidth: 165 }}>
          <div style={{ fontSize: 10, color: 'var(--em-d)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Mois</div>
          <select value={moisSel} onChange={e => setMoisSel(e.target.value)}
            style={{ padding: '6px 30px 6px 10px', borderRadius: 8, border: '1.5px solid rgba(14,165,107,.3)', background: '#fff', fontFamily: 'Lexend,sans-serif', fontSize: 13, color: 'var(--text)', width: '100%' }}>
            {moisDispos.map(m => <option key={m} value={m}>{fmtMonth(m)}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="two-col">

        {/* ── Bénéfice par catégorie (mois sélectionné) ── */}
        <SCard title={`💰 Bénéfice par catégorie — ${fmtMonth(moisSel)}`}>
          {benParCat.length === 0
            ? <div style={{ color: 'var(--text3)', fontSize: 13, padding: '20px 0' }}>Aucune vente ce mois</div>
            : benParCat.map(({ cat, rev, pct, ben }) => {
              const maxBen = Math.max(...benParCat.map(c => c.ben), 1)
              const barPct = Math.round(ben / maxBen * 100)
              return (
                <div key={cat} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{cat}</span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 800, fontSize: 14, color: 'var(--em-d)' }}>
                        {fmt(ben)} FCFA
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 6 }}>
                        ({pct}% de {fmt(rev)} FCFA)
                      </span>
                    </div>
                  </div>
                  <div className="prog-track">
                    <div className="prog-fill" style={{ width: barPct + '%', background: 'var(--em)' }} />
                  </div>
                </div>
              )
            })
          }
        </SCard>

        {/* ── Configuration des marges ── */}
        <SCard title="⚙️ Configuration des marges">
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 14 }}>
            Cliquez sur un % pour le modifier. Les valeurs sont sauvegardées automatiquement.
          </div>
          {CAT_PRODUITS.map(cat => (
            <MargeRow
              key={cat}
              cat={cat}
              pct={marges[cat] ?? 20}
              onSave={pct => setMarge(cat, pct)}
            />
          ))}
        </SCard>

      </div>
    </div>
  )
}

// ── Ligne marge éditable ──
function MargeRow({ cat, pct, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal]         = useState(pct)

  const commit = () => {
    setEditing(false)
    const n = Math.min(100, Math.max(0, Number(val) || 0))
    if (n !== pct) onSave(n)
  }

  const barColor = pct === 0 ? 'var(--text3)'
    : pct < 20 ? 'var(--coral)'
    : pct < 50 ? 'var(--gold)'
    : 'var(--em)'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <span style={{ fontSize: 13, fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {cat}
      </span>
      <div style={{ flex: 2 }}>
        <div className="prog-track">
          <div className="prog-fill" style={{ width: pct + '%', background: barColor, transition: 'width .4s' }} />
        </div>
      </div>
      {editing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="number" value={val} autoFocus
            min={0} max={100}
            onChange={e => setVal(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
            style={{ width: 60, padding: '3px 8px', borderRadius: 7, border: '1.5px solid var(--em)', background: '#fff', fontFamily: 'Lexend,sans-serif', fontSize: 13, outline: 'none', textAlign: 'center' }}
          />
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>%</span>
        </div>
      ) : (
        <button
          onClick={() => { setVal(pct); setEditing(true) }}
          style={{
            minWidth: 52, padding: '4px 10px', borderRadius: 7,
            background: barColor === 'var(--text3)' ? 'var(--bg)' : `${barColor.replace('var(', 'rgba(').replace(')', '')}`,
            border: `1.5px solid ${barColor}`,
            color: barColor, fontFamily: 'Nunito,sans-serif',
            fontWeight: 800, fontSize: 14, cursor: 'pointer',
            transition: 'all .15s',
          }}
        >
          {pct}%
        </button>
      )}
    </div>
  )
}
