# 🤖 Guide Chat IA & IA Contextuelle

## 🎯 Vue d'ensemble

Vous disposez maintenant de **deux nouvelles fonctionnalités d'IA** dans votre application Notlhy :

1. **💬 Chat IA** - Un assistant conversationnel accessible depuis n'importe où
2. **✨ IA Contextuelle** - Transformez du texte sélectionné instantanément

---

## 📦 Fichiers créés/modifiés

### ✨ Nouveaux fichiers :

- **`components/AIChat.tsx`** - Composant de chat avec interface moderne
- **`components/SelectionMenu.tsx`** - Menu flottant pour actions sur texte sélectionné
- **`GUIDE-IA-CHAT-CONTEXTUELLE.md`** - Ce guide

### 🔧 Fichiers modifiés :

- **`lib/ai.ts`** - Ajout de `chatWithAI()` et `transformText()`
- **`app/dashboard/dashboard-client.tsx`** - Intégration des nouvelles fonctionnalités

---

## 🚀 Fonctionnalité 1 : Chat IA

### 🎨 Interface

- **Bouton flottant** 🤖 en bas à droite
- **Panneau de chat** moderne avec effet de verre dépoli
- **Bulles de messages** alternées (utilisateur à droite, IA à gauche)
- **Timestamps** sur chaque message
- **Animations** fluides d'apparition/disparition

### ⚙️ Fonctionnalités

✅ **Conversation fluide** avec l'assistant IA  
✅ **Historique persistant** durant la session  
✅ **État de chargement** pendant que l'IA réfléchit  
✅ **Envoi par Enter** (Shift+Enter pour nouvelle ligne)  
✅ **Fermeture par Échap** ou clic en dehors  
✅ **Auto-scroll** vers le dernier message  
✅ **Responsive** - fonctionne sur mobile  

### 🎯 Comment l'utiliser

1. Cliquez sur le bouton **🤖 Chat IA** en bas à droite
2. Le panneau de chat s'ouvre avec un message de bienvenue
3. Tapez votre question dans l'input en bas
4. Appuyez sur **Enter** ou cliquez sur l'icône d'envoi
5. L'IA répond après ~800ms (simulation)
6. Fermez avec **Échap** ou le bouton ❌

### 💡 Exemple d'utilisation

```
Vous : Comment organiser mes notes de cours ?
IA : C'est une excellente question ! Voici ce que je peux vous dire...
```

---

## 🚀 Fonctionnalité 2 : IA Contextuelle

### 🎨 Interface

- **Bouton flottant** ⚙️ avec badge animé quand actif
- **Menu flottant** au-dessus du texte sélectionné
- **5 actions rapides** avec icônes colorées
- **Animation** d'apparition fluide

### ⚙️ Actions disponibles

| Action | Icône | Description |
|--------|-------|-------------|
| **✨ Améliorer** | Sparkles | Reformule le texte pour le rendre plus clair |
| **✅ Corriger** | CheckCircle | Corrige l'orthographe et la grammaire |
| **🌍 Traduire** | Globe | Traduit le texte (placeholder : EN) |
| **📄 Résumer** | FileText | Crée un résumé concis |
| **💻 Markdown** | Code | Formate en bloc de code markdown |

### 🎯 Comment l'utiliser

1. Cliquez sur le bouton **⚙️ IA contextuelle** pour activer le mode
2. Le bouton devient violet avec un badge animé
3. Sélectionnez du texte dans votre note avec la souris
4. Un menu flottant apparaît au-dessus de la sélection
5. Cliquez sur l'action souhaitée (Améliorer, Corriger, etc.)
6. Le texte est transformé et remplace automatiquement la sélection
7. La note est auto-sauvegardée

### 💡 Exemple d'utilisation

**Texte original sélectionné :**
```
c'est une bonne idee pour mon projet
```

**Après avoir cliqué sur "✨ Améliorer" :**
```
✨ Version améliorée: C'est une bonne idee pour mon projet
```

---

## 🎨 Design & UX

### Boutons flottants

