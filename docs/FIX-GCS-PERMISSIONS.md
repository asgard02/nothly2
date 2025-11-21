# Fix Google Cloud Storage Permissions

## Problème
Le compte de service `nothly-storage@helpdesk-476610.iam.gserviceaccount.com` n'a pas les permissions nécessaires pour accéder au bucket Google Cloud Storage.

## Erreurs rencontrées
- `storage.buckets.get` denied (non bloquant - corrigé dans le code)
- `storage.objects.create` denied (bloquant)
- `storage.objects.get` denied (bloquant)
- `storage.objects.delete` denied (bloquant)

## Solution

### 1. Accéder à Google Cloud Console
1. Allez sur https://console.cloud.google.com
2. Sélectionnez le projet : **helpdesk-476610**

### 2. Ajouter les permissions au compte de service
1. Naviguez vers **IAM & Admin** → **Service Accounts**
2. Trouvez le compte : `nothly-storage@helpdesk-476610.iam.gserviceaccount.com`
3. Cliquez sur le compte pour l'ouvrir
4. Cliquez sur l'onglet **"Permissions"** ou **"Edit"**
5. Cliquez sur **"Add Another Role"**
6. Sélectionnez le rôle : **Storage Object Admin**
   - Ce rôle inclut toutes les permissions nécessaires :
     - `storage.objects.create`
     - `storage.objects.get`
     - `storage.objects.delete`
     - `storage.objects.list`
7. Cliquez sur **"Save"**

### 3. Vérifier les permissions
Attendez 2-5 minutes pour que les changements se propagent, puis testez :

```bash
npx tsx --env-file=.env.local scripts/test-storage-auth.ts
```

## Rôles disponibles

### Storage Object Admin (recommandé)
- Permissions complètes sur les objets (fichiers) dans le bucket
- Ne permet pas de gérer le bucket lui-même
- Suffisant pour l'application

### Storage Admin
- Permissions complètes sur le bucket et les objets
- Permet de créer/supprimer des buckets
- Plus de permissions que nécessaire

### Storage Legacy Bucket Reader + Storage Legacy Object Owner
- Alternative si vous préférez des rôles plus granulaires
- Moins recommandé car les rôles "Legacy" sont dépréciés

## Vérification après correction

Une fois les permissions ajoutées, le test devrait afficher :
```
✅ All tests passed! Google Cloud Storage is configured correctly.
   The service account has the necessary permissions for file operations.
```

## Notes
- Les changements de permissions peuvent prendre quelques minutes à se propager
- Le code a été modifié pour gérer gracieusement l'absence de `storage.buckets.get`
- Le bucket sera créé automatiquement lors du premier upload si nécessaire

