/* ===== FIREBASE MULTI-USER TASK MANAGER ===== */

// Firebase konfiguráció (a te Firebase projektedhez)
const firebaseConfig = {
  apiKey: "AIzaSyAg93are7mqcCxpIsGxrFTIf0MhRjX8FXA",
  authDomain: "task-manager-sb.firebaseapp.com",
  projectId: "task-manager-sb",
  storageBucket: "task-manager-sb.firebasestorage.app",
  messagingSenderId: "845230301220",
  appId: "1:845230301220:web:e4e45ca55ac66907e478b1"
};

// Firebase modulok importálása
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  setDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase inicializálás
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

/* ===== AUTHENTICATION MANAGER ===== */
class AuthManager {
  constructor() {
    this.currentUser = null;
    this.initAuthElements();
    this.initAuthListeners();
    this.checkAuthState();
  }

  initAuthElements() {
    // Auth modal elemek
    this.authModal = document.getElementById('auth-modal');
    this.loginForm = document.getElementById('login-form');
    this.registerForm = document.getElementById('register-form');
    this.showRegisterBtn = document.getElementById('show-register');
    this.showLoginBtn = document.getElementById('show-login');
    this.googleSignInBtn = document.getElementById('google-signin');
    this.logoutBtn = document.getElementById('logout-btn');
    this.userInfo = document.getElementById('user-info');
    this.userName = document.getElementById('user-name');
  }

  initAuthListeners() {
    // Bejelentkezés
    this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    
    // Regisztráció
    this.registerForm.addEventListener('submit', (e) => this.handleRegister(e));
    
    // Google bejelentkezés
    this.googleSignInBtn.addEventListener('click', () => this.signInWithGoogle());
    
    // Kijelentkezés
    this.logoutBtn.addEventListener('click', () => this.logout());
    
    // Form váltás
    this.showRegisterBtn.addEventListener('click', () => this.showRegisterForm());
    this.showLoginBtn.addEventListener('click', () => this.showLoginForm());
  }

  checkAuthState() {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        this.currentUser = user;
        
        // Felhasználó adatainak mentése Firestore-ba
        await this.saveUserToFirestore(user);
        
        this.showApp();
        
        // TaskManager inicializálás
        if (!window.taskManager) {
          window.taskManager = new TaskManager(user);
        }
      } else {
        this.currentUser = null;
        this.showAuthModal();
      }
    });
  }

  async saveUserToFirestore(user) {
    try {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'Felhasználó',
        lastLogin: serverTimestamp(),
        createdAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Felhasználó mentési hiba:', error);
    }
  }

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      this.showNotification('Sikeres bejelentkezés! 🎉');
    } catch (error) {
      console.error('Bejelentkezési hiba:', error);
      this.showNotification('Bejelentkezési hiba: ' + this.getErrorMessage(error.code), 'error');
    }
  }

  async handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    if (password.length < 6) {
      this.showNotification('A jelszónak legalább 6 karakternek kell lennie!', 'error');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      this.showNotification('Sikeres regisztráció! 🎉');
    } catch (error) {
      console.error('Regisztrációs hiba:', error);
      this.showNotification('Regisztrációs hiba: ' + this.getErrorMessage(error.code), 'error');
    }
  }

  async signInWithGoogle() {
    try {
      await signInWithPopup(auth, googleProvider);
      this.showNotification('Google bejelentkezés sikeres! 🎉');
    } catch (error) {
      console.error('Google bejelentkezési hiba:', error);
      this.showNotification('Google bejelentkezési hiba: ' + this.getErrorMessage(error.code), 'error');
    }
  }

  async logout() {
    try {
      await signOut(auth);
      this.showNotification('Sikeres kijelentkezés! 👋');
    } catch (error) {
      console.error('Kijelentkezési hiba:', error);
      this.showNotification('Kijelentkezési hiba: ' + error.message, 'error');
    }
  }

  getErrorMessage(errorCode) {
    const messages = {
      'auth/user-not-found': 'Nem található felhasználó ezzel az email címmel.',
      'auth/wrong-password': 'Hibás jelszó.',
      'auth/email-already-in-use': 'Ez az email cím már használatban van.',
      'auth/weak-password': 'A jelszó túl gyenge.',
      'auth/invalid-email': 'Érvénytelen email cím.',
      'auth/too-many-requests': 'Túl sok sikertelen próbálkozás. Próbáld újra később.',
      'auth/network-request-failed': 'Hálózati hiba. Ellenőrizd az internetkapcsolatod.'
    };
    return messages[errorCode] || 'Ismeretlen hiba történt.';
  }

  showAuthModal() {
    this.authModal.classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
  }

  showApp() {
    this.authModal.classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    this.userName.textContent = this.currentUser.displayName || 'Felhasználó';
  }

  showLoginForm() {
    this.loginForm.classList.remove('hidden');
    this.registerForm.classList.add('hidden');
  }

  showRegisterForm() {
    this.loginForm.classList.add('hidden');
    this.registerForm.classList.remove('hidden');
  }

  showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      color: white;
      z-index: 10000;
      max-width: 300px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      background: ${type === 'error' ? '#F44336' : '#4CAF50'};
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