- **Position** : Coin inférieur droit (fixed)
- **Taille** : 56x56px (14 en Tailwind)
- **Effet hover** : Scale 1.1 + tooltip descriptif
- **Z-index** : 30 (au-dessus du contenu)
- **Animations** : Transitions fluides sur tous les états

### Chat IA

- **Dimensions** : 384px × 600px (w-96 h-[600px])
- **Position** : Bottom-right avec offset
- **Overlay** : Fond noir semi-transparent avec blur
- **Header** : Dégradé purple → indigo
- **Messages** : Bulles arrondies avec ombres douces
- **Input** : Focus ring purple, border-radius cohérent

### Menu de sélection

- **Position** : 60px au-dessus de la sélection
- **Centrage** : Automatique sur le milieu du texte sélectionné
- **Flèche** : Pointe vers le texte (border trick CSS)
- **Boutons** : Hover coloré selon l'action

---

## 🛠️ Architecture technique

### États React

```typescript
// Chat IA
const [isChatOpen, setIsChatOpen] = useState(false)

// Menu contextuel
const [isContextualMode, setIsContextualMode] = useState(false)
const [selectionMenu, setSelectionMenu] = useState({
  show: boolean,
  position: { top: number, left: number },
  selectedText: string
})
const [isTransforming, setIsTransforming] = useState(false)
```

### Détection de sélection

```typescript
useEffect(() => {
  const handleSelection = () => {
    const selection = window.getSelection()
    const selectedText = selection?.toString().trim()
    // Calcul de la position et affichage du menu
  }
  
  document.addEventListener("mouseup", handleSelection)
  document.addEventListener("keyup", handleSelection)
}, [isContextualMode])
```

### Remplacement de texte

```typescript
const handleSelectionAction = async (action: string) => {
  const transformed = await transformText(selectedText, action)
  const newContent = content.replace(selectedText, transformed)
  setContent(newContent)
  // Auto-save se déclenche via useEffect
}
```

---

## 🔧 Fonctions placeholder (lib/ai.ts)

### chatWithAI(message: string)

```typescript
// Simule une réponse IA après 800ms
// Retourne une réponse aléatoire parmi 5 templates
// À remplacer par un vrai appel API OpenAI/Mistral
```

### transformText(text: string, mode: string)

```typescript
// Modes supportés : improve, correct, translate, summarize, markdown
// Simule un traitement après 800ms
// Retourne le texte transformé selon le mode
// À remplacer par un vrai appel API
```

---

## 🚧 Prochaines étapes (Backend réel)

Pour connecter à une vraie API IA (OpenAI, Mistral, Claude), remplacez dans `lib/ai.ts` :

### Pour le Chat IA

```typescript
export async function chatWithAI(message: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "Tu es un assistant pour une app de notes" },
      { role: "user", content: message }
    ],
    max_tokens: 500,
  })
  
  return completion.choices[0].message.content || "Erreur"
}
```

### Pour l'IA Contextuelle

```typescript
export async function transformText(text: string, mode: string): Promise<string> {
  const prompts = {
    improve: `Améliore ce texte : "${text}"`,
    correct: `Corrige ce texte : "${text}"`,
    translate: `Traduis en anglais : "${text}"`,
    summarize: `Résume : "${text}"`,
    markdown: `Formate en markdown : "${text}"`,
  }
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompts[mode] }],
    max_tokens: 300,
  })
  
  return completion.choices[0].message.content || text
}
```

---

## ⚡ Raccourcis clavier

| Touche | Action |
|--------|--------|
| **Échap** | Fermer le chat IA |
| **Enter** | Envoyer un message (dans le chat) |
| **Shift+Enter** | Nouvelle ligne (dans le chat) |

---

## 📱 Responsive

- **Desktop** : Panneau de chat 384px de large
- **Mobile** : À adapter avec media queries si nécessaire
- **Tablet** : Les boutons flottants restent accessibles

---

## 🎨 Customisation

### Changer les couleurs

Dans les composants, remplacez :
- `from-purple-600 to-indigo-600` par vos couleurs de marque
- `hover:bg-purple-50 hover:text-purple-600` pour les hovers

