/* ===== TASK MANAGER PWA - TELJES ALKALMAZÁS ===== */

/* ===== TASK MANAGER OSZTÁLY ===== */
class TaskManager {
    constructor() {
        // Alapvető beállítások
        this.tasks = [];
        this.currentView = 'list';
        this.currentFilter = 'all';
        this.currentEditId = null;
        
        // DOM elemek
        this.initDOMElements();
        
        // Eseménykezelők
        this.initEventListeners();
        
        // Adatok betöltése
        this.loadTasks();
        
        // Kezdeti megjelenítés
        this.renderTasks();
        this.updateStats();
        this.updateCalendar();
        
        // PWA regisztráció
        this.registerServiceWorker();
    }

    /* ===== DOM ELEMEK INICIALIZÁLÁSA ===== */
    initDOMElements() {
        // Header elemek
        this.addTaskBtn = document.getElementById('add-task-btn');
        this.viewToggle = document.getElementById('view-toggle');
        
        // Szűrők és keresés
        this.searchInput = document.getElementById('search-input');
        this.filterButtons = document.querySelectorAll('.filter-btn');
        
        // Nézetek
        this.listView = document.getElementById('list-view');
        this.calendarView = document.getElementById('calendar-view');
        
        // Modal elemek
        this.modal = document.getElementById('task-modal');
        this.modalTitle = document.getElementById('modal-title');
        this.taskForm = document.getElementById('task-form');
        this.closeModalBtn = document.querySelector('.close-modal');
        this.cancelTaskBtn = document.getElementById('cancel-task');
        
        // Form mezők
        this.taskTitle = document.getElementById('task-title');
        this.taskDescription = document.getElementById('task-description');
        this.taskPriority = document.getElementById('task-priority');
        this.taskCategory = document.getElementById('task-category');
        this.taskDate = document.getElementById('task-date');
        this.taskTime = document.getElementById('task-time');
        this.estimatedTime = document.getElementById('estimated-time');
        
        // Részfeladatok
        this.subtasksContainer = document.getElementById('subtasks-container');
        this.addSubtaskBtn = document.getElementById('add-subtask');
        
        // Naptár elemek
        this.prevMonthBtn = document.getElementById('prev-month');
        this.nextMonthBtn = document.getElementById('next-month');
        this.currentMonthEl = document.getElementById('current-month');
        this.calendarGrid = document.getElementById('calendar-grid');
        
        // Statisztika elemek
        this.totalTasksEl = document.getElementById('total-tasks');
        this.completedTasksEl = document.getElementById('completed-tasks');
        this.pendingTasksEl = document.getElementById('pending-tasks');
        this.timeSpentEl = document.getElementById('time-spent');
        
        // Naptár változók
        this.currentDate = new Date();
    }

