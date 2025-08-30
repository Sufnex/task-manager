// Firebase konfiguráció
const firebaseConfig = {
    apiKey: "AIzaSyAg93are7mqcCxpIsGxrFTIf0MhRjX8FXA",
    authDomain: "task-manager-sb.firebaseapp.com",
    projectId: "task-manager-sb",
    storageBucket: "task-manager-sb.firebasestorage.app",
    messagingSenderId: "845230301220",
    appId: "1:845230301220:web:e4e45ca55ac66907e478b1"
};

// Firebase inicializálás
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, orderBy, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

console.log('🔥 Firebase inicializálás...');
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
console.log('✅ Firebase inicializálva:', app);

// Globális változók
let taskManager = null;
let collaborationManager = null;

// AuthManager osztály
class AuthManager {
    constructor() {
        console.log('🔐 AuthManager inicializálás...');
        this.initializeElements();
        this.setupEventListeners();
        this.setupAuthStateListener();
    }

    initializeElements() {
        console.log('📋 Auth elemek inicializálása...');
        this.elements = {
            authModal: document.getElementById('auth-modal'),
            loginBtn: document.getElementById('google-signin'),
            logoutBtn: document.getElementById('logout-btn'),
            userInfo: document.getElementById('user-info'),
            userName: document.getElementById('user-name'),
            userEmail: document.getElementById('user-email'),
            app: document.getElementById('main-app')
        };

        // DEBUG: Ellenőrizzük melyik elem hiányzik
        Object.keys(this.elements).forEach(key => {
            if (!this.elements[key]) {
                console.error(`❌ Hiányzó DOM elem: ${key}`);
            } else {
                console.log(`✅ DOM elem megtalálva: ${key}`);
            }
        });
        console.log('✅ Auth elemek ellenőrzése kész');
    }

    setupEventListeners() {
        console.log('👂 Auth event listener-ek beállítása...');
        
        if (this.elements.loginBtn) {
            this.elements.loginBtn.addEventListener('click', () => this.signInWithGoogle());
            console.log('✅ Login button listener hozzáadva');
        } else {
            console.error('❌ loginBtn nem található!');
        }
        
        if (this.elements.logoutBtn) {
            this.elements.logoutBtn.addEventListener('click', () => this.logout());
            console.log('✅ Logout button listener hozzáadva');
        } else {
            console.error('❌ logoutBtn nem található!');
        }
        
        console.log('✅ Auth event listener-ek beállítva');
    }

    setupAuthStateListener() {
        console.log('👀 Auth állapot figyelés indítása...');
        onAuthStateChanged(auth, (user) => {
            if (user) {
                console.log('✅ Felhasználó bejelentkezve:', user.email);
                this.handleUserLogin(user);
            } else {
                console.log('❌ Nincs bejelentkezve');
                this.handleUserLogout();
            }
        });
    }

    async handleUserLogin(user) {
        try {
            await this.saveUserToFirestore(user);
            this.updateUI(user);
            this.showApp();
            this.initializeManagers(user);
        } catch (error) {
            console.error('❌ Felhasználó kezelési hiba:', error);
            notificationManager.show('Hiba a bejelentkezés során!', 'error');
        }
    }

    async saveUserToFirestore(user) {
        console.log('💾 Felhasználó mentése Firestore-ba:', user.email);
        try {
            await addDoc(collection(db, 'users'), {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                lastLogin: new Date()
            });
            console.log('✅ Felhasználó mentve');
        } catch (error) {
            console.log('ℹ️ Felhasználó már létezik vagy mentési hiba:', error.message);
        }
    }

    updateUI(user) {
        if (this.elements.userName) {
            this.elements.userName.textContent = user.displayName || 'Felhasználó';
        }
        if (this.elements.userEmail) {
            this.elements.userEmail.textContent = user.email;
        }
        if (this.elements.userInfo) {
            this.elements.userInfo.style.display = 'flex';
        }
        if (this.elements.logoutBtn) {
            this.elements.logoutBtn.style.display = 'block';
        }
    }

