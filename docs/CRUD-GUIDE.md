# ✅ Étape 1 – CRUD Notes (Notlhy)

## 📋 Résumé de l'implémentation

Le système CRUD des notes est **complètement fonctionnel** avec deux versions :
- **Version Mock (actuelle)** : Stockage en mémoire, fonctionne immédiatement
- **Version Supabase (production)** : Code prêt, à activer quand Supabase est configuré

---

## 🗂️ Structure des fichiers

```
app/
├── api/
│   └── notes/
│       ├── route.ts              # GET (liste), POST (nouvelle note)
│       └── [id]/
│           └── route.ts          # GET, PATCH, DELETE (note individuelle)
├── dashboard/
│   ├── page.tsx                  # Server Component (vérif auth)
│   └── dashboard-client.tsx      # Client Component (UI interactive)
lib/
├── auth.ts                       # getUser() via cookies
└── db.ts                         # Types + client Supabase
```

---

## 🔌 API Endpoints

### `GET /api/notes`
**Description** : Liste toutes les notes de l'utilisateur connecté  
**Auth** : Cookie `user-id` requis  
**Réponse** : `Note[]` triées par `updated_at` (desc)

```typescript
// Exemple de réponse
[
  {
    id: "note-123",
    user_id: "user-456",
    title: "Ma première note",
    content: "Contenu de la note...",
    updated_at: "2025-10-31T10:00:00.000Z"
  }
]
```

---

### `POST /api/notes`
**Description** : Crée une nouvelle note vide  
**Auth** : Cookie `user-id` requis  
**Body** : `{ title?: string, content?: string }` (optionnels)  
**Réponse** : La note créée

```bash
curl -X POST http://localhost:3000/api/notes \
  -H "Content-Type: application/json" \
  -H "Cookie: user-id=votre-user-id" \
  -d '{"title":"Nouvelle note","content":""}'
```

---

### `GET /api/notes/[id]`
**Description** : Récupère une note spécifique  
**Auth** : Cookie `user-id` requis  
**Réponse** : La note demandée (404 si introuvable ou pas propriétaire)

```bash
curl http://localhost:3000/api/notes/note-123 \
  -H "Cookie: user-id=votre-user-id"
```

---

### `PATCH /api/notes/[id]`
**Description** : Met à jour le titre et/ou le contenu d'une note  
**Auth** : Cookie `user-id` requis  
**Body** : `{ title?: string, content?: string }`  
**Réponse** : La note mise à jour

```bash
curl -X PATCH http://localhost:3000/api/notes/note-123 \
  -H "Content-Type: application/json" \
  -H "Cookie: user-id=votre-user-id" \
  -d '{"content":"Nouveau contenu mis à jour"}'
```

---

### `DELETE /api/notes/[id]`
**Description** : Supprime une note  
**Auth** : Cookie `user-id` requis  
**Réponse** : `{ success: true }`

```bash
curl -X DELETE http://localhost:3000/api/notes/note-123 \
  -H "Cookie: user-id=votre-user-id"
```

---

## 🎨 Interface Dashboard

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│ [Notlhy]  [Nouvelle note]              user@email.com [Pro] │
├────────────────┬────────────────────────────────────────────┤
│                │                                             │
│  Notes (3)     │  # Ma première note                        │
│                │                                             │
│ > Ma première  │  Contenu de la note...                     │
│   note         │                                             │
│                │                                             │
│   Ma deuxième  │                                             │
│   note         │                                             │
│                │                                             │
│   Cours de     │  [Enregistré ✓]                           │
│   maths        │                                             │
│                │  [Export] [Fiche IA] [Quiz IA] [Supprimer]│
└────────────────┴────────────────────────────────────────────┘
```

### Fonctionnalités
✅ **Sidebar gauche** : Liste des notes avec titre + date  
✅ **Zone d'édition** : Textarea full-height pour le contenu  
✅ **Auto-save** : Sauvegarde automatique 500ms après la dernière modification  
✅ **Indicateur** : "Enregistrement..." puis "Enregistré ✓"  
✅ **État vide** : Message "Aucune note – Créez-en une pour commencer"  
✅ **Responsive** : Design adaptatif mobile/desktop  

---

## 🧪 Comment tester en local

### 1. Démarrer le serveur
```bash
cd /Users/macbookmae/Desktop/jsp
npm run dev
```

### 2. Se connecter
- Allez sur http://localhost:3000/dashboard
- Vous serez redirigé vers le login dev
- Entrez n'importe quel email (ex: `test@notlhy.com`)
- Vous serez automatiquement connecté

### 3. Tester le CRUD

#### ✅ Créer une note
1. Cliquez sur "Nouvelle note"
2. Une note vide apparaît dans la sidebar
3. Commencez à taper dans l'éditeur

#### ✅ Modifier une note
1. Sélectionnez une note dans la sidebar
2. Modifiez le titre ou le contenu
3. Attendez 500ms → "Enregistré ✓" apparaît
4. Rechargez la page → les modifications sont conservées

#### ✅ Supprimer une note
1. Sélectionnez une note
2. Cliquez sur "Supprimer"
3. Confirmez
4. La note disparaît

#### ✅ Export
1. Sélectionnez une note
2. Cliquez sur "Exporter"
3. Un fichier `.md` est téléchargé

### 4. Tester l'API directement

Ouvrez la console développeur du navigateur :

```javascript
// Créer une note
await fetch('/api/notes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'Test API', content: 'Hello' })
}).then(r => r.json())

