import { useState, useEffect, useMemo } from 'react'
import {
  collection, onSnapshot, addDoc, updateDoc,
  deleteDoc, doc, serverTimestamp, query, orderBy
} from 'firebase/firestore'
import { db, COLLECTIONS } from '../lib/firebase'

// ── Hook générique temps réel ──
export function useCollection(colName, orderField = 'createdAt') {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, colName), orderBy(orderField, 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      let docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      if (colName === 'boutique_produits') {
        docs = docs.sort((a, b) => {
          const catCmp = (a.cat || '').localeCompare(b.cat || '', 'fr')
          if (catCmp !== 0) return catCmp
          return (a.nom || '').localeCompare(b.nom || '', 'fr')
        })
      }
      setData(docs)
      setLoading(false)
  }, (err) => {
      console.error('Firebase error:', err)
      setLoading(false)
  })
    return () => unsub()
  }, [colName])

  return { data, loading }
}

export function useNotes() {
  const [notes, setNotesState] = useState({})

  useEffect(() => {
    const unsub = onSnapshot(collection(db, COLLECTIONS.NOTES), snap => {
      const data = {}
      snap.docs.forEach(d => { data[d.id] = d.data().texte || '' })
      setNotesState(data)
    })
    return () => unsub()
  }, [])

  const setNote = async (date, texte) => {
    const { setDoc } = await import('firebase/firestore')
    await setDoc(doc(db, COLLECTIONS.NOTES, date), { texte })
  }
  const deleteNote = async (date) => {
    const { deleteDoc } = await import('firebase/firestore')
    await deleteDoc(doc(db, COLLECTIONS.NOTES, date))
  }
  return { notes, setNote, deleteNote }
}

export function useReappros() {
  const { data, loading } = useCollection(COLLECTIONS.REAPPROS, 'createdAt')

  const addReappro = async (r) => {
    await addDoc(collection(db, COLLECTIONS.REAPPROS), {
      ...r, createdAt: serverTimestamp(),
    })
  }

  const deleteReappro = async (id) => {
    await deleteDoc(doc(db, COLLECTIONS.REAPPROS, id))
  }

  return { reappros: data, loading, addReappro, deleteReappro }
}

