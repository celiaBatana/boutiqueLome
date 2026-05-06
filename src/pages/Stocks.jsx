import { useState, useMemo } from 'react'
import { useProduits, useDepenses, useReappros } from '../hooks/useFirebase'
import { SCard, Spinner, Empty, ProgBar, Field } from '../components/UI'
import { fmt, today, CAT_PRODUITS } from '../lib/utils'

const PAGE_R = 8

// ── Cellule éditable inline ──
function EditableCell({ value, color, isCurrency = false, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)

  const commit = () => {
    setEditing(false)
    const n = Number(val)
    if (!isNaN(n) && n !== value) onSave(n)
  }

  if (editing) {
    return (
      <input
        type="number" value={val} autoFocus
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        style={{ width: 90, padding: '4px 8px', borderRadius: 7, border: '1.5px solid var(--em)', background: '#fff', fontFamily: 'Lexend,sans-serif', fontSize: 13, color: 'var(--text)', outline: 'none' }}
      />
    )
  }

  return (
    <span onClick={() => { setVal(value); setEditing(true) }} title="Cliquer pour modifier"
      style={{ cursor: 'pointer', color: color || 'var(--text)', fontWeight: 700, fontSize: 15, borderBottom: '1.5px dashed var(--border)', paddingBottom: 1 }}>
      {isCurrency ? fmt(value) + ' FCFA' : value}
    </span>
  )
}

