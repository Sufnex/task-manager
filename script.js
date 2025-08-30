/* ===== FIREBASE MULTI-USER TASK MANAGER (DEBUG VERZIÓ) ===== */

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
    serverTimestamp,
    setDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase inicializálás
console.log('🔥 Firebase inicializálás...');
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
console.log('✅ Firebase inicializálva:', app);

/* ===== AUTHENTICATION MANAGER ===== */
class AuthManager {
    constructor() {
        console.log('🔐 AuthManager inicializálás...');
        this.currentUser = null;
        this.initAuthElements();
        this.initAuthListeners();
        this.checkAuthState();
    }

    initAuthElements() {
        console.log('📋 Auth elemek inicializálása...');
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
        console.log('✅ Auth elemek megtalálva');
    }

    initAuthListeners() {
        console.log('👂 Auth event listener-ek beállítása...');
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
        console.log('✅ Auth event listener-ek beállítva');
    }

    checkAuthState() {
        console.log('👀 Auth állapot figyelés indítása...');
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                console.log('✅ Felhasználó bejelentkezve:', user.email);
                this.currentUser = user;
                
                // Felhasználó adatainak mentése Firestore-ba
                await this.saveUserToFirestore(user);
                this.showApp();
                
                // TaskManager inicializálás
                if (!window.taskManager) {
                    console.log('🚀 TaskManager inicializálás...');
                    window.taskManager = new TaskManager(user);
                }
            } else {
                console.log('❌ Nincs bejelentkezve');
                this.currentUser = null;
                this.showAuthModal();
            }
        });
    }

    async saveUserToFirestore(user) {
        try {
            console.log('💾 Felhasználó mentése Firestore-ba:', user.email);
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || 'Felhasználó',
                lastLogin: serverTimestamp(),
                createdAt: serverTimestamp()
            }, { merge: true });
            console.log('✅ Felhasználó mentve');
        } catch (error) {
            console.error('❌ Felhasználó mentési hiba:', error);
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        console.log('🔑 Bejelentkezés próbálkozás:', email);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            this.showNotification('Sikeres bejelentkezés! 🎉');
            console.log('✅ Bejelentkezés sikeres');
        } catch (error) {
            console.error('❌ Bejelentkezési hiba:', error);
            this.showNotification('Bejelentkezési hiba: ' + this.getErrorMessage(error.code), 'error');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;

        console.log('📝 Regisztráció próbálkozás:', email);
        if (password.length < 6) {
            this.showNotification('A jelszónak legalább 6 karakternek kell lennie!', 'error');
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName: name });
            this.showNotification('Sikeres regisztráció! 🎉');
            console.log('✅ Regisztráció sikeres');
        } catch (error) {
            console.error('❌ Regisztrációs hiba:', error);
            this.showNotification('Regisztrációs hiba: ' + this.getErrorMessage(error.code), 'error');
        }
    }

    async signInWithGoogle() {
        console.log('🌐 Google bejelentkezés próbálkozás...');
        try {
            await signInWithPopup(auth, googleProvider);
            this.showNotification('Google bejelentkezés sikeres! 🎉');
            console.log('✅ Google bejelentkezés sikeres');
        } catch (error) {
            console.error('❌ Google bejelentkezési hiba:', error);
            this.showNotification('Google bejelentkezési hiba: ' + this.getErrorMessage(error.code), 'error');
        }
    }

    async logout() {
        console.log('🚪 Kijelentkezés...');
        try {
            await signOut(auth);
            this.showNotification('Sikeres kijelentkezés! 👋');
            console.log('✅ Kijelentkezés sikeres');
        } catch (error) {
            console.error('❌ Kijelentkezési hiba:', error);
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
        console.log('🔓 Auth modal megjelenítése');
        this.authModal.classList.remove('hidden');
        document.getElementById('main-app').classList.add('hidden');
    }

    showApp() {
        console.log('📱 Alkalmazás megjelenítése');
        this.authModal.classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        this.userName.textContent = this.currentUser.displayName || 'Felhasználó';
    }

    showLoginForm() {
        console.log('📋 Login form megjelenítése');
        this.loginForm.classList.remove('hidden');
        this.registerForm.classList.add('hidden');
    }

    showRegisterForm() {
        console.log('📝 Register form megjelenítése');
        this.loginForm.classList.add('hidden');
        this.registerForm.classList.remove('hidden');
    }

    showNotification(message, type = 'success') {
        console.log(`📢 Notification (${type}):`, message);
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
        console.log('🤝 CollaborationManager inicializálás...');
        this.user = user;
        this.taskManager = taskManager;
        this.sharedUsers = [];
        this.initCollaborationElements();
    }

    initCollaborationElements() {
        console.log('📋 Collaboration elemek inicializálása...');
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
        console.log('✅ Collaboration elemek beállítva');
    }

    async openShareModal() {
        console.log('👥 Share modal megnyitása...');
        this.shareModal.classList.remove('hidden');
        await this.loadSharedUsers();
    }

    closeShareModal() {
        console.log('❌ Share modal bezárása');
        this.shareModal.classList.add('hidden');
    }

    async shareWithUser() {
        const email = this.shareEmailInput.value.trim();
        console.log('🤝 Megosztás próbálkozás:', email);
        
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
            console.log('🔍 Felhasználó keresése:', email);
            const usersQuery = query(collection(db, 'users'), where('email', '==', email));
            const userDocs = await getDocs(usersQuery);

            if (userDocs.empty) {
                console.log('❌ Felhasználó nem található');
                this.taskManager.showNotification('Nem található felhasználó ezzel az email címmel!', 'error');
                return;
            }

            const targetUser = userDocs.docs[0];
            const targetUserId = targetUser.id;
            console.log('✅ Felhasználó megtalálva:', targetUserId);

            // Ellenőrizzük, hogy már meg van-e osztva
            console.log('🔍 Meglévő megosztás ellenőrzése...');
            const existingCollab = query(collection(db, 'collaborations'), 
                where('ownerUid', '==', this.user.uid),
                where('sharedWithUid', '==', targetUserId));
            const existingDocs = await getDocs(existingCollab);

            if (!existingDocs.empty) {
                console.log('⚠️ Már meg van osztva');
                this.taskManager.showNotification('Már meg van osztva ezzel a felhasználóval!', 'error');
                return;
            }

            // Megosztás hozzáadása
            console.log('💾 Megosztás mentése...');
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
            console.log('✅ Megosztás sikeres');

            // Frissítsük a feladatokat
            this.taskManager.setupFirebaseListeners();
        } catch (error) {
            console.error('❌ Megosztási hiba:', error);
            this.taskManager.showNotification('Hiba történt a megosztás során!', 'error');
        }
    }

    async loadSharedUsers() {
        try {
            console.log('📥 Megosztott felhasználók betöltése...');
            const collaborationsQuery = query(collection(db, 'collaborations'), 
                where('ownerUid', '==', this.user.uid));
            const collaborationDocs = await getDocs(collaborationsQuery);

            this.sharedUsersList.innerHTML = '';

            if (collaborationDocs.empty) {
                console.log('📝 Nincs megosztva senkivel');
                this.sharedUsersList.innerHTML = '<p class="no-shares">Még nincs megosztva senkivel.</p>';
                return;
            }

            console.log(`📋 ${collaborationDocs.size} megosztás találva`);
            collaborationDocs.forEach((doc) => {
                const data = doc.data();
                const userItem = document.createElement('div');
                userItem.className = 'shared-user-item';
                userItem.innerHTML = `
                    <span>👤 ${data.sharedWithEmail}</span>
                    <button onclick="collaborationManager.removeCollaboration('${doc.id}')">❌ Eltávolítás</button>
                `;
                this.sharedUsersList.appendChild(userItem);
            });
        } catch (error) {
            console.error('❌ Megosztott felhasználók betöltési hiba:', error);
        }
    }

    async removeCollaboration(collaborationId) {
        if (!confirm('Biztosan visszavonod a megosztást?')) return;

        try {
            console.log('🗑️ Megosztás törlése:', collaborationId);
            await deleteDoc(doc(db, 'collaborations', collaborationId));
            this.loadSharedUsers();
            this.taskManager.showNotification('Megosztás visszavonva! 🚫');
            console.log('✅ Megosztás törölve');

            // Frissítsük a feladatokat
            this.taskManager.setupFirebaseListeners();
        } catch (error) {
            console.error('❌ Megosztás törlési hiba:', error);
            this.taskManager.showNotification('Hiba történt a megosztás visszavonása során!', 'error');
        }
    }
}

