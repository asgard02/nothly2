# Optimisations de performance des Flashcards

## 🚀 Problème

L'utilisateur signalait des lags ("il y a des lag verifie les charges"). Les animations de retournement 3D (flip) étaient saccadées.

## 🔍 Causes identifiées

1. **Rendu lourd pendant l'animation** : Le composant `MarkdownRenderer` était entièrement recalculé à chaque frame de l'animation de flip car le parent (`FlashcardViewer`) se re-rendait (changement d'état `isFlipped`).
2. **Gradients complexes** : Les arrière-plans utilisaient des dégradés CSS (gradients) qui sont coûteux à "peindre" (paint) pour le navigateur, surtout lors de transformations 3D `rotateY`.

## ✅ Optimisations appliquées

### 1. Mémoïsation du Rendu (`MarkdownRenderer`)

Utilisation de `React.memo` pour empêcher le re-rendu du composant de contenu si les propriétés (le texte) ne changent pas.

**Avant :**

```tsx
export default function MarkdownRenderer(...) { ... }
// Se re-rend à chaque fois que le parent change, même si le texte est identique
```

**Après :**

```tsx
function MarkdownRenderer(...) { ... }
export default React.memo(MarkdownRenderer)
// Ne se re-rend QUE si le texte change
```

### 2. Simplification des Gradients

Remplacement des dégradés CSS par des couleurs unies solides. Cela réduit drastiquement la charge GPU/CPU lors des rotations 3D.

**Avant :**

```tsx
bg-gradient-to-br from-[#FDF6E3] via-[#FDF6E3] to-[#F5EDD5]
```

**Après :**

```tsx
bg - [#FDF6E3]; // Couleur unie
```

### 3. Mémoïsation des fonctions utilitaires

La fonction `truncateText` est maintenant enveloppée dans `useCallback` pour éviter sa recréation à chaque rendu.

```tsx
const truncateText = useCallback((text: string, ...) => { ... }, [])
```

## 📊 Impact attendu

- **Fluidité 60fps** : L'animation de flip devrait être parfaitement fluide.
- **Moins de charge CPU** : Le processeur n'a plus à recalculer le parsing Markdown inutilement.
- **Moins de charge GPU** : Le rendu des faces est plus simple à gérer géométriquement.

## 📁 Fichiers modifiés

1. **`components/subjects/FlashcardViewer.tsx`**
   - Optimisation `useCallback`
   - Suppression des gradients
2. **`components/MarkdownRenderer.tsx`**
   - Ajout de `React.memo`

Tout est maintenant optimisé pour une performance maximale ! ⚡️
