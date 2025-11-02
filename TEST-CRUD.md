# 🧪 Test Rapide du CRUD - Notlhy

## ⚡ Test Express (2 minutes)

### 1️⃣ Lancer l'app
```bash
npm run dev
```
Ouvrez http://localhost:3000

---

### 2️⃣ Se connecter
- Cliquez sur **"Commencer"** ou allez sur `/dashboard`
- Entrez votre email : `test@notlhy.com`
- Vous êtes connecté ✅

---

### 3️⃣ Créer une note
1. Cliquez sur **"Nouvelle note"**
2. Une note vide apparaît dans la sidebar
3. Modifiez le titre : `Ma première note`
4. Tapez du contenu :
```
# Introduction à Notlhy

Notlhy est une application de prise de notes intelligente.

## Fonctionnalités
- Création de notes
- Auto-save
- Export Markdown
- IA pour générer des fiches et quiz
```

5. Attendez 500ms → **"Enregistré ✓"** apparaît

---

### 4️⃣ Créer plusieurs notes
Créez 2-3 notes supplémentaires pour voir la liste se remplir :
- "Cours de mathématiques"
- "Liste de courses"
- "Idées projet"

---

### 5️⃣ Tester la navigation
1. Cliquez sur différentes notes dans la sidebar
2. Le contenu change instantanément
3. Modifiez chaque note
4. L'auto-save se déclenche automatiquement

---

### 6️⃣ Tester la suppression
1. Sélectionnez une note
2. Cliquez sur **"Supprimer"**
3. Confirmez
4. La note disparaît et la suivante est sélectionnée

---

### 7️⃣ Tester l'export
1. Sélectionnez une note
2. Cliquez sur **"Exporter"**
3. Un fichier `.md` se télécharge
4. Ouvrez-le → c'est votre note au format Markdown !

---

### 8️⃣ Tester la persistence
1. Créez/modifiez des notes
2. **Rechargez la page** (F5)
3. Vos notes sont toujours là ✅

> ⚠️ **En mode Mock** : Les notes sont en mémoire. Si vous redémarrez le serveur (`Ctrl+C` puis `npm run dev`), elles seront perdues. Pour une vraie persistence, configurez Supabase.

---

## 🔧 Test des API (Console navigateur)

Appuyez sur `F12` pour ouvrir la console, puis :

```javascript
// 1. Lister toutes les notes
await fetch('/api/notes').then(r => r.json())

// 2. Créer une note via API
const newNote = await fetch('/api/notes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    title: 'Note créée via API', 
    content: 'Ceci est un test' 
  })
}).then(r => r.json())

console.log('Note créée:', newNote)

// 3. Mettre à jour cette note (copiez l'ID de la note)
const noteId = newNote.id
await fetch(`/api/notes/${noteId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    content: 'Contenu modifié via API' 
  })
}).then(r => r.json())

// 4. Récupérer une note spécifique
await fetch(`/api/notes/${noteId}`).then(r => r.json())

// 5. Supprimer la note
await fetch(`/api/notes/${noteId}`, { 
  method: 'DELETE' 
}).then(r => r.json())

// 6. Vérifier qu'elle a disparu
await fetch('/api/notes').then(r => r.json())
```

---

## 🎨 Test UI/UX

### Auto-save
1. Sélectionnez une note
2. Tapez quelque chose
3. Observez l'indicateur en bas :
   - "Enregistrement..." pendant la saisie
   - "Enregistré ✓" 500ms après la dernière frappe

### État vide
1. Supprimez toutes vos notes
2. Vous devriez voir : **"Aucune note – Créez-en une pour commencer"**
3. Cliquez sur "Nouvelle note"
4. L'interface d'édition réapparaît

### Responsive
1. Réduisez la taille de la fenêtre
2. Le layout s'adapte
3. La sidebar et l'éditeur restent utilisables

---

## ✅ Checklist complète

- [ ] Connexion réussie
- [ ] Création de notes
- [ ] Modification de notes
- [ ] Auto-save fonctionne (indicateur visible)
- [ ] Navigation entre notes
- [ ] Suppression de notes
- [ ] Export Markdown
- [ ] Persistence après rechargement de page
- [ ] État vide bien affiché
- [ ] API testée via console
- [ ] Interface fluide et responsive

---

## 🚀 Passer en mode Pro (pour tester l'IA)

Si vous voulez tester les fonctionnalités IA :

1. Connectez-vous au dashboard
2. Allez sur http://localhost:3000/api/dev-upgrade
3. Cliquez sur "Aller au Dashboard"
4. Vous avez maintenant le badge 👑 **Pro**
5. Les boutons "Fiche IA" et "Quiz IA" sont actifs
6. Créez une note avec du contenu
7. Cliquez sur "Fiche IA" ou "Quiz IA"
8. L'IA génère automatiquement du contenu !

---

## 📊 Résultats attendus

| Action | Résultat attendu |
|--------|------------------|
| Créer note | Note vide ajoutée à la sidebar |
| Taper dans l'éditeur | "Enregistrement..." puis "Enregistré ✓" |
| Changer de note | Contenu mis à jour instantanément |
| Supprimer note | Note disparaît, suivante sélectionnée |
| Exporter note | Fichier `.md` téléchargé |
| Recharger page | Toutes les notes présentes |
| API GET /api/notes | JSON avec tableau de notes |
| API POST /api/notes | Nouvelle note créée |
| API PATCH /api/notes/[id] | Note mise à jour |
| API DELETE /api/notes/[id] | Note supprimée |

---

## 🐛 Si quelque chose ne fonctionne pas

### Le serveur ne démarre pas
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Erreur 401 sur l'API
→ Vous n'êtes pas connecté. Allez sur `/api/dev-login`

### Auto-save ne se déclenche pas
→ Vérifiez la console navigateur (F12) pour voir les erreurs

### Les notes disparaissent au redémarrage
→ Normal en mode Mock. Pour la persistence, configurez Supabase

---

**✨ Tout fonctionne ?** Vous êtes prêt pour l'étape 2 : Stripe + IA !

