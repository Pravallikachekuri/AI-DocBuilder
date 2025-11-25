console.log("✅ NEW api.js LOADED");

class API {
    constructor() {
        this.baseURL = "http://127.0.0.1:8000";  // Backend URL
        // Try multiple storage methods for redundancy
        this.token = sessionStorage.getItem('token') || localStorage.getItem('token');
        console.log('🚀 API initialized with baseURL:', this.baseURL);
        console.log('💾 Initial token state:', {
            hasToken: !!this.token,
            tokenLength: this.token ? this.token.length : 0,
            storageMethod: sessionStorage.getItem('token') ? 'sessionStorage' :
                localStorage.getItem('token') ? 'localStorage' : 'none'
        });
    }

    debugRequestState(endpoint) {
        const token = this.token || sessionStorage.getItem('token') || localStorage.getItem('token');
        console.log('🔍 Request Debug:', {
            endpoint,
            hasToken: !!token,
            tokenLength: token ? token.length : 0,
            tokenPreview: token ? token.substring(0, 50) + '...' : 'none',
            storageSource: sessionStorage.getItem('token') ? 'sessionStorage' :
                localStorage.getItem('token') ? 'localStorage' :
                    this.token ? 'apiInstance' : 'none'
        });
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;

        // Debug token state before each request
        this.debugRequestState(endpoint);

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Use the token from any available source
        const token = this.token || sessionStorage.getItem('token') || localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            console.log('🔑 Adding Authorization header with token');
        } else {
            console.warn('⚠️ No token available for request');
        }

        console.log('📤 API Request:', {
            endpoint,
            method: options.method || 'GET',
            url: url,
            headers: headers
        });

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            const contentType = response.headers.get('content-type') || '';
            console.log('📥 API Response:', {
                endpoint,
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
                contentType: contentType
            });

            if (response.status === 401) {
                console.warn('🔐 401 Unauthorized - Authentication required');
                this.clearAuth();

                // Only redirect if we're not already on the login page
                const currentPage = window.location.pathname.split('/').pop();
                if (currentPage !== 'login.html') {
                    console.log('🔄 Redirecting to login page...');
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 100);
                }

