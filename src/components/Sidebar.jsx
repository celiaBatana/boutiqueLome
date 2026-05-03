import { useProduits } from '../hooks/useFirebase'

const NAV = [
  { id: 'dashboard',  icon: '📊', label: 'Tableau de bord', group: 'Principal' },
  { id: 'ventes',     icon: '💰', label: 'Ventes',           group: null },
  { id: 'stocks',     icon: '📦', label: 'Stocks',           group: 'Gestion' },
  { id: 'depenses',   icon: '💸', label: 'Dépenses',         group: null },
  { id: 'historique', icon: '📅', label: 'Historique',       group: null },
  { id: 'investissements', icon: '💡', label: 'Investissements', group: null },
  { id: 'marges', icon: '💹', label: 'Marges', group: null },
]

export default function Sidebar({ page, setPage, open, onClose }) {
  const { produits } = useProduits()
  const lowCount = produits.filter(p => p.stock <= p.seuil).length

  return (
    <>
      <div className={`bg-ov ${open ? 'open' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-orb">🛍</div>
          <div>
            <div className="brand-name">Ma Boutique</div>
            <div className="brand-city">Lomé · Togo 🇹🇬</div>
          </div>
        </div>

        {NAV.map(({ id, icon, label, group }) => (
          <div key={id}>
            {group && <div className="nav-group">{group}</div>}
            <button
              className={`nav-btn ${page === id ? 'active' : ''}`}
              onClick={() => { setPage(id); onClose() }}
            >
              <span className="ni">{icon}</span>
              {label}
            </button>
          </div>
        ))}

        <div className="sidebar-foot">
          <div className="sb-date">
            {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <span className="live-dot">Temps réel</span>
          </div>
          {lowCount > 0 && (
            <div className="sb-badge">⚠ {lowCount} alerte{lowCount > 1 ? 's' : ''}</div>
          )}
        </div>
      </aside>
    </>
  )
}
