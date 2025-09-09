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
let activeFilters = {
  author: null,
  date: null,
  popularity: null,
  status: null
};
let currentUser = null; // Utilisateur connecté
let currentEditingArticle = null; // Article en cours d'édition
let isAdmin = false; // Statut admin
let isLoadingArticles = false; // Flag de chargement
let currentPage = 1;
let articlesPerPage = 4;
let totalPages = 0;
let lastDocuments = {};
let pageArticleCounts = {};

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

function getDateFilter(dateType) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch(dateType) {
    case 'today':
      return today;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        return weekAgo;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setMonth(today.getMonth() - 1);
          return monthAgo;
          default:
            return null;
  }
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
      document.getElementById("statusFilterGroup").style.display = "block";
    }
  } else {
    document.getElementById("statusFilterGroup").style.display = "none";
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
  loadArticles(1);
  loadAuthors();
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
  document.getElementById('applyFilters').addEventListener('click', applyFilters);
  document.getElementById('clearFilters').addEventListener('click', clearFilters);

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
    published: isPublished,
  };

  try {
    if(currentEditingArticle === null) {
      await db.collection("articles").add(articleData);
    showMessage("Article créé avec succès", "success");
  } else {
    const updateData = {
      title: title,
      content: content,
      published: isPublished,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    await db.collection("articles").doc(currentEditingArticle).update(updateData);
    showMessage("Article modifié avec succès", "success");
  }
    closeModal("articleModal");
    document.getElementById("articleForm").reset();
    currentEditingArticle = null;
  } catch (error) {
    showMessage("Erreur lors de la sauvegarde", "error");
  }
}

async function loadArticles(page = 1) {
  if (isLoadingArticles) return;
  isLoadingArticles = true;
  currentPage = page;

  const container = document.getElementById("articlesContainer");
  container.innerHTML = "";
  try {
    let query = db.collection("articles");

    if (activeFilters.author) {
      query = query.where('userName', "==", activeFilters.author);
    }
    if (activeFilters.status && isAdmin) {
      const statusBool = activeFilters.status === 'true';
      query = query.where('published', '==', statusBool);
    }
    query = query.orderBy('createdAt', 'desc');

    if (page > 1 && lastDocuments[page - 1]) {
      query = query.startAfter(lastDocuments[page - 1]);
    }
    const needsClientFiltering = activeFilters.date || activeFilters.popularity;
    const queryLimit = needsClientFiltering ? articlesPerPage * 3 : articlesPerPage;
    query = query.limit(queryLimit);   
    const snapshot = await query.get();

    if (snapshot.empty && page === 1) {
      container.innerHTML = `<div> Aucun article trouvé </div>`;
      return;
    }

    pageArticleCounts[page] = snapshot.size;
    if (snapshot.size > 0) {
      lastDocuments[page] = snapshot.docs[snapshot.docs.length - 1];
    }
    if (snapshot.size < articlesPerPage) {
      totalPages = page;
    } else {
      totalPages =  Math.max(page + 1, totalPages);
    }
    snapshot.forEach((doc) => {
      const articleData = doc.data();
      const articleId = doc.id;
      const likesCount = articleData.likedBy ? articleData.likedBy.length : 0;
      const articleElement = document.createElement("div");
      articleElement.className = "article-card";

      if(activeFilters.date) {
        const filterDate = getDateFilter(activeFilters.date);
        if (filterDate && articleData.createdAt) {
          const articleDate = articleData.createdAt.toDate();
          if (articleDate < filterDate) {
            return;
          }
        }
      }

      if (activeFilters.popularity) {
        const likesCount = articleData.likedBy ? articleData.likedBy.length : 0;
        if (activeFilters.popularity === 'popular' && likesCount < 2) {
          return;
        }
        if (activeFilters.popularity === 'most-popular' && likesCount < 5) {
          return;
        }
      }

      let dateText = "";
      if (articleData.createdAt) {
        try {
          dateText = new Date(
            articleData.createdAt.toDate()
          ).toLocaleDateString();
        } catch (e) {
          dateText = "Date inconnue";
        }
      }
      articleElement.innerHTML = `
       <h3>${articleData.title}</h3>
       <p> Par ${articleData.userName}</p>
       <div>${articleData.content} - ${dateText}</div>

       <div class="article-actions" id="actions-${articleId}" style="display:none;">
       <button onclick="editArticle('${articleId}')" class="btn-secondary btn-small">Modifier</button>
       <button onclick="deleteArticle('${articleId}')" class="btn-danger btn-small" id="delete-${articleId}" style="display:none;">Supprimer</button>
       </div>

       <div class= "comments-section">
       <h4> Commentaires </h4>
       <div class= "comments-form" id="commentForm-${articleId}">
       <textarea id="commentText-${articleId}" placeholder="Ajouter un commentaire..." rows="3"></textarea>
       <button onclick="addComment('${articleId}')"class="btn-primary">Publier</button>
       <button onclick= "addLike('${articleId}')"class="btn-primary">❤️ ${likesCount}</button>
       </div>
       <div class="comments-list" id="commentsList-${articleId}">
                        <p>Chargement des commentaires...</p>
                    </div>
                </div>
       `;
      container.appendChild(articleElement);
      loadComments(articleId);
      if(auth.currentUser) {
      const actionsDiv = document.getElementById(`actions-${articleId}`);
      const deleteBtn = document.getElementById(`delete-${articleId}`);
      const canEdit = isAdmin || (articleData.userName === auth.currentUser.displayName);
      const canDelete = isAdmin;
      if(canEdit) {
        actionsDiv.style.display = 'flex';
      }
      if(canDelete) {
        deleteBtn.style.display = 'inline-block';
      }
    }
    });
    showMessage("Article récupéré avec succès", "success");
    displayPagination();
  } catch (error) {
    console.error("Erreur détaillée:", error);
    showMessage("Erreur lors du chargement de l'article", "error");
  } finally {
    isLoadingArticles = false;
  }
}

