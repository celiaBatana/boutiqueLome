import { useState } from 'react'
import { useDepenses, useCaisse, useVentes } from '../hooks/useFirebase'
import { StatCard, SCard, Spinner, Empty, Field } from '../components/UI'
import { fmt, today, currentMonth, CAT_DEPENSES } from '../lib/utils'

export default function Depenses() {
  const { depenses, loading, addDepense, deleteDepense } = useDepenses()
  const { ventes } = useVentes()
  const { getReport, setReport } = useCaisse()

  const [desc, setDesc]             = useState('')
  const [mont, setMont]             = useState('')
  const [cat, setCat]               = useState('Loyer')
  const [saving, setSaving]         = useState(false)
  const [editReport, setEditReport] = useState(false)
  const [reportVal, setReportVal]   = useState('')

  const m      = currentMonth()
  const md     = depenses.filter(d => (d.date || '').startsWith(m))
  const mv     = ventes.filter(v => (v.date || '').startsWith(m))
  const total  = md.reduce((a, d) => a + (d.montant || 0), 0)
  const revenus = mv.reduce((a, v) => a + (v.total || 0), 0)
  const report = getReport(m)
  const caisse = report + revenus - total

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

  const handleSaveReport = async () => {
    await setReport(m, reportVal)
    setEditReport(false)
  }

  const COLORS = ['c0', 'c1', 'c2', 'c3', 'c4']

  if (loading) return <Spinner />

  return (
    <div>
      <div className="topbar">
        <div className="page-title">Dépenses 💸</div>
      </div>

      {/* ── Report + Caisse ── */}
      <div style={{
        background: 'linear-gradient(135deg,#fff8e1,#fffde7)',
        border: '1.5px solid rgba(240,165,0,.3)',
        borderRadius: 16, padding: '16px 20px',
        marginBottom: 18,
        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
        boxShadow: '0 4px 16px rgba(240,165,0,.1)',
      }}>
        <div style={{ fontSize: 28 }}>💼</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 800, fontSize: 13, color: '#8a5c00', marginBottom: 4 }}>
            Report du mois précédent
          </div>
          {editReport ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="number"
                value={reportVal}
                onChange={e => setReportVal(e.target.value)}
                placeholder="Montant en FCFA"
                autoFocus
                style={{ width: 160, padding: '6px 10px', borderRadius: 8, border: '1.5px solid #f0a500', fontFamily: 'Lexend,sans-serif', fontSize: 13 }}
              />
              <button className="btn btn-gold btn-sm" onClick={handleSaveReport}>✔ Enregistrer</button>
              <button className="btn btn-outline btn-sm" onClick={() => setEditReport(false)}>Annuler</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 900, fontSize: 22, color: report > 0 ? '#8a5c00' : 'var(--text3)' }}>
                {report > 0 ? fmt(report) + ' FCFA' : 'Non défini'}
              </span>
              <button
                className="btn btn-sm"
                onClick={() => { setReportVal(report); setEditReport(true) }}
                style={{ background: 'rgba(240,165,0,.15)', color: '#8a5c00', border: '1px solid rgba(240,165,0,.3)', fontSize: 11 }}
              >
                ✏️ Modifier
              </button>
            </div>
          )}
        </div>

        {/* Détail caisse */}
        <div style={{ textAlign: 'right', minWidth: 160 }}>
          <div style={{ fontSize: 10, color: '#8a5c00', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>
            Caisse ce mois
          </div>
          {/* Détail du calcul */}
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>
            Report : <strong style={{ color: '#8a5c00' }}>{fmt(report)} FCFA</strong>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>
            + Revenus : <strong style={{ color: 'var(--em-d)' }}>{fmt(revenus)} FCFA</strong>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>
            − Dépenses : <strong style={{ color: 'var(--coral)' }}>{fmt(total)} FCFA</strong>
          </div>
          <div style={{ height: 1, background: 'rgba(240,165,0,.3)', marginBottom: 6 }} />
          <div style={{ fontFamily: 'Nunito,sans-serif', fontWeight: 900, fontSize: 22, color: caisse >= 0 ? 'var(--em-d)' : 'var(--coral)' }}>
            {fmt(caisse)} FCFA
          </div>
        </div>
      </div>

      {/* ── Formulaire nouvelle dépense ── */}
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

      {/* ── Stats par catégorie ── */}
      <div className="stat-grid">
        <StatCard colorClass="c0" icon="💸" label="Total dépenses ce mois"
          value={fmt(total)} sub={`FCFA · ${md.length} entrée(s)`} />
        <StatCard colorClass="c1" icon="📈" label="Revenus ce mois"
          value={fmt(revenus)} sub="FCFA" />
        <StatCard colorClass={caisse >= 0 ? 'c3' : 'c2'} icon="💼" label="Caisse"
          value={fmt(caisse)} sub="report + revenus - dépenses" />
        {cats.map(([c, v], i) => (
          <StatCard key={c} colorClass={COLORS[(i + 3) % COLORS.length]}
            label={c} value={fmt(v)} sub="FCFA" />
        ))}
      </div>

      {/* ── Table des dépenses ── */}
      <div className="scard" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="tw">
          <table>
            <thead>
              <tr><th>Date</th><th>Description</th><th>Catégorie</th><th>Montant</th><th></th></tr>
            </thead>
            <tbody>
              {md.length === 0
                ? <tr><td colSpan={5}><Empty icon="💸" text="Aucune dépense ce mois" /></td></tr>
                : md.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(d => (
                  <tr key={d.id}>
                    <td style={{ color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                      {d.date.slice(8,10)}/{d.date.slice(5,7)}
                    </td>
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
