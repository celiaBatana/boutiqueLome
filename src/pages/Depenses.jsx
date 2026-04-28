import { useState } from 'react'
import { useDepenses } from '../hooks/useFirebase'
import { StatCard, SCard, Spinner, Empty, Field } from '../components/UI'
import { fmt, today, currentMonth, CAT_DEPENSES } from '../lib/utils'

export default function Depenses() {
  const { depenses, loading, addDepense, deleteDepense } = useDepenses()
  const [desc, setDesc]   = useState('')
  const [mont, setMont]   = useState('')
  const [cat, setCat]     = useState('Loyer')
  const [saving, setSaving] = useState(false)

  const m  = currentMonth()
  const md = depenses.filter(d => (d.date || '').startsWith(m))
  const total = md.reduce((a, d) => a + (d.montant || 0), 0)

  const catMap = {}
  md.forEach(d => { catMap[d.cat] = (catMap[d.cat] || 0) + (d.montant || 0) })
  const cats = Object.entries(catMap).sort((a, b) => b[1] - a[1])

  const handleAdd = async () => {
    if (!desc.trim() || !mont) return alert('Remplissez la description et le montant.')
    setSaving(true)
    await addDepense({ date: today(), desc, cat, montant: Number(mont) })
    setDesc(''); setMont('')
    setSaving(false)
  }

  const COLORS = ['c0','c1','c2','c3','c4']

  if (loading) return <Spinner />

  return (
    <div>
      <div className="topbar">
        <div className="page-title">Dépenses 💸</div>
      </div>

      <SCard title="Nouvelle dépense">
        <div className="form-grid">
          <Field label="Description">
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ex: Loyer, transport…" />
          </Field>
          <Field label="Montant (FCFA)">
            <input type="number" value={mont} onChange={e => setMont(e.target.value)} placeholder="0" />
          </Field>
          <Field label="Catégorie">
            <select value={cat} onChange={e => setCat(e.target.value)}>
              {CAT_DEPENSES.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <button className="btn btn-em" onClick={handleAdd} disabled={saving}>
          {saving ? '…' : '✚ Ajouter'}
        </button>
      </SCard>

      {/* Stats par catégorie */}
      <div className="stat-grid">
        <StatCard colorClass="c0" icon="💸" label="Total ce mois"
          value={fmt(total)} sub={`FCFA · ${md.length} entrée(s)`} />
        {cats.map(([c, v], i) => (
          <StatCard key={c} colorClass={COLORS[(i + 1) % COLORS.length]}
            label={c} value={fmt(v)} sub="FCFA" />
        ))}
      </div>

      {/* Table */}
      <div className="scard" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="tw">
          <table>
            <thead>
              <tr><th>Date</th><th>Description</th><th>Catégorie</th><th>Montant</th><th></th></tr>
            </thead>
            <tbody>
              {md.length === 0
                ? <tr><td colSpan={5}><Empty icon="💸" text="Aucune dépense ce mois" /></td></tr>
                : md.map(d => (
                  <tr key={d.id}>
                    <td style={{ color: 'var(--text3)' }}>{d.date}</td>
                    <td><strong>{d.desc}</strong></td>
                    <td><span className="badge b-gold">{d.cat}</span></td>
                    <td><span style={{ color: 'var(--coral)', fontWeight: 700 }}>{fmt(d.montant)} FCFA</span></td>
                    <td>
                      <button className="btn btn-del btn-xs"
                        onClick={() => confirm('Supprimer ?') && deleteDepense(d.id)}>
                        ✕
                      </button>
                    </td>
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