    /* ===== ESEMÉNYKEZELŐK ===== */
    initEventListeners() {
        // Új feladat hozzáadása
        this.addTaskBtn.addEventListener('click', () => this.openModal());
        
        // Modal bezárása
        this.closeModalBtn.addEventListener('click', () => this.closeModal());
        this.cancelTaskBtn.addEventListener('click', () => this.closeModal());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });
        
        // Űrlap küldése
        this.taskForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        
        // Nézet váltás
        this.viewToggle.addEventListener('click', () => this.toggleView());
        
        // Szűrők
        this.filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.setFilter(e.target.dataset.filter));
        });
        
        // Keresés
        this.searchInput.addEventListener('input', () => this.renderTasks());
        
        // Részfeladat hozzáadása
        this.addSubtaskBtn.addEventListener('click', () => this.addSubtaskField());
        
        // Naptár navigáció
        this.prevMonthBtn.addEventListener('click', () => this.previousMonth());
        this.nextMonthBtn.addEventListener('click', () => this.nextMonth());
        
        // Billentyűzet támogatás
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                this.openModal();
            }
        });
    }

    /* ===== FELADAT LÉTREHOZÁSA ÉS SZERKESZTÉSE ===== */
    openModal(taskId = null) {
        this.currentEditId = taskId;
        
        if (taskId) {
            // Szerkesztés
            const task = this.tasks.find(t => t.id === taskId);
            this.modalTitle.textContent = 'Feladat szerkesztése';
            this.fillForm(task);
        } else {
            // Új feladat
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
        
        // Részfeladatok betöltése
        this.subtasksContainer.innerHTML = '';
        if (task.subtasks && task.subtasks.length > 0) {
            task.subtasks.forEach(subtask => {
                this.addSubtaskField(subtask.text, subtask.completed);
            });
        }
    }

    resetForm() {
        this.taskForm.reset();
        this.subtasksContainer.innerHTML = '';
        this.taskDate.value = new Date().toISOString().split('T')[0];
    }

    handleFormSubmit(e) {
        e.preventDefault();
        
        const taskData = {
            title: this.taskTitle.value.trim(),
            description: this.taskDescription.value.trim(),
            priority: this.taskPriority.value,
            category: this.taskCategory.value,
            dueDate: this.taskDate.value,
            dueTime: this.taskTime.value,
            estimatedTime: parseInt(this.estimatedTime.value) || 0,
            subtasks: this.getSubtasks()
        };

        if (!taskData.title) {
            alert('A feladat neve kötelező!');
            return;
        }

        if (this.currentEditId) {
            this.updateTask(this.currentEditId, taskData);
        } else {
            this.createTask(taskData);
        }

        this.closeModal();
        this.renderTasks();
        this.updateStats();
        this.updateCalendar();
    }

    createTask(taskData) {
        const task = {
            id: Date.now().toString(),
            ...taskData,
            completed: false,
            createdAt: new Date().toISOString(),
            timeSpent: 0
        };

        this.tasks.unshift(task);
        this.saveTasks();
        this.showNotification('Feladat létrehozva! 🎉');
    }

    updateTask(id, taskData) {
        const index = this.tasks.findIndex(t => t.id === id);
        if (index !== -1) {
            this.tasks[index] = { ...this.tasks[index], ...taskData };
            this.saveTasks();
            this.showNotification('Feladat frissítve! ✅');
        }
    }

    deleteTask(id) {
        if (confirm('Biztosan törölni szeretnéd ezt a feladatot?')) {
            this.tasks = this.tasks.filter(t => t.id !== id);
            this.saveTasks();
            this.renderTasks();
            this.updateStats();
            this.updateCalendar();
            this.showNotification('Feladat törölve! 🗑️');
        }
    }

    toggleTaskComplete(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            if (task.completed) {
                task.completedAt = new Date().toISOString();
                this.showNotification('Feladat befejezve! 🎉');
            } else {
                delete task.completedAt;
            }
            this.saveTasks();
            this.renderTasks();
            this.updateStats();
        }
    }

    /* ===== RÉSZFELADATOK KEZELÉSE ===== */
    addSubtaskField(text = '', completed = false) {
        const subtaskDiv = document.createElement('div');
        subtaskDiv.className = 'subtask-item';
        subtaskDiv.innerHTML = `
            <input type="checkbox" ${completed ? 'checked' : ''}>
            <input type="text" placeholder="Részfeladat..." value="${text}">
            <button type="button" onclick="this.parentElement.remove()">🗑️</button>
        `;
        this.subtasksContainer.appendChild(subtaskDiv);
    }

    getSubtasks() {
        const subtaskItems = this.subtasksContainer.querySelectorAll('.subtask-item');
        return Array.from(subtaskItems).map(item => ({
            text: item.querySelector('input[type="text"]').value.trim(),
            completed: item.querySelector('input[type="checkbox"]').checked
        })).filter(subtask => subtask.text);
    }

    /* ===== MEGJELENÍTÉS ÉS SZŰRÉS ===== */
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
            <div class="task-item priority-${task.priority} ${task.completed ? 'completed' : ''}" 
                 data-task-id="${task.id}">
                <div class="task-header">
                    <div>
                        <div class="task-title">${this.escapeHtml(task.title)}</div>
                        <span class="task-category">${this.getCategoryLabel(task.category)}</span>
                    </div>
                    <div class="task-actions">
                        <button onclick="taskManager.toggleTaskComplete('${task.id}')" 
                                title="${task.completed ? 'Visszavonás' : 'Befejezés'}">
                            ${task.completed ? '↶' : '✓'}
                        </button>
                        <button onclick="taskManager.openModal('${task.id}')" title="Szerkesztés">✏️</button>
                        <button onclick="taskManager.deleteTask('${task.id}')" title="Törlés">🗑️</button>
                    </div>
                </div>
                ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
                ${task.subtasks && task.subtasks.length > 0 ? `
                    <div class="subtasks">
                        ${task.subtasks.map((subtask, index) => `
                            <div class="subtask ${subtask.completed ? 'completed' : ''}">
                                <input type="checkbox" ${subtask.completed ? 'checked' : ''} 
                                       onchange="taskManager.toggleSubtask('${task.id}', ${index})">
                                <span>${this.escapeHtml(subtask.text)}</span>
                            </div>
                        `).join('')}
                    </div>
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
            case 'high':
                filtered = filtered.filter(task => task.priority === 'high' || task.priority === 'urgent');
                break;
        }

        // Keresés
        const searchTerm = this.searchInput.value.toLowerCase().trim();
        if (searchTerm) {
            filtered = filtered.filter(task =>
                task.title.toLowerCase().includes(searchTerm) ||
                (task.description && task.description.toLowerCase().includes(searchTerm)) ||
                task.category.toLowerCase().includes(searchTerm)
            );
        }

        // Rendezés: befejezetlen feladatok elől, majd prioritás szerint
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
        
        // Aktív gomb frissítése
        this.filterButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        
        this.renderTasks();
    }

    /* ===== NÉZET VÁLTÁS ===== */
    toggleView() {
        if (this.currentView === 'list') {
            this.currentView = 'calendar';
            this.listView.classList.add('hidden');
            this.calendarView.classList.remove('hidden');
            this.viewToggle.textContent = '📋';
            this.updateCalendar();
        } else {
            this.currentView = 'list';
            this.listView.classList.remove('hidden');
            this.calendarView.classList.add('hidden');
            this.viewToggle.textContent = '📅';
        }
    }

    /* ===== NAPTÁR FUNKCIÓK ===== */
    updateCalendar() {
        this.currentMonthEl.textContent = this.currentDate.toLocaleDateString('hu-HU', {
            year: 'numeric',
            month: 'long'
        });
        this.renderCalendarGrid();
    }

    renderCalendarGrid() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay() + 1);

        this.calendarGrid.innerHTML = '';

        // Hét napjainak fejlécei
        const weekDays = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'];
        weekDays.forEach(day => {
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-header-day';
            dayEl.textContent = day;
            this.calendarGrid.appendChild(dayEl);
        });

        // Naptár napjainak generálása
        for (let i = 0; i < 42; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            
            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            dayEl.textContent = date.getDate();

            // Mai nap jelölése
            if (this.isToday(date)) {
                dayEl.classList.add('today');
            }

            // Aktuális hónap napjai
            if (date.getMonth() === month) {
                dayEl.classList.add('current-month');
                
                // Feladatok ellenőrzése ezen a napon
                const tasksOnDay = this.getTasksForDate(date);
                if (tasksOnDay.length > 0) {
                    dayEl.classList.add('has-tasks');
                    dayEl.title = `${tasksOnDay.length} feladat`;
                }
            } else {
                dayEl.classList.add('other-month');
            }

            dayEl.addEventListener('click', () => {
                this.showTasksForDate(date);
            });

            this.calendarGrid.appendChild(dayEl);
        }
    }

    previousMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.updateCalendar();
    }

    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.updateCalendar();
    }

    getTasksForDate(date) {
        const dateStr = date.toISOString().split('T')[0];
        return this.tasks.filter(task => task.dueDate === dateStr);
    }

    showTasksForDate(date) {
        const tasks = this.getTasksForDate(date);
        const dateStr = date.toLocaleDateString('hu-HU');
        
        if (tasks.length === 0) {
            alert(`Nincsenek feladatok erre a napra: ${dateStr}`);
            return;
        }

        const taskList = tasks.map(task => 
            `• ${task.title} (${this.getPriorityLabel(task.priority)})`
        ).join('\n');
        
        alert(`Feladatok - ${dateStr}:\n\n${taskList}`);
    }

    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }

    /* ===== STATISZTIKÁK ===== */
    updateStats() {
        const today = new Date().toISOString().split('T')[0];
        const todayTasks = this.tasks.filter(task => 
            task.dueDate === today || 
            (task.createdAt && task.createdAt.split('T')[0] === today)
        );

        const totalTasks = todayTasks.length;
        const completedTasks = todayTasks.filter(task => task.completed).length;
        const pendingTasks = totalTasks - completedTasks;
        const timeSpent = this.tasks.reduce((total, task) => total + (task.timeSpent || 0), 0);

        this.totalTasksEl.textContent = totalTasks;
        this.completedTasksEl.textContent = completedTasks;
        this.pendingTasksEl.textContent = pendingTasks;
        this.timeSpentEl.textContent = Math.round(timeSpent);
    }

    /* ===== ADATKEZELÉS (OFFLINE TÁROLÁS) ===== */
    saveTasks() {
        try {
            localStorage.setItem('taskManager_tasks', JSON.stringify(this.tasks));
        } catch (error) {
            console.error('Hiba a feladatok mentésekor:', error);
            this.showNotification('Hiba történt a mentés során! ⚠️');
        }
    }

    loadTasks() {
        try {
            const saved = localStorage.getItem('taskManager_tasks');
            if (saved) {
                this.tasks = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Hiba a feladatok betöltésekor:', error);
            this.tasks = [];
        }
    }

    /* ===== SEGÉDFUNKCIÓK ===== */
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

    showNotification(message) {
        // PWA push notifikáció
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Task Manager', { 
                body: message,
                icon: './icons/icon-192.png'
            });
        }

        // Képernyőn megjelenő értesítés
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--success-color);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: var(--shadow-medium);
            z-index: 10000;
            animation: slideIn 0.3s ease;
            max-width: 300px;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    toggleSubtask(taskId, subtaskIndex) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task && task.subtasks && task.subtasks[subtaskIndex]) {
            task.subtasks[subtaskIndex].completed = !task.subtasks[subtaskIndex].completed;
            this.saveTasks();
            this.renderTasks();
        }
    }

    /* ===== PWA SERVICE WORKER REGISZTRÁLÁS ===== */
    async registerServiceWorker() {
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

    /* ===== ADATOK EXPORTÁLÁSA/IMPORTÁLÁSA ===== */
    exportTasks() {
        const dataStr = JSON.stringify(this.tasks, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `task-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        this.showNotification('Feladatok exportálva! 📤');
    }

    importTasks(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const tasks = JSON.parse(e.target.result);
                if (Array.isArray(tasks)) {
                    this.tasks = tasks;
                    this.saveTasks();
                    this.renderTasks();
                    this.updateStats();
                    this.updateCalendar();
                    this.showNotification('Feladatok importálva! 📥');
                } else {
                    throw new Error('Hibás fájlformátum');
                }
            } catch (error) {
                alert('Hiba történt az importálás során!');
            }
        };
        reader.readAsText(file);
    }
}

