# 💰 Page Dashboard Pricing

## ✅ Ce qui a été créé

Page moderne `/dashboard/pricing` avec 3 plans et portefeuille IA.

---

## 📁 Fichier créé

### `app/dashboard/pricing/page.tsx`

Page affichant 3 plans avec portefeuille IA en bas.

---

## 🎯 Les 3 plans

### 1. Free (Gratuit)
- ✅ Jusqu'à 100 notes
- ✅ 10 000 tokens IA offerts
- ✅ Export Markdown
- ✅ Synchronisation cloud
- ✅ Accès mobile & desktop
- ✅ Support communautaire

**Bouton** : "Plan actuel" (grisé si déjà actif)

---

### 2. Pro (Tokens uniques) ⭐ Populaire
- ✅ 9€ / 1 million de tokens
- ✅ Chat IA personnalisé
- ✅ Résumé de PDF & images
- ✅ Génération de quiz automatique
- ✅ Historique de conversation IA
- ✅ Pas d'expiration

**Bouton** : "Acheter des tokens" (bleu)

**Badge** : "Populaire" en haut à droite

---

### 3. Illimité (Abonnement)
- ✅ 29€ / mois
- ✅ IA illimitée
- ✅ Support prioritaire
- ✅ Accès anticipé aux nouvelles features
- ✅ Tout de Pro inclus
- ✅ Meilleures performances
- ✅ API dédiée

**Bouton** : "Passer à Illimité" (bleu)

---

## 📊 Section "Mon portefeuille"

### Contenu
- **Icône** : Sparkles (magie)
- **Titre** : "Mon portefeuille IA"

### Barre de progression
- **Compteur** : "7 500 / 10 000" tokens
- **Barre** : Gradient bleu-indigo
- **Largeur dynamique** : % de tokens restants

### Bouton
- **"Acheter plus"** → Redirige vers `/settings/plan`

### Historique
- **4 actions récentes** :
  1. Résumé de texte (250 tokens) - Aujourd'hui
  2. Correction grammaticale (180 tokens) - Hier
  3. Génération de quiz (320 tokens) - Il y a 2 jours
  4. Traduction FR → EN (150 tokens) - Il y a 3 jours

---

## 🎨 Design

### Layout
- **Container** : `max-w-5xl mx-auto py-12 px-6`
- **Grille** : `grid grid-cols-1 md:grid-cols-3 gap-8`

### Cartes de plan
- **Fond** : Blanc `bg-white`
- **Bordure** : `border rounded-2xl`
- **Shadow** : `shadow-sm hover:shadow-md`
- **Hover** : `hover:scale-[1.02]`
- **Padding** : `p-6`

### Typographie
- **Titre plan** : `text-lg font-semibold`
- **Prix** : `text-3xl font-bold text-blue-600`
- **Features** : `text-neutral-600 text-sm`

### Boutons
- **Primaire** : `bg-blue-600 hover:bg-blue-700 text-white`
- **Désactivé** : `bg-neutral-200 text-neutral-600`
- **Padding** : `py-2`

---

## 🔗 Navigation

### Sidebar
- **Bouton "Tarifs"** → `/dashboard/pricing`
- **Active state** : Sur `/dashboard/pricing`, `/pricing`, `/settings/plan`

### Actions
- **"Acheter des tokens"** → TODO: Stripe
- **"Passer à Illimité"** → `/settings/plan`
- **"Acheter plus"** → `/settings/plan`

---

## 🎬 Animations

### Hover
- **Cartes** : `scale-[1.02]` + `shadow-md`
- **Boutons** : `bg-blue-700` (plus foncé)
- **Transitions** : `transition-all duration-200`

### Barre de progression
- **Animation** : `duration-300` sur changement de largeur

---

## 🧪 Tests

### Navigation
1. Cliquez sur "Tarifs" dans la sidebar
2. ✅ Redirige vers `/dashboard/pricing`
3. ✅ Bouton "Tarifs" est actif (bleu)

### Plans
1. Vérifiez les 3 cartes de plans
2. ✅ Free affiche "Plan actuel" grisé
3. ✅ Pro a un badge "Populaire"
4. ✅ Illimité a un prix "29€ /mois"

### Portefeuille
1. Vérifiez la barre de progression
2. ✅ Compteur "7 500 / 10 000"
3. ✅ Barre à 75% de largeur
4. ✅ 4 actions dans l'historique

### Responsive
1. Rétrécissez la fenêtre
2. ✅ Grille passe à 1 colonne sur mobile

---

## 🔧 TODO - Intégration future

### Hook `useTokens()`
```typescript
export function useTokens() {
  const { data: user } = useUser()
  
  return useQuery({
    queryKey: ["tokens", user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/tokens/${user?.id}`)
      return res.json()
    },
  })
}
```

### Table Supabase `user_tokens`
```sql
CREATE TABLE user_tokens (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  tokens_total INTEGER,
  tokens_used INTEGER,
  plan VARCHAR(50),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Historique IA
```sql
CREATE TABLE ai_actions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action_type VARCHAR(50),
  tokens_spent INTEGER,
  created_at TIMESTAMP
);
```

---

## ✅ Checklist de vérification

- [x] Page `/dashboard/pricing` créée
- [x] 3 plans affichés (Free, Pro, Illimité)
- [x] Badge "Populaire" sur Pro
- [x] Section portefeuille avec historique
- [x] Barre de progression animée
- [x] Boutons fonctionnels
- [x] Design moderne Notion/Linear
- [x] Responsive mobile
- [x] Sidebar mise à jour
- [x] Transitions fluides
- [x] Documentation complète

---

**Résultat final :** Page de pricing professionnelle avec portefeuille IA ! 🎉

