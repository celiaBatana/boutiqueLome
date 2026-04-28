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
      setData(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    }, (err) => {
      console.error('Firebase error:', err)
      setLoading(false)
    })
    return () => unsub()
  }, [colName])

  return { data, loading }
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
