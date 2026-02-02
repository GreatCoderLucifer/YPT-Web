/**
 * StudyFlow - Offline Study Tracker Application
 * Complete vanilla JavaScript implementation with IndexedDB storage
 */

// =============================================================================
// DATA MODEL & STORAGE
// =============================================================================

class DataStore {
    constructor() {
        this.dbName = 'StudyFlowDB';
        this.dbVersion = 1;
        this.db = null;
    }

    /**
     * Initialize IndexedDB
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Subjects store
                if (!db.objectStoreNames.contains('subjects')) {
                    const subjectStore = db.createObjectStore('subjects', { keyPath: 'id' });
                    subjectStore.createIndex('name', 'name', { unique: false });
                }

                // Tasks store
                if (!db.objectStoreNames.contains('tasks')) {
                    const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
                    taskStore.createIndex('subjectId', 'subjectId', { unique: false });
                }

                // Sessions store
                if (!db.objectStoreNames.contains('sessions')) {
                    const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
                    sessionStore.createIndex('subjectId', 'subjectId', { unique: false });
                    sessionStore.createIndex('date', 'date', { unique: false });
                }

                // Settings store (for goal, streak, etc.)
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }

    /**
     * Generic method to add/update data
     */
    async save(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Generic method to get data by key
     */
    async get(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Generic method to get all data from a store
     */
    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Generic method to delete data
     */
    async delete(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get data by index
     */
    async getByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}

// =============================================================================
// APPLICATION STATE
// =============================================================================

class AppState {
    constructor() {
        this.subjects = [];
        this.tasks = [];
        this.sessions = [];
        this.goal = null;
        this.currentView = 'dashboard';
        this.editingSubjectId = null;
        this.editingTaskId = null;
        this.editingSessionId = null;
        this.currentSubjectDetail = null;
        
        // Timer state
        this.timerState = {
            subjectId: null,
            startTime: null,
            elapsedSeconds: 0,
            isRunning: false,
            intervalId: null
        };

        // Calendar state
        this.calendarDate = new Date();
        this.selectedDate = null;

        // Stats period
        this.statsPeriod = 'week';
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Get subject by ID
     */
    getSubject(id) {
        return this.subjects.find(s => s.id === id);
    }

    /**
     * Get tasks for a subject
     */
    getTasksForSubject(subjectId) {
        return this.tasks.filter(t => t.subjectId === subjectId);
    }

    /**
     * Get sessions for a subject
     */
    getSessionsForSubject(subjectId) {
        return this.sessions.filter(s => s.subjectId === subjectId);
    }

    /**
     * Get sessions for a date
     */
    getSessionsForDate(dateString) {
        return this.sessions.filter(s => s.date === dateString);
    }

    /**
     * Calculate total time for subject
     */
    getTotalTimeForSubject(subjectId) {
        const sessions = this.getSessionsForSubject(subjectId);
        return sessions.reduce((total, session) => total + session.duration, 0);
    }

    /**
     * Calculate total time for date
     */
    getTotalTimeForDate(dateString) {
        const sessions = this.getSessionsForDate(dateString);
        return sessions.reduce((total, session) => total + session.duration, 0);
    }

    /**
     * Get today's date string
     */
    getTodayString() {
        return this.formatDate(new Date());
    }

    /**
     * Format date to YYYY-MM-DD
     */
    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Calculate study streak
     */
    calculateStreak() {
        if (this.sessions.length === 0) return 0;

        const today = new Date();
        const todayString = this.formatDate(today);
        
        // Get unique dates with sessions, sorted descending
        const datesWithSessions = [...new Set(this.sessions.map(s => s.date))]
            .sort((a, b) => b.localeCompare(a));

        if (datesWithSessions.length === 0) return 0;

        // Check if studied today or yesterday
        const latestDate = datesWithSessions[0];
        const latestDateObj = new Date(latestDate);
        const daysDiff = Math.floor((today - latestDateObj) / (1000 * 60 * 60 * 24));

        if (daysDiff > 1) return 0; // Streak broken

        let streak = 0;
        let checkDate = new Date(today);

        // Count consecutive days
        for (let i = 0; i < datesWithSessions.length; i++) {
            const dateString = this.formatDate(checkDate);
            if (datesWithSessions.includes(dateString)) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }

        return streak;
    }
}

// =============================================================================
// UI MANAGER
// =============================================================================

class UIManager {
    constructor(app) {
        this.app = app;
        this.initializeEventListeners();
    }

    /**
     * Initialize all event listeners
     */
    initializeEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchView(btn.dataset.view));
        });

        // Subject modal
        document.getElementById('add-subject-btn').addEventListener('click', () => this.openSubjectModal());
        document.getElementById('close-subject-modal').addEventListener('click', () => this.closeModal('subject-modal'));
        document.getElementById('cancel-subject').addEventListener('click', () => this.closeModal('subject-modal'));
        document.getElementById('save-subject').addEventListener('click', () => this.saveSubject());

        // Color picker sync
        const colorInput = document.getElementById('subject-color');
        const colorHexInput = document.getElementById('subject-color-hex');
        colorInput.addEventListener('input', (e) => {
            colorHexInput.value = e.target.value;
        });
        colorHexInput.addEventListener('input', (e) => {
            if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                colorInput.value = e.target.value;
            }
        });