/* ===== COLLABORATION MANAGER ===== */
class CollaborationManager {
  constructor(user, taskManager) {
    this.user = user;
    this.taskManager = taskManager;
    this.sharedUsers = [];
    this.initCollaborationElements();
  }

  initCollaborationElements() {
    // Megosztás modal
    this.shareModal = document.getElementById('share-modal');
    this.shareEmailInput = document.getElementById('share-email');
    this.shareBtn = document.getElementById('share-btn');
    this.closeShareBtn = document.getElementById('close-share');
    this.sharedUsersList = document.getElementById('shared-users');

    // Event listeners
    this.shareBtn.addEventListener('click', () => this.shareWithUser());
    this.closeShareBtn.addEventListener('click', () => this.closeShareModal());
    
    // Megosztás gomb a header-ben
    document.getElementById('open-share').addEventListener('click', () => this.openShareModal());
  }

  async openShareModal() {
    this.shareModal.classList.remove('hidden');
    await this.loadSharedUsers();
  }

  closeShareModal() {
    this.shareModal.classList.add('hidden');
  }

  async shareWithUser() {
    const email = this.shareEmailInput.value.trim();
    if (!email) {
      this.taskManager.showNotification('Kérlek adj meg egy email címet!', 'error');
      return;
    }

    if (email === this.user.email) {
      this.taskManager.showNotification('Nem oszthatod meg magaddal!', 'error');
      return;
    }

    try {
      // Ellenőrizzük, hogy létezik-e a felhasználó
      const usersQuery = query(
        collection(db, 'users'),
        where('email', '==', email)
      );
      const userDocs = await getDocs(usersQuery);

      if (userDocs.empty) {
        this.taskManager.showNotification('Nem található felhasználó ezzel az email címmel!', 'error');
        return;
      }

      const targetUser = userDocs.docs[0];
      const targetUserId = targetUser.id;

      // Ellenőrizzük, hogy már meg van-e osztva
      const existingCollab = query(
        collection(db, 'collaborations'),
        where('ownerUid', '==', this.user.uid),
        where('sharedWithUid', '==', targetUserId)
      );
      const existingDocs = await getDocs(existingCollab);

      if (!existingDocs.empty) {
        this.taskManager.showNotification('Már meg van osztva ezzel a felhasználóval!', 'error');
        return;
      }

      // Megosztás hozzáadása
      await addDoc(collection(db, 'collaborations'), {
        ownerUid: this.user.uid,
        ownerEmail: this.user.email,
        sharedWithUid: targetUserId,
        sharedWithEmail: email,
        createdAt: serverTimestamp(),
        permissions: ['read', 'write']
      });

      this.shareEmailInput.value = '';
      this.loadSharedUsers();
      this.taskManager.showNotification('Megosztás sikeres! 🤝');
      
      // Frissítsük a feladatokat
      this.taskManager.setupFirebaseListeners();
    } catch (error) {
      console.error('Megosztási hiba:', error);
      this.taskManager.showNotification('Hiba történt a megosztás során!', 'error');
    }
  }

