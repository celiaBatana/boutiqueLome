# 🛍 Ma Boutique — Application de gestion

Application React + Firebase Firestore avec mise à jour en temps réel.

## 🚀 Déploiement sur Vercel

### Étape 1 — Préparer les règles Firebase
Dans Firebase Console → Firestore Database → Règles, assure-toi d'avoir :
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```
(Pour une version sécurisée plus tard, tu peux ajouter l'authentification)

### Étape 2 — Déployer sur Vercel

**Option A — Via l'interface Vercel (la plus simple) :**
1. Va sur [vercel.com](https://vercel.com) → New Project
2. Importe ce dossier via GitHub **OU** utilise Vercel CLI
3. Framework : **Vite**
4. Build command : `npm run build`
5. Output directory : `dist`
6. Clique Deploy ✅

**Option B — Via Vercel CLI :**
```bash
npm install -g vercel
cd boutique-togo
npm install
vercel
```

### Étape 3 — C'est en ligne ! 🎉

---

## 📦 Collections Firebase utilisées

| Collection | Contenu |
|---|---|
| `boutique_produits` | Produits, stocks, prix, seuils d'alerte |
| `boutique_ventes` | Ventes enregistrées |
| `boutique_depenses` | Dépenses du mois |

> ✅ Ces collections sont **séparées** de l'hôtel bar (`hotelbar/`)

---

## 🛠 Développement local

```bash
npm install
npm run dev
```