        // Task modal
        document.getElementById('close-task-modal').addEventListener('click', () => this.closeModal('task-modal'));
        document.getElementById('cancel-task').addEventListener('click', () => this.closeModal('task-modal'));
        document.getElementById('save-task').addEventListener('click', () => this.saveTask());

        // Goal modal
        document.getElementById('edit-goal-btn').addEventListener('click', () => this.openGoalModal());
        document.getElementById('close-goal-modal').addEventListener('click', () => this.closeModal('goal-modal'));
        document.getElementById('cancel-goal').addEventListener('click', () => this.closeModal('goal-modal'));
        document.getElementById('save-goal').addEventListener('click', () => this.saveGoal());
        document.getElementById('reset-goal').addEventListener('click', () => this.resetGoal());

        // Session modal
        document.getElementById('close-session-modal').addEventListener('click', () => this.closeModal('session-modal'));
        document.getElementById('cancel-session').addEventListener('click', () => this.closeModal('session-modal'));
        document.getElementById('save-session').addEventListener('click', () => this.saveSession());

        // Subject detail modal
        document.getElementById('close-subject-detail').addEventListener('click', () => this.closeModal('subject-detail-modal'));
        document.getElementById('edit-subject-btn').addEventListener('click', () => this.editCurrentSubject());
        document.getElementById('delete-subject-btn').addEventListener('click', () => this.deleteCurrentSubject());
        document.getElementById('add-task-btn').addEventListener('click', () => this.openTaskModal());

        // Timer controls
        document.getElementById('timer-subject').addEventListener('change', (e) => this.onTimerSubjectChange(e));
        document.getElementById('start-timer').addEventListener('click', () => this.startTimer());
        document.getElementById('pause-timer').addEventListener('click', () => this.pauseTimer());
        document.getElementById('reset-timer').addEventListener('click', () => this.resetTimer());

        // Calendar navigation
        document.getElementById('prev-month').addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('next-month').addEventListener('click', () => this.changeMonth(1));

        // History filter
        document.getElementById('history-filter').addEventListener('change', () => this.renderHistory());

