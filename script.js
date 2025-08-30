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

    async function logout() {
        console.log('🚪 Kijelentkezés...');
        
        try {
            // TaskManager listener-ek leállítása
            if (window.taskManager) {
                window.taskManager.cleanup();
                window.taskManager = null;
            }
            
            // CollaborationManager cleanup
            if (window.collaborationManager) {
                window.collaborationManager = null;
            }
            
            await signOut(auth);
            notificationManager.show('Sikeres kijelentkezés! 👋', 'success');
            console.log('✅ Kijelentkezés sikeres');
        } catch (error) {
            console.error('❌ Kijelentkezési hiba:', error);
            notificationManager.show('Hiba a kijelentkezés során!', 'error');
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
    constructor(userId, userEmail) {
        this.userId = userId;
        this.userEmail = userEmail;
        this.tasks = [];
        this.filteredTasks = [];
        this.currentFilter = 'all';
        this.unsubscribeTasks = null;
        this.unsubscribeSharedTasks = null;
        this.init();
    }

    async init() {
        console.log('📋 TaskManager inicializálás...', this.userEmail);
        
        try {
            this.initializeDOM();
            this.setupEventListeners();
            this.setupFirebaseListeners();
            console.log('✅ TaskManager inicializálva');
        } catch (error) {
            console.error('❌ TaskManager inicializálási hiba:', error);
        }
    }

    initializeDOM() {
        console.log('📋 DOM elemek inicializálása...');
        
        this.elements = {
            addTaskBtn: document.getElementById('addTaskBtn'),
            taskForm: document.getElementById('taskForm'),
            taskModal: document.getElementById('taskModal'),
            closeModal: document.querySelector('.close'),
            submitTaskBtn: document.getElementById('submitTaskBtn'),
            taskTitle: document.getElementById('taskTitle'),
            taskDescription: document.getElementById('taskDescription'),
            taskPriority: document.getElementById('taskPriority'),
            taskCategory: document.getElementById('taskCategory'),
            tasksList: document.getElementById('tasksList'),
            filterBtns: document.querySelectorAll('.filter-btn'),
            searchInput: document.getElementById('searchInput'),
            totalTasks: document.getElementById('totalTasks'),
            completedTasks: document.getElementById('completedTasks'),
            pendingTasks: document.getElementById('pendingTasks')
        };

        if (!this.elements.addTaskBtn || !this.elements.tasksList) {
            throw new Error('Hiányzó DOM elemek');
        }

        console.log('✅ DOM elemek megtalálva');
    }

    setupEventListeners() {
        console.log('👂 Event listener-ek beállítása...');
        
        this.elements.addTaskBtn.addEventListener('click', () => this.showTaskModal());
        this.elements.closeModal.addEventListener('click', () => this.hideTaskModal());
        this.elements.taskForm.addEventListener('submit', (e) => this.handleTaskSubmit(e));
        this.elements.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        
        this.elements.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.elements.filterBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.filter;
                this.filterAndRenderTasks();
            });
        });

        window.addEventListener('click', (e) => {
            if (e.target === this.elements.taskModal) {
                this.hideTaskModal();
            }
        });

        console.log('✅ Event listener-ek beállítva');
    }

    setupFirebaseListeners() {
        console.log('🔥 Firebase listener-ek beállítása...');
        
        console.log('👀 Saját feladatok figyelése...');
        const tasksQuery = query(
            collection(db, 'tasks'),
            where('userId', '==', this.userId),
            orderBy('createdAt', 'desc')
        );

        this.unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
            console.log(`📥 ${snapshot.docs.length} saját feladat érkezett`);
            snapshot.docs.forEach(doc => {
                console.log(`📄 Feladat: ${doc.id}`, doc.data().title);
            });
            this.handleTasksSnapshot(snapshot, 'own');
        }, (error) => {
            console.error('❌ Saját feladatok listener hiba:', error);
            notificationManager.show('Hiba a feladatok betöltése során!', 'error');
        });

        this.loadSharedTasks();
    }

    cleanup() {
        console.log('🧹 TaskManager cleanup...');
        
        if (this.unsubscribeTasks) {
            this.unsubscribeTasks();
            this.unsubscribeTasks = null;
            console.log('✅ Saját feladatok listener leállítva');
        }
        
        if (this.unsubscribeSharedTasks) {
            this.unsubscribeSharedTasks();
            this.unsubscribeSharedTasks = null;
            console.log('✅ Megosztott feladatok listener leállítva');
        }
    }

    async loadSharedTasks() {
        console.log('👥 Megosztott feladatok betöltése...');
        
        try {
            const collaborationsQuery = query(
                collection(db, 'collaborations'),
                where('collaboratorEmail', '==', this.userEmail)
            );

            const collaborationsSnapshot = await getDocs(collaborationsQuery);
            console.log(`🤝 ${collaborationsSnapshot.docs.length} kollaboráció találva`);

            for (const collabDoc of collaborationsSnapshot.docs) {
                const collaboration = collabDoc.data();
                const sharedTasksQuery = query(
                    collection(db, 'tasks'),
                    where('userId', '==', collaboration.ownerId),
                    where('isShared', '==', true)
                );

                const sharedTasksSnapshot = await getDocs(sharedTasksQuery);
                this.handleTasksSnapshot(sharedTasksSnapshot, 'shared', collaboration.ownerId);
            }
        } catch (error) {
            console.error('❌ Megosztott feladatok betöltési hiba:', error);
        }
    }

    handleTasksSnapshot(snapshot, type, ownerId = null) {
        console.log(`🔄 Feladatok frissítése (${type}): ${snapshot.docs.length}`);
        
        if (type === 'own') {
            this.tasks = this.tasks.filter(task => task.type !== 'own');
        } else if (type === 'shared') {
            this.tasks = this.tasks.filter(task => !(task.type === 'shared' && task.ownerId === ownerId));
        }

        snapshot.docs.forEach(doc => {
            const taskData = { 
                id: doc.id, 
                ...doc.data(), 
                type,
                ownerId: ownerId || this.userId
            };
            this.tasks.push(taskData);
        });

        console.log(`📊 Összes feladat: ${this.tasks.length}`);
        this.filterAndRenderTasks();
        this.updateStats();
    }

    showTaskModal(task = null) {
        this.currentEditingTask = task;
        
        if (task) {
            this.elements.taskTitle.value = task.title;
            this.elements.taskDescription.value = task.description || '';
            this.elements.taskPriority.value = task.priority || 'medium';
            this.elements.taskCategory.value = task.category || 'personal';
            this.elements.submitTaskBtn.textContent = 'Feladat frissítése';
        } else {
            this.elements.taskForm.reset();
            this.elements.submitTaskBtn.textContent = 'Feladat létrehozása';
        }
        
        this.elements.taskModal.style.display = 'block';
    }

    hideTaskModal() {
        this.elements.taskModal.style.display = 'none';
        this.currentEditingTask = null;
    }

    async handleTaskSubmit(e) {
        e.preventDefault();
        
        const taskData = {
            title: this.elements.taskTitle.value.trim(),
            description: this.elements.taskDescription.value.trim(),
            priority: this.elements.taskPriority.value,
            category: this.elements.taskCategory.value,
            userId: this.userId,
            userEmail: this.userEmail,
            completed: false,
            isShared: false,
            updatedAt: new Date()
        };

        if (!taskData.title) {
            notificationManager.show('A feladat címe kötelező!', 'error');
            return;
        }

        try {
            if (this.currentEditingTask) {
                await updateDoc(doc(db, 'tasks', this.currentEditingTask.id), taskData);
                notificationManager.show('Feladat sikeresen frissítve! ✏️', 'success');
            } else {
                taskData.createdAt = new Date();
                await addDoc(collection(db, 'tasks'), taskData);
                notificationManager.show('Feladat sikeresen létrehozva! ✅', 'success');
            }
            
            this.hideTaskModal();
        } catch (error) {
            console.error('❌ Feladat mentési hiba:', error);
            notificationManager.show('Hiba a feladat mentése során!', 'error');
        }
    }

    async toggleTaskCompletion(taskId, currentStatus) {
        try {
            await updateDoc(doc(db, 'tasks', taskId), {
                completed: !currentStatus,
                updatedAt: new Date()
            });
            
            const message = !currentStatus ? 'Feladat befejezve! 🎉' : 'Feladat újra megnyitva! 🔄';
            notificationManager.show(message, 'success');
        } catch (error) {
            console.error('❌ Feladat állapot frissítési hiba:', error);
            notificationManager.show('Hiba a feladat frissítése során!', 'error');
        }
    }

    async deleteTask(taskId) {
        if (!confirm('Biztosan törölni szeretnéd ezt a feladatot?')) {
            return;
        }

        try {
            await deleteDoc(doc(db, 'tasks', taskId));
            notificationManager.show('Feladat sikeresen törölve! 🗑️', 'success');
        } catch (error) {
            console.error('❌ Feladat törlési hiba:', error);
            notificationManager.show('Hiba a feladat törlése során!', 'error');
        }
    }

    handleSearch(searchTerm) {
        this.searchTerm = searchTerm.toLowerCase();
        this.filterAndRenderTasks();
    }

    filterAndRenderTasks() {
        let filtered = this.tasks;

        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(task => {
                if (this.currentFilter === 'completed') return task.completed;
                if (this.currentFilter === 'pending') return !task.completed;
                return task.category === this.currentFilter;
            });
        }

        if (this.searchTerm) {
            filtered = filtered.filter(task =>
                task.title.toLowerCase().includes(this.searchTerm) ||
                (task.description && task.description.toLowerCase().includes(this.searchTerm))
            );
        }

        this.filteredTasks = filtered;
        this.renderTasks();
    }

    renderTasks() {
        console.log(`🎨 Feladatok renderelése: ${this.filteredTasks.length}`);
        
        if (this.filteredTasks.length === 0) {
            this.elements.tasksList.innerHTML = `
                <div class="empty-state">
                    <p>📝 Nincsenek feladatok</p>
                    <p>Hozz létre egy újat a + gombbal!</p>
                </div>
            `;
            return;
        }

        this.elements.tasksList.innerHTML = this.filteredTasks.map(task => `
            <div class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
                <div class="task-content">
                    <div class="task-header">
                        <h3 class="task-title">${this.escapeHtml(task.title)}</h3>
                        <div class="task-meta">
                            <span class="priority priority-${task.priority || 'medium'}">${this.getPriorityText(task.priority)}</span>
                            <span class="category">${this.getCategoryText(task.category)}</span>
                            ${task.type === 'shared' ? '<span class="shared-badge">👥 Megosztott</span>' : ''}
                        </div>
                    </div>
                    ${task.description ? `<p class="task-description">${this.escapeHtml(task.description)}</p>` : ''}
                    <div class="task-footer">
                        <small class="task-date">
                            Létrehozva: ${this.formatDate(task.createdAt)}
                            ${task.updatedAt && task.updatedAt.toDate() > task.createdAt.toDate() ? 
                                ` • Frissítve: ${this.formatDate(task.updatedAt)}` : ''}
                        </small>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="btn-icon complete-btn" onclick="taskManager.toggleTaskCompletion('${task.id}', ${task.completed})" 
                            title="${task.completed ? 'Megnyitás' : 'Befejezés'}">
                        ${task.completed ? '🔄' : '✅'}
                    </button>
                    ${task.type === 'own' ? `
                        <button class="btn-icon edit-btn" onclick="taskManager.showTaskModal(${JSON.stringify(task).replace(/"/g, '&quot;')})" title="Szerkesztés">
                            ✏️
                        </button>
                        <button class="btn-icon share-btn" onclick="collaborationManager.showShareModal('${task.id}')" title="Megosztás">
                            👥
                        </button>
                        <button class="btn-icon delete-btn" onclick="taskManager.deleteTask('${task.id}')" title="Törlés">
                            🗑️
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    updateStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(task => task.completed).length;
        const pending = total - completed;

        this.elements.totalTasks.textContent = total;
        this.elements.completedTasks.textContent = completed;
        this.elements.pendingTasks.textContent = pending;

        console.log(`📊 Statisztika frissítés: {totalTasks: ${total}, completedTasks: ${completed}, pendingTasks: ${pending}}`);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(timestamp) {
        if (!timestamp) return 'Ismeretlen';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('hu-HU') + ' ' + date.toLocaleTimeString('hu-HU', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    getPriorityText(priority) {
        const priorities = {
            low: 'Alacsony',
            medium: 'Közepes',
            high: 'Magas'
        };
        return priorities[priority] || 'Közepes';
    }

    getCategoryText(category) {
        const categories = {
            work: 'Munka',
            personal: 'Személyes',
            shopping: 'Bevásárlás',
            health: 'Egészség',
            education: 'Tanulás',
            other: 'Egyéb'
        };
        return categories[category] || 'Egyéb';
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



