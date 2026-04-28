import { useState } from 'react'
import { useProduits, useVentes } from '../hooks/useFirebase'
import { SCard, Spinner, Empty, Field } from '../components/UI'
import { fmt, today, nowTime } from '../lib/utils'

export default function Ventes() {
  const { produits } = useProduits()
  const { ventes, loading, addVente, deleteVente } = useVentes()
  const [pid, setPid]   = useState('')
  const [qty, setQty]   = useState(1)
  const [prix, setPrix] = useState('')
  const [saving, setSaving] = useState(false)

  const t = today()
  const todayVentes = ventes.filter(v => v.date === t)
  const totalDay = todayVentes.reduce((a, v) => a + (v.total || 0), 0)

  const handleAdd = async () => {
    const p = produits.find(x => x.id === pid)
    if (!p) return alert('Sélectionnez un produit.')
    if (qty > p.stock) return alert('Stock insuffisant ! Restant : ' + p.stock)
    setSaving(true)
    try {
      // Mise à jour du stock
      const { updateStock } = await import('../hooks/useFirebase').then(m => m.useProduits ? { updateStock: null } : { updateStock: null })
      // On importe le hook updateStock directement
      const { db, COLLECTIONS } = await import('../lib/firebase')
      const { doc, updateDoc } = await import('firebase/firestore')
      await updateDoc(doc(db, COLLECTIONS.PRODUITS, pid), { stock: p.stock - qty })
      await addVente({
        date: t,
        heure: nowTime(),
        prodId: pid,
        prodNom: p.nom,
        qty: Number(qty),
        prix: Number(prix),
        total: Number(qty) * Number(prix),
      })
      setPid(''); setQty(1); setPrix('')
    } catch (e) { alert('Erreur : ' + e.message) }
    setSaving(false)
  }

  const handleDelete = async (v) => {
    if (!confirm('Supprimer cette vente ?')) return
    // Remettre le stock
    const { db, COLLECTIONS } = await import('../lib/firebase')
    const { doc, updateDoc, getDoc } = await import('firebase/firestore')
    const ref = doc(db, COLLECTIONS.PRODUITS, v.prodId)
    const snap = await getDoc(ref)
    if (snap.exists()) await updateDoc(ref, { stock: (snap.data().stock || 0) + v.qty })
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
          <Field label="Produit">
            <select value={pid} onChange={e => {
              setPid(e.target.value)
              const p = produits.find(x => x.id === e.target.value)
              if (p) setPrix(p.prix)
            }}>
              <option value="">— Choisir —</option>
              {produits.map(p => (
                <option key={p.id} value={p.id}>{p.nom} (stock : {p.stock})</option>
              ))}
            </select>
          </Field>
          <Field label="Quantité">
            <input type="number" min="1" value={qty} onChange={e => setQty(+e.target.value)} />
          </Field>
          <Field label="Prix unitaire (FCFA)">
            <input type="number" value={prix} onChange={e => setPrix(e.target.value)} placeholder="0" />
          </Field>
        </div>
        {pid && prix && qty && (
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
              <tr><th>Heure</th><th>Produit</th><th>Qté</th><th>P.U.</th><th>Total</th><th></th></tr>
            </thead>
            <tbody>
              {todayVentes.length === 0
                ? <tr><td colSpan={6}><Empty icon="🛒" text="Aucune vente aujourd'hui" /></td></tr>
                : todayVentes.map(v => (
                  <tr key={v.id}>
                    <td style={{ color: 'var(--text3)' }}>{v.heure}</td>
                    <td><strong>{v.prodNom}</strong></td>
                    <td>{v.qty}</td>
                    <td>{fmt(v.prix)} FCFA</td>
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
