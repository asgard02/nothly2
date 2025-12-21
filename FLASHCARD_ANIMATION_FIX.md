# Correction finale - Texte inversé sur les flashcards

## 🐛 Problème

Après avoir corrigé l'animation de flip, le texte sur la face arrière des flashcards apparaissait toujours inversé (effet miroir).

## 🔍 Cause

Le `scaleX(-1)` était toujours appliqué sur le contenu de la face arrière, alors qu'il n'était plus nécessaire avec la nouvelle approche utilisant `backfaceVisibility: 'hidden'`.

## ✅ Solution

**Suppression du `scaleX(-1)`** du contenu de la face arrière.

### Avant (texte inversé) ❌

```tsx
<div style={{ transform: "scaleX(-1)" }}>
  <MarkdownRenderer content={current.answer} />
</div>
```

### Après (texte correct) ✅

```tsx
<div>
  <MarkdownRenderer content={current.answer} />
</div>
```

## 💡 Explication technique

Avec `backfaceVisibility: 'hidden'`, les deux faces de la carte sont correctement gérées :

- **Face avant** : `rotateY(0deg)` → visible normalement
- **Face arrière** : `rotateY(180deg)` → pré-rotée de 180°

Quand on clique, le container parent tourne de 0° à 180° :

- La face avant (0°) devient invisible (dos tourné)
- La face arrière (180°) devient visible (face tournée vers nous)

Le texte s'affiche correctement **sans besoin de `scaleX(-1)`** car `backfaceVisibility: 'hidden'` gère automatiquement l'affichage correct.

## 📁 Fichier modifié

**`components/subjects/FlashcardViewer.tsx`** (ligne 282)

- Suppression de `style={{ transform: 'scaleX(-1)' }}`

## 🎯 Résultat final

- ✅ Animation de flip 3D fluide (700ms)
- ✅ Texte lisible et **non inversé** sur les deux faces
- ✅ Clics fonctionnels
- ✅ Code plus simple et plus maintenable

## 🧪 Test

1. Ouvrir une matière avec des flashcards
2. Cliquer sur l'onglet "Flashcards"
3. Cliquer sur une carte → Observer l'animation
4. **Vérifier que le texte de la réponse est lisible** (pas inversé)
5. Cliquer à nouveau → La carte se retourne

Tout fonctionne parfaitement maintenant ! 🎉