    initializeManagers(user) {
        console.log('🚀 TaskManager inicializálás...');
        console.log('👤 User objektum:', user.uid, user.email);
        window.taskManager = new TaskManager(user.uid, user.email);
        window.collaborationManager = new CollaborationManager(user.uid, user.email);
    }

    handleUserLogout() {
        this.hideApp();
        this.showAuthModal();
        if (this.elements.userInfo) {
            this.elements.userInfo.style.display = 'none';
        }
        if (this.elements.logoutBtn) {
            this.elements.logoutBtn.style.display = 'none';
        }
    }

    showApp() {
        console.log('📱 Alkalmazás megjelenítése');
        if (this.elements.app) {
            this.elements.app.style.display = 'block';
            this.elements.app.classList.remove('hidden');
        }
        if (this.elements.authModal) {
            this.elements.authModal.style.display = 'none';
        }
    }

    hideApp() {
        if (this.elements.app) {
            this.elements.app.style.display = 'none';
            this.elements.app.classList.add('hidden');
        }
    }

    showAuthModal() {
        console.log('🔓 Auth modal megjelenítése');
        if (this.elements.authModal) {
            this.elements.authModal.style.display = 'flex';
        }
    }

    async signInWithGoogle() {
        console.log('🌐 Google bejelentkezés próbálkozás...');
        try {
            const result = await signInWithPopup(auth, provider);
            notificationManager.show('Google bejelentkezés sikeres! 🎉', 'success');
            console.log('✅ Google bejelentkezés sikeres');
        } catch (error) {
            console.error('❌ Google bejelentkezési hiba:', error);
            notificationManager.show('Google bejelentkezési hiba!', 'error');
        }
    }

    async logout() {
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
}

// NotificationManager osztály
class NotificationManager {
    constructor() {
        this.container = this.createContainer();
    }

    createContainer() {
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(container);
        return container;
    }