  async loadSharedUsers() {
    try {
      const collaborationsQuery = query(
        collection(db, 'collaborations'),
        where('ownerUid', '==', this.user.uid)
      );
      const collaborationDocs = await getDocs(collaborationsQuery);

      this.sharedUsersList.innerHTML = '';

      if (collaborationDocs.empty) {
        this.sharedUsersList.innerHTML = '<p class="no-shares">Még nincs megosztva senkivel.</p>';
        return;
      }

      collaborationDocs.forEach((doc) => {
        const data = doc.data();
        const userItem = document.createElement('div');
        userItem.className = 'shared-user-item';
        userItem.innerHTML = `
          <span>👤 ${data.sharedWithEmail}</span>
          <button onclick="collaborationManager.removeCollaboration('${doc.id}')">
            ❌ Eltávolítás
          </button>
        `;
        this.sharedUsersList.appendChild(userItem);
      });
    } catch (error) {
      console.error('Megosztott felhasználók betöltési hiba:', error);
    }
  }

  async removeCollaboration(collaborationId) {
    if (!confirm('Biztosan visszavonod a megosztást?')) return;

    try {
      await deleteDoc(doc(db, 'collaborations', collaborationId));
      this.loadSharedUsers();
      this.taskManager.showNotification('Megosztás visszavonva! 🚫');
      
      // Frissítsük a feladatokat
      this.taskManager.setupFirebaseListeners();
    } catch (error) {
      console.error('Megosztás törlési hiba:', error);
      this.taskManager.showNotification('Hiba történt a megosztás visszavonása során!', 'error');
    }
  }
}

/* ===== TASK MANAGER (FIREBASE INTEGRÁLT) ===== */
class TaskManager {
  constructor(user) {
    this.user = user;
    this.tasks = [];
    this.currentView = 'list';
    this.currentFilter = 'all';
    this.currentEditId = null;
    
    this.initDOMElements();
    this.initEventListeners();
    this.setupFirebaseListeners();
    this.renderTasks();
    this.updateStats();

    // Collaboration manager inicializálás
    window.collaborationManager = new CollaborationManager(user, this);
  }

  initDOMElements() {
    this.addTaskBtn = document.getElementById('add-task-btn');
    this.viewToggle = document.getElementById('view-toggle');
    this.searchInput = document.getElementById('search-input');
    this.filterButtons = document.querySelectorAll('.filter-btn');
    this.listView = document.getElementById('list-view');
    
    this.modal = document.getElementById('task-modal');
    this.modalTitle = document.getElementById('modal-title');
    this.taskForm = document.getElementById('task-form');
    this.closeModalBtn = document.querySelector('.close-modal');
    this.cancelTaskBtn = document.getElementById('cancel-task');
    
    this.taskTitle = document.getElementById('task-title');
    this.taskDescription = document.getElementById('task-description');
    this.taskPriority = document.getElementById('task-priority');
    this.taskCategory = document.getElementById('task-category');
    this.taskDate = document.getElementById('task-date');
    this.taskTime = document.getElementById('task-time');
    this.estimatedTime = document.getElementById('estimated-time');
    this.taskType = document.getElementById('task-type');

    // Statisztika elemek
    this.totalTasksEl = document.getElementById('total-tasks');
    this.completedTasksEl = document.getElementById('completed-tasks');
    this.pendingTasksEl = document.getElementById('pending-tasks');
  }

