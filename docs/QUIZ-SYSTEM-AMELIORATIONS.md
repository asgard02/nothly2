# 🎯 Système de Quiz Amélioré - Documentation

## Vue d'ensemble

Le système de quiz a été complètement refondu avec :
1. **Design moderne et intuitif**
2. **Suivi pédagogique complet**
3. **Système de révision adaptative**
4. **Génération de questions ciblées sur les faiblesses**

## 🗄️ Base de données

### Tables créées (`supabase-quiz-progress.sql`)

1. **`user_quiz_sessions`** - Sessions de quiz complètes
   - Suivi des scores, temps, progression
   - Types de session : `practice`, `review`, `adaptive`

2. **`user_quiz_answers`** - Réponses individuelles
   - Chaque réponse est enregistrée avec le temps passé
   - Suivi des tentatives multiples

3. **`quiz_question_stats`** - Statistiques agrégées par question
   - Niveaux de maîtrise : `new`, `learning`, `reviewing`, `mastered`
   - Calcul automatique du niveau basé sur le taux de réussite
   - Système de répétition espacée (`next_review_at`)

4. **`user_weak_areas`** - Zones de difficulté identifiées
   - Tags/concepts problématiques
   - Score de difficulté (0-100)
   - Utilisé pour générer des questions ciblées

## 🎨 Interface utilisateur

### QuizViewer - Design moderne

- **Header avec statistiques** : Progression, précision, questions réussies/à revoir
- **Indicateurs de maîtrise** : Badges colorés pour chaque niveau (nouvelle, à apprendre, en révision, maîtrisée)
- **Options de réponse** : Design moderne avec animations et feedback visuel
- **Zones de difficulté** : Affichage des concepts problématiques avec scores
- **Navigation rapide** : Miniatures des questions avec indicateurs de statut

### Modes de quiz

1. **Mode Pratique** : Toutes les questions dans l'ordre
2. **Mode Révision** : Questions à réviser prioritairement
3. **Mode Adaptatif** : Focus automatique sur les questions difficiles

## 🔄 Système de suivi pédagogique

### Niveaux de maîtrise

- **`new`** : Question jamais tentée
- **`learning`** : < 50% de réussite
- **`reviewing`** : 50-80% de réussite
- **`mastered`** : > 80% de réussite

### Algorithme de répétition espacée

- **Maîtrisé** : Révision dans 30 jours
- **En révision** : Révision dans 7 jours
- **À apprendre** : Révision le lendemain
- Ajustement selon le nombre d'erreurs

### Zones de difficulté

Les tags des questions ratées sont automatiquement identifiés comme zones de difficulté :
- Score de difficulté calculé (0-100)
- Comptage des questions ratées par tag
- Utilisé pour générer des questions ciblées

## 🚀 API Endpoints

### POST `/api/quiz/progress`
Sauvegarde une réponse de quiz et met à jour les statistiques.

**Body:**
```json
{
  "sessionId": "uuid",
  "quizQuestionId": "uuid",
  "userAnswer": "string",
  "isCorrect": boolean,
  "timeSpentSeconds": number,
  "studyCollectionId": "uuid"
}
```

**Réponse:**
```json
{
  "success": true,
  "answerId": "uuid",
  "sessionId": "uuid"
}
```

### GET `/api/quiz/progress`
Récupère les statistiques de progression.

**Query params:**
- `studyCollectionId`: ID de la collection
- `quizQuestionId`: ID d'une question spécifique (optionnel)

**Réponse:**
```json
{
  "stats": [...],
  "weakAreas": [...]
}
```

### POST `/api/quiz/generate-targeted`
Génère des questions/flashcards ciblées sur les zones de difficulté.

**Body:**
```json
{
  "studyCollectionId": "uuid",
  "type": "quiz" | "flashcards"
}
```

**Réponse:**
```json
{
  "success": true,
  "studyCollectionId": "uuid",
  "itemsGenerated": 5,
  "weakAreas": [...],
  "message": "..."
}
```

### GET `/api/quiz/generate-targeted`
Récupère les zones de difficulté pour une collection.

**Query params:**
- `studyCollectionId`: ID de la collection

## 🎯 Fonctionnalités clés

### 1. Suivi en temps réel
- Chaque réponse est sauvegardée automatiquement
- Statistiques mises à jour instantanément
- Timer pour chaque question

### 2. Mode adaptatif
- Réorganisation automatique des questions par priorité
- Focus sur les questions difficiles (`learning` > `reviewing` > `new` > `mastered`)
- Tri par nombre d'erreurs

### 3. Génération ciblée
- Identification automatique des concepts difficiles
- Génération de questions/flashcards spécifiques via IA
- Création d'une nouvelle `study_collection` avec les questions ciblées

### 4. Visualisation des progrès
- Graphiques de progression
- Indicateurs de maîtrise par question
- Zones de difficulté avec scores

## 📝 Utilisation

### Pour l'utilisateur

1. **Commencer un quiz** : Cliquer sur "Commencer le quiz" dans une collection
2. **Répondre aux questions** : Sélectionner une réponse et cliquer sur "Vérifier"
3. **Voir les statistiques** : Cliquer sur "Statistiques" pour voir la progression
4. **Voir les zones difficiles** : Cliquer sur "Zones difficiles" pour identifier les concepts problématiques
5. **Générer des questions ciblées** : Cliquer sur "Générer questions ciblées" pour créer de nouvelles questions sur les concepts difficiles

### Pour le développeur

1. **Exécuter le script SQL** : `supabase-quiz-progress.sql` dans Supabase
2. **Vérifier les APIs** : Les endpoints sont prêts à l'emploi
3. **Personnaliser** : Modifier les seuils de maîtrise dans `quiz_question_stats` si nécessaire

## 🔧 Configuration

### Variables d'environnement requises

- `OPENAI_API_KEY` : Pour la génération de questions ciblées
- `NEXT_PUBLIC_SUPABASE_URL` : URL Supabase
- `SUPABASE_SERVICE_ROLE_KEY` : Clé de service Supabase

## 📊 Métriques suivies

- Taux de réussite par question
- Temps passé par question
- Nombre de tentatives
- Niveau de maîtrise
- Zones de difficulté (tags)
- Score global de session

## 🎓 Pédagogie

Le système utilise :
- **Répétition espacée** : Révisions programmées selon la maîtrise
- **Apprentissage adaptatif** : Focus sur les points faibles
- **Feedback immédiat** : Explications détaillées après chaque réponse
- **Génération ciblée** : Questions créées spécifiquement pour les concepts difficiles

## 🚧 Améliorations futures possibles

- [ ] Graphiques de progression dans le temps
- [ ] Recommandations de révision personnalisées
- [ ] Mode multijoueur/compétition
- [ ] Export des statistiques
- [ ] Notifications de révision
- [ ] Intégration avec calendrier pour les révisions