// ── Modal Nouveau produit ──
function ModalAddProduit({ onClose, onSave }) {
  const [form, setForm] = useState({ nom: '', cat: 'Boissons', stock: 3, seuil: 1, prix: 0 })
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

// ── Modal Réappro ──
function ModalReappro({ produits, onClose, onSave }) {
  const [pid, setPid]   = useState('')
  const [qty, setQty]   = useState(1)
  const [date, setDate] = useState(today())
  return (
    <div className="overlay open">
      <div className="modal">
        <div className="modal-head">
          <div className="modal-icon" style={{ background: 'linear-gradient(135deg,#fef9c3,#fde68a)' }}>🔄</div>
          <div className="modal-ttl">Réapprovisionnement</div>
          <button className="modal-x" onClick={onClose}>✕</button>
        </div>
        <div className="form-grid">
          <Field label="Date">
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </Field>
          <Field label="Produit">
            <select value={pid} onChange={e => setPid(e.target.value)}>
              <option value="">— Choisir —</option>
              {produits.map(p => <option key={p.id} value={p.id}>{p.nom} (stock : {p.stock})</option>)}
            </select>
          </Field>
          <Field label="Quantité ajoutée">
            <input type="number" min="1" value={qty} onChange={e => setQty(+e.target.value)} />
          </Field>
        </div>
        <div className="modal-foot">
          <button className="btn btn-gold" onClick={() => {
            if (!pid) return alert('Sélectionnez un produit.')
            onSave({ pid, qty: Number(qty), date })
          }}>✔ Confirmer</button>
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  )
}

// ── Historique réappros paginé ──
function HistoriqueReappros({ reappros, produits, deleteReappro }) {
  const [filterProd, setFilterProd] = useState('tous')
  const [page, setPage]             = useState(1)

  const sorted = useMemo(() => {
    const filtered = filterProd === 'tous'
      ? reappros
      : reappros.filter(r => r.prodId === filterProd)
    return filtered.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  }, [reappros, filterProd])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_R))
  const slice = sorted.slice((page - 1) * PAGE_R, page * PAGE_R)

  // Reset page quand filtre change
  const handleFilter = (v) => { setFilterProd(v); setPage(1) }

  const btnP = (active) => ({
    padding: '4px 10px', borderRadius: 7, cursor: 'pointer',
    fontFamily: 'Lexend,sans-serif', fontSize: 12, fontWeight: 600,
    background: active ? 'var(--em)' : 'var(--bg)',
    color: active ? '#fff' : 'var(--text2)',
    border: active ? 'none' : '1.5px solid var(--border)',
    transition: 'all .15s',
  })

  return (
    <div className="scard">
      {/* Header + filtre */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="scard-title" style={{ flex: 1 }}>🔄 Historique des réapprovisionnements</div>
        <select value={filterProd} onChange={e => handleFilter(e.target.value)}
          style={{ padding: '6px 30px 6px 12px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg)', fontFamily: 'Lexend,sans-serif', fontSize: 13, color: 'var(--text)' }}>
          <option value="tous">Tous les produits</option>
          {produits.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
        </select>
      </div>

      {/* Tableau */}
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Produit</th>
              <th>Catégorie</th>
              <th>Qté ajoutée</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {slice.length === 0
              ? <tr><td colSpan={5}><Empty icon="🔄" text="Aucun réapprovisionnement enregistré" /></td></tr>
              : slice.map(r => (
                <tr key={r.id}>
                  <td style={{ color: 'var(--text3)', whiteSpace: 'nowrap', fontSize: 12 }}>
                    {r.date ? `${r.date.slice(8,10)}/${r.date.slice(5,7)}/${r.date.slice(0,4)}` : '—'}
                  </td>
                  <td><strong>{r.prodNom}</strong></td>
                  <td><span className="badge b-light">{r.prodCat || '—'}</span></td>
                  <td>
                    <span style={{ color: 'var(--em)', fontWeight: 800, fontFamily: 'Nunito,sans-serif', fontSize: 15 }}>
                      +{r.qty}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-del btn-xs"
                      onClick={() => { if (!confirm('Supprimer ce réappro ? Le stock ne sera pas modifié.')) return; deleteReappro(r.id) }}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>
            {(page - 1) * PAGE_R + 1}–{Math.min(page * PAGE_R, sorted.length)} sur {sorted.length} réappros
          </span>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <button style={btnP(false)} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Préc.</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} style={btnP(p === page)} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button style={btnP(false)} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Suiv. →</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Page principale ──
export default function Stocks() {
  const { produits, loading, addProduit, updateProduit, deleteProduit } = useProduits()
  const { reappros, addReappro, deleteReappro } = useReappros()
  const [showAdd, setShowAdd]         = useState(false)
  const [showReappro, setShowReappro] = useState(false)

  const handleAddProduit = async (form) => {
    await addProduit(form)
    setShowAdd(false)
  }

  const handleReappro = async ({ pid, qty, date }) => {
    const { db, COLLECTIONS } = await import('../lib/firebase')
    const { doc, updateDoc, getDoc } = await import('firebase/firestore')
    const ref = doc(db, COLLECTIONS.PRODUITS, pid)
    const snap = await getDoc(ref)
    if (!snap.exists()) return
    const p = { id: pid, ...snap.data() }
    await updateDoc(ref, { stock: (p.stock || 0) + qty })
    await addReappro({ prodId: pid, prodNom: p.nom, prodCat: p.cat, qty, date })
    setShowReappro(false)
  }

  const handleUpdate = (id, field, value) => updateProduit(id, { [field]: value })

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

      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        ✏️ Cliquez sur le <span style={{ borderBottom: '1.5px dashed var(--text3)', margin: '0 3px' }}>stock</span>,
        le <span style={{ borderBottom: '1.5px dashed var(--text3)', margin: '0 3px' }}>seuil</span> ou le
        <span style={{ borderBottom: '1.5px dashed var(--text3)', margin: '0 3px' }}>prix</span> pour modifier directement
      </div>

      {/* ── Tableau des stocks ── */}
      <div className="scard" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Produit</th>
                <th>Catégorie</th>
                <th>Stock / Solde</th>
                <th>Seuil alerte</th>
                <th>Prix vente</th>
                <th>État</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {produits.length === 0
                ? <tr><td colSpan={7}><Empty icon="📦" text='Aucun produit. Cliquez sur "Nouveau produit"' /></td></tr>
                : (() => {
                  let lastCat = null
                  return produits.map(p => {
                    const credit = p.cat === 'Crédit téléphonique'
                    const col = p.stock === 0 ? 'var(--coral)' : p.stock <= p.seuil ? 'var(--gold)' : 'var(--em)'
                    const badge = p.stock === 0
                      ? <span className="badge b-red">Épuisé</span>
                      : p.stock <= p.seuil
                        ? <span className="badge b-gold">⚠ Faible</span>
                        : <span className="badge b-green">✓ OK</span>

                    const catHeader = p.cat !== lastCat ? (
                      <tr key={'cat-' + p.cat}>
                        <td colSpan={7} style={{
                          background: 'linear-gradient(90deg, var(--em-g), transparent)',
                          padding: '8px 14px', fontFamily: 'Nunito,sans-serif',
                          fontWeight: 800, fontSize: 11, color: 'var(--em-d)',
                          textTransform: 'uppercase', letterSpacing: '.07em',
                          borderBottom: '1.5px solid var(--border)',
                        }}>
                          {p.cat === 'Crédit téléphonique' ? '📱 ' : ''}{p.cat}
                        </td>
                      </tr>
                    ) : null
                    lastCat = p.cat

                    return [
                      catHeader,
                      <tr key={p.id}>
                        <td>
                          <strong>{p.nom}</strong>
                          {credit && <span style={{ marginLeft: 6 }}>📱</span>}
                        </td>
                        <td><span className="badge b-light">{p.cat}</span></td>
                        <td style={{ minWidth: 150 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <EditableCell value={p.stock} color={col} isCurrency={credit}
                              onSave={v => handleUpdate(p.id, 'stock', v)} />
                            <div style={{ flex: 1 }}>
                              <ProgBar value={p.stock} max={Math.max(p.seuil * 3, 1)} color={col} />
                            </div>
                          </div>
                        </td>
                        <td>
                          <EditableCell value={p.seuil} color="var(--text2)" isCurrency={credit}
                            onSave={v => handleUpdate(p.id, 'seuil', v)} />
                        </td>
                        <td>
                          {credit
                            ? <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>
                            : <EditableCell value={p.prix} isCurrency onSave={v => handleUpdate(p.id, 'prix', v)} />
                          }
                        </td>
                        <td>{badge}</td>
                        <td>
                          <button className="btn btn-del btn-xs"
                            onClick={() => confirm('Supprimer ce produit ?') && deleteProduit(p.id)}>✕</button>
                        </td>
                      </tr>
                    ]
                  })
                })()
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Historique réappros ── */}
      <HistoriqueReappros
        reappros={reappros}
        produits={produits}
        deleteReappro={deleteReappro}
      />

      {showAdd && <ModalAddProduit onClose={() => setShowAdd(false)} onSave={handleAddProduit} />}
      {showReappro && <ModalReappro produits={produits} onClose={() => setShowReappro(false)} onSave={handleReappro} />}
    </div>
  )
}