async function editArticle(articleId) {
  try {
    const getArticle = await db.collection('articles').doc(articleId).get();
    
    if(getArticle && getArticle.exists) {
      const articleData = getArticle.data();

      document.getElementById('articleTitle').value = articleData.title;
      document.getElementById('articleContent').value = articleData.content;
      document.getElementById('articlePublished').checked = articleData.published;

      currentEditingArticle = articleId;
      document.getElementById('articleModalTitle').textContent = 'Modifier l\'article';
      openModal('articleModal');
    } else {
      showMessage("Article non trouvé", "error");
    }
  } catch (error) {
    console.error("Erreur lors de la récupération:", error);
    showMessage("Erreur lors du chargement de l'article", "error");
  }
}

async function deleteArticle(articleId) {
  if(!isAdmin) {
    showMessage("Seuls les admins peuvent supprimer des articles");
    return;
  }
  if(!confirm("Etes-vous sur de vouloir supprimer cet article ? Cette action est irréversible.")) {
    return;
  }
  try {
    await db.collection('articles').doc(articleId).delete();
    showMessage("Article supprimé avec succès", "success");
    loadArticles(1);
  } catch (error) {
    console.error("Erreur suppression:", error);
    showMessage("Erreur lors de la suppression", "error");
  }
}

async function loadAuthors() {
    try {
        const snapshot = await db.collection('articles').get();
        const authors = new Set();
        
        snapshot.forEach(doc => {
            const articleData = doc.data();
            if (articleData.userName) {
                authors.add(articleData.userName);
            }
        });
        
        const authorSelect = document.getElementById('filterAuthor');
        authorSelect.innerHTML = '<option value="">Tous les auteurs</option>';
        
        authors.forEach(author => {
            const option = document.createElement('option');
            option.value = author;
            option.textContent = author;
            authorSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('Erreur lors du chargement des auteurs:', error);
    }
}
 

function displayPagination() {
  console.log("Pagination - Page actuelle:", currentPage);
    console.log("Pagination - Total pages:", totalPages);
    console.log("Pagination - Articles cette page:", pageArticleCounts[currentPage]);

  let paginationContainer = document.getElementById('paginationContainer');
  if (!paginationContainer) {
    paginationContainer = document.createElement('div');
    paginationContainer.id = 'paginationContainer';
    paginationContainer.className = 'pagination';
    document.getElementById('articlesContainer').after(paginationContainer);
  }
  paginationContainer.innerHTML = '';

  if (currentPage > 1) {
    const prevBtn = document.createElement('button');
    prevBtn.textContent = 'Précédent';
    prevBtn.className = 'btn-secondary';
    prevBtn.onclick = () => loadArticles(currentPage - 1);
    paginationContainer.appendChild(prevBtn);
  }
  for (let i = 1; i <= Math.max(currentPage, totalPages); i++) {
    const pageBtn = document.createElement('button');
    pageBtn.textContent = i;
    pageBtn.className = i === currentPage ? 'btn-primary' : 'btn-secondary';
    pageBtn.onclick = () => loadArticles(i);
    paginationContainer.appendChild(pageBtn);
  }

  if (pageArticleCounts[currentPage] === articlesPerPage) {
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Suivant';
    nextBtn.className = 'btn-secondary';
    nextBtn.onclick = () => loadArticles(currentPage + 1);
    paginationContainer.appendChild(nextBtn);
  }
}

function applyFilters() {
  activeFilters.author = document.getElementById('filterAuthor').value || null;
  activeFilters.date = document.getElementById('filterDate').value || null;
  activeFilters.popularity = document.getElementById('filterPopularity').value || null;
  activeFilters.status = document.getElementById('filterStatus').value || null;

  currentPage = 1;
  lastDocuments = {};
  pageArticleCounts = {};
  totalPages = 0;

  loadArticles(1);
}

function clearFilters() {
  activeFilters = {
    author: null,
    date: null,
    popularity: null,
    status: null
  };
  document.getElementById('filterAuthor').value = "";
  document.getElementById('filterDate').value = "";
  document.getElementById('filterPopularity').value = "";
  document.getElementById('filterStatus').value = "";
  currentPage = 1;
  lastDocuments = {};
  pageArticleCounts = {};
  totalPages = 0;
  loadArticles(1);
}

async function addComment(articleId) {
    const textArea = document.getElementById(`commentText-${articleId}`);
    const content = textArea.value.trim();

    if(!content) {
        showMessage("Veuillez entrer un commentaire", "error");
        return;
    }

    if (!auth.currentUser) {
        showMessage("Vous devez être connecté pour ajouter un commentaire", "error");
        return;
    }

    try {
        await db.collection('comments').add({
            articleId: articleId,
            userId: auth.currentUser.uid,
            userName: auth.currentUser.displayName || auth.currentUser.email || "Anonyme",
            content: content,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        textArea.value = "";
        showMessage("Commentaire ajouté", "success");
        loadComments(articleId);
    } catch (error) {
        console.error("Erreur de l'ajout du commentaire", error);
        showMessage("Erreur lors de l'ajout du commentaire", "error");
    }
}

async function updateLikeButton(articleId) {
  try {
    const articleDoc = await db.collection('articles').doc(articleId).get();
    const articleData = articleDoc.data();
    const likesCount = articleData.likedBy ? articleData.likedBy.length : 0;
    const button = document.querySelector(`button[onclick="addLike('${articleId}')"]`);
    if (button) {
      button.textContent = `❤️ ${likesCount}`;
    }
  } catch (error) {
    console.error("Erreur mise à jour bouton", error);
  }
}

async function addLike(articleId) {
  if (!auth.currentUser) {
        showMessage("Vous devez être connecté pour ajouter un like", "error");
        return;
    }
    try {
    const articleRef = db.collection('articles').doc(articleId);
    const articleDoc = await articleRef.get();
    const articleData = articleDoc.data();
    const likedBy = articleData.likedBy || [];
    const userHasLiked = likedBy.includes(auth.currentUser.uid);
    if (userHasLiked) {
     await articleRef.update({
        likedBy: firebase.firestore.FieldValue.arrayRemove(auth.currentUser.uid)
      });
    } else {
      await articleRef.update({
        likedBy: firebase.firestore.FieldValue.arrayUnion(auth.currentUser.uid)
      });
    }
    updateLikeButton(articleId);
  } catch (error) {
    console.error("Erreur like:", error);
    showMessage("Erreur lors de la mise à jour du like", "error");
  }
}

async function loadComments(articleId) {
    const commentsList = document.getElementById(`commentsList-${articleId}`);

    try {
        const snapshot = await db.collection('comments')
        .where('articleId', '==', articleId)
        .orderBy('createdAt', 'desc')
        .get();

        if (snapshot.empty) {
            commentsList.innerHTML = '<p> Aucun commentaire pour le moment.</p>';
            return;
        }

        commentsList.innerHTML = '';
        snapshot.forEach(doc => {
            const commentData = doc.data();
            const commentElement = document.createElement('div');
            commentElement.className = 'comment';

            let commentDate = "Date inconnue";
            if (commentData.createdAt) {
                try {
                    commentDate = new Date(commentData.createdAt.toDate()).toLocaleDateString();
                } catch (e) {
                    commentDate = "Date inconnue";
                }
            }
            commentElement.innerHTML = `
                <div class="comment-author">${commentData.userName}</div>
                <div class="comment-content">${commentData.content}</div>
                <div class="comment-date">${commentDate}</div>
            `;

            commentsList.appendChild(commentElement);
        });
    } catch (error) {
        console.error("Erreur chargement commentaires", error);
        commentsList.innerHTML = '<p> Erreur lors du chargement des commentaires.</p>';
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

firebase
  .firestore()
  .enableNetwork()
  .then(() => {
    console.log("Firestore connecté");
  })
  .catch((error) => {
    console.error("Erreur Firestore:", error);
  });