### Changer la taille du chat

Dans `AIChat.tsx`, ligne 148 :
```tsx
className="... w-96 h-[600px] ..."  // Modifiez w-96 et h-[600px]
```

### Changer la position du menu contextuel

Dans `dashboard-client.tsx`, ligne 71 :
```tsx
top: rect.top + window.scrollY - 60,  // Changez -60 pour ajuster
```

---

## 🐛 Dépannage

### Le menu de sélection n'apparaît pas

✅ Vérifiez que le mode IA contextuelle est **activé** (bouton ⚙️ violet)  
✅ Assurez-vous de sélectionner du texte dans le **textarea** de la note  
✅ Vérifiez la console pour des erreurs JavaScript  

### Le chat ne s'affiche pas

✅ Vérifiez que le composant `AIChat` est bien importé  
✅ Vérifiez que `isChatOpen` change bien de valeur dans React DevTools  
✅ Inspectez le DOM pour voir si le panneau est rendu mais mal positionné  

### Les réponses IA ne fonctionnent pas

✅ C'est normal ! Les fonctions sont des **placeholders**  
✅ Remplacez-les par de vrais appels API (voir section "Prochaines étapes")  
✅ Ajoutez votre clé API OpenAI dans `.env.local`  

---

## 🌟 Fonctionnalités bonus possibles

- [ ] **Historique de chat persistant** (localStorage ou DB)
- [ ] **Contexte de la note actuelle** envoyé au chat
- [ ] **Actions personnalisées** dans le menu contextuel
- [ ] **Raccourcis clavier** pour activer l'IA contextuelle
- [ ] **Multi-langue** pour la traduction
- [ ] **Ton de voix** (formel, décontracté, académique)
- [ ] **Export de conversation** du chat
- [ ] **Suggestions proactives** d'amélioration

---

## 📊 Statistiques actuelles

| Métrique | Valeur |
|----------|--------|
| **Lignes de code ajoutées** | ~500 |
| **Nouveaux composants** | 2 (AIChat, SelectionMenu) |
| **Nouvelles fonctions IA** | 2 (chatWithAI, transformText) |
| **Temps de réponse simulé** | 800ms |
| **États React ajoutés** | 4 |

---

## 🎓 Concepts utilisés

- **React Hooks** : useState, useEffect, useRef
- **Window API** : window.getSelection(), getBoundingClientRect()
- **Event Listeners** : mouseup, keyup, keydown
- **Animations CSS** : Tailwind transitions, animate-ping
- **Position absolue** : Calcul dynamique de coordonnées
- **Z-index layering** : Overlay → Buttons → Menus
- **Conditional Rendering** : Affichage selon états

---

## 📝 Checklist de test

- [x] ✅ Le bouton Chat IA ouvre le panneau
- [x] ✅ Le chat peut recevoir et envoyer des messages
- [x] ✅ Les messages s'affichent correctement (user/IA)
- [x] ✅ Le chat se ferme avec Échap
- [x] ✅ Le bouton IA contextuelle active le mode
- [x] ✅ Le menu apparaît sur sélection de texte
- [x] ✅ Les 5 actions transforment le texte
- [x] ✅ Le texte transformé remplace l'original
- [x] ✅ L'auto-save fonctionne après transformation
- [x] ✅ Aucune erreur de linter

---

## 🎉 Félicitations !

Vous avez maintenant une application de notes avec :
- 📝 Prise de notes fluide avec auto-save
- ✨ Amélioration complète de notes
- 💬 Chat IA conversationnel
- 🎯 Transformations contextuelles de texte
- 🎨 Interface moderne et intuitive

**Prochaine étape** : Connectez les APIs réelles pour rendre tout cela fonctionnel en production ! 🚀

---

## 📞 Support

Si vous rencontrez des problèmes :
1. Vérifiez la console du navigateur
2. Inspectez les React DevTools
3. Consultez ce guide
4. Testez avec des données simples d'abord

---

**Fait avec 💜 pour Notlhy**

