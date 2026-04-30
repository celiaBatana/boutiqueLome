import { useState, useMemo } from 'react'
import { useDepenses, useCaisse, useVentes } from '../hooks/useFirebase'
import { StatCard, SCard, Spinner, Empty, Field } from '../components/UI'
import { fmt, today, currentMonth, monthKey, fmtMonth, CAT_DEPENSES } from '../lib/utils'

export default function Depenses() {
  const { depenses, loading, addDepense, deleteDepense } = useDepenses()
  const { ventes } = useVentes()
  const { getReport, setReport } = useCaisse()

  const [desc, setDesc]             = useState('')
  const [mont, setMont]             = useState('')
  const [cat, setCat]               = useState('Loyer')
  const [date, setDate]             = useState(today())
  const [saving, setSaving]         = useState(false)
  const [editReport, setEditReport] = useState(false)
  const [reportVal, setReportVal]   = useState('')

  // Filtre
  const [filterMode, setFilterMode] = useState('mois')
  const [filterMois, setFilterMois] = useState(currentMonth())

  const m = currentMonth()

  // Mois disponibles
  const moisDispos = useMemo(() => {
    const future = []
    for (let i = 1; i <= 3; i++) {
      const d = new Date()
      d.setMonth(d.getMonth() + i)
      future.push(d.toISOString().slice(0, 7))
    }
    const s = new Set([...depenses.map(d => monthKey(d.date || '')), m, ...future])
    return [...s].filter(Boolean).sort().reverse()
  }, [depenses])

  // Dépenses filtrées
  const depFiltrees = useMemo(() => {
    if (filterMode === 'tout') return depenses
    return depenses.filter(d => (d.date || '').startsWith(filterMois))
  }, [depenses, filterMode, filterMois])

  // Stats toujours sur le mois en cours
  const md      = depenses.filter(d => (d.date || '').startsWith(m))
  const mv      = ventes.filter(v => (v.date || '').startsWith(m))
  const total   = md.reduce((a, d) => a + (d.montant || 0), 0)
  const revenus = mv.reduce((a, v) => a + (v.total || 0), 0)
  const report  = getReport(m)
  const caisse  = report + revenus - total

  // Dépenses planifiées (dates futures)
  const t = today()
  const planifiees = depenses.filter(d => (d.date || '') > t)

  const catMap = {}
  md.forEach(d => { catMap[d.cat] = (catMap[d.cat] || 0) + (d.montant || 0) })
  const cats = Object.entries(catMap).sort((a, b) => b[1] - a[1])

  const totalFiltre = depFiltrees.reduce((a, d) => a + (d.montant || 0), 0)

  const handleAdd = async () => {
    if (!desc.trim() || !mont) return alert('Remplissez la description et le montant.')
    setSaving(true)
    await addDepense({ date, desc, cat, montant: Number(mont) })
    setDesc(''); setMont('')
    setSaving(false)
  }

  const handleSaveReport = async () => {
    await setReport(m, reportVal)
    setEditReport(false)
  }

  const COLORS = ['c0', 'c1', 'c2', 'c3', 'c4']

  const fmtDate = (d) => {
    if (!d) return ''
    if (d === t) return "Aujourd'hui"
    if (d > t) return `📅 ${d.slice(8,10)}/${d.slice(5,7)}/${d.slice(0,4)}`
    return `${d.slice(8,10)}/${d.slice(5,7)}`
  }

  if (loading) return <Spinner />

  return (
    <div>
      <div className="topbar">
        <div className="page-title">Dépenses 💸</div>
      </div>

      {/* ── Alerte dépenses planifiées ── */}
      {planifiees.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg,rgba(14,165,233,.07),rgba(14,165,233,.03))',
          border: '1.5px solid rgba(14,165,233,.25)',
          borderRadius: 12, padding: '12px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 18 }}>📅</span>
          <div style={{ flex: 1 }}>
            <strong style={{ color: 'var(--sky)', fontSize: 13 }}>
              {planifiees.length} dépense{planifiees.length > 1 ? 's' : ''} planifiée{planifiees.length > 1 ? 's' : ''}
            </strong>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {planifiees.map(d => (
                <span key={d.id} style={{ background: 'rgba(14,165,233,.1)', color: 'var(--sky)', border: '1px solid rgba(14,165,233,.2)', borderRadius: 99, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
                  {d.desc} — {fmt(d.montant)} FCFA ({d.date.slice(8,10)}/{d.date.slice(5,7)})
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Report + Caisse ── */}
      <div style={{
        background: 'linear-gradient(135deg,#fff8e1,#fffde7)',
        border: '1.5px solid rgba(240,165,0,.3)',
        borderRadius: 16, padding: '16px 20px', marginBottom: 18,
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
                type="number" value={reportVal}
                onChange={e => setReportVal(e.target.value)}
                placeholder="Montant en FCFA" autoFocus
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
        <div style={{ textAlign: 'right', minWidth: 160 }}>
          <div style={{ fontSize: 10, color: '#8a5c00', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>
            Caisse ce mois
          </div>
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

      {/* ── Formulaire ── */}
      <SCard title="Nouvelle dépense">
        <div className="form-grid">
          <Field label="Date">
            <input
              type="date" value={date}
              onChange={e => setDate(e.target.value)}
            />
          </Field>
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
        {date > t && (
          <div style={{ marginBottom: 12, padding: '8px 12px', background: 'rgba(14,165,233,.08)', border: '1px solid rgba(14,165,233,.2)', borderRadius: 8, fontSize: 12, color: 'var(--sky)', fontWeight: 600 }}>
            📅 Cette dépense sera planifiée pour le {date.slice(8,10)}/{date.slice(5,7)}/{date.slice(0,4)}
          </div>
        )}
        <button className="btn btn-em" onClick={handleAdd} disabled={saving}>
          {saving ? '…' : date > t ? '📅 Planifier' : '✚ Ajouter'}
        </button>
      </SCard>

      {/* ── Stats mois en cours ── */}
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
      <div className="scard">
        {/* Filtres */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="scard-title" style={{ flex: 1 }}>Historique</div>
          <button className={`btn btn-sm ${filterMode === 'mois' ? 'btn-em' : 'btn-outline'}`}
            onClick={() => setFilterMode('mois')}>📅 Par mois</button>
          <button className={`btn btn-sm ${filterMode === 'tout' ? 'btn-em' : 'btn-outline'}`}
            onClick={() => setFilterMode('tout')}>📋 Tout voir</button>
          {filterMode === 'mois' && (
            <select value={filterMois} onChange={e => setFilterMois(e.target.value)}
              style={{ padding: '6px 30px 6px 12px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg)', fontFamily: 'Lexend,sans-serif', fontSize: 13, color: 'var(--text)' }}>
              {moisDispos.map(m => <option key={m} value={m}>{fmtMonth(m)}</option>)}
            </select>
          )}
          {depFiltrees.length > 0 && (
            <span style={{ marginLeft: 'auto', fontFamily: 'Nunito,sans-serif', fontSize: 14, fontWeight: 800, color: 'var(--coral)' }}>
              {fmt(totalFiltre)} FCFA
            </span>
          )}
        </div>

        <div className="tw">
          <table>
            <thead>
              <tr><th>Date</th><th>Description</th><th>Catégorie</th><th>Montant</th><th></th></tr>
            </thead>
            <tbody>
              {depFiltrees.length === 0
                ? <tr><td colSpan={5}><Empty icon="💸" text="Aucune dépense pour cette période" /></td></tr>
                : depFiltrees.slice().sort((a, b) => (a.date || '').localeCompare(b.date || '')).map(d => {
                  const isFuture = (d.date || '') > t
                  return (
                    <tr key={d.id} style={{ background: isFuture ? 'rgba(14,165,233,.04)' : 'transparent' }}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: isFuture ? 'var(--sky)' : 'var(--text3)' }}>
                          {fmtDate(d.date)}
                        </span>
                      </td>
                      <td>
                        <strong>{d.desc}</strong>
                        {isFuture && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--sky)', fontWeight: 600 }}>Planifiée</span>}
                      </td>
                      <td><span className="badge b-gold">{d.cat}</span></td>
                      <td><span style={{ color: isFuture ? 'var(--sky)' : 'var(--coral)', fontWeight: 700 }}>{fmt(d.montant)} FCFA</span></td>
                      <td>
                        <button className="btn btn-del btn-xs"
                          onClick={() => confirm('Supprimer ?') && deleteDepense(d.id)}>
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
    </div>
  )
}
