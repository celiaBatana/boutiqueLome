import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyDBVuYPQCbXNo6Z12Ml2zcWwFiG2sz34YI",
  authDomain: "hotelbar-df17e.firebaseapp.com",
  projectId: "hotelbar-df17e",
  storageBucket: "hotelbar-df17e.firebasestorage.app",
  messagingSenderId: "929058001004",
  appId: "1:929058001004:web:746801cdfbfa709ecf8849",
  measurementId: "G-4XRW4E7LEB"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)

// Collections boutique — séparées de l'hôtel bar
// hotelbar/ → categories, products, sales (inchangé)
// boutique/ → produits, ventes, depenses (nouveau)
export const COLLECTIONS = {
  PRODUITS:  'boutique_produits',
  VENTES:    'boutique_ventes',
  DEPENSES:  'boutique_depenses',
  CAISSE:    'boutique_caisse',
}