    show(message, type = 'info', duration = 4000) {
        console.log(`📢 Notification (${type}): ${message}`);
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            background: ${this.getBackgroundColor(type)};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            max-width: 300px;
            word-wrap: break-word;
            font-size: 14px;
            line-height: 1.4;
        `;
        notification.textContent = message;
        this.container.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 100);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }

    getBackgroundColor(type) {
        const colors = {
            success: '#4CAF50',
            error: '#f44336',
            warning: '#ff9800',
            info: '#2196F3'
        };
        return colors[type] || colors.info;
    }
}

// CollaborationManager osztály
class CollaborationManager {
    constructor(userId, userEmail) {
        console.log('🤝 CollaborationManager inicializálás...');
        this.userId = userId;
        this.userEmail = userEmail;
        this.initializeElements();
    }

    initializeElements() {
        console.log('📋 Collaboration elemek inicializálása...');
        this.elements = {
            shareModal: document.getElementById('share-modal'),
            closeShareModal: document.querySelector('#share-modal .close-modal'),
            shareBtn: document.getElementById('share-btn'),
            shareEmail: document.getElementById('share-email'),
            openShareBtn: document.getElementById('open-share')
        };
        this.setupEventListeners();
        console.log('✅ Collaboration elemek beállítva');
    }

    setupEventListeners() {
        if (this.elements.closeShareModal) {
            this.elements.closeShareModal.addEventListener('click', () => this.hideShareModal());
        }
        
        if (this.elements.shareBtn) {
            this.elements.shareBtn.addEventListener('click', (e) => this.handleShare(e));
        }
        
        if (this.elements.openShareBtn) {
            this.elements.openShareBtn.addEventListener('click', () => this.showShareModal());
        }

        window.addEventListener('click', (e) => {
            if (e.target === this.elements.shareModal) {
                this.hideShareModal();
            }
        });
    }

    showShareModal() {
        if (this.elements.shareModal) {
            this.elements.shareModal.style.display = 'block';
            this.elements.shareModal.classList.remove('hidden');
        }
    }

    hideShareModal() {
        if (this.elements.shareModal) {
            this.elements.shareModal.style.display = 'none';
            this.elements.shareModal.classList.add('hidden');
        }
        if (this.elements.shareEmail) {
            this.elements.shareEmail.value = '';
        }
    }

    async handleShare(e) {
        e.preventDefault();
        
        if (!this.elements.shareEmail) {
            notificationManager.show('Email mező nem található!', 'error');
            return;
        }
        
        const collaboratorEmail = this.elements.shareEmail.value.trim();

        if (!collaboratorEmail) {
            notificationManager.show('Az email cím megadása kötelező!', 'error');
            return;
        }

        if (collaboratorEmail === this.userEmail) {
            notificationManager.show('Nem oszthatod meg magaddal a feladatot!', 'error');
            return;
        }

        try {
            await addDoc(collection(db, 'collaborations'), {
                ownerId: this.userId,
                ownerEmail: this.userEmail,
                collaboratorEmail,
                createdAt: new Date(),
                status: 'active'
            });

            notificationManager.show(`Partnerkapcsolat létrehozva ${collaboratorEmail} címmel! 🤝`, 'success');
            this.hideShareModal();
        } catch (error) {
            console.error('❌ Megosztási hiba:', error);
            notificationManager.show('Hiba a partnerkapcsolat létrehozása során!', 'error');
        }
    }
}

// TaskManager osztály
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
            addTaskBtn: document.getElementById('add-task-btn'),
            taskForm: document.getElementById('task-form'),
            taskModal: document.getElementById('task-modal'),
            closeModal: document.querySelector('#task-modal .close-modal'),
            submitTaskBtn: document.querySelector('#task-form button[type="submit"]'),
            cancelTaskBtn: document.getElementById('cancel-task'),
            taskTitle: document.getElementById('task-title'),
            taskDescription: document.getElementById('task-description'),
            taskPriority: document.getElementById('task-priority'),
            taskCategory: document.getElementById('task-category'),
            tasksList: document.getElementById('list-view'),
            filterBtns: document.querySelectorAll('.filter-btn'),
            searchInput: document.getElementById('search-input'),
            totalTasks: document.getElementById('total-tasks'),
            completedTasks: document.getElementById('completed-tasks'),
            pendingTasks: document.getElementById('pending-tasks')
        };

        // DEBUG: Ellenőrizzük melyik elem hiányzik
        Object.keys(this.elements).forEach(key => {
            if (!this.elements[key] || (this.elements[key].length === 0)) {
                console.error(`❌ Hiányzó DOM elem: ${key}`);
            } else {
                console.log(`✅ DOM elem megtalálva: ${key}`);
            }
        });

        if (!this.elements.addTaskBtn || !this.elements.tasksList) {
            console.error('❌ Kritikus DOM elemek hiányoznak!');
            throw new Error('Hiányzó DOM elemek');
        }
        console.log('✅ DOM elemek megtalálva');
    }

    setupEventListeners() {
        console.log('👂 Event listener-ek beállítása...');
        
        if (this.elements.addTaskBtn) {
            this.elements.addTaskBtn.addEventListener('click', () => this.showTaskModal());
        }
        
        if (this.elements.closeModal) {
            this.elements.closeModal.addEventListener('click', () => this.hideTaskModal());
        }
        
        if (this.elements.cancelTaskBtn) {
            this.elements.cancelTaskBtn.addEventListener('click', () => this.hideTaskModal());
        }
        
        if (this.elements.taskForm) {
            this.elements.taskForm.addEventListener('submit', (e) => this.handleTaskSubmit(e));
        }
        
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }

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
            if (this.elements.submitTaskBtn) {
                this.elements.submitTaskBtn.textContent = '💾 Frissítés';
            }
        } else {
            this.elements.taskForm.reset();
            if (this.elements.submitTaskBtn) {
                this.elements.submitTaskBtn.textContent = '💾 Mentés';
            }
        }
        
        if (this.elements.taskModal) {
            this.elements.taskModal.style.display = 'block';
            this.elements.taskModal.classList.remove('hidden');
        }
    }

    hideTaskModal() {
        if (this.elements.taskModal) {
            this.elements.taskModal.style.display = 'none';
            this.elements.taskModal.classList.add('hidden');
        }
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
                if (this.currentFilter === 'shared') return task.type === 'shared';
                if (this.currentFilter === 'private') return task.type === 'own';
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
                        <small class="task-date">Létrehozva: ${this.formatDate(task.createdAt)}${task.updatedAt && task.updatedAt.toDate() > task.createdAt.toDate() ?
                ` • Frissítve: ${this.formatDate(task.updatedAt)}` : ''}</small>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="btn-icon complete-btn" 
                            onclick="taskManager.toggleTaskCompletion('${task.id}', ${task.completed})"
                            title="${task.completed ? 'Megnyitás' : 'Befejezés'}">
                        ${task.completed ? '🔄' : '✅'}
                    </button>
                    ${task.type === 'own' ? `
                        <button class="btn-icon edit-btn" 
                                onclick="taskManager.showTaskModal(${JSON.stringify(task).replace(/"/g, '&quot;')})" 
                                title="Szerkesztés">✏️</button>
                        <button class="btn-icon delete-btn" 
                                onclick="taskManager.deleteTask('${task.id}')" 
                                title="Törlés">🗑️</button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    updateStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(task => task.completed).length;
        const pending = total - completed;

        if (this.elements.totalTasks) {
            this.elements.totalTasks.textContent = total;
        }
        if (this.elements.completedTasks) {
            this.elements.completedTasks.textContent = completed;
        }
        if (this.elements.pendingTasks) {
            this.elements.pendingTasks.textContent = pending;
        }

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
            high: 'Magas',
            urgent: 'Sürgős'
        };
        return priorities[priority] || 'Közepes';
    }

    getCategoryText(category) {
        const categories = {
            work: 'Munka',
            personal: 'Személyes',
            shopping: 'Bevásárlás',
            health: 'Egészség',
            other: 'Egyéb'
        };
        return categories[category] || 'Egyéb';
    }
}