// ── Marges ──
export function useMarges() {
  const [marges, setMargesState] = useState({})
  const [loading, setLoading] = useState(true)

  const DEFAULT_MARGES = {
    'Boissons': 40, 'Eau': 70, 'Biscuits': 20,
    'Chaussures/Talons': 20, 'Sacs': 20, 'Vêtements': 20,
    'Parfums': 20, 'Masques': 20, 'Déodorants': 20,
    'Mouchoirs': 20, 'Crédit téléphonique': 0, 'Autre': 20,
  }

  useEffect(() => {
    const unsub = onSnapshot(collection(db, COLLECTIONS.MARGES), (snap) => {
      const data = { ...DEFAULT_MARGES }
      snap.docs.forEach(d => { data[d.id] = d.data().pct ?? data[d.id] ?? 20 })
      setMargesState(data)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const setMarge = async (cat, pct) => {
    const { setDoc } = await import('firebase/firestore')
    await setDoc(doc(db, COLLECTIONS.MARGES, cat), { pct: Number(pct) || 0 })
  }

  return { marges, loading, setMarge, DEFAULT_MARGES }
}

// ── Investissements ──
export function useInvestissements() {
  const { data, loading } = useCollection(COLLECTIONS.INVESTISSEMENTS, 'createdAt')

  const addInvestissement = async (inv) => {
    await addDoc(collection(db, COLLECTIONS.INVESTISSEMENTS), {
      ...inv,
      montant: Number(inv.montant) || 0,
      rembourse: 0,
      createdAt: serverTimestamp(),
    })
  }

  const updateRembourse = async (id, montant) => {
    await updateDoc(doc(db, COLLECTIONS.INVESTISSEMENTS, id), { rembourse: Number(montant) || 0 })
  }

  const deleteInvestissement = async (id) => {
    await deleteDoc(doc(db, COLLECTIONS.INVESTISSEMENTS, id))
  }

  return { investissements: data, loading, addInvestissement, updateRembourse, deleteInvestissement }
}

// ── Produits ──
export function useProduits() {
  const { data, loading } = useCollection(COLLECTIONS.PRODUITS, 'nom')
  
  const addProduit = async (produit) => {
    await addDoc(collection(db, COLLECTIONS.PRODUITS), {
      ...produit,
      stock: Number(produit.stock) || 0,
      seuil: Number(produit.seuil) || 5,
      prix: Number(produit.prix) || 0,
      createdAt: serverTimestamp(),
    })
  }

  const updateStock = async (id, newStock) => {
    await updateDoc(doc(db, COLLECTIONS.PRODUITS, id), { stock: newStock })
  }

  const updateProduit = async (id, data) => {
    await updateDoc(doc(db, COLLECTIONS.PRODUITS, id), data)
  }

  const deleteProduit = async (id) => {
    await deleteDoc(doc(db, COLLECTIONS.PRODUITS, id))
  }

  return { produits: data, loading, addProduit, updateStock, updateProduit, deleteProduit }
}

// ── Ventes ──
export function useVentes() {
  const { data, loading } = useCollection(COLLECTIONS.VENTES, 'createdAt')

  const addVente = async (vente) => {
    await addDoc(collection(db, COLLECTIONS.VENTES), {
      ...vente,
      createdAt: serverTimestamp(),
    })
  }

  const deleteVente = async (id) => {
    await deleteDoc(doc(db, COLLECTIONS.VENTES, id))
  }

  return { ventes: data, loading, addVente, deleteVente }
}
// ── Caisse / Report mensuel ──
// Report = valeur saisie à la main si elle existe, sinon caisse du mois précédent
// (report précédent + revenus − dépenses), calculée automatiquement.
export function useCaisse(ventes = [], depenses = []) {
  const [reports, setReports] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, COLLECTIONS.CAISSE), (snap) => {
      const data = {}
      snap.docs.forEach(d => { data[d.id] = d.data().report || 0 })
      setReports(data)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const setReport = async (mois, montant) => {
    const { setDoc } = await import('firebase/firestore')
    await setDoc(doc(db, COLLECTIONS.CAISSE, mois), { report: Number(montant) || 0 })
  }

  const resetReport = async (mois) => {
    await deleteDoc(doc(db, COLLECTIONS.CAISSE, mois))
  }

  const { getReport, isAuto } = useMemo(() => {
    const sums = {}
    const add = (date, key, val) => {
      const k = (date || '').slice(0, 7)
      if (!k) return
      if (!sums[k]) sums[k] = { rev: 0, dep: 0 }
      sums[k][key] += val || 0
    }
    ventes.forEach(v => add(v.date, 'rev', v.total))
    depenses.forEach(d => add(d.date, 'dep', d.montant))

    const first = [...Object.keys(sums), ...Object.keys(reports)].sort()[0]
    const prevOf = (m) => {
      const [y, mo] = m.split('-').map(Number)
      const d = new Date(y, mo - 2, 1)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    }
    const memo = {}
    const effective = (m) => {
      if (m in reports) return reports[m]
      if (!first || m <= first) return 0
      if (memo[m] !== undefined) return memo[m]
      const p = prevOf(m)
      const s = sums[p] || { rev: 0, dep: 0 }
      return (memo[m] = effective(p) + s.rev - s.dep)
    }
    return { getReport: effective, isAuto: (m) => !(m in reports) }
  }, [reports, ventes, depenses])

  return { reports, loading, setReport, resetReport, getReport, isAuto }
}

// ── Dépenses ──
export function useDepenses() {
  const { data, loading } = useCollection(COLLECTIONS.DEPENSES, 'createdAt')

  const addDepense = async (dep) => {
    await addDoc(collection(db, COLLECTIONS.DEPENSES), {
      ...dep,
      montant: Number(dep.montant) || 0,
      createdAt: serverTimestamp(),
    })
  }

  const deleteDepense = async (id) => {
    await deleteDoc(doc(db, COLLECTIONS.DEPENSES, id))
  }

  return { depenses: data, loading, addDepense, deleteDepense }
}
