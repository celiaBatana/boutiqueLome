import { useState } from 'react'
import { useProduits, useDepenses } from '../hooks/useFirebase'
import { SCard, Spinner, Empty, ProgBar, Field } from '../components/UI'
import { fmt, today, CAT_PRODUITS } from '../lib/utils'

function ModalAddProduit({ onClose, onSave }) {
  const [form, setForm] = useState({ nom: '', cat: 'Boissons', stock: 0, seuil: 5, prix: 0 })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="overlay open">
      <div className="modal">
        <div className="modal-head">
          <div className="modal-icon" style={{ background: 'linear-gradient(135deg,#d1fae5,#a7f3d0)' }}>📦</div>
          <div className="modal-ttl">Nouveau produit</div>
          <button className="modal-x" onClick={onClose}>✕</button>
        </div>
        <div className="form-grid">
          <Field label="Nom du produit">
            <input value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Ex: Coca-Cola 33cl" />
          </Field>
          <Field label="Catégorie">
            <select value={form.cat} onChange={e => set('cat', e.target.value)}>
              {CAT_PRODUITS.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Quantité initiale">
            <input type="number" min="0" value={form.stock} onChange={e => set('stock', +e.target.value)} />
          </Field>
          <Field label="Seuil d'alerte">
            <input type="number" min="1" value={form.seuil} onChange={e => set('seuil', +e.target.value)} />
          </Field>
          <Field label="Prix de vente (FCFA)">
            <input type="number" value={form.prix} onChange={e => set('prix', +e.target.value)} placeholder="0" />
          </Field>
        </div>
        <div className="modal-foot">
          <button className="btn btn-em" onClick={() => { if (!form.nom.trim()) return alert('Entrez un nom.'); onSave(form) }}>
            Enregistrer
          </button>
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  )
}

function ModalReappro({ produits, onClose, onSave }) {
  const [pid, setPid]   = useState('')
  const [qty, setQty]   = useState(1)
  const [cout, setCout] = useState('')
  return (
    <div className="overlay open">
      <div className="modal">
        <div className="modal-head">
          <div className="modal-icon" style={{ background: 'linear-gradient(135deg,#fef9c3,#fde68a)' }}>🔄</div>
          <div className="modal-ttl">Réapprovisionnement</div>
          <button className="modal-x" onClick={onClose}>✕</button>
        </div>
        <div className="form-grid">
          <Field label="Produit" style={{ gridColumn: '1/-1' }}>
            <select value={pid} onChange={e => setPid(e.target.value)}>
              <option value="">— Choisir —</option>
              {produits.map(p => <option key={p.id} value={p.id}>{p.nom} (stock : {p.stock})</option>)}
            </select>
          </Field>
          <Field label="Quantité ajoutée">
            <input type="number" min="1" value={qty} onChange={e => setQty(+e.target.value)} />
          </Field>
          <Field label="Coût total (FCFA)">
            <input type="number" value={cout} onChange={e => setCout(e.target.value)} placeholder="0" />
          </Field>
        </div>
        <div className="modal-foot">
          <button className="btn btn-gold" onClick={() => {
            if (!pid) return alert('Sélectionnez un produit.')
            onSave({ pid, qty: Number(qty), cout: Number(cout) })
          }}>✔ Confirmer</button>
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  )
}

export default function Stocks() {
  const { produits, loading, addProduit, deleteProduit } = useProduits()
  const { addDepense } = useDepenses()
  const [showAdd, setShowAdd]       = useState(false)
  const [showReappro, setShowReappro] = useState(false)

  const handleAddProduit = async (form) => {
    await addProduit(form)
    setShowAdd(false)
  }

  const handleReappro = async ({ pid, qty, cout }) => {
    const { db, COLLECTIONS } = await import('../lib/firebase')
    const { doc, updateDoc, getDoc } = await import('firebase/firestore')
    const ref = doc(db, COLLECTIONS.PRODUITS, pid)
    const snap = await getDoc(ref)
    if (!snap.exists()) return
    const p = { id: pid, ...snap.data() }
    await updateDoc(ref, { stock: (p.stock || 0) + qty })
    if (cout > 0) {
      await addDepense({
        date: today(), desc: `Réappro: ${p.nom} (×${qty})`,
        cat: 'Réapprovisionnement', montant: cout,
      })
    }
    setShowReappro(false)
  }

  if (loading) return <Spinner />

  return (
    <div>
      <div className="topbar">
        <div className="page-title">Stocks 📦</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-em" onClick={() => setShowAdd(true)}>✚ Nouveau produit</button>
          <button className="btn btn-gold" onClick={() => setShowReappro(true)}>🔄 Réapprovisionner</button>
        </div>
      </div>

      <div className="scard" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="tw">
          <table>
            <thead>
              <tr><th>Produit</th><th>Catégorie</th><th>Stock</th><th>Alerte ≤</th><th>Prix vente</th><th>État</th><th></th></tr>
            </thead>
            <tbody>
              {produits.length === 0
                ? <tr><td colSpan={7}><Empty icon="📦" text='Aucun produit. Cliquez sur "Nouveau produit"' /></td></tr>
                : produits.map(p => {
                  const col = p.stock === 0 ? 'var(--coral)' : p.stock <= p.seuil ? 'var(--gold)' : 'var(--em)'
                  const badge = p.stock === 0
                    ? <span className="badge b-red">Épuisé</span>
                    : p.stock <= p.seuil
                      ? <span className="badge b-gold">⚠ Faible</span>
                      : <span className="badge b-green">✓ OK</span>
                  return (
                    <tr key={p.id}>
                      <td><strong>{p.nom}</strong></td>
                      <td><span className="badge b-light">{p.cat}</span></td>
                      <td style={{ minWidth: 120 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <strong style={{ color: col, fontSize: 15 }}>{p.stock}</strong>
                          <div style={{ flex: 1 }}>
                            <ProgBar value={p.stock} max={p.seuil * 3} color={col} />
                          </div>
                        </div>
                      </td>
                      <td>{p.seuil}</td>
                      <td>{fmt(p.prix)} FCFA</td>
                      <td>{badge}</td>
                      <td>
                        <button className="btn btn-del btn-xs"
                          onClick={() => confirm('Supprimer ce produit ?') && deleteProduit(p.id)}>
                          ✕
                        </button>
                      </td>
                    </tr>
                  )
                })
              }
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && <ModalAddProduit onClose={() => setShowAdd(false)} onSave={handleAddProduit} />}
      {showReappro && <ModalReappro produits={produits} onClose={() => setShowReappro(false)} onSave={handleReappro} />}
    </div>
  )
}
