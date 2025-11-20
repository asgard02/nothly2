# 🔧 Fix : Boucle Infinie de Polling

## Problème identifié

Le polling continuait malgré les corrections précédentes. La cause principale était :

1. **`refetchInterval` fonction réévaluée trop souvent** : React Query réévalue la fonction `refetchInterval` à chaque changement de données, même si c'est juste `updated_at` qui change
2. **Conflit avec `refetchOnMount`** : Le provider avait `refetchOnMount: true` par défaut
3. **Dépendances du useEffect** : Le `useEffect` dépendait de `query.data` complet, ce qui causait des réexécutions à chaque changement

## Solution appliquée

### 1. Remplacement de `refetchInterval` par polling manuel

Au lieu d'utiliser `refetchInterval` (qui est réévalué à chaque changement), on utilise maintenant `useEffect` + `setInterval` avec un contrôle strict :

```typescript
// ❌ AVANT : refetchInterval réévalué à chaque changement
refetchInterval: (query) => {
  const data = query.state.data
  return data?.some(c => c.status === "processing") ? 5000 : false
}

// ✅ APRÈS : Polling manuel avec useEffect
useEffect(() => {
  if (processingCollections.length > 0 && !pollingIntervalRef.current) {
    pollingIntervalRef.current = setInterval(() => {
      queryClient.refetchQueries({ queryKey: ["collections"] })
    }, 5000)
  }
  // ...
}, [query.status, query.data?.map(c => `${c.id}:${c.status}`).join(",")])
```

### 2. Dépendances optimisées

Au lieu de dépendre de `query.data` complet (qui change à chaque `updated_at`), on dépend seulement de :
- `query.status` : statut de la requête
- `query.data?.map(c => \`${c.id}:${c.status}\`).join(",")` : seulement les IDs et statuts des collections

Cela évite les réexécutions inutiles quand seule la date `updated_at` change.

### 3. Vérification avant de créer un nouvel intervalle

On vérifie toujours si un intervalle existe déjà avant d'en créer un nouveau :

```typescript
if (processingCollections.length > 0 && !pollingIntervalRef.current) {
  // Créer l'intervalle seulement s'il n'existe pas déjà
  pollingIntervalRef.current = setInterval(...)
}
```

### 4. Nettoyage strict

Le cleanup du `useEffect` nettoie toujours l'intervalle :

```typescript
return () => {
  if (pollingIntervalRef.current) {
    clearInterval(pollingIntervalRef.current)
    pollingIntervalRef.current = null
  }
}
```

## Changements dans les fichiers

### `lib/hooks/useCollections.ts`

- ✅ `useCollections()` : Polling manuel avec `useEffect` + `setInterval`
- ✅ `useCollectionDetail()` : Même approche pour les détails
- ✅ Dépendances optimisées pour éviter les réexécutions inutiles
- ✅ Vérification stricte avant de créer un nouvel intervalle

## Résultat attendu

- ✅ Polling toutes les 5 secondes seulement si des collections sont en traitement
- ✅ Arrêt automatique du polling quand toutes les collections sont terminées
- ✅ Pas de boucle infinie même si les données changent fréquemment
- ✅ Pas de multiples intervalles créés simultanément

## Tests à effectuer

1. Créer une collection → Vérifier que le polling démarre
2. Attendre que la collection soit terminée → Vérifier que le polling s'arrête
3. Ouvrir plusieurs onglets → Vérifier qu'il n'y a pas de conflit
4. Surveiller la console réseau → Vérifier qu'il n'y a pas de requêtes toutes les 150-250ms