  initEventListeners() {
    this.addTaskBtn.addEventListener('click', () => this.openModal());
    this.closeModalBtn.addEventListener('click', () => this.closeModal());
    this.cancelTaskBtn.addEventListener('click', () => this.closeModal());
    
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.closeModal();
    });
    
    this.taskForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
    this.viewToggle.addEventListener('click', () => this.toggleView());
    
    this.filterButtons.forEach(btn => {
      btn.addEventListener('click', (e) => this.setFilter(e.target.dataset.filter));
    });
    
    this.searchInput.addEventListener('input', () => this.renderTasks());
    
    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
    });
  }

  setupFirebaseListeners() {
    // Tisztítjuk a korábbi listener-eket
    this.tasks = [];

    // Saját feladatok figyelése
    const myTasksQuery = query(
      collection(db, 'tasks'),
      where('ownerUid', '==', this.user.uid),
      orderBy('createdAt', 'desc')
    );

    onSnapshot(myTasksQuery, (snapshot) => {
      const myTasks = [];
      snapshot.forEach((doc) => {
        myTasks.push({ 
          id: doc.id, 
          ...doc.data(),
          isOwn: true 
        });
      });
      this.updateTasksFromFirebase(myTasks, 'own');
    });

    // Megosztott feladatok figyelése
    this.loadSharedTasks();
  }

  async loadSharedTasks() {
    try {
      // Kollaborációk lekérése ahol én vagyok a megosztott fél
      const collaborationsQuery = query(
        collection(db, 'collaborations'),
        where('sharedWithUid', '==', this.user.uid)
      );
      
      const collaborationDocs = await getDocs(collaborationsQuery);
      
      collaborationDocs.forEach((collaborationDoc) => {
        const collaboration = collaborationDoc.data();
        
        // Megosztott feladatok figyelése
        const sharedTasksQuery = query(
          collection(db, 'tasks'),
          where('ownerUid', '==', collaboration.ownerUid),
          where('type', '==', 'shared'),
          orderBy('createdAt', 'desc')
        );

        onSnapshot(sharedTasksQuery, (snapshot) => {
          const sharedTasks = [];
          snapshot.forEach((doc) => {
            sharedTasks.push({
              id: doc.id,
              ...doc.data(),
              isShared: true,
              sharedBy: collaboration.ownerEmail
            });
          });
          this.updateTasksFromFirebase(sharedTasks, 'shared');
        });
      });
    } catch (error) {
      console.error('Megosztott feladatok betöltési hiba:', error);
    }
  }

  updateTasksFromFirebase(newTasks, type) {
    if (type === 'own') {
      // Saját feladatok frissítése
      this.tasks = this.tasks.filter(task => task.isShared);
      this.tasks = [...this.tasks, ...newTasks];
    } else if (type === 'shared') {
      // Megosztott feladatok frissítése
      this.tasks = this.tasks.filter(task => !task.isShared);
      this.tasks = [...this.tasks, ...newTasks];
    }
    
    this.renderTasks();
    this.updateStats();
  }

  async handleFormSubmit(e) {
    e.preventDefault();

    const taskData = {
      title: this.taskTitle.value.trim(),
      description: this.taskDescription.value.trim(),
      priority: this.taskPriority.value,
      category: this.taskCategory.value,
      dueDate: this.taskDate.value,
      dueTime: this.taskTime.value,
      estimatedTime: parseInt(this.estimatedTime.value) || 0,
      type: this.taskType.value,
      ownerUid: this.user.uid,
      createdAt: serverTimestamp(),
      completed: false
    };

    if (!taskData.title) {
      this.showNotification('A feladat neve kötelező!', 'error');
      return;
    }

    try {
      if (this.currentEditId) {
        await this.updateTask(this.currentEditId, taskData);
      } else {
        await this.createTask(taskData);
      }
      
      this.closeModal();
      this.showNotification('Feladat mentve! 🎉');
    } catch (error) {
      console.error('Feladat mentési hiba:', error);
      this.showNotification('Hiba történt a mentés során!', 'error');
    }
  }

  async createTask(taskData) {
    try {
      await addDoc(collection(db, 'tasks'), taskData);
    } catch (error) {
      throw new Error('Feladat létrehozási hiba: ' + error.message);
    }
  }

  async updateTask(taskId, taskData) {
    try {
      // Csak saját feladatokat szerkeszthetjük
      const task = this.tasks.find(t => t.id === taskId);
      if (!task || task.isShared) {
        throw new Error('Nincs jogosultságod szerkeszteni ezt a feladatot!');
      }
      
      await updateDoc(doc(db, 'tasks', taskId), taskData);
    } catch (error) {
      throw new Error('Feladat frissítési hiba: ' + error.message);
    }
  }

  async deleteTask(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    
    if (!task) return;
    
    if (task.isShared) {
      this.showNotification('Nem törölheted a megosztott feladatokat!', 'error');
      return;
    }
    
    if (!confirm('Biztosan törölni szeretnéd ezt a feladatot?')) return;

    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      this.showNotification('Feladat törölve! 🗑️');
    } catch (error) {
      console.error('Feladat törlési hiba:', error);
      this.showNotification('Hiba történt a törlés során!', 'error');
    }
  }

  async toggleTaskComplete(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      await updateDoc(doc(db, 'tasks', taskId), {
        completed: !task.completed,
        completedAt: !task.completed ? serverTimestamp() : null
      });
      
      this.showNotification(
        !task.completed ? 'Feladat befejezve! 🎉' : 'Feladat visszaállítva! ↶'
      );
    } catch (error) {
      console.error('Feladat állapot módosítási hiba:', error);
      this.showNotification('Hiba történt a módosítás során!', 'error');
    }
  }

  openModal(taskId = null) {
    this.currentEditId = taskId;
    
    if (taskId) {
      const task = this.tasks.find(t => t.id === taskId);
      
      if (task && task.isShared) {
        this.showNotification('Nem szerkesztheted a megosztott feladatokat!', 'error');
        return;
      }
      
      this.modalTitle.textContent = 'Feladat szerkesztése';
      this.fillForm(task);
    } else {
      this.modalTitle.textContent = 'Új feladat';
      this.resetForm();
    }
    
    this.modal.classList.remove('hidden');
    this.taskTitle.focus();
  }

  closeModal() {
    this.modal.classList.add('hidden');
    this.currentEditId = null;
    this.resetForm();
  }

  fillForm(task) {
    this.taskTitle.value = task.title;
    this.taskDescription.value = task.description || '';
    this.taskPriority.value = task.priority;
    this.taskCategory.value = task.category;
    this.taskDate.value = task.dueDate || '';
    this.taskTime.value = task.dueTime || '';
    this.estimatedTime.value = task.estimatedTime || '';
    this.taskType.value = task.type || 'private';
  }

  resetForm() {
    this.taskForm.reset();
    this.taskDate.value = new Date().toISOString().split('T')[0];
    this.taskType.value = 'private';
  }

  renderTasks() {
    const filteredTasks = this.getFilteredTasks();

    if (filteredTasks.length === 0) {
      this.listView.innerHTML = `
        <div class="empty-state">
          <h3>📝 Nincsenek feladatok</h3>
          <p>Hozz létre egy új feladatot a kezdéshez!</p>
          <button class="btn-primary" onclick="taskManager.openModal()">
            + Első feladat létrehozása
          </button>
        </div>
      `;
      return;
    }

    this.listView.innerHTML = filteredTasks.map(task => `
      <div class="task-item priority-${task.priority} ${task.completed ? 'completed' : ''} ${task.isShared ? 'shared-task' : ''}"
           data-task-id="${task.id}">
        <div class="task-header">
          <div>
            <div class="task-title">${this.escapeHtml(task.title)}</div>
            <div class="task-badges">
              <span class="task-category">${this.getCategoryLabel(task.category)}</span>
              ${task.type === 'shared' ? '<span class="shared-badge">👥 Megosztott</span>' : ''}
              ${task.isShared ? `<span class="received-badge">📩 ${task.sharedBy}</span>` : ''}
            </div>
          </div>
          <div class="task-actions">
            <button onclick="taskManager.toggleTaskComplete('${task.id}')"
                    title="${task.completed ? 'Visszavonás' : 'Befejezés'}">
              ${task.completed ? '↶' : '✓'}
            </button>
            ${!task.isShared ? `
              <button onclick="taskManager.openModal('${task.id}')" title="Szerkesztés">✏️</button>
              <button onclick="taskManager.deleteTask('${task.id}')" title="Törlés">🗑️</button>
            ` : `
              <span class="shared-info" title="Megosztott feladat - csak a tulajdonos szerkesztheti">🔒</span>
            `}
          </div>
        </div>
        
        ${task.description ? `
          <div class="task-description">${this.escapeHtml(task.description)}</div>
        ` : ''}
        
        <div class="task-meta">
          <div>
            ${task.dueDate ? `<span class="task-date">📅 ${this.formatDate(task.dueDate)}</span>` : ''}
            ${task.dueTime ? `<span class="task-time">🕐 ${task.dueTime}</span>` : ''}
            ${task.estimatedTime ? `<span class="task-time">⏱️ ${task.estimatedTime} perc</span>` : ''}
          </div>
          <div class="task-priority-badge priority-${task.priority}">
            ${this.getPriorityLabel(task.priority)}
          </div>
        </div>
      </div>
    `).join('');
  }

  getFilteredTasks() {
    let filtered = [...this.tasks];

    // Szűrés állapot szerint
    switch (this.currentFilter) {
      case 'pending':
        filtered = filtered.filter(task => !task.completed);
        break;
      case 'completed':
        filtered = filtered.filter(task => task.completed);
        break;
      case 'shared':
        filtered = filtered.filter(task => task.type === 'shared' || task.isShared);
        break;
      case 'private':
        filtered = filtered.filter(task => task.type === 'private' && !task.isShared);
        break;
    }

    // Keresés
    const searchTerm = this.searchInput.value.toLowerCase().trim();
    if (searchTerm) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(searchTerm) ||
        (task.description && task.description.toLowerCase().includes(searchTerm))
      );
    }

    // Rendezés
    return filtered.sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  setFilter(filter) {
    this.currentFilter = filter;
    this.filterButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    this.renderTasks();
  }

  toggleView() {
    this.currentView = this.currentView === 'list' ? 'calendar' : 'list';
    this.viewToggle.textContent = this.currentView === 'list' ? '📅' : '📋';
    // Naptár nézet implementálása későbbre...
  }

  updateStats() {
    const myTasks = this.tasks.filter(task => !task.isShared);
    const totalTasks = myTasks.length;
    const completedTasks = myTasks.filter(task => task.completed).length;
    const pendingTasks = totalTasks - completedTasks;

    this.totalTasksEl.textContent = totalTasks;
    this.completedTasksEl.textContent = completedTasks;
    this.pendingTasksEl.textContent = pendingTasks;
  }

  // Segédfunkciók
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('hu-HU');
  }

  getPriorityLabel(priority) {
    const labels = {
      low: 'Alacsony',
      medium: 'Közepes',
      high: 'Magas',
      urgent: 'Sürgős'
    };
    return labels[priority] || priority;
  }

  getCategoryLabel(category) {
    const labels = {
      personal: 'Személyes',
      work: 'Munka',
      shopping: 'Bevásárlás',
      health: 'Egészség',
      other: 'Egyéb'
    };
    return labels[category] || category;
  }

  showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#F44336' : '#4CAF50'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.15);
      z-index: 10000;
      max-width: 300px;
      font-weight: 500;
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

