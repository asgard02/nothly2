# Corrections Flashcards et Suggestions

## 🐛 Problèmes corrigés

### 1. Flashcards à l'envers ✅

**Problème** : Le texte sur la face arrière des flashcards apparaissait inversé (effet miroir). De plus, après la première correction, les clics ne fonctionnaient plus pour retourner la carte.

**Cause** : La transformation CSS `rotateY(180deg)` inversait non seulement la carte mais aussi le texte. Appliquer `scaleX(-1)` sur toute la carte inversait aussi les zones de clic.

**Solution finale** : Appliquer `scaleX(-1)` uniquement sur le **contenu texte** (div interne), pas sur toute la carte :

```tsx
// Container de la carte (sans scaleX pour garder les clics fonctionnels)
<div style={{ transform: "rotateY(180deg) translateZ(0)" }}>
  {/* Contenu avec scaleX(-1) pour corriger le texte inversé */}
  <div style={{ transform: "scaleX(-1)" }}>
    <MarkdownRenderer content={current.answer} />
  </div>
</div>
```

**Fichier modifié** : `components/subjects/FlashcardViewer.tsx` (lignes 266-287)

---

### 2. Suggestions affichées dans tous les onglets ✅

**Problème** : Les boutons de suggestion (Générer des flashcards, Générer un quiz, Résumer) s'affichaient dans tous les onglets (PDF, Flashcards, Quiz, Résumés).

**Solution** : Les suggestions ne s'affichent maintenant que dans l'onglet **PDF** :

```tsx
// Avant
{!showChatInput && (

// Après
{!showChatInput && activeTab === "pdf" && (
```

**Fichier modifié** : `components/workspace/SubjectView.tsx` (ligne 1280)

---

## 📋 Résumé

- ✅ **Flashcards** : Le texte s'affiche maintenant correctement (pas inversé) ET les clics fonctionnent
- ✅ **Suggestions** : Visibles uniquement dans l'onglet PDF
- ✅ **UX améliorée** : Interface plus claire et cohérente

## 🧪 Test

Pour tester :

1. Ouvrir une matière avec des flashcards
2. Cliquer sur l'onglet "Flashcards"
3. **Cliquer sur la carte pour la retourner** - vérifier que ça fonctionne
4. Vérifier que le texte est lisible (pas inversé) sur la face arrière
5. Vérifier que les boutons de suggestion ne s'affichent pas
6. Retourner sur l'onglet "PDF"
7. Vérifier que les boutons de suggestion sont bien visibles
