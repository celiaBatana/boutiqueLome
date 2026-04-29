import { useState } from 'react'
import { useProduits, useVentes } from '../hooks/useFirebase'
import { SCard, Spinner, Empty, Field } from '../components/UI'
import { fmt, today, nowTime } from '../lib/utils'

const isCredit = (p) => p?.cat === 'Crédit téléphonique'

export default function Ventes() {
  const { produits } = useProduits()
  const { ventes, loading, addVente, deleteVente } = useVentes()
  const [pid, setPid]       = useState('')
  const [qty, setQty]       = useState(1)
  const [prix, setPrix]     = useState('')
  const [montant, setMontant] = useState('') // pour crédit
  const [date, setDate] = useState(today())
  const [prodSearch, setProdSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const t = today()
  const todayVentes = ventes.filter(v => v.date === t)
  const selectedDate = date || t
  const totalDay = todayVentes.reduce((a, v) => a + (v.total || 0), 0)

  const selectedProd = produits.find(x => x.id === pid)
  const creditMode = isCredit(selectedProd)

  const handleAdd = async () => {
    const p = produits.find(x => x.id === pid)
    if (!p) return alert('Sélectionnez un produit.')

    const { db, COLLECTIONS } = await import('../lib/firebase')
    const { doc, updateDoc } = await import('firebase/firestore')
    setSaving(true)

    try {
      if (isCredit(p)) {
        // ── Mode crédit : montant libre, déduit du solde ──
        const mont = Number(montant)
        if (!mont || mont <= 0) return alert('Entrez un montant valide.')
        if (mont > p.stock) return alert(`Solde insuffisant ! Solde : ${fmt(p.stock)} FCFA`)
        await updateDoc(doc(db, COLLECTIONS.PRODUITS, pid), { stock: p.stock - mont })
        await addVente({
          date: selectedDate, heure: nowTime(),
          prodId: pid, prodNom: p.nom,
          qty: mont,       // on stocke le montant dans qty
          prix: 1,         // prix unitaire = 1 pour crédit
          total: mont,
          typeCredit: true,
        })
        setMontant('')
      } else {
        // ── Mode normal ──
        if (qty > p.stock) return alert('Stock insuffisant ! Restant : ' + p.stock)
        await updateDoc(doc(db, COLLECTIONS.PRODUITS, pid), { stock: p.stock - qty })
        await addVente({
          date: selectedDate, heure: nowTime(),
          prodId: pid, prodNom: p.nom,
          qty: Number(qty), prix: Number(prix),
          total: Number(qty) * Number(prix),
          typeCredit: false,
        })
        setQty(1); setPrix('')
      }
      setPid('')
      setProdSearch('')
      setDate(today())
    } catch (e) { alert('Erreur : ' + e.message) }
    setSaving(false)
  }

  const handleDelete = async (v) => {
    if (!confirm('Supprimer cette vente ?')) return
    const { db, COLLECTIONS } = await import('../lib/firebase')
    const { doc, updateDoc, getDoc } = await import('firebase/firestore')
    const ref = doc(db, COLLECTIONS.PRODUITS, v.prodId)
    const snap = await getDoc(ref)
    if (snap.exists()) {
      // Remettre le montant/stock
      await updateDoc(ref, { stock: (snap.data().stock || 0) + (v.typeCredit ? v.total : v.qty) })
    }
    await deleteVente(v.id)
  }

  if (loading) return <Spinner />

  return (
    <div>
      <div className="topbar">
        <div className="page-title">Enregistrer une vente 💰</div>
      </div>

      <SCard title="Nouvelle vente">
        <div className="form-grid">
          <Field label="Date de vente">
            <input
              type="text"
              value={date}
              onChange={e => {
                let v = e.target.value.replace(/[^0-9-]/g, '')
                // Auto-complétion : "01" → "2025-04-01", "0104" → "2025-04-01", "04-01" → "2025-04-01"
                if (/^\d{2}$/.test(v)) v = new Date().getFullYear() + '-' + new Date().toISOString().slice(5,7) + '-' + v
                if (/^\d{4}$/.test(v)) v = new Date().getFullYear() + '-' + v.slice(0,2) + '-' + v.slice(2,4)
                if (/^\d{2}-\d{2}$/.test(v)) v = new Date().getFullYear() + '-' + v.slice(3,5) + '-' + v.slice(0,2)
                setDate(v)
              }}
              placeholder="01 → 2025-04-01 · 0401 → 2025-04-01"
              style={{ fontFamily: 'monospace' }}
            />
        </Field>
          <Field label="Produit">
            <input
              list="prod-list"
              value={prodSearch}
              onChange={e => {
                setProdSearch(e.target.value)
                const p = produits.find(x => x.nom === e.target.value)
                if (p) {
                  setPid(p.id)
                  if (!isCredit(p)) setPrix(p.prix)
                  setMontant(''); setQty(1)
                } else {
                  setPid('')
                }
              }}
              placeholder="Tapez pour chercher un produit…"
            />
            <datalist id="prod-list">
              {produits.map(p => (
                <option key={p.id} value={p.nom}>
                  {isCredit(p) ? `📱 Solde: ${fmt(p.stock)} FCFA` : `Stock: ${p.stock}`}
                </option>
              ))}
            </datalist>
        </Field>

          {creditMode ? (
            // ── Crédit : juste un montant ──
            <Field label="Montant vendu (FCFA)">
              <input
                type="number" min="1"
                value={montant}
                onChange={e => setMontant(e.target.value)}
                placeholder="Ex: 250"
              />
            </Field>
          ) : (
            // ── Normal : quantité + prix ──
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

        {/* Aperçu total */}
        {creditMode && montant && (
          <div style={{ marginBottom: 12, padding: '10px 14px', background: 'rgba(14,165,107,.08)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text2)' }}>
              📱 Solde restant après vente :
            </span>
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

      <SCard title="Ventes du jour">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span className="live-dot">Mise à jour en temps réel</span>
          {todayVentes.length > 0 && (
            <span style={{ fontFamily: 'Nunito,sans-serif', fontSize: 15, fontWeight: 800, color: 'var(--em)' }}>
              Total : {fmt(totalDay)} FCFA
            </span>
          )}
        </div>
        <div className="tw">
          <table>
            <thead>
              <tr><th>Heure</th><th>Produit</th><th>Qté / Montant</th><th>P.U.</th><th>Total</th><th></th></tr>
            </thead>
            <tbody>
              {todayVentes.length === 0
                ? <tr><td colSpan={6}><Empty icon="🛒" text="Aucune vente aujourd'hui" /></td></tr>
                : todayVentes.map(v => (
                  <tr key={v.id}>
                    <td style={{ color: 'var(--text3)' }}>{v.heure}</td>
                    <td>
                      <strong>{v.prodNom}</strong>
                      {v.typeCredit && <span className="badge b-sky" style={{ marginLeft: 6 }}>📱 Crédit</span>}
                    </td>
                    <td>{v.typeCredit ? `${fmt(v.qty)} FCFA` : v.qty}</td>
                    <td>{v.typeCredit ? '—' : `${fmt(v.prix)} FCFA`}</td>
                    <td><span style={{ color: 'var(--em)', fontWeight: 700 }}>{fmt(v.total)} FCFA</span></td>
                    <td><button className="btn btn-del btn-xs" onClick={() => handleDelete(v)}>✕</button></td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </SCard>
    </div>
  )
}
