class AuthManager {
    constructor() {
        this.currentPage = window.location.pathname.split('/').pop();
        this.isRedirecting = false; // Prevent multiple redirects
        console.log('🏗️ AuthManager initialized for page:', this.currentPage);
        this.init();
    }

    init() {
        this.debugAuthStatus();
        this.checkAuthStatus();
        this.setupEventListeners();
    }

    debugAuthStatus() {
        const sessionToken = sessionStorage.getItem('token');
        const localToken = localStorage.getItem('token');
        const apiToken = api.token;

        console.log('🔐 Auth Debug:', {
            currentPage: this.currentPage,
            sessionStorage: !!sessionToken,
            localStorage: !!localToken,
            apiInstance: !!apiToken,
            sessionLength: sessionToken ? sessionToken.length : 0,
            localLength: localToken ? localToken.length : 0,
            apiLength: apiToken ? apiToken.length : 0,
            allStorageKeys: {
                session: Object.keys(sessionStorage),
                local: Object.keys(localStorage)
            }
        });
    }

    debugTokenStorage() {
        console.log('🔍 Token Storage Debug:', {
            sessionStorage: sessionStorage.getItem('token'),
            localStorage: localStorage.getItem('token'),
            apiToken: api.token,
            allSessionKeys: Object.keys(sessionStorage),
            allLocalKeys: Object.keys(localStorage)
        });
    }

    checkAuthStatus() {
        // Prevent multiple redirects
        if (this.isRedirecting) {
            console.log('⏳ Redirect already in progress, skipping check');
            return;
        }

        const token = sessionStorage.getItem('token') || localStorage.getItem('token') || api.token;

        console.log('🔄 Auth status check for:', this.currentPage, 'Has token:', !!token);
        console.log('🔍 Token details:', {
            sessionStorage: sessionStorage.getItem('token')?.substring(0, 20) + '...',
            localStorage: localStorage.getItem('token')?.substring(0, 20) + '...',
            apiToken: api.token?.substring(0, 20) + '...'
        });

        // For dashboard and protected pages, let them handle their own authentication
        const selfHandlingPages = ['dashboard.html', 'project-wizard.html', 'project-editor.html'];
        if (selfHandlingPages.includes(this.currentPage)) {
            console.log('📊 Protected page - letting page handle its own auth');
            return;
        }

        // Pages that should redirect if already authenticated (auth pages)
        const authPages = ['login.html', 'register.html', 'index.html'];

        if (authPages.includes(this.currentPage)) {
            // If user is already logged in and trying to access auth pages, redirect to dashboard
            if (token) {
                console.log('📦 User already authenticated, redirecting to dashboard');
                this.isRedirecting = true;
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 100);
                return;
            }
        }
    }

    setupEventListeners() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const logoutBtn = document.getElementById('logoutBtn');

        // 🔇 If we are not on login/register page, silently skip
        if (!loginForm && !registerForm) {
            console.log('ℹ️ AuthManager: No auth forms on this page, skipping setup.');
            return;
        }

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
            console.log('✅ Login event attached');
        }
        
        if (!loginForm) {
            console.warn("Login form not found (this is normal on register.html).");
        } else {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }


        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
            console.log('✅ Register event attached');
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
    }


    async handleLogin(e) {
        e.preventDefault();

        // Prevent multiple submissions
        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn.disabled) {
            console.log('⏳ Login already in progress');
            return;
        }

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const messageDiv = document.getElementById('message');

        try {
            this.showLoading(submitBtn);
            this.clearMessage(messageDiv);

            console.log('🔐 Starting login process for:', email);
            console.log('🔍 Pre-login token state:', api.debugTokenState());

            const data = await api.login(email, password);

            // ✅ Handle successful login
            console.log('✅ Login successful, response data:', data);

            if (data && data.access_token) {
                console.log('🔑 Token received, length:', data.access_token.length);

                // Verify token was stored
                console.log('🔍 Post-login token state:', api.debugTokenState());

                // Show success message
                this.showMessage('Login successful! Redirecting...', 'success', messageDiv);

                // IMPORTANT: Set redirecting flag to prevent AuthManager from interfering
                this.isRedirecting = true;

                // Wait longer before redirect to ensure everything is processed
                console.log('⏳ Waiting before redirect...');
                setTimeout(() => {
                    console.log('🔄 Starting redirect to dashboard...');
                    console.log('🔍 Final token check:', api.debugTokenState());

                    // Clear any existing AuthManager instances that might interfere
                    if (window.authManager) {
                        window.authManager.isRedirecting = true;
                    }

                    // Use replace to prevent back navigation issues
                    window.location.replace('dashboard.html');
                }, 1500);
            } else {
                throw new Error('No access token received from server');
            }

        } catch (error) {
            console.error('❌ Login failed:', error);
            this.showMessage(error.message || 'Login failed. Please check your credentials.', 'error', messageDiv);
            this.isRedirecting = false; // Reset flag on error
        } finally {
            this.hideLoading(submitBtn, 'Sign In');
        }
    }

    async handleRegister(e) {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const messageDiv = document.getElementById('message');

        if (password !== confirmPassword) {
            this.showMessage('Passwords do not match.', 'error', messageDiv);
            return;
        }

        if (password.length < 6) {
            this.showMessage('Password must be at least 6 characters long.', 'error', messageDiv);
            return;
        }

        try {
            this.showLoading(submitBtn);
            this.clearMessage(messageDiv);

            console.log('👤 Attempting registration for:', email);

            await api.register(email, password);

            this.showMessage('Registration successful! Please log in.', 'success', messageDiv);
            console.log('✅ Registration successful');

            setTimeout(() => {
                window.location.replace('dashboard.html');
            }, 300);


        } catch (error) {
            console.error('❌ Registration failed:', error);
            this.showMessage(error.message || 'Registration failed. Please try again.', 'error', messageDiv);
        } finally {
            this.hideLoading(submitBtn, 'Create Account');
        }
    }

    handleLogout() {
        console.log('🚪 Logging out...');
        console.log('🔍 Pre-logout token state:', api.debugTokenState());
        api.clearAuth();
        console.log('🔍 Post-logout token state:', api.debugTokenState());
        window.location.href = 'login.html';
    }

    showLoading(button) {
        button.disabled = true;
        button.innerHTML = '<div class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></div> Processing...';
    }

    hideLoading(button, originalText) {
        button.disabled = false;
        button.textContent = originalText;
    }

    showMessage(text, type, container) {
        container.textContent = text;
        container.className = `message ${type}`;
        container.classList.remove('hidden');
    }

    clearMessage(container) {
        container.textContent = '';
        container.className = 'message hidden';
    }
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏗️ DOM loaded, initializing AuthManager...');
    window.authManager = new AuthManager();
});