        // Stats period
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.app.state.statsPeriod = btn.dataset.period;
                document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderStats();
            });
        });

        // Modal backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
    }

    /**
     * Switch between views
     */
    switchView(viewName) {
        this.app.state.currentView = viewName;

        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });

        // Update views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        document.getElementById(`${viewName}-view`).classList.add('active');

        // Render view-specific content
        switch (viewName) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'subjects':
                this.renderSubjects();
                break;
            case 'timer':
                this.renderTimer();
                break;
            case 'calendar':
                this.renderCalendar();
                break;
            case 'history':
                this.renderHistory();
                break;
            case 'stats':
                this.renderStats();
                break;
        }
    }

    /**
     * Open/Close modals
     */
    openModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }

    /**
     * Subject modal operations
     */
    openSubjectModal(subjectId = null) {
        this.app.state.editingSubjectId = subjectId;
        const modal = document.getElementById('subject-modal');
        const title = document.getElementById('subject-modal-title');
        const nameInput = document.getElementById('subject-name');
        const colorInput = document.getElementById('subject-color');
        const colorHexInput = document.getElementById('subject-color-hex');

        if (subjectId) {
            const subject = this.app.state.getSubject(subjectId);
            title.textContent = 'Edit Subject';
            nameInput.value = subject.name;
            colorInput.value = subject.color;
            colorHexInput.value = subject.color;
        } else {
            title.textContent = 'Add Subject';
            nameInput.value = '';
            colorInput.value = '#6366f1';
            colorHexInput.value = '#6366f1';
        }

        this.openModal('subject-modal');
        nameInput.focus();
    }

    async saveSubject() {
        const name = document.getElementById('subject-name').value.trim();
        const color = document.getElementById('subject-color').value;

        if (!name) {
            alert('Please enter a subject name');
            return;
        }

        const subjectData = {
            id: this.app.state.editingSubjectId || this.app.state.generateId(),
            name,
            color,
            createdAt: this.app.state.editingSubjectId ? 
                this.app.state.getSubject(this.app.state.editingSubjectId).createdAt : 
                Date.now()
        };

        await this.app.dataStore.save('subjects', subjectData);
        await this.app.loadData();
        this.closeModal('subject-modal');
        this.renderSubjects();
        this.renderDashboard();
    }

    /**
     * Task modal operations
     */
    openTaskModal(taskId = null) {
        this.app.state.editingTaskId = taskId;
        const modal = document.getElementById('task-modal');
        const title = document.getElementById('task-modal-title');
        const descInput = document.getElementById('task-description');

        if (taskId) {
            const task = this.app.state.tasks.find(t => t.id === taskId);
            title.textContent = 'Edit Task';
            descInput.value = task.description;
        } else {
            title.textContent = 'Add Task';
            descInput.value = '';
        }

        this.openModal('task-modal');
        descInput.focus();
    }

    async saveTask() {
        const description = document.getElementById('task-description').value.trim();

        if (!description) {
            alert('Please enter a task description');
            return;
        }

        const taskData = {
            id: this.app.state.editingTaskId || this.app.state.generateId(),
            subjectId: this.app.state.currentSubjectDetail,
            description,
            completed: this.app.state.editingTaskId ? 
                this.app.state.tasks.find(t => t.id === this.app.state.editingTaskId).completed : 
                false,
            createdAt: this.app.state.editingTaskId ? 
                this.app.state.tasks.find(t => t.id === this.app.state.editingTaskId).createdAt : 
                Date.now()
        };

        await this.app.dataStore.save('tasks', taskData);
        await this.app.loadData();
        this.closeModal('task-modal');
        this.renderSubjectDetail(this.app.state.currentSubjectDetail);
    }

    async toggleTask(taskId) {
        const task = this.app.state.tasks.find(t => t.id === taskId);
        task.completed = !task.completed;
        await this.app.dataStore.save('tasks', task);
        await this.app.loadData();
        this.renderSubjectDetail(this.app.state.currentSubjectDetail);
        this.renderDashboard();
    }

    async deleteTask(taskId) {
        if (!confirm('Delete this task?')) return;
        await this.app.dataStore.delete('tasks', taskId);
        await this.app.loadData();
        this.renderSubjectDetail(this.app.state.currentSubjectDetail);
    }

    /**
     * Goal modal operations
     */
    openGoalModal() {
        const goal = this.app.state.goal;
        document.getElementById('goal-name-input').value = goal?.name || 'NEET-UG 2026';
        document.getElementById('goal-date').value = goal?.targetDate || '';
        document.getElementById('goal-start-date').value = goal?.startDate || '';
        this.openModal('goal-modal');
    }

    async saveGoal() {
        const name = document.getElementById('goal-name-input').value.trim();
        const targetDate = document.getElementById('goal-date').value;
        const startDate = document.getElementById('goal-start-date').value;

        if (!name || !targetDate) {
            alert('Please enter goal name and target date');
            return;
        }

        const goalData = {
            key: 'goal',
            name,
            targetDate,
            startDate: startDate || this.app.state.formatDate(new Date())
        };

        await this.app.dataStore.save('settings', goalData);
        await this.app.loadData();
        this.closeModal('goal-modal');
        this.renderGoal();
    }

    async resetGoal() {
        if (!confirm('Reset goal to default?')) return;
        await this.app.dataStore.delete('settings', 'goal');
        await this.app.loadData();
        this.closeModal('goal-modal');
        this.renderGoal();
    }

    /**
     * Session modal operations
     */
    openSessionModal(sessionId) {
        this.app.state.editingSessionId = sessionId;
        const session = this.app.state.sessions.find(s => s.id === sessionId);
        
        // Populate subject dropdown
        const subjectSelect = document.getElementById('session-subject');
        subjectSelect.innerHTML = this.app.state.subjects
            .map(s => `<option value="${s.id}" ${s.id === session.subjectId ? 'selected' : ''}>${s.name}</option>`)
            .join('');

        document.getElementById('session-date').value = session.date;
        document.getElementById('session-start').value = session.startTime;
        document.getElementById('session-end').value = session.endTime;

        this.openModal('session-modal');
    }

    async saveSession() {
        const sessionId = this.app.state.editingSessionId;
        const subjectId = document.getElementById('session-subject').value;
        const date = document.getElementById('session-date').value;
        const startTime = document.getElementById('session-start').value;
        const endTime = document.getElementById('session-end').value;

        if (!subjectId || !date || !startTime || !endTime) {
            alert('Please fill all fields');
            return;
        }

        // Calculate duration
        const start = new Date(`${date}T${startTime}`);
        const end = new Date(`${date}T${endTime}`);
        const duration = Math.floor((end - start) / 1000);

        if (duration <= 0) {
            alert('End time must be after start time');
            return;
        }

        const sessionData = {
            id: sessionId,
            subjectId,
            date,
            startTime,
            endTime,
            duration
        };

        await this.app.dataStore.save('sessions', sessionData);
        await this.app.loadData();
        this.closeModal('session-modal');
        this.renderCalendar();
        this.renderHistory();
        this.renderStats();
        this.renderDashboard();
    }

    async deleteSession(sessionId) {
        if (!confirm('Delete this session?')) return;
        await this.app.dataStore.delete('sessions', sessionId);
        await this.app.loadData();
        this.renderCalendar();
        this.renderHistory();
        this.renderStats();
        this.renderDashboard();
    }

    /**
     * Subject detail modal
     */
    openSubjectDetail(subjectId) {
        this.app.state.currentSubjectDetail = subjectId;
        this.renderSubjectDetail(subjectId);
        this.openModal('subject-detail-modal');
    }

    renderSubjectDetail(subjectId) {
        const subject = this.app.state.getSubject(subjectId);
        if (!subject) return;

        document.getElementById('subject-detail-name').textContent = subject.name;

        const totalTime = this.app.state.getTotalTimeForSubject(subjectId);
        const sessions = this.app.state.getSessionsForSubject(subjectId);
        
        document.getElementById('subject-total-time').textContent = this.formatTime(totalTime);
        document.getElementById('subject-session-count').textContent = sessions.length;

        // Render tasks
        const tasks = this.app.state.getTasksForSubject(subjectId);
        const tasksList = document.getElementById('tasks-list');

        if (tasks.length === 0) {
            tasksList.innerHTML = '<div class="empty-state-text">No tasks yet</div>';
        } else {
            tasksList.innerHTML = tasks.map(task => `
                <div class="task-item ${task.completed ? 'completed' : ''}">
                    <input type="checkbox" class="task-checkbox" 
                           ${task.completed ? 'checked' : ''}
                           onchange="app.ui.toggleTask('${task.id}')">
                    <span class="task-text">${this.escapeHtml(task.description)}</span>
                    <div class="task-actions">
                        <button class="btn-task" onclick="app.ui.openTaskModal('${task.id}')">✏️</button>
                        <button class="btn-task" onclick="app.ui.deleteTask('${task.id}')">🗑️</button>
                    </div>
                </div>
            `).join('');
        }
    }

    editCurrentSubject() {
        this.closeModal('subject-detail-modal');
        this.openSubjectModal(this.app.state.currentSubjectDetail);
    }

    async deleteCurrentSubject() {
        if (!confirm('Delete this subject and all its data?')) return;
        
        const subjectId = this.app.state.currentSubjectDetail;
        
        // Delete all tasks
        const tasks = this.app.state.getTasksForSubject(subjectId);
        for (const task of tasks) {
            await this.app.dataStore.delete('tasks', task.id);
        }

        // Delete all sessions
        const sessions = this.app.state.getSessionsForSubject(subjectId);
        for (const session of sessions) {
            await this.app.dataStore.delete('sessions', session.id);
        }

        // Delete subject
        await this.app.dataStore.delete('subjects', subjectId);
        
        await this.app.loadData();
        this.closeModal('subject-detail-modal');
        this.renderSubjects();
        this.renderDashboard();
    }

    /**
     * Render methods
     */
    renderDashboard() {
        // Update date
        const now = new Date();
        document.getElementById('current-date').textContent = now.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Render goal
        this.renderGoal();

        // Today's total
        const todayString = this.app.state.getTodayString();
        const todayTotal = this.app.state.getTotalTimeForDate(todayString);
        document.getElementById('today-total').textContent = this.formatTime(todayTotal);

        // Streak
        const streak = this.app.state.calculateStreak();
        document.getElementById('current-streak').textContent = `${streak} ${streak === 1 ? 'day' : 'days'}`;

        // Tasks
        const totalTasks = this.app.state.tasks.length;
        const completedTasks = this.app.state.tasks.filter(t => t.completed).length;
        document.getElementById('tasks-completed').textContent = `${completedTasks}/${totalTasks}`;

        // Quick subjects
        const quickList = document.getElementById('quick-subjects-list');
        if (this.app.state.subjects.length === 0) {
            quickList.innerHTML = '<div class="empty-state-text">No subjects yet. Add one to get started!</div>';
        } else {
            quickList.innerHTML = this.app.state.subjects.map(subject => {
                const time = this.app.state.getTotalTimeForSubject(subject.id);
                return `
                    <div class="quick-subject-item" onclick="app.ui.openSubjectDetail('${subject.id}')">
                        <div class="quick-subject-info">
                            <div class="subject-color-dot" style="background-color: ${subject.color}"></div>
                            <span class="quick-subject-name">${this.escapeHtml(subject.name)}</span>
                        </div>
                        <span class="quick-subject-time">${this.formatTime(time)}</span>
                    </div>
                `;
            }).join('');
        }
    }

    renderGoal() {
        const goal = this.app.state.goal;
        if (!goal || !goal.targetDate) {
            document.getElementById('goal-name').textContent = 'NEET-UG 2026';
            document.getElementById('days-remaining').textContent = '--';
            document.getElementById('weeks-remaining').textContent = '--';
            document.getElementById('time-elapsed').textContent = '--';
            document.getElementById('goal-progress').style.width = '0%';
            return;
        }

        const now = new Date();
        const target = new Date(goal.targetDate);
        const start = new Date(goal.startDate);

        const totalTime = target - start;
        const elapsed = now - start;
        const remaining = target - now;

        const daysRemaining = Math.max(0, Math.ceil(remaining / (1000 * 60 * 60 * 24)));
        const weeksRemaining = Math.max(0, Math.ceil(daysRemaining / 7));
        const percentElapsed = Math.min(100, Math.max(0, (elapsed / totalTime) * 100));

        document.getElementById('goal-name').textContent = goal.name;
        document.getElementById('days-remaining').textContent = daysRemaining;
        document.getElementById('weeks-remaining').textContent = weeksRemaining;
        document.getElementById('time-elapsed').textContent = `${percentElapsed.toFixed(0)}%`;
        document.getElementById('goal-progress').style.width = `${percentElapsed}%`;
    }

    renderSubjects() {
        const grid = document.getElementById('subjects-grid');
        
        if (this.app.state.subjects.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📚</div>
                    <div class="empty-state-text">No subjects yet. Click "Add Subject" to create one!</div>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.app.state.subjects.map(subject => {
            const totalTime = this.app.state.getTotalTimeForSubject(subject.id);
            const sessions = this.app.state.getSessionsForSubject(subject.id);
            const tasks = this.app.state.getTasksForSubject(subject.id);
            const completedTasks = tasks.filter(t => t.completed).length;

            return `
                <div class="subject-card" onclick="app.ui.openSubjectDetail('${subject.id}')">
                    <div class="subject-card-header">
                        <div class="subject-color-badge" style="background-color: ${subject.color}">
                            📖
                        </div>
                        <div class="subject-card-title">
                            <h3>${this.escapeHtml(subject.name)}</h3>
                        </div>
                    </div>
                    <div class="subject-card-stats">
                        <div class="subject-stat">
                            <span class="subject-stat-label">Total Time</span>
                            <span class="subject-stat-value">${this.formatTime(totalTime)}</span>
                        </div>
                        <div class="subject-stat">
                            <span class="subject-stat-label">Sessions</span>
                            <span class="subject-stat-value">${sessions.length}</span>
                        </div>
                        <div class="subject-stat">
                            <span class="subject-stat-label">Tasks</span>
                            <span class="subject-stat-value">${completedTasks}/${tasks.length}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderTimer() {
        // Populate subject dropdown
        const select = document.getElementById('timer-subject');
        select.innerHTML = '<option value="">Choose a subject...</option>' +
            this.app.state.subjects.map(s => 
                `<option value="${s.id}">${this.escapeHtml(s.name)}</option>`
            ).join('');

        // Restore timer state if exists
        if (this.app.state.timerState.subjectId) {
            select.value = this.app.state.timerState.subjectId;
            this.updateTimerDisplay();
        }
    }

    onTimerSubjectChange(e) {
        const subjectId = e.target.value;
        if (subjectId) {
            this.app.state.timerState.subjectId = subjectId;
            document.getElementById('start-timer').disabled = false;
        } else {
            document.getElementById('start-timer').disabled = true;
            document.getElementById('pause-timer').disabled = true;
            document.getElementById('reset-timer').disabled = true;
        }
    }

    startTimer() {
        const state = this.app.state.timerState;
        
        if (!state.isRunning) {
            state.isRunning = true;
            state.startTime = Date.now() - (state.elapsedSeconds * 1000);
            
            state.intervalId = setInterval(() => {
                state.elapsedSeconds = Math.floor((Date.now() - state.startTime) / 1000);
                this.updateTimerDisplay();
            }, 1000);

            document.getElementById('start-timer').disabled = true;
            document.getElementById('pause-timer').disabled = false;
            document.getElementById('reset-timer').disabled = false;

            const subject = this.app.state.getSubject(state.subjectId);
            document.getElementById('timer-info').textContent = `Studying ${subject.name}...`;
        }
    }

    async pauseTimer() {
        const state = this.app.state.timerState;
        
        if (state.isRunning) {
            state.isRunning = false;
            clearInterval(state.intervalId);

            // Save session
            await this.saveTimerSession();

            document.getElementById('start-timer').disabled = false;
            document.getElementById('pause-timer').disabled = true;
            
            const subject = this.app.state.getSubject(state.subjectId);
            document.getElementById('timer-info').textContent = `Session saved for ${subject.name}!`;
        }
    }

    async resetTimer() {
        const state = this.app.state.timerState;
        
        if (state.isRunning) {
            clearInterval(state.intervalId);
        }

        state.isRunning = false;
        state.startTime = null;
        state.elapsedSeconds = 0;

        this.updateTimerDisplay();

        document.getElementById('start-timer').disabled = false;
        document.getElementById('pause-timer').disabled = true;
        document.getElementById('reset-timer').disabled = true;
        document.getElementById('timer-info').textContent = '';
    }

    async saveTimerSession() {
        const state = this.app.state.timerState;
        if (state.elapsedSeconds < 60) return; // Don't save sessions under 1 minute

        const now = new Date();
        const startTime = new Date(state.startTime);
        const endTime = now;

        const sessionData = {
            id: this.app.state.generateId(),
            subjectId: state.subjectId,
            date: this.app.state.formatDate(now),
            startTime: startTime.toTimeString().substr(0, 5),
            endTime: endTime.toTimeString().substr(0, 5),
            duration: state.elapsedSeconds
        };

        await this.app.dataStore.save('sessions', sessionData);
        await this.app.loadData();
        
        // Reset elapsed time for next session
        state.elapsedSeconds = 0;
        state.startTime = Date.now();
    }

    updateTimerDisplay() {
        const seconds = this.app.state.timerState.elapsedSeconds;
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        
        const display = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        document.getElementById('timer-display').textContent = display;
    }

    renderCalendar() {
        const date = this.app.state.calendarDate;
        const year = date.getFullYear();
        const month = date.getMonth();

        // Update header
        document.getElementById('calendar-month-year').textContent = 
            date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        const grid = document.getElementById('calendar-grid');
        
        // Day names
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        let html = '<div class="calendar-header">';
        dayNames.forEach(name => {
            html += `<div class="calendar-day-name">${name}</div>`;
        });
        html += '</div><div class="calendar-days">';

        // Previous month days
        for (let i = firstDay - 1; i >= 0; i--) {
            html += `<div class="calendar-day empty other-month">
                <div class="calendar-day-number">${daysInPrevMonth - i}</div>
            </div>`;
        }

        // Current month days
        const today = new Date();
        const todayString = this.app.state.formatDate(today);

        for (let day = 1; day <= daysInMonth; day++) {
            const dateString = this.app.state.formatDate(new Date(year, month, day));
            const dayTime = this.app.state.getTotalTimeForDate(dateString);
            const isToday = dateString === todayString;
            const hasSessions = dayTime > 0;

            html += `
                <div class="calendar-day ${isToday ? 'today' : ''} ${hasSessions ? 'has-sessions' : ''}"
                     onclick="app.ui.selectDate('${dateString}')">
                    <div class="calendar-day-number">${day}</div>
                    ${hasSessions ? `<div class="calendar-day-time">${this.formatTime(dayTime)}</div>` : ''}
                </div>
            `;
        }

        // Next month days
        const remainingDays = 42 - (firstDay + daysInMonth);
        for (let day = 1; day <= remainingDays; day++) {
            html += `<div class="calendar-day empty other-month">
                <div class="calendar-day-number">${day}</div>
            </div>`;
        }

        html += '</div>';
        grid.innerHTML = html;

        // Render selected date details
        if (this.app.state.selectedDate) {
            this.renderDayDetails(this.app.state.selectedDate);
        }
    }

    selectDate(dateString) {
        this.app.state.selectedDate = dateString;
        this.renderDayDetails(dateString);
    }

    renderDayDetails(dateString) {
        const sessions = this.app.state.getSessionsForDate(dateString);
        const container = document.getElementById('day-details');

        if (sessions.length === 0) {
            container.innerHTML = `
                <h3>${new Date(dateString).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                })}</h3>
                <div class="empty-state-text">No study sessions on this day</div>
            `;
            return;
        }

        container.innerHTML = `
            <h3>${new Date(dateString).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            })}</h3>
            ${sessions.map(session => {
                const subject = this.app.state.getSubject(session.subjectId);
                return `
                    <div class="day-session">
                        <div class="day-session-info">
                            <div class="day-session-subject" style="color: ${subject.color}">
                                ${this.escapeHtml(subject.name)}
                            </div>
                            <div class="day-session-time">
                                ${session.startTime} - ${session.endTime} (${this.formatTime(session.duration)})
                            </div>
                        </div>
                        <div class="day-session-actions">
                            <button class="btn-task" onclick="app.ui.openSessionModal('${session.id}')">✏️</button>
                            <button class="btn-task" onclick="app.ui.deleteSession('${session.id}')">🗑️</button>
                        </div>
                    </div>
                `;
            }).join('')}
        `;
    }

    changeMonth(delta) {
        const date = this.app.state.calendarDate;
        date.setMonth(date.getMonth() + delta);
        this.renderCalendar();
    }

    renderHistory() {
        const filter = document.getElementById('history-filter').value;
        let sessions = [...this.app.state.sessions];

        const now = new Date();
        const todayString = this.app.state.formatDate(now);

        // Filter sessions
        switch (filter) {
            case 'today':
                sessions = sessions.filter(s => s.date === todayString);
                break;
            case 'week':
                const weekAgo = new Date(now);
                weekAgo.setDate(weekAgo.getDate() - 7);
                sessions = sessions.filter(s => new Date(s.date) >= weekAgo);
                break;
            case 'month':
                const monthAgo = new Date(now);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                sessions = sessions.filter(s => new Date(s.date) >= monthAgo);
                break;
        }

        // Sort by date and time (newest first)
        sessions.sort((a, b) => {
            const dateCompare = b.date.localeCompare(a.date);
            if (dateCompare !== 0) return dateCompare;
            return b.startTime.localeCompare(a.startTime);
        });

        const container = document.getElementById('history-list');

        if (sessions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📜</div>
                    <div class="empty-state-text">No study sessions found</div>
                </div>
            `;
            return;
        }

        container.innerHTML = sessions.map(session => {
            const subject = this.app.state.getSubject(session.subjectId);
            const date = new Date(session.date);
            const dateStr = date.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
            });

            return `
                <div class="history-item">
                    <div class="history-item-info">
                        <div class="history-item-subject">
                            <div class="subject-color-dot" style="background-color: ${subject.color}"></div>
                            ${this.escapeHtml(subject.name)}
                        </div>
                        <div class="history-item-details">
                            ${dateStr} • ${session.startTime} - ${session.endTime} • ${this.formatTime(session.duration)}
                        </div>
                    </div>
                    <div class="history-item-actions">
                        <button class="btn-task" onclick="app.ui.openSessionModal('${session.id}')">✏️</button>
                        <button class="btn-task" onclick="app.ui.deleteSession('${session.id}')">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderStats() {
        const period = this.app.state.statsPeriod;
        const now = new Date();
        let sessions = [...this.app.state.sessions];

        // Filter by period
        switch (period) {
            case 'week':
                const weekAgo = new Date(now);
                weekAgo.setDate(weekAgo.getDate() - 7);
                sessions = sessions.filter(s => new Date(s.date) >= weekAgo);
                break;
            case 'month':
                const monthAgo = new Date(now);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                sessions = sessions.filter(s => new Date(s.date) >= monthAgo);
                break;
        }

        // Total study time
        const totalTime = sessions.reduce((sum, s) => sum + s.duration, 0);
        document.getElementById('total-study-time').textContent = this.formatTime(totalTime);

        // Subject breakdown
        const subjectTimes = {};
        sessions.forEach(session => {
            if (!subjectTimes[session.subjectId]) {
                subjectTimes[session.subjectId] = 0;
            }
            subjectTimes[session.subjectId] += session.duration;
        });

        const breakdown = document.getElementById('subject-breakdown');
        const maxTime = Math.max(...Object.values(subjectTimes), 1);

        if (Object.keys(subjectTimes).length === 0) {
            breakdown.innerHTML = '<div class="empty-state-text">No data for this period</div>';
        } else {
            breakdown.innerHTML = Object.entries(subjectTimes)
                .sort((a, b) => b[1] - a[1])
                .map(([subjectId, time]) => {
                    const subject = this.app.state.getSubject(subjectId);
                    const percentage = (time / maxTime) * 100;
                    return `
                        <div class="breakdown-item">
                            <div class="breakdown-color" style="background-color: ${subject.color}"></div>
                            <div class="breakdown-name">${this.escapeHtml(subject.name)}</div>
                            <div class="breakdown-time">${this.formatTime(time)}</div>
                            <div class="breakdown-bar">
                                <div class="breakdown-bar-fill" 
                                     style="width: ${percentage}%; background-color: ${subject.color}"></div>
                            </div>
                        </div>
                    `;
                }).join('');
        }

        // Daily chart
        this.renderDailyChart(sessions, period);
    }

    renderDailyChart(sessions, period) {
        const chart = document.getElementById('daily-chart');
        const days = period === 'week' ? 7 : period === 'month' ? 30 : 90;
        
        const dailyData = {};
        const now = new Date();

        // Initialize all days
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateString = this.app.state.formatDate(date);
            dailyData[dateString] = 0;
        }

        // Fill with session data
        sessions.forEach(session => {
            if (dailyData.hasOwnProperty(session.date)) {
                dailyData[session.date] += session.duration;
            }
        });

        const maxTime = Math.max(...Object.values(dailyData), 1);
        const entries = Object.entries(dailyData);

        if (entries.length === 0) {
            chart.innerHTML = '<div class="empty-state-text">No data to display</div>';
            return;
        }

        chart.innerHTML = entries.map(([date, time]) => {
            const height = (time / maxTime) * 100;
            const dateObj = new Date(date);
            const label = dateObj.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            });
            
            return `
                <div class="chart-bar" style="height: ${height}%">
                    <div class="chart-bar-value">${this.formatTime(time)}</div>
                    <div class="chart-bar-label">${label}</div>
                </div>
            `;
        }).join('');
    }

    /**
     * Utility functions
     */
    formatTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        
        if (h > 0) {
            return `${h}h ${m}m`;
        } else if (m > 0) {
            return `${m}m`;
        } else {
            return `${seconds}s`;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// =============================================================================
// MAIN APPLICATION
// =============================================================================

class StudyFlowApp {
    constructor() {
        this.dataStore = new DataStore();
        this.state = new AppState();
        this.ui = null;
    }

    async init() {
        try {
            // Initialize database
            await this.dataStore.init();

            // Load data
            await this.loadData();

            // Initialize UI
            this.ui = new UIManager(this);

            // Render initial view
            this.ui.switchView('dashboard');

            console.log('StudyFlow initialized successfully!');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            alert('Failed to initialize app. Please refresh the page.');
        }
    }

    async loadData() {
        try {
            // Load subjects
            this.state.subjects = await this.dataStore.getAll('subjects');

            // Load tasks
            this.state.tasks = await this.dataStore.getAll('tasks');

            // Load sessions
            this.state.sessions = await this.dataStore.getAll('sessions');

            // Load goal
            this.state.goal = await this.dataStore.get('settings', 'goal');

            console.log('Data loaded:', {
                subjects: this.state.subjects.length,
                tasks: this.state.tasks.length,
                sessions: this.state.sessions.length
            });
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    }
}

// =============================================================================
// INITIALIZE APP
// =============================================================================

let app;

document.addEventListener('DOMContentLoaded', async () => {
    app = new StudyFlowApp();
    await app.init();
});
