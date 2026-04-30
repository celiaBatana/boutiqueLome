import { useState, useEffect } from 'react'
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
export function useCaisse() {
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

  const getReport = (mois) => reports[mois] || 0

  return { reports, loading, setReport, getReport }
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
