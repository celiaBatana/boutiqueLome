export const fmt = (n) => Number(n || 0).toLocaleString('fr-FR')
export const today = () => new Date().toISOString().slice(0, 10)
export const nowTime = () => new Date().toTimeString().slice(0, 5)
export const monthKey = (d) => d?.slice(0, 7) || ''
export const currentMonth = () => today().slice(0, 7)

export const MONTHS = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
]
export const fmtMonth = (m) => {
  if (!m) return ''
  const [y, mo] = m.split('-')
  return MONTHS[+mo - 1] + ' ' + y
}

export const GRAD_COLORS = [
  'linear-gradient(135deg,#0ea56b,#12e68c)',
  'linear-gradient(135deg,#f0a500,#ffd44a)',
  'linear-gradient(135deg,#ff5a5f,#ff8f70)',
  'linear-gradient(135deg,#6366f1,#a78bfa)',
  'linear-gradient(135deg,#0ea5e9,#67e8f9)',
  'linear-gradient(135deg,#ec4899,#f9a8d4)',
]
export const CHART_COLORS = ['#0ea56b','#f0a500','#6366f1','#ff5a5f','#0ea5e9','#ec4899']
export const MEDALS = ['🥇','🥈','🥉']

export const CAT_PRODUITS = [
  'Boissons','Biscuits','Eau','Chaussures/Talons',
  'Sacs','Vêtements','Parfums','Masques','Déodorants','Mouchoirs',
  'Crédit téléphonique','Autre'
]
export const CAT_DEPENSES = [
  'Loyer','Transport','Électricité/Eau','Réapprovisionnement','Personnel','Autre'
]
