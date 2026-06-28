# Guide de démarrage rapide - History Pins

## 🚀 Démarrage en 3 étapes

### 1. Installer les dépendances

```bash
npm install
```

### 2. Configurer Supabase

Créez un fichier `.env.local` à la racine du projet :

```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-cle-publique-anon
```

Pour obtenir ces informations :
1. Allez sur votre projet Supabase
2. Settings → API
3. Copiez "Project URL" et "anon public" key

### 3. Lancer le projet

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) 🎉

---

## 📋 Vérification de la base de données

Avant de lancer l'application, assurez-vous que votre base Supabase contient :

### Tables requises
- ✅ `stories` (avec au moins une story `status = 'published'`)
- ✅ `story_versions` (avec `is_selected = true`)
- ✅ `story_scenes` (triées par `idx`)
- ✅ `story_images` (avec `status = 'approved'`)
- ⚠️ `story_audio` (optionnel, pour le mode audio)

### Requête de test SQL

Exécutez ceci dans l'éditeur SQL Supabase pour vérifier :

```sql
-- Vérifier les stories publiées
SELECT COUNT(*) as nb_stories_publiees
FROM stories
WHERE status = 'published';

-- Vérifier qu'une story a bien ses assets
SELECT 
  s.title,
  sv.is_selected,
  COUNT(DISTINCT sc.id) as nb_scenes,
  COUNT(DISTINCT si.id) as nb_images
FROM stories s
LEFT JOIN story_versions sv ON sv.story_id = s.id AND sv.is_selected = true
LEFT JOIN story_scenes sc ON sc.story_id = s.id
LEFT JOIN story_images si ON si.scene_id = sc.id AND si.status = 'approved'
WHERE s.status = 'published'
GROUP BY s.id, s.title, sv.is_selected
LIMIT 5;
```

---

## 🐛 Dépannage

### Erreur : "Cannot find module 'leaflet'"

```bash
npm install leaflet react-leaflet @types/leaflet --save
```

### Erreur : Variables d'environnement non définies

Vérifiez que :
1. Le fichier `.env.local` existe à la racine
2. Les variables commencent bien par `NEXT_PUBLIC_`
3. Redémarrez le serveur de dev après modification

### La carte ne s'affiche pas

Vérifiez dans la console du navigateur. Problèmes courants :
- CSS Leaflet non chargé → vérifier `globals.css`
- Markers non visibles → vérifier les coordonnées lat/lng

### Aucune story n'apparaît

1. Vérifiez la console pour les erreurs Supabase
2. Vérifiez que des stories ont `status = 'published'`
3. Vérifiez les politiques RLS (Row Level Security) de Supabase

---

## 📦 Structure après installation

```
history-pins/
├── .env.local              # ⚠️ À créer (voir .env.example)
├── package.json            # Dépendances
├── next.config.js          # Config Next.js
├── tailwind.config.ts      # Config Tailwind
├── tsconfig.json           # Config TypeScript
├── src/
│   ├── app/               # Pages Next.js
│   ├── components/        # Composants React
│   ├── hooks/             # Hooks personnalisés
│   ├── lib/               # Client Supabase
│   ├── services/          # Services de données
│   └── types/             # Types TypeScript
└── public/                # Assets statiques
```

---

## 🎯 Prochaines étapes

1. **Tester l'application** : Cliquez sur un marker pour ouvrir une story
2. **Ajouter du contenu** : Ajoutez des stories dans Supabase
3. **Personnaliser** : Modifiez les styles dans `tailwind.config.ts`
4. **Déployer** : Utilisez Vercel pour un déploiement rapide

---

## 📞 Besoin d'aide ?

- Vérifiez le README.md pour la documentation complète
- Consultez la [documentation Next.js](https://nextjs.org/docs)
- Consultez la [documentation Supabase](https://supabase.com/docs)