// PWA Install Manager
class PWAInstallManager {
    constructor() {
        this.deferredPrompt = null;
        this.setupInstallPrompt();
    }

    setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            console.log('📱 Install prompt elérhető');
            this.showInstallButton();
        });

        window.addEventListener('appinstalled', () => {
            console.log('📱 PWA telepítve');
            notificationManager.show('Alkalmazás sikeresen telepítve! 📱', 'success');
            this.hideInstallButton();
        });
    }

    showInstallButton() {
        const installBtn = document.getElementById('installBtn');
        if (installBtn) {
            installBtn.style.display = 'block';
            installBtn.addEventListener('click', () => this.installPWA());
        }
    }

    hideInstallButton() {
        const installBtn = document.getElementById('installBtn');
        if (installBtn) {
            installBtn.style.display = 'none';
        }
    }

    async installPWA() {
        if (!this.deferredPrompt) {
            notificationManager.show('A telepítés jelenleg nem elérhető!', 'warning');
            return;
        }

        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('✅ PWA telepítés elfogadva');
        } else {
            console.log('❌ PWA telepítés elutasítva');
        }

        this.deferredPrompt = null;
    }
}

// Service Worker regisztráció
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('./sw.js');
            console.log('✅ SW registered: ', registration);

            // Frissítés kezelése
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        notificationManager.show('Új verzió elérhető! Frissítsd az oldalt. 🔄', 'info', 8000);
                    }
                });
            });
        } catch (error) {
            console.error('❌ SW registration failed: ', error);
        }
    }
}

// Globális notification manager
const notificationManager = new NotificationManager();

// Alkalmazás inicializálás
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM Content Loaded');
    
    // Managers inicializálása
    new AuthManager();
    new PWAInstallManager();
    
    // Service Worker regisztráció
    registerServiceWorker();
    
    console.log('🚀 Multi-User Task Manager betöltve!');
});

