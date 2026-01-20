# Configuration Sentry

Ce document explique comment configurer et utiliser Sentry dans l'application Citizen Vitae.

## 📋 Prérequis

1. Créer un compte sur [sentry.io](https://sentry.io)
2. Créer un nouveau projet pour votre application React
3. Obtenir votre DSN (Data Source Name) depuis les paramètres du projet

## 🔧 Configuration

### 1. Variables d'environnement

Créez un fichier `.env.local` à la racine du projet avec les variables suivantes :

```bash
# OBLIGATOIRE - DSN de votre projet Sentry
VITE_SENTRY_DSN=https://your-key@o123456.ingest.sentry.io/123456

# OPTIONNEL - Pour l'upload des source maps en production
VITE_SENTRY_ORG=your-organization-slug
VITE_SENTRY_PROJECT=your-project-slug
VITE_SENTRY_AUTH_TOKEN=your-auth-token

# OPTIONNEL - Version de l'application
VITE_APP_VERSION=1.0.0
```

### 2. Obtenir le DSN

1. Connectez-vous sur [sentry.io](https://sentry.io)
2. Sélectionnez votre projet
3. Allez dans **Settings** > **Projects** > **[Votre Projet]** > **Client Keys (DSN)**
4. Copiez le DSN et collez-le dans votre fichier `.env.local`

### 3. Configuration de l'Auth Token (pour production)

Pour uploader les source maps en production :

1. Allez sur [sentry.io/settings/account/api/auth-tokens/](https://sentry.io/settings/account/api/auth-tokens/)
2. Cliquez sur **Create New Token**
3. Donnez-lui un nom (ex: "Citizen Vitae Production")
4. Sélectionnez les permissions :
   - ✅ `project:releases`
   - ✅ `project:write`
5. Copiez le token et ajoutez-le dans `.env.local` comme `VITE_SENTRY_AUTH_TOKEN`

## 🚀 Fonctionnalités implémentées

### 1. Initialisation automatique

Sentry est automatiquement initialisé au démarrage de l'application dans `src/main.tsx`.

### 2. Tracking des utilisateurs

Lorsqu'un utilisateur se connecte, ses informations sont automatiquement envoyées à Sentry :
- ID utilisateur
- Email
- Nom d'utilisateur

Cela permet de savoir quel utilisateur a rencontré quelle erreur.

### 3. Error Boundary

Un ErrorBoundary global capture toutes les erreurs de rendu React et les envoie à Sentry.

### 4. Session Replay

Les sessions des utilisateurs sont enregistrées (avec masquage automatique des données sensibles) :
- 10% des sessions normales
- 100% des sessions avec erreur

### 5. Performance Monitoring

Les performances de l'application sont monitorées :
- 100% des transactions en développement
- 10% des transactions en production (pour limiter les coûts)

## 📊 Utilisation avancée

### Capturer une erreur manuellement

```typescript
import { captureException } from '@/lib/sentry';

try {
  // Code qui peut échouer
  riskyOperation();
} catch (error) {
  captureException(error, {
    feature: 'user-registration',
    step: 'email-verification'
  });
}
```

### Capturer un message

```typescript
import { captureMessage } from '@/lib/sentry';

captureMessage('Événement important détecté', 'warning');
```

### Ajouter un contexte

```typescript
import { setContext } from '@/lib/sentry';

setContext('payment', {
  amount: 99.99,
  currency: 'EUR',
  method: 'credit_card'
});
```

### Ajouter des tags

```typescript
import { setTag } from '@/lib/sentry';

setTag('feature', 'event-registration');
setTag('user_type', 'premium');
```

## 🔒 Sécurité et confidentialité

Sentry est configuré pour protéger les données sensibles :

1. **Masquage automatique** : Tout le texte et les médias sont masqués dans les replays
2. **Filtrage des erreurs** : Les erreurs non pertinentes sont filtrées (extensions de navigateur, erreurs réseau temporaires)
3. **Filtrage des breadcrumbs** : Les clics sur les champs sensibles (mots de passe, cartes de crédit) ne sont pas enregistrés
4. **Désactivé en développement** : Par défaut, Sentry n'envoie pas de données en mode développement local

## 🧪 Test de l'intégration

### Méthode 1 : Utiliser le composant de test (Recommandé)

Un composant de test a été intégré dans le **tableau de bord Super Admin** :

1. Connectez-vous avec un compte super admin
2. Allez sur `/super-admin`
3. Dans l'onglet "Vue d'ensemble", vous trouverez la section **"Tests Sentry"**
4. Cliquez sur les différents boutons pour tester :
   - **Erreur capturée** : Envoie une erreur gérée à Sentry
   - **Message info** : Envoie un message informatif
   - **Avertissement** : Envoie un warning
   - **Crash ErrorBoundary** : ⚠️ Fait volontairement planter l'app pour tester l'ErrorBoundary

### Méthode 2 : Tester manuellement dans le code

```typescript
// Dans n'importe quel composant
import { captureMessage } from '@/lib/sentry';

const handleTest = () => {
  captureMessage('Test Sentry - ça fonctionne !', 'info');
};
```

Ou pour tester l'ErrorBoundary :

```typescript
const handleTestError = () => {
  throw new Error('Test d\'erreur pour Sentry');
};
```

## 📈 Monitoring en production

Une fois déployé en production :

1. Visitez votre projet sur [sentry.io](https://sentry.io)
2. Consultez le dashboard **Issues** pour voir les erreurs
3. Utilisez **Performance** pour analyser les performances
4. Regardez **Replays** pour voir les sessions utilisateurs

## 🛠️ Dépannage

### Sentry n'envoie pas d'erreurs

Vérifiez que :
- Le DSN est bien configuré dans `.env.local`
- Vous n'êtes pas en mode développement (`MODE=development` désactive Sentry par défaut)
- Les erreurs ne sont pas filtrées par `beforeSend` dans `src/lib/sentry.ts`

### Les source maps ne sont pas uploadées

Vérifiez que :
- `VITE_SENTRY_AUTH_TOKEN` est configuré
- `VITE_SENTRY_ORG` et `VITE_SENTRY_PROJECT` sont corrects
- Vous buildez en mode production (`npm run build`)

## 📚 Ressources

- [Documentation officielle Sentry](https://docs.sentry.io/)
- [Sentry React SDK](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Sentry Vite Plugin](https://docs.sentry.io/platforms/javascript/guides/react/sourcemaps/uploading/vite/)
