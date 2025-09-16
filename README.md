Blog de Lecteurs
Un blog collaboratif développé avec Firebase permettant aux utilisateurs de publier et partager leurs articles de lecture.
Fonctionnalités
Authentification

Inscription et connexion des utilisateurs
Gestion des profils utilisateurs
Système de rôles (utilisateur/administrateur)

Gestion des articles

Création d'articles avec titre et contenu
Publication immédiate ou sauvegarde en brouillon
Modification des articles existants
Suppression des articles (administrateurs uniquement)
Pagination des articles

Système d'interaction

Système de likes sur les articles
Commentaires sur les articles
Affichage des métadonnées (auteur, date de publication)

Filtres et recherche

Filtrage par auteur
Filtrage par date (aujourd'hui, cette semaine, ce mois)
Filtrage par popularité (nombre de likes)
Filtrage par statut de publication (brouillons/publiés)

Interface utilisateur

Design glassmorphisme moderne
Interface responsive
Modales pour les formulaires
Messages de feedback utilisateur
Système de pagination

Technologies utilisées

Frontend: HTML5, CSS3, JavaScript vanilla
Backend: Firebase (Firestore, Authentication)
Base de données: Cloud Firestore
Hébergement: Compatible avec Firebase Hosting

Structure du projet
blog-lecteurs/
├── index.html          # Page principale
├── style.css          # Styles et thème glassmorphisme
├── script.js          # Logique JavaScript et Firebase
└── README.md          # Documentation
Configuration
Prérequis

Compte Firebase
Projet Firebase configuré avec Authentication et Firestore

Installation

Clonez le repository

git clone [https://github.com/MPeypouxDev/blog-firebase]
cd blog-lecteurs

Configurez Firebase dans script.js

javascriptconst firebaseConfig = {
  apiKey: "votre-api-key",
  authDomain: "votre-auth-domain",
  projectId: "votre-project-id",
  // ... autres configurations
};

Configurez les règles Firestore

javascriptrules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Règles pour la collection articles
    match /articles/{articleId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
        (request.auth.uid == resource.data.userId || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin");
      allow delete: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin";
    }
    
    // Règles pour la collection commentaires
    match /comments/{commentId} {
      allow read: if true;
      allow create: if request.auth != null;
    }
    
    // Règles pour la collection utilisateurs
    match /users/{userId} {
      allow read: if true;
      allow create, update: if request.auth != null && request.auth.uid == userId;
    }
  }
}

Activez l'authentification par email/mot de passe dans la console Firebase
Ouvrez index.html dans un navigateur ou déployez sur un serveur web

Utilisation
Pour les utilisateurs

Créez un compte ou connectez-vous
Rédigez des articles depuis le panel utilisateur
Interagissez avec les articles (likes, commentaires)
Utilisez les filtres pour trouver du contenu spécifique

Pour les administrateurs

Les administrateurs peuvent supprimer tous les articles
Accès au panel admin avec fonctionnalités étendues
Possibilité de filtrer par statut de publication

Structure des données
Collection articles
javascript{
  title: "Titre de l'article",
  content: "Contenu de l'article",
  userName: "Nom de l'auteur",
  userId: "ID Firebase de l'auteur",
  published: true/false,
  createdAt: timestamp,
  updatedAt: timestamp,
  likedBy: ["userId1", "userId2"]
}
Collection comments
javascript{
  articleId: "ID de l'article",
  userId: "ID de l'utilisateur",
  userName: "Nom de l'utilisateur",
  content: "Contenu du commentaire",
  createdAt: timestamp
}
Collection users
javascript{
  email: "email@example.com",
  displayName: "Nom d'affichage",
  role: "user" | "admin",
  createdAt: timestamp
}
Contribution
Les contributions sont les bienvenues. Veuillez suivre ces étapes :

Forkez le projet
Créez une branche pour votre fonctionnalité
Committez vos changements
Poussez vers la branche
Ouvrez une Pull Request

Licence
Ce projet est sous licence MIT. Voir le fichier LICENSE pour plus de détails.
Support
Pour toute question ou problème, ouvrez une issue sur le repository GitHub.