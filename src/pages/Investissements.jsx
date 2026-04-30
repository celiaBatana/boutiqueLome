import { useState } from 'react'
import { useInvestissements } from '../hooks/useFirebase'
import { SCard, Spinner, Empty, Field } from '../components/UI'
import { fmt, today, currentMonth, monthKey, fmtMonth } from '../lib/utils'

const CAT_INV = [
  'Marchandises', 'Loyer', 'Salaire', 'Équipement', 'Transport', 'Autre'
]

export default function Investissements() {
  const { investissements, loading, addInvestissement, updateRembourse, deleteInvestissement } = useInvestissements()

  const [desc, setDesc]     = useState('')
  const [mont, setMont]     = useState('')
  const [cat, setCat]       = useState('Marchandises')
  const [date, setDate]     = useState(today())
  const [saving, setSaving] = useState(false)

  // Filtre par mois
  const moisDispos = [...new Set([
    ...investissements.map(i => monthKey(i.date || '')),
    currentMonth()
  ])].filter(Boolean).sort().reverse()

  const [moisSel, setMoisSel] = useState(currentMonth())
  const [filterAll, setFilterAll] = useState(false)

  const liste = filterAll
    ? investissements
    : investissements.filter(i => (i.date || '').startsWith(moisSel))

  // Stats globales
  const totalInvesti    = investissements.reduce((a, i) => a + (i.montant || 0), 0)
  const totalRembourse  = investissements.reduce((a, i) => a + (i.rembourse || 0), 0)
  const resteRecuperer  = totalInvesti - totalRembourse

  // Stats du filtre courant
  const totalFiltreInv  = liste.reduce((a, i) => a + (i.montant || 0), 0)
  const totalFiltreRemb = liste.reduce((a, i) => a + (i.rembourse || 0), 0)

  const handleAdd = async () => {
    if (!desc.trim() || !mont) return alert('Remplissez la description et le montant.')
    setSaving(true)
    await addInvestissement({ date, desc, cat, montant: Number(mont) })
    setDesc(''); setMont('')
    setSaving(false)
  }

  if (loading) return <Spinner />

  return (
    <div>
      <div className="topbar">
        <div className="page-title">Investissements 💡</div>
      </div>

      {/* ── Résumé global ── */}
      <div style={{
        background: 'linear-gradient(135deg,#eff6ff,#dbeafe)',
        border: '1.5px solid rgba(37,99,235,.2)',
        borderRadius: 16, padding: '16px 20px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        boxShadow: '0 4px 16px rgba(37,99,235,.08)',
      }}>
        <div style={{ fontSize: 28 }}>💡</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
            Total investi de votre poche
          </div>
          <div style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 900, fontSize: 26, color: '#1e40af' }}>
            {fmt(totalInvesti)} FCFA
          </div>
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#1e40af', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Remboursé</div>
            <div style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 900, fontSize: 18, color: 'var(--em-d)' }}>
              {fmt(totalRembourse)} FCFA
            </div>
          </div>
          <div style={{ width: 1, background: 'rgba(37,99,235,.2)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#1e40af', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>À récupérer</div>
            <div style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 900, fontSize: 18, color: resteRecuperer > 0 ? 'var(--coral)' : 'var(--em-d)' }}>
              {fmt(resteRecuperer)} FCFA
            </div>
          </div>
        </div>
      </div>

      {/* ── Formulaire ── */}
      <SCard title="Nouvel investissement">
        <div className="form-grid">
          <Field label="Date">
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </Field>
          <Field label="Description">
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ex: Achat marchandises avril" />
          </Field>
          <Field label="Montant (FCFA)">
            <input type="number" value={mont} onChange={e => setMont(e.target.value)} placeholder="0" />
          </Field>
          <Field label="Catégorie">
            <select value={cat} onChange={e => setCat(e.target.value)}>
              {CAT_INV.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <button className="btn btn-em" onClick={handleAdd} disabled={saving}>
          {saving ? '…' : '✚ Ajouter'}
        </button>
      </SCard>

      {/* ── Liste ── */}
      <div className="scard">
        {/* Filtres */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="scard-title" style={{ flex: 1 }}>Historique</div>
          <button
            className={`btn btn-sm ${!filterAll ? 'btn-em' : 'btn-outline'}`}
            onClick={() => setFilterAll(false)}
          >📅 Par mois</button>
          <button
            className={`btn btn-sm ${filterAll ? 'btn-em' : 'btn-outline'}`}
            onClick={() => setFilterAll(true)}
          >📋 Tout voir</button>
          {!filterAll && (
            <select value={moisSel} onChange={e => setMoisSel(e.target.value)}
              style={{ padding: '6px 30px 6px 12px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg)', fontFamily: 'Lexend,sans-serif', fontSize: 13, color: 'var(--text)' }}>
              {moisDispos.map(m => <option key={m} value={m}>{fmtMonth(m)}</option>)}
            </select>
          )}
          {liste.length > 0 && (
            <span style={{ marginLeft: 'auto', fontFamily: 'Nunito,sans-serif', fontSize: 13, fontWeight: 800, color: '#1e40af' }}>
              {fmt(totalFiltreInv)} FCFA investi
            </span>
          )}
        </div>

        {/* Tableau */}
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Catégorie</th>
                <th>Montant</th>
                <th>Remboursé</th>
                <th>Reste</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {liste.length === 0
                ? <tr><td colSpan={7}><Empty icon="💡" text="Aucun investissement pour cette période" /></td></tr>
                : liste.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(inv => {
                  const reste = (inv.montant || 0) - (inv.rembourse || 0)
                  return (
                    <tr key={inv.id}>
                      <td style={{ color: 'var(--text3)', whiteSpace: 'nowrap', fontSize: 12 }}>
                        {inv.date.slice(8,10)}/{inv.date.slice(5,7)}/{inv.date.slice(0,4)}
                      </td>
                      <td><strong>{inv.desc}</strong></td>
                      <td>
                        <span style={{
                          background: 'rgba(37,99,235,.1)', color: '#1e40af',
                          border: '1px solid rgba(37,99,235,.2)',
                          borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 700
                        }}>
                          {inv.cat}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: '#1e40af', fontWeight: 700 }}>
                          {fmt(inv.montant)} FCFA
                        </span>
                      </td>
                      <td>
                        {/* Champ remboursé éditable */}
                        <RembourseCell
                          value={inv.rembourse || 0}
                          max={inv.montant || 0}
                          onSave={v => updateRembourse(inv.id, v)}
                        />
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: reste <= 0 ? 'var(--em-d)' : 'var(--coral)' }}>
                          {reste <= 0 ? '✅ Soldé' : fmt(reste) + ' FCFA'}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-del btn-xs"
                          onClick={() => confirm('Supprimer cet investissement ?') && deleteInvestissement(inv.id)}>
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

        {/* Total filtre */}
        {liste.length > 0 && (
          <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--bg)', borderRadius: 10, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>
              Total investi : <strong style={{ color: '#1e40af' }}>{fmt(totalFiltreInv)} FCFA</strong>
            </span>
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>
              Remboursé : <strong style={{ color: 'var(--em-d)' }}>{fmt(totalFiltreRemb)} FCFA</strong>
            </span>
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>
              Reste : <strong style={{ color: 'var(--coral)' }}>{fmt(totalFiltreInv - totalFiltreRemb)} FCFA</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Cellule remboursé éditable ──
function RembourseCell({ value, max, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal]         = useState(value)

  const commit = () => {
    setEditing(false)
    const n = Math.min(Number(val) || 0, max)
    if (n !== value) onSave(n)
  }

  if (editing) {
    return (
      <input
        type="number" value={val} autoFocus
        min={0} max={max}
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        style={{ width: 90, padding: '4px 8px', borderRadius: 7, border: '1.5px solid var(--em)', background: '#fff', fontFamily: 'Lexend,sans-serif', fontSize: 13, outline: 'none' }}
      />
    )
  }

  return (
    <span
      onClick={() => { setVal(value); setEditing(true) }}
      title="Cliquer pour modifier"
      style={{
        cursor: 'pointer', fontWeight: 600,
        color: value >= max ? 'var(--em-d)' : value > 0 ? 'var(--text2)' : 'var(--text3)',
        borderBottom: '1.5px dashed var(--border)', paddingBottom: 1, fontSize: 13
      }}
    >
      {value > 0 ? fmt(value) + ' FCFA' : '—'}
    </span>
  )
}