/* ===== PWA MANAGER OSZTÁLY ===== */
class PWAManager {
    constructor(taskManager) {
        this.taskManager = taskManager;
        this.initPWAFeatures();
    }

    async initPWAFeatures() {
        console.log('🔧 PWA funkciók inicializálása...');
        
        // URL paraméterek kezelése (shortcuts)
        this.handleURLParams();
        
        // Hálózat állapot figyelése
        this.monitorNetworkStatus();
        
        // Háttér szinkronizálás regisztrálása
        await this.registerBackgroundSync();
        
        // Cache tisztítás ütemezése
        this.scheduleCacheCleanup();
        
        // Periodikus backup engedélyezése
        this.enablePeriodicBackup();
    }

    handleURLParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');
        const filter = urlParams.get('filter');

        if (action === 'new-task') {
            // Várunk egy kicsit, hogy a TaskManager betöltődjön
            setTimeout(() => {
                if (this.taskManager) {
                    this.taskManager.openModal();
                }
            }, 1000);
        }

        if (filter === 'today') {
            setTimeout(() => {
                if (this.taskManager) {
                    const today = new Date().toISOString().split('T')[0];
                    this.taskManager.searchInput.value = today;
                    this.taskManager.renderTasks();
                }
            }, 500);
        }

        if (filter === 'pending') {
            setTimeout(() => {
                if (this.taskManager) {
                    this.taskManager.setFilter('pending');
                }
            }, 500);
        }
    }

    monitorNetworkStatus() {
        const updateOnlineStatus = () => {
            const isOnline = navigator.onLine;
            document.body.classList.toggle('offline', !isOnline);
            
            // Online/offline jelző hozzáadása
            this.updateConnectionIndicator(isOnline);

            if (!isOnline) {
                this.taskManager?.showNotification('📴 Offline módban vagy - Az adatok helyben mentődnek');
            } else {
                this.taskManager?.showNotification('🌐 Internetkapcsolat helyreállt!');
            }
        };

        // Kezdeti állapot beállítása
        updateOnlineStatus();

        // Események figyelése
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
    }

    updateConnectionIndicator(isOnline) {
        // Kapcsolat jelző hozzáadása/frissítése
        let indicator = document.getElementById('connection-indicator');
        
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'connection-indicator';
            indicator.style.cssText = `
                position: fixed;
                top: 70px;
                right: 20px;
                padding: 8px 12px;
                border-radius: 20px;
                font-size: 0.8rem;
                font-weight: 500;
                z-index: 1001;
                transition: all 0.3s ease;
            `;
            document.body.appendChild(indicator);
        }

        if (isOnline) {
            indicator.textContent = '🌐 Online';
            indicator.style.background = '#4CAF50';
            indicator.style.color = 'white';
            // Pár másodperc után elrejtjük
            setTimeout(() => {
                indicator.style.opacity = '0';
            }, 3000);
        } else {
            indicator.textContent = '📴 Offline';
            indicator.style.background = '#FF9800';
            indicator.style.color = 'white';
            indicator.style.opacity = '1';
        }
    }

    async registerBackgroundSync() {
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
            try {
                const registration = await navigator.serviceWorker.ready;
                await registration.sync.register('background-sync');
                console.log('✅ Háttér szinkronizálás regisztrálva');
            } catch (error) {
                console.log('⚠️ Háttér szinkronizálás nem támogatott:', error);
            }
        }
    }

    scheduleCacheCleanup() {
        // Cache tisztítás minden 6 órában
        setInterval(() => {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.controller?.postMessage({
                    type: 'CLEAN_CACHE'
                });
            }
        }, 6 * 60 * 60 * 1000); // 6 óra
    }

    enablePeriodicBackup() {
        setInterval(() => {
            if (this.taskManager && navigator.onLine) {
                // Itt lehet implementálni a felhő szinkronizálást
                console.log('🔄 Periodikus backup ellenőrzés...');
            }
        }, 30 * 60 * 1000); // 30 percenként
    }
}

