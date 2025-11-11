# 🔄 Guide de redémarrage propre du serveur dev

## Si vous voyez des erreurs 404 sur les fichiers CSS/JS

### 1️⃣ Arrêter tous les processus Next.js
```bash
pkill -f "next dev"
```

### 2️⃣ Libérer le port 3000 (si nécessaire)
```bash
lsof -ti:3000 | xargs kill -9
```

### 3️⃣ Nettoyer complètement
```bash
npm run clean
```

### 4️⃣ Redémarrer le serveur dev
```bash
npm run dev
```

### 5️⃣ Vider le cache du navigateur
- **Chrome/Edge** : `Cmd+Shift+R` (Mac) ou `Ctrl+Shift+R` (Windows)
- **Firefox** : `Cmd+Shift+R` (Mac) ou `Ctrl+F5` (Windows)
- **Safari** : `Cmd+Option+R`

## ⚠️ Causes courantes des erreurs 404

1. **Plusieurs serveurs Next.js actifs** - Arrêter tous les processus
2. **Cache corrompu** - Utiliser `npm run clean`
3. **Port occupé** - Libérer le port 3000
4. **Cache navigateur** - Vider le cache ou utiliser le mode incognito

## ✅ Vérification

Une fois le serveur démarré, vous devriez voir :
```
▲ Next.js 14.2.33
- Local:        http://localhost:3000
```

Si les fichiers ne se chargent toujours pas, vérifiez la console du navigateur pour d'autres erreurs.

