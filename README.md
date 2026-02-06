# Notlhy - Application de notes intelligentes avec IA

Application web freemium de prise de notes avec génération automatique de fiches de révision et de quiz par intelligence artificielle.

## 🚀 Fonctionnalités

### Version Gratuite (Free)
- ✅ Création et édition de notes illimitées
- ✅ Interface élégante et minimaliste
- ✅ Auto-save après chaque modification
- ✅ Export Markdown/PDF

### Version Payante (Pro) - 9,99€/mois
- ✨ Génération automatique de fiches de révision par IA
- ✨ Génération de quiz interactifs par IA
- ✨ 1M de tokens par mois (GPT-4o-mini)
- ✨ Support prioritaire

## 🛠️ Stack Technique

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Base de données**: Supabase (PostgreSQL)
- **Authentification**: Mock login (dev) / Supabase Auth (production)
- **Paiements**: Stripe (abonnements)
- **IA**: OpenAI API (GPT-4o-mini)
- **Déploiement**: Vercel

## 📦 Installation locale

### Prérequis

- Node.js 18+ et npm/pnpm/yarn
- Un compte Supabase
- Un compte Stripe
- Une clé API OpenAI

### 1. Cloner et installer les dépendances

```bash
npm install
# ou
pnpm install
# ou
yarn install
```

### 2. Configurer Supabase

