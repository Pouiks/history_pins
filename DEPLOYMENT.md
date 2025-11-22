# Guide de déploiement - Métronome

## 🚀 Déploiement sur Vercel (Recommandé)

Vercel est la plateforme optimale pour Next.js, créée par les mêmes développeurs.

### Étape 1 : Préparer le projet

1. **Commitez votre code** (si Git n'est pas déjà configuré) :

```bash
git init
git add .
git commit -m "Initial commit - Métronome application"
```

2. **Poussez vers GitHub/GitLab** :

```bash
git remote add origin <votre-repo-url>
git push -u origin main
```

### Étape 2 : Déployer sur Vercel

#### Option A : Via l'interface web

1. Allez sur [vercel.com](https://vercel.com)
2. Cliquez sur "Add New Project"
3. Importez votre repository GitHub
4. Vercel détectera automatiquement Next.js
5. **Configurez les variables d'environnement** :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Cliquez sur "Deploy"

#### Option B : Via Vercel CLI

```bash
# Installer Vercel CLI
npm i -g vercel

# Déployer
vercel

# Suivre les instructions interactives
# Configurer les variables d'environnement quand demandé
```

### Étape 3 : Vérifier le déploiement

- Votre app sera disponible sur `https://votre-app.vercel.app`
- Testez que la carte s'affiche
- Testez qu'une story se charge correctement

---

## 🌐 Autres plateformes

### Netlify

1. Connectez votre repository
2. Build command : `npm run build`
3. Publish directory : `.next`
4. Ajoutez les variables d'environnement dans Settings → Environment

### Docker (Auto-hébergement)

Créez un `Dockerfile` :

```dockerfile
FROM node:18-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

Buildez et lancez :

```bash
docker build -t metronome .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=your-url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key \
  metronome
```

---

## ⚙️ Configuration post-déploiement

### Domaine personnalisé

Sur Vercel :
1. Settings → Domains
2. Ajoutez votre domaine
3. Configurez les DNS selon les instructions

### Performance

Activez automatiquement par Vercel :
- ✅ Edge Network (CDN global)
- ✅ Automatic HTTPS
- ✅ Image Optimization
- ✅ Compression Gzip/Brotli

### Analytics (Optionnel)

Ajoutez Vercel Analytics :

```bash
npm install @vercel/analytics
```

Dans `src/app/layout.tsx` :

```tsx
import { Analytics } from '@vercel/analytics/react';

// Dans le return
<body>
  {children}
  <Analytics />
</body>
```

---

## 🔒 Sécurité

### Variables d'environnement

⚠️ **Important** :
- Les variables `NEXT_PUBLIC_*` sont exposées côté client
- Ne mettez JAMAIS de clés secrètes dans ces variables
- Utilisez la clé **anon** de Supabase (pas la clé service)

### Row Level Security (RLS) Supabase

Assurez-vous que vos tables ont des politiques RLS :

```sql
-- Exemple pour stories (lecture publique)
CREATE POLICY "Enable read access for all users" ON stories
FOR SELECT USING (status = 'published');

-- Appliquer à toutes les tables nécessaires
```

### CORS

Si vous utilisez un domaine personnalisé, configurez CORS dans Supabase :
1. Dashboard → Settings → API
2. Ajoutez votre domaine dans "Allowed Origins"

---

## 📊 Monitoring

### Logs Vercel

- Dashboard → Votre projet → Functions
- Voir les logs en temps réel
- Filtrer par erreur/warning

### Supabase Logs

- Dashboard Supabase → Logs
- Vérifier les requêtes lentes
- Identifier les erreurs d'authentification

---

## 🔄 Mises à jour

### Déploiement automatique

Avec Vercel + GitHub :
- Chaque push sur `main` → déploiement en production
- Chaque push sur autre branche → preview deployment

### Rollback

Sur Vercel :
1. Dashboard → Deployments
2. Sélectionnez un déploiement précédent
3. Cliquez sur "Promote to Production"

---

## ✅ Checklist pré-déploiement

- [ ] Variables d'environnement configurées
- [ ] Base de données Supabase accessible
- [ ] Au moins une story publiée en test
- [ ] RLS configuré sur Supabase
- [ ] Build local réussi (`npm run build`)
- [ ] Pas d'erreurs dans la console
- [ ] Tests sur mobile et desktop

---

## 🆘 Problèmes courants

### Build échoue

- Vérifiez `npm run build` en local
- Vérifiez les erreurs TypeScript
- Supprimez `.next` et `node_modules`, puis réinstallez

### Variables d'environnement non trouvées

- Redéployez après avoir ajouté les variables
- Vérifiez qu'elles commencent par `NEXT_PUBLIC_`

### Images ne chargent pas

- Ajoutez les domaines dans `next.config.js` → `images.domains`
- Ou utilisez `remotePatterns` (déjà configuré)

---

## 📞 Support

- [Documentation Vercel](https://vercel.com/docs)
- [Documentation Next.js](https://nextjs.org/docs/deployment)
- [Documentation Supabase](https://supabase.com/docs/guides/platform)

