import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

const DialogCtx = createContext(null)

export function useDialog() {
  return useContext(DialogCtx)
}

// Remplace window.confirm / window.alert par de jolies fenêtres.
//   const { confirm, alert } = useDialog()
//   if (!(await confirm('Supprimer ?'))) return
//   await alert('Sélectionnez un produit.')
export function DialogProvider({ children }) {
  const [dlg, setDlg] = useState(null)
  const resolver = useRef(null)

  const open = useCallback((cfg) => new Promise(resolve => {
    resolver.current = resolve
    setDlg(cfg)
  }), [])

  const close = (val) => {
    setDlg(null)
    resolver.current?.(val)
    resolver.current = null
  }

  const confirm = useCallback((message, opts = {}) =>
    open({ kind: 'confirm', message, ...opts }), [open])
  const alert = useCallback((message, opts = {}) =>
    open({ kind: 'alert', message, ...opts }), [open])

  useEffect(() => {
    if (!dlg) return
    const onKey = (e) => {
      if (e.key === 'Escape') close(dlg.kind === 'confirm' ? false : undefined)
      if (e.key === 'Enter') close(dlg.kind === 'confirm' ? true : undefined)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dlg])

  const isConfirm = dlg?.kind === 'confirm'

  return (
    <DialogCtx.Provider value={{ confirm, alert }}>
      {children}
      <div className={`overlay ${dlg ? 'open' : ''}`} onClick={() => dlg && close(isConfirm ? false : undefined)}>
        {dlg && (
          <div className="modal dialog" onClick={e => e.stopPropagation()}>
            <div className="dialog-icon">{dlg.icon || (isConfirm ? '🗑️' : '💡')}</div>
            <div className="dialog-title">{dlg.title || (isConfirm ? 'Confirmer' : 'Information')}</div>
            <div className="dialog-msg">{dlg.message}</div>
            <div className="modal-foot dialog-foot">
              {isConfirm && <button className="btn btn-outline" onClick={() => close(false)}>Annuler</button>}
              <button className={`btn ${isConfirm ? 'btn-del-solid' : 'btn-em'}`} autoFocus onClick={() => close(isConfirm ? true : undefined)}>
                {dlg.okLabel || (isConfirm ? 'Supprimer' : 'OK')}
              </button>
            </div>
          </div>
        )}
      </div>
    </DialogCtx.Provider>
  )
}
