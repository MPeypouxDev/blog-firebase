# Configuration Firestore - Résolution du problème "Access Denied"

## Problème
Votre application affiche "Accès refusé" car les règles de sécurité Firestore bloquent l'accès aux données.

## Solution : Configurer les règles Firestore

### 1. Accéder à la console Firebase
1. Allez sur https://console.firebase.google.com/
2. Sélectionnez votre projet `blog-tutoriel-alm-2ec0e`
3. Dans le menu de gauche, cliquez sur "Firestore Database"
4. Cliquez sur l'onglet "Règles" (Rules)

### 2. Règles de sécurité recommandées

#### Option 1: Règles de base (pour le développement)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Règles pour les utilisateurs
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Règles pour les articles
    match /articles/{articleId} {
      // Lecture: tous les utilisateurs connectés
      allow read: if request.auth != null;
      
      // Écriture: utilisateurs connectés peuvent créer
      allow create: if request.auth != null 
        && request.auth.uid == resource.data.userId;
      
      // Modification/suppression: seulement le propriétaire ou admin
      allow update, delete: if request.auth != null 
        && (request.auth.uid == resource.data.userId 
            || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }
  }
}
```

#### Option 2: Règles temporaires (UNIQUEMENT pour les tests)
⚠️ **ATTENTION: Ne pas utiliser en production!**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 3. Appliquer les règles
1. Copiez les règles choisies dans l'éditeur
2. Cliquez sur "Publier" (Publish)
3. Attendez quelques secondes pour la propagation

### 4. Tester l'application
1. Rechargez votre application
2. Connectez-vous avec un compte
3. Les articles devraient maintenant se charger

### 5. Créer un article de test
Si aucun article n'existe, vous pouvez:
1. Ouvrir la console du navigateur (F12)
2. Taper: `createTestArticle()`
3. Appuyer sur Entrée

## Structure des données

### Collection `users`
```javascript
{
  email: "user@example.com",
  displayName: "Nom Utilisateur",
  role: "user" | "admin",
  createdAt: timestamp
}
```

### Collection `articles`
```javascript
{
  title: "Titre de l'article",
  content: "Contenu de l'article",
  userName: "Nom de l'auteur",
  userId: "uid-de-l-auteur",
  published: true,
  createdAt: timestamp
}
```

## Dépannage

### Si les articles ne se chargent toujours pas:
1. Vérifiez la console du navigateur pour les erreurs
2. Assurez-vous d'être connecté
3. Vérifiez que les règles sont bien publiées
4. Attendez quelques minutes (propagation des règles)

### Pour devenir admin:
1. Allez dans la console Firebase > Firestore
2. Trouvez votre document dans la collection `users`
3. Modifiez le champ `role` de `"user"` à `"admin"`

## Sécurité

⚠️ **Important**: Les règles temporaires (Option 2) permettent à tous les utilisateurs connectés de lire/écrire toutes les données. Utilisez les règles de base (Option 1) dès que possible.

✅ **Recommandé**: Utilisez toujours les règles de base qui limitent l'accès selon les permissions appropriées.