import { useState, useMemo } from 'react'
import { useProduits, useVentes, useNotes } from '../hooks/useFirebase'
import { SCard, Spinner, Empty, Field } from '../components/UI'
import { fmt, today, nowTime, currentMonth, monthKey, fmtMonth } from '../lib/utils'

const isCredit = (p) => p?.cat === 'Crédit téléphonique'

// ── Note du jour éditable ──
function NoteJour({ date, notes, setNote, deleteNote }) {
  const [editing, setEditing]   = useState(false)
  const [val, setVal]           = useState('')
  const note = notes[date] || ''

  const handleSave = async () => {
    if (val.trim()) await setNote(date, val.trim())
    else if (note) await deleteNote(date)
    setEditing(false)
  }

  if (editing) {
    return (
      <div style={{ margin: '6px 0 8px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          autoFocus value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
          placeholder="Ex: Promo -20%, Marché spécial, Fête du quartier…"
          style={{ flex: 1, minWidth: 180, padding: '5px 10px', borderRadius: 8, border: '1.5px solid var(--em)', background: '#fff', fontFamily: 'Lexend,sans-serif', fontSize: 12, outline: 'none' }}
        />
        <button className="btn btn-em btn-sm" onClick={handleSave}>✔ Sauvegarder</button>
        <button className="btn btn-outline btn-sm" onClick={() => setEditing(false)}>Annuler</button>
      </div>
    )
  }

  return (
    <div style={{ margin: '6px 0 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
      {note ? (
        <>
          <span style={{ fontSize: 12, color: '#7c3aed', fontWeight: 600, background: 'rgba(124,58,237,.08)', border: '1px solid rgba(124,58,237,.2)', borderRadius: 8, padding: '3px 10px', flex: 1 }}>
            📝 {note}
          </span>
          <button
            onClick={() => { setVal(note); setEditing(true) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text3)', padding: '2px 4px' }}
            title="Modifier la note"
          >✏️</button>
          <button
            onClick={async () => { if (confirm('Supprimer cette note ?')) await deleteNote(date) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--coral)', padding: '2px 4px' }}
            title="Supprimer la note"
          >✕</button>
        </>
      ) : (
        <button
          onClick={() => { setVal(''); setEditing(true) }}
          style={{ background: 'none', border: '1px dashed var(--border)', borderRadius: 8, padding: '3px 10px', fontSize: 11, color: 'var(--text3)', cursor: 'pointer', fontFamily: 'Lexend,sans-serif', transition: 'all .15s' }}
        >
          📝 Ajouter une note (promo, événement…)
        </button>
      )}
    </div>
  )
}

export default function Ventes() {
  const { produits } = useProduits()
  const { ventes, loading, addVente, deleteVente } = useVentes()
  const { notes, setNote, deleteNote } = useNotes()

  const [pid, setPid]         = useState('')
  const [qty, setQty]         = useState(1)
  const [prix, setPrix]       = useState('')
  const [montant, setMontant] = useState('')
  const [date, setDate]       = useState(() => sessionStorage.getItem('lastVenteDate') || today())
  const [prodSearch, setProdSearch] = useState('')
  const [saving, setSaving]   = useState(false)

  // Filtres
  const [filterMode, setFilterMode] = useState('mois')
  const [filterJour, setFilterJour] = useState(today())
  const [filterMois, setFilterMois] = useState(currentMonth())

  const t = today()
  const selectedDate = date || t
  const selectedProd = produits.find(x => x.id === pid)
  const creditMode = isCredit(selectedProd)

  const moisDispos = useMemo(() => {
    const s = new Set([...ventes.map(v => monthKey(v.date)), currentMonth()])
    return [...s].filter(Boolean).sort().reverse()
  }, [ventes])

  const joursDispos = useMemo(() => {
    const s = new Set(ventes.filter(v => (v.date || '').startsWith(filterMois)).map(v => v.date))
    return [...s].filter(Boolean).sort().reverse()
  }, [ventes, filterMois])

  const ventesFiltrees = useMemo(() => {
    if (filterMode === 'jour') return ventes.filter(v => v.date === filterJour)
    return ventes.filter(v => (v.date || '').startsWith(filterMois))
  }, [ventes, filterMode, filterJour, filterMois])

  const ventesParJour = useMemo(() => {
    const map = {}
    ventesFiltrees.forEach(v => {
      if (!map[v.date]) map[v.date] = []
      map[v.date].push(v)
    })
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
  }, [ventesFiltrees])

  const totalFiltre = ventesFiltrees.reduce((a, v) => a + (v.total || 0), 0)

  const fmtDate = (d) => {
    if (!d) return ''
    if (d === t) return "Aujourd'hui"
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
    if (d === yesterday.toISOString().slice(0, 10)) return 'Hier'
    return d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4)
  }

  const handleAdd = async () => {
    const p = produits.find(x => x.id === pid)
    if (!p) return alert('Sélectionnez un produit.')
    const { db, COLLECTIONS } = await import('../lib/firebase')
    const { doc, updateDoc } = await import('firebase/firestore')
    setSaving(true)
    try {
      if (isCredit(p)) {
        const mont = Number(montant)
        if (!mont || mont <= 0) return alert('Entrez un montant valide.')
        if (mont > p.stock) return alert(`Solde insuffisant ! Solde : ${fmt(p.stock)} FCFA`)
        await updateDoc(doc(db, COLLECTIONS.PRODUITS, pid), { stock: p.stock - mont })
        await addVente({ date: selectedDate, heure: nowTime(), prodId: pid, prodNom: p.nom, prodCat: p.cat, qty: mont, prix: 1, total: mont, typeCredit: true })
        setMontant('')
      } else {
        if (qty > p.stock) return alert('Stock insuffisant ! Restant : ' + p.stock)
        await updateDoc(doc(db, COLLECTIONS.PRODUITS, pid), { stock: p.stock - qty })
        await addVente({ date: selectedDate, heure: nowTime(), prodId: pid, prodNom: p.nom, prodCat: p.cat, qty: Number(qty), prix: Number(prix), total: Number(qty) * Number(prix), typeCredit: false })
        setQty(1); setPrix('')
      }
      setPid(''); setProdSearch('')
    } catch (e) { alert('Erreur : ' + e.message) }
    setSaving(false)
  }

  const handleDelete = async (v) => {
    if (!confirm('Supprimer cette vente ?')) return
    const { db, COLLECTIONS } = await import('../lib/firebase')
    const { doc, updateDoc, getDoc } = await import('firebase/firestore')
    const ref = doc(db, COLLECTIONS.PRODUITS, v.prodId)
    const snap = await getDoc(ref)
    if (snap.exists()) await updateDoc(ref, { stock: (snap.data().stock || 0) + (v.typeCredit ? v.total : v.qty) })
    await deleteVente(v.id)
  }

  if (loading) return <Spinner />

  return (
    <div>
      <div className="topbar">
        <div className="page-title">Enregistrer une vente 💰</div>
      </div>

      {/* ── Formulaire ── */}
      <SCard title="Nouvelle vente">
        <div className="form-grid">
          <Field label="Date de vente">
            <input
              type="text" value={date}
              onChange={e => {
                let v = e.target.value.replace(/[^0-9-]/g, '')
                if (/^\d{2}$/.test(v)) v = new Date().getFullYear() + '-' + new Date().toISOString().slice(5, 7) + '-' + v
                if (/^\d{4}$/.test(v)) v = new Date().getFullYear() + '-' + v.slice(0, 2) + '-' + v.slice(2, 4)
                if (/^\d{2}-\d{2}$/.test(v)) v = new Date().getFullYear() + '-' + v.slice(3, 5) + '-' + v.slice(0, 2)
                setDate(v); sessionStorage.setItem('lastVenteDate', v)
              }}
              placeholder="01 → 2026-04-01 · 0401 → 2026-04-01"
              style={{ fontFamily: 'monospace' }}
            />
          </Field>

          <Field label="Produit">
            <input
              list="produits-datalist" value={prodSearch} autoComplete="off"
              onChange={e => {
                const val = e.target.value
                setProdSearch(val)
                const p = produits.find(x => x.nom.toLowerCase() === val.toLowerCase())
                if (p) { setPid(p.id); if (!isCredit(p)) setPrix(p.prix); setMontant(''); setQty(1) }
                else setPid('')
              }}
              placeholder="Tapez pour chercher un produit…"
            />
            <datalist id="produits-datalist">
              {produits.map(p => <option key={p.id} value={p.nom} />)}
            </datalist>
          </Field>

          {creditMode ? (
            <Field label="Montant vendu (FCFA)">
              <input type="number" min="1" value={montant} onChange={e => setMontant(e.target.value)} placeholder="Ex: 250" />
            </Field>
          ) : (
            <>
              <Field label="Quantité">
                <input type="number" min="1" value={qty} onChange={e => setQty(+e.target.value)} />
              </Field>
              <Field label="Prix unitaire (FCFA)">
                <input type="number" value={prix} onChange={e => setPrix(e.target.value)} placeholder="0" />
              </Field>
            </>
          )}
        </div>

        {creditMode && montant && (
          <div style={{ marginBottom: 12, padding: '10px 14px', background: 'rgba(14,165,107,.08)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text2)' }}>📱 Solde restant après vente :</span>
            <strong style={{ color: selectedProd?.stock - montant < (selectedProd?.seuil || 0) ? 'var(--coral)' : 'var(--em)', fontSize: 15 }}>
              {fmt((selectedProd?.stock || 0) - Number(montant))} FCFA
            </strong>
          </div>
        )}
        {!creditMode && pid && prix && qty && (
          <div style={{ marginBottom: 12, color: 'var(--em)', fontWeight: 700, fontSize: 14 }}>
            Total : {fmt(qty * prix)} FCFA
          </div>
        )}
        <button className="btn btn-em" onClick={handleAdd} disabled={saving}>
          {saving ? '…' : '✚ Enregistrer la vente'}
        </button>
      </SCard>

      {/* ── Liste des ventes ── */}
      <div className="scard">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <div className="scard-title" style={{ flex: 1 }}>Ventes</div>
          <span className="live-dot">Temps réel</span>
        </div>

        {/* Filtres */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className={`btn btn-sm ${filterMode === 'mois' ? 'btn-em' : 'btn-outline'}`}
            onClick={() => setFilterMode('mois')}>📅 Par mois</button>
          <button className={`btn btn-sm ${filterMode === 'jour' ? 'btn-em' : 'btn-outline'}`}
            onClick={() => setFilterMode('jour')}>📆 Par jour</button>

          {filterMode === 'mois' && (
            <select value={filterMois} onChange={e => setFilterMois(e.target.value)}
              style={{ padding: '6px 30px 6px 12px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg)', fontFamily: 'Lexend,sans-serif', fontSize: 13, color: 'var(--text)' }}>
              {moisDispos.map(m => <option key={m} value={m}>{fmtMonth(m)}</option>)}
            </select>
          )}

          {filterMode === 'jour' && (
            <select value={filterJour} onChange={e => setFilterJour(e.target.value)}
              style={{ padding: '6px 30px 6px 12px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg)', fontFamily: 'Lexend,sans-serif', fontSize: 13, color: 'var(--text)' }}>
              {joursDispos.length === 0
                ? <option value={filterJour}>{fmtDate(filterJour)}</option>
                : joursDispos.map(d => <option key={d} value={d}>{fmtDate(d)}</option>)
              }
            </select>
          )}

          {ventesFiltrees.length > 0 && (
            <span style={{ marginLeft: 'auto', fontFamily: 'Nunito,sans-serif', fontSize: 15, fontWeight: 800, color: 'var(--em)' }}>
              Total : {fmt(totalFiltre)} FCFA
            </span>
          )}
        </div>

        {/* Ventes groupées par jour */}
        {ventesParJour.length === 0 ? (
          <Empty icon="🛒" text="Aucune vente pour cette période" />
        ) : (
          ventesParJour.map(([jour, ventesJour]) => {
            const totalJour = ventesJour.reduce((a, v) => a + (v.total || 0), 0)
            const isToday = jour === t
            const hasNote = !!notes[jour]

            return (
              <div key={jour} style={{ marginBottom: 20 }}>
                {/* Bandeau jour */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '7px 12px', marginBottom: 4,
                  background: isToday
                    ? 'linear-gradient(90deg,rgba(14,165,107,.15),transparent)'
                    : 'linear-gradient(90deg,var(--bg),transparent)',
                  borderRadius: 8,
                  borderLeft: isToday ? '3px solid var(--em)' : hasNote ? '3px solid #7c3aed' : '3px solid var(--border)',
                }}>
                  <span style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 800, fontSize: 13, color: isToday ? 'var(--em-d)' : 'var(--text2)' }}>
                    📅 {fmtDate(jour)}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: isToday ? 'var(--em)' : 'var(--text2)' }}>
                    {ventesJour.length} vente{ventesJour.length > 1 ? 's' : ''} · {fmt(totalJour)} FCFA
                  </span>
                </div>

                {/* Note du jour */}
                <NoteJour
                  date={jour}
                  notes={notes}
                  setNote={setNote}
                  deleteNote={deleteNote}
                />

                {/* Tableau */}
                <div className="tw">
                  <table>
                    <thead>
                      <tr><th>Heure</th><th>Produit</th><th>Qté / Montant</th><th>P.U.</th><th>Total</th><th></th></tr>
                    </thead>
                    <tbody>
                      {ventesJour.map(v => (
                        <tr key={v.id}>
                          <td style={{ color: 'var(--text3)', fontSize: 12 }}>{v.heure}</td>
                          <td>
                            <strong>{v.prodNom}</strong>
                            {v.typeCredit && <span className="badge b-sky" style={{ marginLeft: 6 }}>📱 Crédit</span>}
                          </td>
                          <td>{v.typeCredit ? `${fmt(v.qty)} FCFA` : v.qty}</td>
                          <td>{v.typeCredit ? '—' : `${fmt(v.prix)} FCFA`}</td>
                          <td><span style={{ color: 'var(--em)', fontWeight: 700 }}>{fmt(v.total)} FCFA</span></td>
                          <td><button className="btn btn-del btn-xs" onClick={() => handleDelete(v)}>✕</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
