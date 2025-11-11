# 🛠️ Guide : Menu Outils IA

## 🎯 Nouvelle fonctionnalité

Le bouton **⚙️ Outils IA** ouvre maintenant un menu contextuel complet avec :
- **5 actions sur le texte** (Améliorer, Corriger, Traduire, Résumer, Markdown)
- **Zone drag & drop** pour analyser des fichiers (PDF, images)

---

## 📦 Fichiers créés/modifiés

### ✨ Nouveau composant

**`components/AIContextMenu.tsx`**
- Menu contextuel flottant avec titre "Outils IA"
- Section actions de texte avec 5 boutons
- Zone drag & drop pour PDF et images
- Gestion des événements drag & drop
- Fonctions placeholder pour analyse de fichiers

### 🔧 Modifications

**`app/dashboard/dashboard-client.tsx`**
- Import du nouveau composant `AIContextMenu`
- Ajout de l'état `isContextMenuOpen`
- Nouvelle fonction `handleTextActionFromMenu()`
- Modification du bouton ⚙️ pour ouvrir le menu
- Intégration du composant dans le render

---

## 🚀 Comment utiliser

### 1️⃣ Actions sur le texte

**Avec le menu contextuel :**
1. Cliquez sur le bouton **⚙️ Outils IA** en bas à droite
2. Un menu s'ouvre avec 5 actions
3. **Sélectionnez du texte** dans votre note
4. Cliquez sur une action (ex: "✨ Améliorer le style")
5. Le texte est transformé instantanément

**Avec le mode sélection rapide :**
1. Le mode se active automatiquement quand vous ouvrez le menu
2. Sélectionnez du texte → un petit menu apparaît au-dessus
3. Cliquez directement sur une action
4. Plus rapide pour des modifications répétées

### 2️⃣ Analyser des fichiers