/* ===== ALKALMAZÁS INDÍTÁSA ===== */
let taskManager;
let pwaManager;

document.addEventListener('DOMContentLoaded', () => {
    // TaskManager inicializálása
    taskManager = new TaskManager();
    
    // PWAManager inicializálása
    pwaManager = new PWAManager(taskManager);
    
    // Global hozzáférés fejlesztéshez
    window.taskManager = taskManager;
    window.pwaManager = pwaManager;
    
    console.log('🚀 Task Manager PWA betöltve!');
    console.log('📱 PWA funkciók aktívak');
});

/* ===== PWA TELEPÍTÉSI PROMPT ===== */
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Telepítési gomb megjelenítése
    const installBtn = document.createElement('button');
    installBtn.textContent = '📱 Telepítés';
    installBtn.className = 'btn-primary install-btn';
    installBtn.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 1000;
        box-shadow: var(--shadow-large);
    `;
    
    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const result = await deferredPrompt.userChoice;
            if (result.outcome === 'accepted') {
                installBtn.remove();
                taskManager.showNotification('App telepítve! 🎉');
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
        taskManager.openModal();
    }
    
    // Ctrl/Cmd + F = Keresés fókusz
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        taskManager.searchInput.focus();
    }
    
    // Ctrl/Cmd + E = Exportálás
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        taskManager.exportTasks();
    }
    
    // Ctrl/Cmd + V = Nézet váltás
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        taskManager.toggleView();
    }
});

/* ===== ANIMÁCIÓS UTILITY-K ===== */
const AnimationUtils = {
    slideIn: (element) => {
        element.style.animation = 'slideIn 0.3s ease';
    },
    
    slideOut: (element) => {
        element.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => element.remove(), 300);
    }
};

// CSS animációk hozzáadása dinamikusan
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes slideOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-20px); }
    }
`;
document.head.appendChild(style);