1. Créez un nouveau projet sur [supabase.com](https://supabase.com)
2. Allez dans l'éditeur SQL et exécutez le fichier `supabase-schema.sql`
3. Récupérez vos clés API dans Settings > API

### 3. Configurer Stripe

1. Créez un compte sur [stripe.com](https://stripe.com)
2. Créez un produit "Notlhy Pro" avec un prix récurrent de 9,99€/mois
3. Récupérez l'ID du prix (commence par `price_...`)
4. Récupérez vos clés API (test keys pour le développement)
5. Configurez un webhook pointant vers `https://votre-domaine.com/api/stripe/webhook`
   - Événements à écouter: `checkout.session.completed`, `customer.subscription.deleted`
   - Récupérez le secret du webhook (commence par `whsec_...`)

### 4. Configurer OpenAI

1. Créez un compte sur [platform.openai.com](https://platform.openai.com)
2. Générez une clé API dans API keys
3. Ajoutez du crédit à votre compte

### 5. Variables d'environnement

Créez un fichier `.env.local` à la racine du projet :

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_anon_key
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_PRO=price_...

# OpenAI
OPENAI_API_KEY=sk-...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 6. Lancer en local

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

## 🚢 Déploiement sur Vercel

### 1. Préparer le projet

1. Créez un compte sur [vercel.com](https://vercel.com)
2. Installez la CLI Vercel (optionnel) :
   ```bash
   npm i -g vercel
   ```

### 2. Déployer depuis GitHub

1. Push votre code sur GitHub
2. Sur Vercel, cliquez sur "New Project"
3. Importez votre repository GitHub
4. Configurez les variables d'environnement (copiez celles de `.env.local`)
5. Changez `NEXT_PUBLIC_APP_URL` pour votre URL de production
6. Cliquez sur "Deploy"

### 3. Configurer le webhook Stripe en production

1. Allez dans votre dashboard Stripe
2. Créez un nouveau webhook pointant vers `https://votre-domaine.vercel.app/api/stripe/webhook`
3. Copiez le secret du webhook
4. Mettez à jour la variable `STRIPE_WEBHOOK_SECRET` dans Vercel
5. Redéployez l'application

### 4. Tester le webhook

Pour tester le webhook en local, utilisez la CLI Stripe :

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## 📁 Structure du projet

```
/
├── app/
│   ├── (marketing)/          # Pages publiques
│   │   ├── page.tsx          # Landing page
│   │   └── pricing/          # Page tarifs
│   ├── dashboard/            # Interface principale
│   │   ├── page.tsx          # Dashboard serveur
│   │   └── dashboard-client.tsx  # Dashboard client
│   ├── api/
│   │   ├── dev-login/        # Authentification dev
│   │   ├── notes/            # CRUD notes
│   │   ├── ai/               # Génération IA
│   │   └── stripe/           # Intégration Stripe
│   │       ├── checkout/     # Créer session checkout
│   │       └── webhook/      # Recevoir événements
│   ├── layout.tsx            # Layout racine
│   └── globals.css           # Styles globaux
├── components/
│   ├── ui/                   # Composants shadcn/ui
│   └── navbar.tsx            # Barre de navigation
├── lib/
│   ├── db.ts                 # Client Supabase
│   ├── auth.ts               # Gestion auth
│   ├── billing.ts            # Gestion quotas
│   └── utils.ts              # Utilitaires
├── middleware.ts             # Protection routes
├── supabase-schema.sql       # Schema base de données
└── package.json              # Dépendances
```

## 🔐 Authentification

En développement, l'application utilise un système de login simplifié (mock) :
- Accédez à `/api/dev-login`
- Entrez n'importe quel email
- Un utilisateur sera créé automatiquement

Pour la production, vous pouvez remplacer par Supabase Auth :
- Modifier `lib/auth.ts` pour utiliser `supabase.auth.signIn()`
- Ajouter les providers OAuth si nécessaire

## 🤖 IA - Génération de contenu

L'application utilise GPT-4o-mini pour :
- **Fiches de révision** : Extraction des concepts clés, définitions, points essentiels
- **Quiz** : Génération de QCM, vrai/faux, questions ouvertes avec corrections

Les prompts sont dans `app/api/ai/route.ts` et peuvent être personnalisés.

## 💳 Stripe - Gestion des abonnements

### Flow de paiement

1. L'utilisateur clique sur "Passer à Pro"
2. Redirection vers Stripe Checkout (`/api/stripe/checkout`)
3. Paiement et création de l'abonnement
4. Stripe envoie un webhook `checkout.session.completed`
5. Le rôle de l'utilisateur passe à `pro` dans la DB
6. Redirection vers le dashboard

### Annulation d'abonnement

1. L'utilisateur annule depuis le portail client Stripe
2. Stripe envoie un webhook `customer.subscription.deleted`
3. Le rôle de l'utilisateur revient à `free` dans la DB

## 📊 Quotas et usage

- Les utilisateurs Pro ont 1M de tokens/mois
- Le comptage se fait dans la table `usage_counters`
- La limite est vérifiée avant chaque appel à l'IA
- Le reset se fait automatiquement chaque mois

## 🎨 Personnalisation

### Modifier le branding

- **Nom** : Rechercher "Notlhy" et remplacer
- **Couleurs** : Modifier les gradients dans `app/globals.css` et les composants
- **Logo** : Ajouter un logo dans `/public` et l'importer dans `navbar.tsx`

### Modifier les plans tarifaires

1. Mettez à jour `app/(marketing)/pricing/page.tsx`
2. Créez de nouveaux produits dans Stripe
3. Mettez à jour les logiques dans `lib/billing.ts`

## 🐛 Debugging

### Logs Vercel

```bash
vercel logs
```

### Tester les webhooks Stripe

```bash
stripe trigger checkout.session.completed
```

### Tester l'API IA

```bash
curl -X POST http://localhost:3000/api/ai \
  -H "Content-Type: application/json" \
  -H "Cookie: user-id=votre-user-id" \
  -d '{"content":"Notes de cours sur la photosynthèse...","type":"fiche"}'
```

## 📝 TODO / Améliorations futures

- [x] Authentification Supabase complète (OAuth, email/password)
- [x] Mode sombre
- [x] Recherche de notes
- [x] Tags et catégories
- [ ] **Notifications** — La page Settings > Notifications est prête côté UI (toggles pour email, push, suggestions IA, digest hebdo, nouvelles features, marketing). Il reste à brancher un vrai backend de notifications (email via Resend/SendGrid, push via Web Push API). La page est actuellement désactivée avec un bandeau "Bientôt disponible".
- [ ] Partage de notes
- [ ] Export PDF avancé avec mise en page
- [ ] Statistiques d'usage
- [ ] Système d'abonnement Stripe (actuellement en bêta publique gratuite)
- [ ] Application mobile (React Native)

## 🆘 Support

Pour toute question ou problème :
- Ouvrez une issue sur GitHub
- Consultez la documentation des services utilisés :
  - [Next.js](https://nextjs.org/docs)
  - [Supabase](https://supabase.com/docs)
  - [Stripe](https://stripe.com/docs)
  - [OpenAI](https://platform.openai.com/docs)

## 📄 Licence

MIT - Libre d'utilisation et de modification

---

Développé avec ❤️ en Next.js 14