**Drag & Drop :**
1. Ouvrez le menu **⚙️ Outils IA**
2. Faites glisser un fichier PDF ou une image
3. Déposez-le dans la zone "Glissez un fichier ici"
4. Le fichier est analysé (simulation pour l'instant)
5. Une alerte affiche le résultat

**Types de fichiers supportés :**
- 📄 **PDF** → Extraction de texte et résumé (à venir)
- 🖼️ **Images** → OCR et description (JPG, PNG, GIF, WebP)

---

## 🎨 Design

### Menu contextuel
- **Largeur** : 320px (w-80)
- **Position** : 90px du bas, 24px de la droite
- **Header** : Dégradé purple-indigo avec icône Sparkles
- **Sections** : Séparées visuellement avec bordures
- **Animations** : Fade-in + slide-in (200ms)

### Zone drag & drop
- **État normal** : Bordure grise en pointillés
- **Hover** : Bordure purple + fond gris léger
- **Drag actif** : Bordure purple solide + fond purple clair
- **Processing** : Spinner animé

### Actions de texte
- **5 boutons** avec icônes et couleurs distinctes :
  - ✨ Purple (Améliorer)
  - ✅ Green (Corriger)
  - 🌍 Blue (Traduire)
  - 📄 Orange (Résumer)
  - 💻 Gray (Markdown)

---

## 🔧 Architecture technique

### États React ajoutés

```typescript
const [isContextMenuOpen, setIsContextMenuOpen] = useState(false)
```

### Nouvelle fonction

```typescript
const handleTextActionFromMenu = async (action: string) => {
  // Vérifie qu'il y a du texte sélectionné
  // Appelle transformText() avec l'action
  // Remplace le texte dans la note
  // Auto-save via useEffect
}
```

### Composant AIContextMenu

```typescript
interface AIContextMenuProps {
  isOpen: boolean
  onClose: () => void
  position: { bottom: number; right: number }
  onTextAction: (action: string) => void
}
```

**Props :**
- `isOpen` : Contrôle l'affichage du menu
- `onClose` : Callback pour fermer le menu
- `position` : Position fixe en pixels
- `onTextAction` : Callback quand une action est cliquée

---

## 📝 Fonctions placeholder

### handlePDF(file: File)

```typescript
async function handlePDF(file: File) {
  console.log("📄 Analyse PDF :", file.name)
  await new Promise(resolve => setTimeout(resolve, 1500))
  alert(`✅ PDF analysé : ${file.name}`)
}
```

**À implémenter plus tard :**
- Extraction de texte avec pdf.js ou API
- Résumé automatique du contenu
- Ajout du contenu à la note actuelle

### handleImage(file: File)

```typescript
async function handleImage(file: File) {
  console.log("🖼️ Analyse image :", file.name)
  await new Promise(resolve => setTimeout(resolve, 1500))
  alert(`✅ Image analysée : ${file.name}`)
}
```

**À implémenter plus tard :**
- OCR avec Tesseract.js ou API vision
- Description de l'image avec GPT-4 Vision
- Insertion du texte extrait dans la note

---

## 🎯 Flux utilisateur

### Scénario 1 : Améliorer un paragraphe

```
1. Utilisateur ouvre une note
2. Clique sur ⚙️ Outils IA
3. Menu s'ouvre avec les 5 actions
4. Sélectionne un paragraphe
5. Clique sur "✨ Améliorer le style"
6. Texte transformé après ~800ms
7. Note auto-sauvegardée
```

### Scénario 2 : Analyser un PDF

```
1. Utilisateur ouvre une note
2. Clique sur ⚙️ Outils IA
3. Menu s'ouvre
4. Fait glisser un PDF depuis son ordinateur
5. Dépose dans la zone drag & drop
6. Spinner apparaît pendant 1.5s
7. Alert confirme l'analyse
8. (À venir : contenu extrait ajouté à la note)
```

---

## 🚧 Prochaines étapes

### Phase 1 : Connexion API réelles
- [ ] Intégrer OpenAI pour les actions de texte
- [ ] Ajouter GPT-4 Vision pour analyse d'images
- [ ] Implémenter extraction PDF (pdf.js)

### Phase 2 : Fonctionnalités avancées
- [ ] Historique des transformations (Undo)
- [ ] Choix de langue pour traduction
- [ ] Templates personnalisés d'amélioration
- [ ] Analyse de plusieurs fichiers à la fois

### Phase 3 : Intégration dans la note
- [ ] Insérer le contenu extrait à la position du curseur
- [ ] Créer une nouvelle note depuis un PDF
- [ ] Lier les images analysées à la note
- [ ] Prévisualisation avant insertion

---

## 🎨 Customisation

### Changer la position du menu

Dans `dashboard-client.tsx`, ligne 472 :
```typescript
position={{ bottom: 90, right: 24 }}
// bottom: distance du bas en px
// right: distance de la droite en px
```

### Ajouter une action de texte

Dans `AIContextMenu.tsx`, ajoutez dans `textActions` :
```typescript
{
  id: "paraphrase",
  label: "Paraphraser",
  icon: RefreshCw, // importer de lucide-react
  color: "hover:bg-teal-50 hover:text-teal-600"
}
```

Puis dans `lib/ai-client.ts`, ajoutez le case :
```typescript
case "paraphrase":
  return `🔄 Version paraphrasée: ${text}...`
```

### Modifier les types de fichiers acceptés

Dans `AIContextMenu.tsx`, ligne 47 :
```typescript
} else if (fileType.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
  // Ajoutez svg, bmp, etc.
```

---

## ⚡ Performance

- **Taille du composant** : ~170 lignes
- **États locaux** : 2 (isDragging, isProcessing)
- **Render conditionnel** : Menu ne se rend que si `isOpen={true}`
- **Fermeture optimisée** : Overlay transparent pour clic extérieur

---

## 🐛 Dépannage

### Le menu ne s'ouvre pas

✅ Vérifiez que `isContextMenuOpen` change de valeur  
✅ Inspectez le DOM pour voir si le composant est rendu  
✅ Vérifiez le z-index (50 pour le menu, 40 pour l'overlay)  

### Les actions ne fonctionnent pas

✅ Assurez-vous de sélectionner du texte AVANT de cliquer sur l'action  
✅ Vérifiez la console pour voir les erreurs  
✅ Testez `handleTextActionFromMenu()` avec un console.log  

### Le drag & drop ne répond pas

✅ Vérifiez que les événements `onDragOver`, `onDragLeave`, `onDrop` sont bien liés  
✅ Testez avec différents types de fichiers  
✅ Regardez les logs dans la console (`console.log` dans handlePDF/handleImage)  

---

## 📊 Statistiques

| Métrique | Valeur |
|----------|--------|
| **Nouveau composant** | AIContextMenu.tsx (170 lignes) |
| **Fonctions ajoutées** | 3 (handleTextActionFromMenu, handlePDF, handleImage) |
| **États ajoutés** | 1 global + 2 locaux |
| **Actions disponibles** | 5 (texte) + 2 (fichiers) |
| **Types de fichiers** | 6 (PDF, JPG, PNG, GIF, WebP) |

---

## ✨ Améliorations apportées

Par rapport au système précédent :

✅ **Menu plus accessible** - Clic sur un bouton au lieu d'activer un mode  
✅ **Plus d'actions** - Drag & drop en plus des transformations de texte  
✅ **Meilleure UX** - Interface visuelle claire avec sections  
✅ **Feedback visuel** - États de hover, drag, processing  
✅ **Extensible** - Facile d'ajouter de nouvelles actions  

---

## 🎉 Résultat final

Vous avez maintenant un **menu d'outils IA complet** avec :

- 💬 **Chat IA** conversationnel
- ✨ **5 actions de transformation** de texte
- 📎 **Drag & drop** pour fichiers PDF et images
- 🎨 **Interface moderne** et intuitive
- 🚀 **Prêt à connecter** aux APIs réelles

**Testez-le maintenant** : `npm run dev` et cliquez sur ⚙️ ! 🎯

