class Dashboard {
    constructor() {
        this.projects = [];
        this.init();
    }

    async init() {
        // First check authentication before doing anything
        await this.checkAuthentication();

        // If we passed authentication check, proceed
        await this.loadProjects();
        this.setupEventListeners();
        this.setupNavigation();
    }

    async checkAuthentication() {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token') || api.token;

        console.log('🔐 Dashboard authentication check:', {
            hasToken: !!token,
            tokenLength: token ? token.length : 0,
            currentPage: window.location.pathname.split('/').pop()
        });

        if (!token) {
            console.warn('❌ No authentication token found, redirecting to login');
            this.redirectToLogin();
            throw new Error('No authentication token'); // Stop execution
        }

        console.log('✅ Dashboard authentication check passed');
    }

    redirectToLogin() {
        console.log('🔄 Redirecting to login page...');
        // Use replace to prevent back navigation to dashboard
        window.location.replace('login.html');
    }

    async loadProjects() {
        const loadingEl = document.getElementById('loading');
        const emptyStateEl = document.getElementById('emptyState');
        const projectsGridEl = document.getElementById('projectsGrid');

        // Show loading state
        if (loadingEl) loadingEl.classList.remove('hidden');
        if (emptyStateEl) emptyStateEl.classList.add('hidden');
        if (projectsGridEl) projectsGridEl.classList.add('hidden');

        try {
            console.log('📦 Loading projects...');
            this.projects = await api.getProjects();
            console.log('✅ Projects loaded:', this.projects);

            if (loadingEl) loadingEl.classList.add('hidden');

            if (this.projects.length === 0) {
                if (emptyStateEl) emptyStateEl.classList.remove('hidden');
                console.log('ℹ️ No projects found, showing empty state');
            } else {
                if (projectsGridEl) projectsGridEl.classList.remove('hidden');
                this.renderProjects();
                console.log(`🎯 Rendered ${this.projects.length} projects`);
            }
        } catch (error) {
            console.error('❌ Failed to load projects:', error);
            if (loadingEl) loadingEl.classList.add('hidden');

            if (error.message.includes('401') || error.message.includes('Authentication')) {
                this.showError('Session expired. Please log in again.');
                setTimeout(() => {
                    this.redirectToLogin();
                }, 2000);
            } else {
                this.showError('Failed to load projects: ' + error.message);
            }
        }
    }

    renderProjects() {
        const projectsGridEl = document.getElementById('projectsGrid');
        if (!projectsGridEl) return;

        projectsGridEl.innerHTML = this.projects.map(project => `
            <div class="project-card" onclick="dashboard.openProject(${project.id})">
                <h3>${this.escapeHtml(project.title)}</h3>
                <p><strong>Type:</strong> ${project.document_type.toUpperCase()}</p>
                <p><strong>Topic:</strong> ${this.escapeHtml(project.topic)}</p>
                <p><strong>Created:</strong> ${this.formatDate(project.created_at)}</p>
                <p><strong>Last Updated:</strong> ${this.formatDate(project.updated_at)}</p>
            </div>
        `).join('');
    }

    setupEventListeners() {
        // Safe event listener setup with null checks
        const newProjectBtn = document.getElementById('newProjectBtn');
        if (newProjectBtn) {
            newProjectBtn.addEventListener('click', () => {
                this.showProjectModal();
            });
        }

        const createFirstProject = document.getElementById('createFirstProject');
        if (createFirstProject) {
            createFirstProject.addEventListener('click', () => {
                this.showProjectModal();
            });
        }

        const closeModal = document.getElementById('closeModal');
        if (closeModal) {
            closeModal.addEventListener('click', () => {
                this.hideProjectModal();
            });
        }

        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.hideProjectModal();
            });
        }

        const projectForm = document.getElementById('projectForm');
        if (projectForm) {
            projectForm.addEventListener('submit', (e) => {
                this.handleProjectCreate(e);
            });
        }

        const projectModal = document.getElementById('projectModal');
        if (projectModal) {
            projectModal.addEventListener('click', (e) => {
                if (e.target.id === 'projectModal') {
                    this.hideProjectModal();
                }
            });
        }
    }

    setupNavigation() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }
    }

    handleLogout() {
        console.log('🚪 Logging out from dashboard...');
        api.clearAuth();
        window.location.href = 'login.html';
    }

    showProjectModal() {
        const modal = document.getElementById('projectModal');
        if (modal) {
            modal.classList.remove('hidden');
            const titleInput = document.getElementById('projectTitle');
            if (titleInput) titleInput.focus();
        }
    }

    hideProjectModal() {
        const modal = document.getElementById('projectModal');
        if (modal) {
            modal.classList.add('hidden');
        }
        const form = document.getElementById('projectForm');
        if (form) {
            form.reset();
        }
    }

    async handleProjectCreate(e) {
        e.preventDefault();

        const title = document.getElementById('projectTitle')?.value;
        const documentType = document.getElementById('documentType')?.value;
        const topic = document.getElementById('projectTopic')?.value;
        const submitBtn = e.target.querySelector('button[type="submit"]');

        if (!title || !documentType || !topic) {
            this.showError('Please fill in all fields');
            return;
        }

        try {
            this.showLoading(submitBtn, 'Creating...');

            const projectData = {
                title,
                document_type: documentType,
                topic,
                sections: []   // ✅ THIS FIXES YOUR ERROR
            };


            console.log('📝 Creating project:', projectData);
            const newProject = await api.createProject(projectData);
            console.log('✅ Project created:', newProject);

            this.hideProjectModal();
            this.showSuccess('Project created successfully!');

            setTimeout(() => {
                window.location.href = `project-wizard.html?projectId=${newProject.id}`;
            }, 1000);

        } catch (error) {
            console.error('❌ Project creation failed:', error);
            this.showError('Failed to create project: ' + error.message);
        } finally {
            this.hideLoading(submitBtn, 'Create Project');
        }
    }

    openProject(projectId) {
        console.log('🎯 Opening project:', projectId);
        window.location.href = `project-editor.html?projectId=${projectId}`;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        if (!dateString) return 'Unknown';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return 'Invalid date';
        }
    }

    showLoading(button, text = 'Loading...') {
        if (!button) return;
        button.disabled = true;
        button.innerHTML = `<div class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></div> ${text}`;
    }

    hideLoading(button, originalText) {
        if (!button) return;
        button.disabled = false;
        button.textContent = originalText;
    }

    showError(message) {
        console.error('❌ Error:', message);
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        console.log('✅ Success:', message);
        this.showNotification(message, 'success');
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;

        if (type === 'error') {
            notification.style.background = '#ef4444';
        } else {
            notification.style.background = '#10b981';
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏗️ DOM loaded, initializing Dashboard...');
    console.log('🔐 Pre-dashboard token state:', {
        sessionStorage: !!sessionStorage.getItem('token'),
        localStorage: !!localStorage.getItem('token'),
        sessionToken: sessionStorage.getItem('token')?.substring(0, 20) + '...',
        localToken: localStorage.getItem('token')?.substring(0, 20) + '...'
    });
    window.dashboard = new Dashboard();
});