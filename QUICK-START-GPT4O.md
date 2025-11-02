# 🚀 Quick Start : Chat GPT-4o

## ⚡ Configuration rapide (2 minutes)

### 1️⃣ Ajoutez votre clé API OpenAI

Éditez (ou créez) le fichier `.env.local` :

```bash
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Obtenez votre clé sur :** https://platform.openai.com/api-keys

---

### 2️⃣ Redémarrez le serveur

```bash
# Arrêtez le serveur (Ctrl+C dans le terminal)
# Puis relancez :
npm run dev
```

---

### 3️⃣ Testez le chat !

1. Allez sur **http://localhost:3000**
2. Connectez-vous
3. Cliquez sur le bouton **🤖** en bas à droite
4. Tapez "Bonjour !" et appuyez sur Enter
5. GPT-4o vous répond ! 🎉

---

## ✅ Fichiers créés

- ✅ `app/api/chat/route.ts` - Route API
- ✅ `lib/chat.ts` - Helper
- ✅ `components/AIChat.tsx` - Mis à jour

---

## 💰 Coûts

**~1.4 centimes par conversation** (5 échanges)

---

## 🐛 Problème ?

### "Vérifiez votre clé API"
→ Assurez-vous que `OPENAI_API_KEY` est dans `.env.local`  
→ Redémarrez le serveur

### "Non authentifié"
→ Connectez-vous à votre compte

### "Quota exceeded"
→ Ajoutez des crédits sur platform.openai.com

---

## 📖 Documentation complète

Lisez **GUIDE-CHAT-GPT4O.md** pour :
- Architecture détaillée
- Personnalisation
- Fonctionnalités avancées
- Dépannage complet

---

**C'est tout ! Profitez de votre chat IA ! 🚀**