/* ===== PWA SERVICE WORKER REGISZTRÁLÁS ===== */
async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('./sw.js');
      console.log('✅ Service Worker regisztrálva');
    } catch (error) {
      console.error('❌ Service Worker hiba:', error);
    }
  }

  // Értesítési engedély kérése
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

/* ===== ALKALMAZÁS INDÍTÁSA ===== */
document.addEventListener('DOMContentLoaded', () => {
  // AuthManager inicializálás
  window.authManager = new AuthManager();
  
  // Service Worker regisztrálás
  registerServiceWorker();
  
  console.log('🚀 Multi-User Task Manager betöltve!');
});

/* ===== PWA TELEPÍTÉSI PROMPT ===== */
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  // Telepítési gomb megjelenítése
  const installBtn = document.createElement('button');
  installBtn.textContent = '📱 App telepítése';
  installBtn.className = 'btn-primary install-btn';
  installBtn.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    animation: float 3s ease-in-out infinite;
  `;

  installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      
      if (result.outcome === 'accepted') {
        installBtn.remove();
        if (window.taskManager) {
          window.taskManager.showNotification('App telepítve! 🎉');
        }
      }
      
      deferredPrompt = null;
    }
  });

  document.body.appendChild(installBtn);
});

/* ===== BILLENTYŰPARANCSOK ===== */
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + N = Új feladat
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    if (window.taskManager) {
      window.taskManager.openModal();
    }
  }

  // Ctrl/Cmd + F = Keresés fókusz
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    e.preventDefault();
    if (window.taskManager) {
      window.taskManager.searchInput.focus();
    }
  }
});

/* ===== ANIMÁCIÓS STÍLUSOK ===== */
const animationStyles = document.createElement('style');
animationStyles.textContent = `
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes slideOut {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(-20px); }
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }
  
  .task-item {
    animation: slideIn 0.3s ease;
  }
`;
document.head.appendChild(animationStyles);