// Lister les notes
await fetch('/api/notes').then(r => r.json())

// Mettre à jour une note (remplacez l'ID)
await fetch('/api/notes/NOTE_ID', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: 'Contenu mis à jour' })
}).then(r => r.json())

// Supprimer une note
await fetch('/api/notes/NOTE_ID', { method: 'DELETE' })
  .then(r => r.json())
```

---

## 🔄 Passer à Supabase (Production)

### Étape 1 : Configurer Supabase
1. Créez un projet sur [supabase.com](https://supabase.com)
2. Exécutez `supabase-schema.sql` dans l'éditeur SQL
3. Récupérez vos clés dans Settings > API

### Étape 2 : Mettre à jour `.env.local`
```bash
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-anon-key
SUPABASE_SERVICE_ROLE_KEY=votre-service-role-key
```

### Étape 3 : Activer le code Supabase

#### Dans `/app/api/notes/route.ts` :
1. **Commentez** le code Mock (lignes 1-50)
2. **Décommentez** le bloc "VERSION PRODUCTION AVEC SUPABASE"

#### Dans `/app/api/notes/[id]/route.ts` :
1. **Commentez** le code Mock (lignes 1-85)
2. **Décommentez** le bloc "VERSION PRODUCTION AVEC SUPABASE"

#### Dans `/lib/auth.ts` :
1. Remplacez le code mock par les appels Supabase
2. Le code est déjà prêt dans les commentaires

### Étape 4 : Redémarrer
```bash
# Ctrl+C puis
npm run dev
```

---

## 📊 Schéma de la base de données

```sql
CREATE TABLE notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Nouvelle note',
  content text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX notes_user_id_idx ON notes(user_id);
CREATE INDEX notes_updated_at_idx ON notes(updated_at DESC);
```

---

## 🔐 Sécurité

✅ **Authentification** : Toutes les routes vérifient `getUser()`  
✅ **Isolation** : Un utilisateur ne peut accéder qu'à ses propres notes  
✅ **Validation** : Les ID sont vérifiés avant toute opération  
✅ **Cascade delete** : Si un user est supprimé, ses notes aussi  

---

## 🎯 Prochaines étapes

- [ ] Intégration Stripe pour les abonnements Pro
- [ ] Génération IA de fiches et quiz
- [ ] Recherche de notes
- [ ] Tags et catégories
- [ ] Partage de notes

---

## 🐛 Troubleshooting

### "401 Unauthorized"
→ Vous n'êtes pas connecté. Allez sur `/api/dev-login`

### "404 Note non trouvée"
→ La note n'existe pas ou ne vous appartient pas

### "Les notes ne persistent pas après redémarrage"
→ Normal en mode Mock. Passez à Supabase pour la persistence.

### "Auto-save ne fonctionne pas"
→ Vérifiez la console. Le debounce est de 500ms.

---

## ✨ Fonctionnalités implémentées

✅ CRUD complet (Create, Read, Update, Delete)  
✅ Auto-save avec debounce 500ms  
✅ Interface minimaliste type Notion  
✅ Gestion de l'état vide  
✅ Export Markdown  
✅ Responsive design  
✅ Indicateur de sauvegarde  
✅ Tri par date de modification  
✅ Protection par authentification  
✅ Isolation des données par utilisateur  

---

**📝 Version Mock active** : Les données sont en mémoire. Pour une vraie base de données, suivez les instructions "Passer à Supabase" ci-dessus.

