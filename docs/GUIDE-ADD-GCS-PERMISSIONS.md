# Guide Étape par Étape : Ajouter les Permissions GCS

## 📋 Prérequis
- Accès à Google Cloud Console avec les droits d'administration
- Projet : `helpdesk-476610`

## 🚀 Étapes Détaillées

### Étape 1 : Accéder à Google Cloud Console
1. Ouvrez votre navigateur
2. Allez sur : **https://console.cloud.google.com**
3. Connectez-vous avec votre compte Google qui a accès au projet

### Étape 2 : Sélectionner le Projet
1. En haut de la page, cliquez sur le sélecteur de projet (à côté de "Google Cloud")
2. Sélectionnez ou recherchez : **helpdesk-476610**
3. Cliquez sur le projet pour le sélectionner

### Étape 3 : Accéder aux Service Accounts
1. Dans le menu de gauche (☰), cliquez sur **"IAM & Admin"**
2. Dans le sous-menu, cliquez sur **"Service Accounts"**
3. Vous verrez une liste de comptes de service

### Étape 4 : Trouver le Compte de Service
1. Dans la liste, recherchez : **nothly-storage@helpdesk-476610.iam.gserviceaccount.com**
2. Cliquez sur l'email du compte de service pour l'ouvrir

### Étape 5 : Ajouter le Rôle
1. Une fois sur la page du compte de service, vous verrez plusieurs onglets
2. Cliquez sur l'onglet **"Permissions"** (ou **"PERMISSIONS"**)
3. Vous verrez une section "Grant this service account access to project"
4. Cliquez sur le bouton **"Grant Access"** (ou **"ADD PRINCIPAL"** si vous voyez ce bouton)

### Étape 6 : Sélectionner le Rôle
1. Dans le champ "Select a role", commencez à taper : **Storage Object Admin**
2. Sélectionnez **"Storage Object Admin"** dans la liste déroulante
   - Ce rôle donne toutes les permissions nécessaires pour les fichiers
3. Cliquez sur **"Save"** (ou **"Grant Access"**)

### Étape 7 : Vérifier
1. Vous devriez voir le rôle **"Storage Object Admin"** apparaître dans la liste des permissions
2. Attendez **2-5 minutes** pour que les changements se propagent

## ✅ Vérification

Une fois les permissions ajoutées, revenez au terminal et exécutez :

```bash
cd /Users/macbookmae/Desktop/note_fi
npx tsx --env-file=.env.local scripts/test-storage-auth.ts
```

Vous devriez voir :
```
✅ All tests passed! Google Cloud Storage is configured correctly.
   The service account has the necessary permissions for file operations.
```

## 🔍 Alternative : Via IAM

Si vous ne trouvez pas l'option dans Service Accounts, vous pouvez aussi :

1. Aller dans **IAM & Admin** → **IAM**
2. Cliquer sur **"Grant Access"** (ou **"ADD"**)
3. Dans "New principals", entrez : `nothly-storage@helpdesk-476610.iam.gserviceaccount.com`
4. Sélectionnez le rôle : **Storage Object Admin**
5. Cliquez sur **"Save"**

## ❓ Problèmes Courants

### "You don't have permission to grant access"
- Vous devez avoir le rôle "Owner" ou "IAM Admin" sur le projet
- Contactez l'administrateur du projet

### Le rôle n'apparaît pas dans la liste
- Tapez "Storage" dans la recherche pour filtrer
- Assurez-vous de sélectionner "Storage Object Admin" (pas "Storage Admin" ou "Storage Legacy")

### Les permissions ne fonctionnent pas immédiatement
- Attendez 2-5 minutes pour la propagation
- Rafraîchissez la page de la console
- Relancez le test

## 📞 Besoin d'Aide ?

Si vous rencontrez des problèmes, vérifiez :
1. Que vous êtes bien connecté au bon projet (`helpdesk-476610`)
2. Que le compte de service existe bien
3. Que vous avez les droits d'administration sur le projet

