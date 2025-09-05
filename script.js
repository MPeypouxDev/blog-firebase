// CONFIGURATION FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyBCxduN_cLwZmWv99AqnEnrSGjiJXopuAk",
  authDomain: "blog-tutoriel-alm-2ec0e.firebaseapp.com",
  projectId: "blog-tutoriel-alm-2ec0e",
  storageBucket: "blog-tutoriel-alm-2ec0e.firebasestorage.app",
  messagingSenderId: "333763461798",
  appId: "1:333763461798:web:e40a5ff99cac6e504aaa67",
};

// Initialisation de Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// VARIABLES GLOBALES
let currentUser = null; // Utilisateur connecté
let currentEditingArticle = null; // Article en cours d'édition
let isAdmin = false; // Statut admin
let isLoadingArticles = false; // Flag de chargement

// MODAL
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.add("active");
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.remove("active");
}

function showMessage(message, type) {
  const container = document.getElementById("messageContainer");
  if (!message) {
    return;
  }
  const content = document.createElement("div");
  content.textContent = message;
  container.appendChild(content);
  if (type === "success") {
    content.className = "message-success";
  } else if (type === "error") {
    content.className = "message-error";
  }
  setTimeout(() => {
    content.remove();
  }, 3000);
}

// OBSERVER D'AUTHENTIFICATION
auth.onAuthStateChanged(async (user) => {
  currentUser = user;

  if (user) {
    console.log("✅ Utilisateur connecté:", user.email);

    // Récupérer les informations utilisateur
    try {
      const userDoc = await db.collection("users").doc(user.uid).get();

      if (userDoc.exists) {
        const userData = userDoc.data();
        isAdmin = userData.role === "admin";
        document.getElementById("userInfo").textContent = `Bonjour, ${
          userData.displayName || user.email
        }`;
      } else {
        // Créer le profil si inexistant
        await db
          .collection("users")
          .doc(user.uid)
          .set({
            email: user.email,
            displayName: user.displayName || user.email.split("@")[0],
            role: "user",
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
      }
    } catch (error) {
      console.error("Erreur lors de la récupération du profil:", error);
    }

    // Mise à jour de l'interface
    document.getElementById("loginBtn").style.display = "none";
    document.getElementById("registerBtn").style.display = "none";
    document.getElementById("logoutBtn").style.display = "block";

    if (isAdmin) {
      document.getElementById("adminPanel").style.display = "block";
    }
  } else {
    console.log("👤 Utilisateur déconnecté");

    // Réinitialisation
    document.getElementById("userInfo").textContent = "";
    document.getElementById("loginBtn").style.display = "block";
    document.getElementById("registerBtn").style.display = "block";
    document.getElementById("logoutBtn").style.display = "none";
    document.getElementById("adminPanel").style.display = "none";
    isAdmin = false;
  }

  // Recharger les articles
  loadArticles();
});

// EVENT LISTENERS
document.addEventListener("DOMContentLoaded", () => {
  // Boutons d'authentification
  document
    .getElementById("loginBtn")
    .addEventListener("click", () => openModal("loginModal"));

  document
    .getElementById("registerBtn")
    .addEventListener("click", () => openModal("registerModal"));

  document.getElementById("logoutBtn").addEventListener("click", logout);

  // Bouton nouvel article (admin)
  const newArticleBtn = document.getElementById("newArticleBtn");
  if (newArticleBtn) {
    newArticleBtn.addEventListener("click", () => {
      currentEditingArticle = null;
      document.getElementById("articleModalTitle").textContent =
        "Nouvel Article";
      document.getElementById("articleForm").reset();
      openModal("articleModal");
    });
  }

  // Formulaires
  document.getElementById("loginForm").addEventListener("submit", handleLogin);
  document
    .getElementById("registerForm")
    .addEventListener("submit", handleRegister);
  document
    .getElementById("articleForm")
    .addEventListener("submit", handleArticleSubmit);
});

// ========================================
// CONNEXION
// ========================================
async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  try {
    console.log("🔐 Tentative de connexion...");
    await auth.signInWithEmailAndPassword(email, password);
    closeModal("loginModal");
    showMessage("✅ Connexion réussie !", "success");
    document.getElementById("loginForm").reset();
  } catch (error) {
    console.error("Erreur de connexion:", error);

    // Messages d'erreur personnalisés
    let message = "Erreur de connexion";
    switch (error.code) {
      case "auth/user-not-found":
        message = "Aucun compte trouvé avec cet email";
        break;
      case "auth/wrong-password":
        message = "Mot de passe incorrect";
        break;
      case "auth/invalid-email":
        message = "Email invalide";
        break;
      case "auth/too-many-requests":
        message = "Trop de tentatives. Réessayez plus tard";
        break;
    }
    showMessage(message, "error");
  }
}

// ========================================
// INSCRIPTION
// ========================================
async function handleRegister(e) {
  e.preventDefault();

  const name = document.getElementById("registerName").value;
  const email = document.getElementById("registerEmail").value;
  const password = document.getElementById("registerPassword").value;

  try {
    console.log("📝 Création du compte...");

    // Créer le compte
    const userCredential = await auth.createUserWithEmailAndPassword(
      email,
      password
    );
    const user = userCredential.user;

    // Mettre à jour le profil
    await user.updateProfile({
      displayName: name,
    });

    // Créer le document utilisateur
    await db.collection("users").doc(user.uid).set({
      email: email,
      displayName: name,
      role: "user", // Par défaut, tous les nouveaux utilisateurs sont 'user'
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    closeModal("registerModal");
    showMessage("✅ Inscription réussie ! Bienvenue " + name, "success");
    document.getElementById("registerForm").reset();
  } catch (error) {
    console.error("Erreur d'inscription:", error);

    let message = "Erreur lors de l'inscription";
    switch (error.code) {
      case "auth/email-already-in-use":
        message = "Cet email est déjà utilisé";
        break;
      case "auth/weak-password":
        message = "Le mot de passe doit contenir au moins 6 caractères";
        break;
      case "auth/invalid-email":
        message = "Email invalide";
        break;
    }
    showMessage(message, "error");
  }
}

async function handleArticleSubmit(e) {
  e.preventDefault();

  const title = document.getElementById("articleTitle").value.trim();
  const content = document.getElementById("articleContent").value.trim();
  const isPublished = document.getElementById("articlePublished").checked;

  if (!title || !content) {
    showMessage("Veuillez entrer un titre d'article et du contenu");
    return;
  }

  if (title.length < 5) {
    showMessage("Veuillez entrer un minimum de 5 lettres pour votre titre");
    return;
  }

  if (!auth.currentUser) {
    showMessage("Veuillez vous connecter", "error");
    return;
  }

  const name =
    auth.currentUser.displayName || auth.currentUser.email || "Anonyme";
  const articleData = {
    title: title,
    content: content,
    userName: name,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    isPublished: isPublished,
  };

  try {
    await db.collection("articles").add(articleData);
    showMessage("Article créé avec succès", "success");
    closeModal("articleModal");
    document.getElementById("articleForm").reset();
  } catch (error) {
    showMessage("Erreur lors de la sauvegarde", "error");
  }
}

async function loadArticles() {
  const container = document.getElementById("articlesContainer");
  container.innerHTML =
    '<div class="loading"><div class="spinner"></div>Chargement des articles...</div>';

  try {
    console.log("Début du chargement des articles...");
    console.log(
      "Utilisateur connecté:",
      currentUser ? currentUser.email : "Non connecté"
    );

    // Vérifier si l'utilisateur est connecté
    if (!currentUser) {
      container.innerHTML =
        '<div class="no-articles">Connectez-vous pour voir les articles</div>';
      return;
    }

    // Essayer d'abord sans orderBy pour éviter les problèmes d'index
    const snapshot = await db.collection("articles").get();

    console.log("Snapshot reçu:", snapshot.size, "documents");

    container.innerHTML = "";

    if (snapshot.empty) {
      console.log("Aucun article trouvé dans la base de données");
      container.innerHTML =
        '<div class="no-articles">Aucun article trouvé</div>';
      return;
    }

    // Convertir en array et trier par date si possible
    const articles = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      articles.push({ id: doc.id, ...data });
    });

    // Trier par date de création (plus récent en premier)
    articles.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return b.createdAt.toDate() - a.createdAt.toDate();
      }
      return 0;
    });

    // Afficher les articles
    articles.forEach((articleData) => {
      const articleElement = document.createElement("div");
      articleElement.className = "article-card";
      articleElement.innerHTML = `
                <h3>${articleData.title || "Titre non défini"}</h3>
                <p>Par ${articleData.userName || "Auteur inconnu"}</p>
                <div class="article-content">${
                  articleData.content || "Contenu non disponible"
                }</div>
                <div class="article-date">${
                  articleData.createdAt
                    ? new Date(
                        articleData.createdAt.toDate()
                      ).toLocaleDateString()
                    : "Date inconnue"
                }</div>
            `;
      container.appendChild(articleElement);
    });

    console.log("Articles affichés avec succès:", articles.length);
  } catch (error) {
    console.error("Erreur détaillée lors du chargement des articles:", error);
    console.error("Code d'erreur:", error.code);
    console.error("Message d'erreur:", error.message);

    let errorMessage = "Erreur lors du chargement des articles.";

    if (error.code === "permission-denied") {
      errorMessage =
        "Accès refusé. Les règles Firestore bloquent la lecture. Configurez les règles de sécurité dans la console Firebase.";
    } else if (error.code === "unavailable") {
      errorMessage =
        "Service temporairement indisponible. Réessayez plus tard.";
    } else if (error.message.includes("network")) {
      errorMessage =
        "Problème de connexion réseau. Vérifiez votre connexion internet.";
    }

    container.innerHTML = `<div class="error-message">${errorMessage}</div>`;
    showMessage(errorMessage, "error");
  }
}

// ========================================
// DÉCONNEXION
// ========================================
function logout() {
  if (confirm("Voulez-vous vraiment vous déconnecter ?")) {
    auth
      .signOut()
      .then(() => {
        showMessage("👋 Déconnexion réussie", "success");
      })
      .catch((error) => {
        console.error("Erreur de déconnexion:", error);
        showMessage("Erreur lors de la déconnexion", "error");
      });
  }
}

// Fonction globale pour tester depuis la console
window.createTestArticle = createTestArticle;