                throw new Error('Authentication required - Please log in again');
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ API Error Response:', errorText);
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = { detail: errorText || `HTTP error! status: ${response.status}` };
                }
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }

            // ALWAYS parse as JSON for all endpoints except actual file downloads
            const isFileDownload = (
                contentType.includes('application/vnd.openxmlformats') ||
                contentType.includes('application/octet-stream') ||
                (endpoint.includes('/export') && endpoint.includes('/download'))
            );

            if (isFileDownload) {
                console.log('📁 File download response detected');
                return response;
            }

            // For ALL other responses, parse as JSON
            const responseText = await response.text();
            console.log('📄 Raw response text:', responseText);

            if (!responseText) {
                throw new Error('Empty response from server');
            }

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('❌ JSON parse error:', parseError, 'Response text:', responseText);
                throw new Error('Invalid JSON response from server');
            }

            console.log('✅ Parsed response data:', data);
            return data;

        } catch (error) {
            console.error('💥 API request failed:', error);

            // Don't throw authentication errors again if we're already handling them
            if (error.message.includes('Authentication required') &&
                window.location.pathname.split('/').pop() === 'login.html') {
                console.log('🔄 Already on login page, not redirecting again');
            } else {
                throw error;
            }
        }
    }

    setToken(token) {
        if (!token) {
            console.error('❌ Cannot set empty token');
            throw new Error('No token provided');
        }

        console.log('💾 Storing token using multiple methods...');
        console.log('🔍 Token to store:', token.length, 'characters');

        // Store token in API instance
        this.token = token;

        // Store in both sessionStorage and localStorage for redundancy
        sessionStorage.setItem('token', token);
        localStorage.setItem('token', token);

        // Immediate verification
        const sessionToken = sessionStorage.getItem('token');
        const localToken = localStorage.getItem('token');
        const apiToken = this.token;

        console.log('✅ Token storage verification:', {
            sessionStorage: !!sessionToken,
            localStorage: !!localToken,
            apiInstance: !!apiToken,
            sessionLength: sessionToken ? sessionToken.length : 0,
            localLength: localToken ? localToken.length : 0,
            apiLength: apiToken ? apiToken.length : 0
        });

        if (!sessionToken && !localToken) {
            throw new Error('Token storage failed in all methods');
        }

        console.log('💾 Token stored successfully in all methods');
        return true;
    }

    clearAuth() {
        console.log('🧹 Clearing authentication data...');
        this.token = null;
        sessionStorage.removeItem('token');
        localStorage.removeItem('token');
        console.log('✅ Authentication data cleared');
    }

    // Test method
    async testSimple() {
        console.log('🧪 Testing simple endpoint');
        const data = await this.request('/auth/test-simple', {
            method: 'POST',
            body: JSON.stringify({})
        });
        console.log('🧪 Simple test response:', data);
        return data;
    }

    // Test debug method
    async testDebug() {
        console.log('🐛 Testing debug endpoint');
        const data = await this.request('/auth/debug-login', {
            method: 'POST',
            body: JSON.stringify({
                email: 'test@example.com',
                password: 'password123'
            })
        });
        console.log('🐛 Debug test response:', data);
        return data;
    }

    // Auth methods
    async login(email, password) {
        console.log('🔐 Attempting login for:', email);
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        console.log('📨 Login response received:', data);

        if (!data) {
            console.error('❌ No data in login response');
            throw new Error('No response received from server');
        }

        if (!data.access_token) {
            console.error('❌ No access_token in login response. Response:', data);
            throw new Error('Invalid login response: no access token received');
        }

        console.log('✅ Login successful, storing token...');
        const storageSuccess = this.setToken(data.access_token);

        if (!storageSuccess) {
            throw new Error('Failed to store authentication token');
        }

        console.log('🎉 Login process completed successfully, returning data to caller');
        return data; // Just return the data, let the caller handle success
    }

    async register(email, password) {
        console.log('👤 Attempting registration for:', email);
        const data = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        console.log('✅ Registration response:', data);
        return data;
    }

    // Project methods
    async getProjects() {
        return await this.request('/projects');
    }

    async getProject(projectId) {
        return await this.request(`/projects/${projectId}`);
    }

    async createProject(projectData) {
        return await this.request('/projects', {
            method: 'POST',
            body: JSON.stringify(projectData)
        });
    }

    async setProjectSections(projectId, sections) {
        return await this.request(`/projects/${projectId}/sections`, {
            method: 'POST',
            body: JSON.stringify({ sections })
        });
    }

    async generateContent(projectId) {
        return await this.request(`/projects/${projectId}/generate`, {
            method: 'POST'
        });
    }

    async suggestOutline(topic, documentType) {
        return await this.request('/projects/0/suggest-outline', {
            method: 'POST',
            body: JSON.stringify({ topic, document_type: documentType })
        });
    }

    // Section methods
    async refineSection(sectionId, prompt) {
        return await this.request(`/sections/${sectionId}/refine`, {
            method: 'POST',
            body: JSON.stringify({ prompt })
        });
    }

    // ✅ FINAL exportProject WITH ALERTS
    async exportProject(projectId) {
        const token =
            this.token ||
            sessionStorage.getItem('token') ||
            localStorage.getItem('token');

        console.log('🔍 exportProject token check:', {
            hasToken: !!token,
            tokenPreview: token ? token.slice(0, 25) + '...' : 'none',
        });

        if (!token) {
            throw new Error('No authentication token found. Please log in again.');
        }

        const url = `${this.baseURL}/projects/${projectId}/export`;
        console.log('📤 Calling export endpoint:', url);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            }
        });

        if (response.status === 401) {
            const text = await response.text();
            console.error('❌ Export 401 response:', text);
            this.clearAuth();
            throw new Error('Authentication failed (401). Please log in again and retry.');
        }

        if (!response.ok) {
            const text = await response.text();
            console.error('❌ Export failed response:', text);
            throw new Error(`Export failed: ${response.status} ${response.statusText}`);
        }

        // ✅ NEW: Alert when document is ready
        alert("✅ Document generated. Download starting...");

        const blob = await response.blob();

        const contentType = response.headers.get('content-type') || '';
        let ext = 'docx';
        if (contentType.includes('presentation')) {
            ext = 'pptx';
        }

        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `project_${projectId}.${ext}`;

        document.body.appendChild(a);
        a.click();
        a.remove();

        window.URL.revokeObjectURL(downloadUrl);

        // ✅ NEW: Alert after download
        setTimeout(() => {
            alert("✅ Download completed successfully!");
        }, 1500);
    }

    async getSectionHistory(sectionId) {
        return await this.request(`/sections/${sectionId}/history`);
    }

    async sendFeedback(sectionId, type) {
        return await this.request(`/sections/${sectionId}/feedback`, {
            method: 'POST',
            body: JSON.stringify({ type })
        });
    }

    async addComment(sectionId, text) {
        return await this.request(`/sections/${sectionId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ text })
        });
    }

    // Debug method to check current token state
    debugTokenState() {
        const sessionToken = sessionStorage.getItem('token');
        const localToken = localStorage.getItem('token');
        return {
            apiInstance: !!this.token,
            sessionStorage: !!sessionToken,
            localStorage: !!localToken,
            sessionToken: sessionToken ? sessionToken.length : 0,
            localToken: localToken ? localToken.length : 0,
            apiToken: this.token ? this.token.length : 0,
            sessionPreview: sessionToken ? sessionToken.substring(0, 20) + '...' : 'none',
            localPreview: localToken ? localToken.substring(0, 20) + '...' : 'none'
        };
    }
}

const api = new API();
