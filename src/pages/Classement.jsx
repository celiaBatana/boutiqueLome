import { useState, useMemo } from 'react'
import { useVentes, useProduits, useMarges } from '../hooks/useFirebase'
import { StatCard, SCard, Spinner, Empty } from '../components/UI'
import { fmt, currentMonth, fmtMonth, MEDALS, CAT_PRODUITS } from '../lib/utils'

const PERIODES = [3, 6, 12]

// 1er mois inclus dans la période (mois en cours + n-1 précédents)
function startMonth(n) {
  const [y, m] = currentMonth().split('-').map(Number)
  const d = new Date(y, m - n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const SORTS = [
  { id: 'qty', label: '📦 Quantité',          key: 'qty' },
  { id: 'ca',  label: '💰 Somme vendue',      key: 'ca'  },
  { id: 'ben', label: '📈 Bénéfice estimé',   key: 'ben' },
]

export default function Classement() {
  const { ventes, loading: lV } = useVentes()
  const { produits, loading: lP } = useProduits()
  const { marges } = useMarges()

  const [nb, setNb]       = useState(6)
  const [sort, setSort]   = useState('ben')
  const [cat, setCat]     = useState('Toutes')

  const debut = startMonth(nb)

  const { rows, credit, totals } = useMemo(() => {
    const map = {}
    let credit = { ca: 0, nb: 0 }
    ventes
      .filter(v => (v.date || '').slice(0, 7) >= debut)
      .forEach(v => {
        const prod = produits.find(p => p.id === v.prodId)
        const c = v.typeCredit ? 'Crédit téléphonique' : (prod?.cat || v.prodCat || 'Autre')
        if (v.typeCredit) { credit.ca += v.total || 0; credit.nb += 1; return }
        const key = v.prodId || v.prodNom
        if (!map[key]) map[key] = { key, nom: prod?.nom || v.prodNom || '—', cat: c, qty: 0, ca: 0, ben: 0 }
        map[key].qty += v.qty || 0
        map[key].ca  += v.total || 0
        map[key].ben += (v.total || 0) * ((marges?.[c] ?? 20) / 100)
      })
    const all = Object.values(map).map(r => ({ ...r, ben: Math.round(r.ben) }))
    const totals = {
      qty: all.reduce((a, r) => a + r.qty, 0),
      ca:  all.reduce((a, r) => a + r.ca, 0) + credit.ca,
      ben: all.reduce((a, r) => a + r.ben, 0),
    }
    return { rows: all, credit, totals }
  }, [ventes, produits, marges, debut])

  const key = SORTS.find(s => s.id === sort).key
  const liste = rows
    .filter(r => cat === 'Toutes' || r.cat === cat)
    .sort((a, b) => b[key] - a[key] || b.ca - a.ca)
  const maxV = Math.max(...liste.map(r => r[key]), 1)
  const cats = ['Toutes', ...CAT_PRODUITS.filter(c => c !== 'Crédit téléphonique')]

  if (lV || lP) return <Spinner />

  return (
    <div>
      <div className="topbar">
        <div className="page-title">Classement 🏆</div>
        <div className="date-pill">{fmtMonth(debut)} → {fmtMonth(currentMonth())}</div>
      </div>

      <div className="stat-grid">
        <StatCard colorClass="c0" icon="💰" label="Somme vendue" value={fmt(totals.ca)} sub={`FCFA · ${nb} derniers mois`} />
        <StatCard colorClass="c3" icon="📈" label="Bénéfice estimé" value={fmt(totals.ben)} sub="FCFA (hors crédit)" />
        <StatCard colorClass="c1" icon="📦" label="Articles vendus" value={fmt(totals.qty)} sub={`${rows.length} produit${rows.length > 1 ? 's' : ''} différent${rows.length > 1 ? 's' : ''}`} />
      </div>

      <div className="scard">
        <div className="flex-row">
          {PERIODES.map(n => (
            <button key={n} className={`btn btn-sm ${nb === n ? 'btn-em' : 'btn-outline'}`} onClick={() => setNb(n)}>
              {n} mois
            </button>
          ))}
          <span className="spacer" />
          <select value={cat} onChange={e => setCat(e.target.value)} style={{ width: 'auto', minWidth: 160 }}>
            {cats.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex-row" style={{ marginBottom: 0 }}>
          <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>Classer par :</span>
          {SORTS.map(s => (
            <button key={s.id} className={`btn btn-sm ${sort === s.id ? 'btn-gold' : 'btn-outline'}`} onClick={() => setSort(s.id)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="scard" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Produit</th>
                <th style={{ textAlign: 'right' }}>Qté</th>
                <th style={{ textAlign: 'right' }}>Somme vendue</th>
                <th style={{ textAlign: 'right' }}>% du total</th>
                <th style={{ textAlign: 'right' }}>Bénéfice estimé</th>
              </tr>
            </thead>
            <tbody>
              {liste.length === 0
                ? <tr><td colSpan={6}><Empty icon="🏆" text="Aucune vente sur cette période" /></td></tr>
                : liste.map((r, i) => (
                  <tr key={r.key}>
                    <td style={{ fontSize: 16, whiteSpace: 'nowrap' }}>{MEDALS[i] || <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 700 }}>{i + 1}</span>}</td>
                    <td>
                      <strong>{r.nom}</strong>
                      <div style={{ marginTop: 2 }}><span className="badge b-light">{r.cat}</span></div>
                      <div className="prog-track" style={{ maxWidth: 220 }}>
                        <div className="prog-fill" style={{ width: `${(r[key] / maxV) * 100}%`, background: 'linear-gradient(90deg,var(--em),var(--em2))' }} />
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: sort === 'qty' ? 800 : 500 }}>{fmt(r.qty)}</td>
                    <td style={{ textAlign: 'right', fontWeight: sort === 'ca' ? 800 : 500 }}>{fmt(r.ca)} F</td>
                    <td style={{ textAlign: 'right', color: 'var(--text3)' }}>{totals.ca ? Math.round(r.ca / totals.ca * 100) : 0}%</td>
                    <td style={{ textAlign: 'right', fontWeight: sort === 'ben' ? 800 : 700, color: 'var(--em-d)' }}>{fmt(r.ben)} F</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {credit.ca > 0 && (cat === 'Toutes') && (
        <SCard title="📱 Crédit téléphonique (à part)">
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>
            <strong style={{ color: 'var(--em-d)', fontFamily: 'Nunito,sans-serif', fontSize: 18 }}>{fmt(credit.ca)} FCFA</strong>
            {' '}vendus en {credit.nb} recharge{credit.nb > 1 ? 's' : ''} sur la période — non classé en quantité, et bénéfice estimé selon la marge définie pour cette catégorie.
          </div>
        </SCard>
      )}
    </div>
  )
}