/* ===== TASK MANAGER (FIREBASE INTEGRÁLT) ===== */
class TaskManager {
    constructor(user) {
        console.log('📋 TaskManager inicializálás...', user.email);
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
        console.log('✅ TaskManager inicializálva');
    }

    initDOMElements() {
        console.log('📋 DOM elemek inicializálása...');
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
        console.log('✅ DOM elemek megtalálva');
    }

    initEventListeners() {
        console.log('👂 Event listener-ek beállítása...');
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
        console.log('✅ Event listener-ek beállítva');
    }

    setupFirebaseListeners() {
        console.log('🔥 Firebase listener-ek beállítása...');
        // Tisztítjuk a korábbi listener-eket
        this.tasks = [];

        // Saját feladatok figyelése (INDEX NÉLKÜL ELŐSZÖR)
        console.log('👀 Saját feladatok figyelése...');
        try {
            // EGYSZERŰ QUERY ELŐSZÖR (index nélkül)
            const myTasksQuery = query(collection(db, 'tasks'), where('ownerUid', '==', this.user.uid));
            
            onSnapshot(myTasksQuery, (snapshot) => {
                console.log(`📥 ${snapshot.size} saját feladat érkezett`);
                const myTasks = [];
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    console.log('📄 Feladat:', doc.id, data.title);
                    myTasks.push({
                        id: doc.id,
                        ...data,
                        isOwn: true
                    });
                });
                this.updateTasksFromFirebase(myTasks, 'own');
            }, (error) => {
                console.error('❌ Saját feladatok listener hiba:', error);
                this.showNotification('Hiba a feladatok betöltése során!', 'error');
            });
        } catch (error) {
            console.error('❌ Firebase listener setup hiba:', error);
        }

        // Megosztott feladatok figyelése
        this.loadSharedTasks();
    }

    async loadSharedTasks() {
        try {
            console.log('👥 Megosztott feladatok betöltése...');
            // Kollaborációk lekérése ahol én vagyok a megosztott fél
            const collaborationsQuery = query(collection(db, 'collaborations'), 
                where('sharedWithUid', '==', this.user.uid));
            const collaborationDocs = await getDocs(collaborationsQuery);
            
            console.log(`🤝 ${collaborationDocs.size} kollaboráció találva`);

            collaborationDocs.forEach((collaborationDoc) => {
                const collaboration = collaborationDoc.data();
                console.log('📩 Kollaboráció:', collaboration.ownerEmail);

                // Megosztott feladatok figyelése (EGYSZERŰ QUERY)
                const sharedTasksQuery = query(collection(db, 'tasks'), 
                    where('ownerUid', '==', collaboration.ownerUid),
                    where('type', '==', 'shared'));

                onSnapshot(sharedTasksQuery, (snapshot) => {
                    console.log(`📥 ${snapshot.size} megosztott feladat érkezett`);
                    const sharedTasks = [];
                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        console.log('📄 Megosztott feladat:', doc.id, data.title);
                        sharedTasks.push({
                            id: doc.id,
                            ...data,
                            isShared: true,
                            sharedBy: collaboration.ownerEmail
                        });
                    });
                    this.updateTasksFromFirebase(sharedTasks, 'shared');
                }, (error) => {
                    console.error('❌ Megosztott feladatok listener hiba:', error);
                });
            });
        } catch (error) {
            console.error('❌ Megosztott feladatok betöltési hiba:', error);
        }
    }

    updateTasksFromFirebase(newTasks, type) {
        console.log(`🔄 Feladatok frissítése (${type}):`, newTasks.length);
        if (type === 'own') {
            // Saját feladatok frissítése
            this.tasks = this.tasks.filter(task => task.isShared);
            this.tasks = [...this.tasks, ...newTasks];
        } else if (type === 'shared') {
            // Megosztott feladatok frissítése
            this.tasks = this.tasks.filter(task => !task.isShared);
            this.tasks = [...this.tasks, ...newTasks];
        }
        
        console.log('📊 Összes feladat:', this.tasks.length);
        this.renderTasks();
        this.updateStats();
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        console.log('💾 Feladat mentése...');

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

        console.log('📄 Feladat adatok:', taskData);

        if (!taskData.title) {
            this.showNotification('A feladat neve kötelező!', 'error');
            return;
        }

        try {
            if (this.currentEditId) {
                console.log('✏️ Feladat szerkesztése:', this.currentEditId);
                await this.updateTask(this.currentEditId, taskData);
            } else {
                console.log('➕ Új feladat létrehozása');
                await this.createTask(taskData);
            }
            this.closeModal();
            this.showNotification('Feladat mentve! 🎉');
            console.log('✅ Feladat mentve');
        } catch (error) {
            console.error('❌ Feladat mentési hiba:', error);
            this.showNotification('Hiba történt a mentés során!', 'error');
        }
    }

    async createTask(taskData) {
        try {
            console.log('🔥 Firestore-ba írás...', taskData);
            const docRef = await addDoc(collection(db, 'tasks'), taskData);
            console.log('✅ Feladat létrehozva, ID:', docRef.id);
        } catch (error) {
            console.error('❌ Feladat létrehozási hiba:', error);
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

            console.log('🔄 Feladat frissítése:', taskId);
            await updateDoc(doc(db, 'tasks', taskId), taskData);
            console.log('✅ Feladat frissítve');
        } catch (error) {
            console.error('❌ Feladat frissítési hiba:', error);
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
            console.log('🗑️ Feladat törlése:', taskId);
            await deleteDoc(doc(db, 'tasks', taskId));
            this.showNotification('Feladat törölve! 🗑️');
            console.log('✅ Feladat törölve');
        } catch (error) {
            console.error('❌ Feladat törlési hiba:', error);
            this.showNotification('Hiba történt a törlés során!', 'error');
        }
    }

    async toggleTaskComplete(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        try {
            console.log('✅ Feladat állapot váltás:', taskId, !task.completed);
            await updateDoc(doc(db, 'tasks', taskId), {
                completed: !task.completed,
                completedAt: !task.completed ? serverTimestamp() : null
            });
            this.showNotification(!task.completed ? 'Feladat befejezve! 🎉' : 'Feladat visszaállítva! ↶');
            console.log('✅ Feladat állapot frissítve');
        } catch (error) {
            console.error('❌ Feladat állapot módosítási hiba:', error);
            this.showNotification('Hiba történt a módosítás során!', 'error');
        }
    }

    openModal(taskId = null) {
        console.log('📱 Modal megnyitása:', taskId || 'új feladat');
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
        console.log('❌ Modal bezárása');
        this.modal.classList.add('hidden');
        this.currentEditId = null;
        this.resetForm();
    }

    fillForm(task) {
        console.log('📝 Form kitöltése:', task.title);
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
        console.log('🔄 Form alaphelyzetbe');
        this.taskForm.reset();
        this.taskDate.value = new Date().toISOString().split('T')[0];
        this.taskType.value = 'private';
    }

    renderTasks() {
        const filteredTasks = this.getFilteredTasks();
        console.log('🎨 Feladatok renderelése:', filteredTasks.length);

        if (filteredTasks.length === 0) {
            this.listView.innerHTML = `
                <div class="empty-state">
                    <h3>📝 Nincsenek feladatok</h3>
                    <p>Hozz létre egy új feladatot a kezdéshez!</p>
                    <button class="btn-primary" onclick="taskManager.openModal()">+ Első feladat létrehozása</button>
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
                ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
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
        console.log('🔍 Szűrő beállítása:', filter);
        this.currentFilter = filter;
        this.filterButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        this.renderTasks();
    }

    toggleView() {
        console.log('👁️ Nézet váltás');
        this.currentView = this.currentView === 'list' ? 'calendar' : 'list';
        this.viewToggle.textContent = this.currentView === 'list' ? '📅' : '📋';
    }

    updateStats() {
        const myTasks = this.tasks.filter(task => !task.isShared);
        const totalTasks = myTasks.length;
        const completedTasks = myTasks.filter(task => task.completed).length;
        const pendingTasks = totalTasks - completedTasks;

        console.log('📊 Statisztika frissítés:', { totalTasks, completedTasks, pendingTasks });

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
        console.log(`📢 TaskManager Notification (${type}):`, message);
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
    console.log('🚀 DOM Content Loaded');
    
    // AuthManager inicializálás
    window.authManager = new AuthManager();
    
    // Service Worker regisztrálás
    registerServiceWorker();
    
    console.log('🚀 Multi-User Task Manager betöltve!');
});

/* ===== PWA TELEPÍTÉSI PROMPT ===== */
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    console.log('📱 Install prompt érhető');
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
                console.log('✅ App telepítve');
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
