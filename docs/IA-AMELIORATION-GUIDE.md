# 🤖 Guide d'amélioration de notes avec l'IA

## ✅ Ce qui a été implémenté

### 1. **Fichier `lib/ai.ts`**
Fonction qui utilise l'API OpenAI pour améliorer le contenu d'une note :
- Modèle : `gpt-4o-mini` (rapide et économique)
- Max tokens : 1000
- Température : 0.7 (équilibre entre créativité et précision)

### 2. **Route API `app/api/ai/improve/route.ts`**
Endpoint POST qui :
- Vérifie l'authentification de l'utilisateur
- Valide le contenu de la note
- Appelle la fonction `improveNote()`
- Retourne le texte amélioré

### 3. **Intégration dans `dashboard-client.tsx`**
Ajout d'un bouton "✨ Améliorer avec l'IA" dans la barre d'outils qui :
- Envoie le contenu actuel à l'API
- Affiche un état de chargement pendant le traitement
- Met à jour automatiquement le contenu avec la version améliorée
- Déclenche la sauvegarde automatique via le système existant

## 🔧 Configuration requise

### Clé API OpenAI

Dans votre fichier `.env.local`, ajoutez :

```bash
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Où obtenir votre clé API :**
1. Créez un compte sur [platform.openai.com](https://platform.openai.com)
2. Accédez à la section "API Keys"
3. Générez une nouvelle clé API
4. Copiez-la dans votre fichier `.env.local`

> ⚠️ **Important** : Ne partagez jamais votre clé API publiquement

## 🚀 Utilisation

1. Lancez votre serveur de développement :
```bash
npm run dev
```

2. Connectez-vous au dashboard

3. Ouvrez ou créez une note

4. Écrivez du contenu dans votre note

5. Cliquez sur le bouton **"✨ Améliorer avec l'IA"** dans la barre d'outils

6. Attendez quelques secondes pendant que l'IA améliore votre texte

7. Le contenu amélioré remplacera automatiquement le texte original et sera sauvegardé

## 🎨 Fonctionnalités

- **Amélioration intelligente** : L'IA rend le texte plus clair, fluide et cohérent
- **Préservation du sens** : Aucun ajout de contenu inventé
- **Auto-sauvegarde** : Le texte amélioré est automatiquement enregistré
- **État de chargement** : Feedback visuel pendant le traitement
- **Désactivation intelligente** : Le bouton est désactivé si la note est vide

## 🎯 Exemple d'utilisation

**Texte original :**
```
j'ai fait des recherche sur la photosynthese c'est important pour les plante
parce que sa leur permet de fabriquer leur nourriture avec la lumiere
```

**Après amélioration avec l'IA :**
```
J'ai effectué des recherches sur la photosynthèse. C'est un processus essentiel 
pour les plantes, car il leur permet de fabriquer leur propre nourriture en 
utilisant la lumière.
```

## 💡 Alternative gratuite : Mistral AI

Si vous préférez utiliser l'API gratuite de Mistral :

1. Modifiez `lib/ai.ts` pour utiliser l'API Mistral
2. Changez la clé d'environnement en `.env.local` :
```bash
MISTRAL_API_KEY=votre_cle_mistral
```

## 📊 Coûts estimés (OpenAI)

Avec `gpt-4o-mini` :
- ~$0.15 par million de tokens d'entrée
- ~$0.60 par million de tokens de sortie
- Une amélioration de note (500 mots) coûte environ **$0.001** (0.1 centime)

## 🛠️ Architecture technique

```
Client (dashboard-client.tsx)
    ↓
    Bouton "Améliorer avec l'IA"
    ↓
API Route (/api/ai/improve)
    ↓
    Vérification authentification
    ↓
    Validation du contenu
    ↓
Fonction improveNote (lib/ai.ts)
    ↓
    Appel OpenAI API
    ↓
    Retour du texte amélioré
    ↓
Auto-sauvegarde dans Supabase
```

## ✨ Améliorations futures possibles

- [ ] Historique des versions (annuler l'amélioration)
- [ ] Choix du style d'amélioration (formel, décontracté, académique)
- [ ] Traduction automatique
- [ ] Correction orthographique uniquement
- [ ] Résumé automatique
- [ ] Génération de titres pertinents

## 🐛 Dépannage

**Erreur "Non authentifié"** :
- Assurez-vous d'être connecté
- Vérifiez que votre session est valide

**Erreur "Impossible d'améliorer le texte"** :
- Vérifiez que votre clé API OpenAI est valide
- Vérifiez que vous avez des crédits OpenAI disponibles
- Consultez les logs dans la console

**Le bouton est désactivé** :
- Assurez-vous que votre note contient du texte
- Attendez que la sauvegarde en cours soit terminée

## 📝 Notes

- La fonctionnalité utilise le même SDK OpenAI que la génération de fiches et quiz existante
- L'amélioration ne modifie pas le titre de la note
- Le système d'auto-sauvegarde existant prend en charge la sauvegarde du texte amélioré

