class ProjectWizard {
    constructor() {
        this.currentStep = 1;
        this.projectData = {
            title: '',
            document_type: '',
            topic: '',
            sections: []
        };
        this.isSubmitting = false;
        console.log('🏗️ ProjectWizard initialized');
        this.init();
    }

    async init() {
        try {
            // First check authentication
            await this.checkAuthentication();

            // If authenticated, proceed
            this.loadFromURL();
            this.setupEventListeners();
            this.updateStepDisplay();

            console.log('✅ ProjectWizard initialized successfully');
            console.log('📊 Initial project data:', this.projectData);
        } catch (error) {
            console.error('❌ ProjectWizard initialization failed:', error);
            this.showError('Failed to initialize project wizard: ' + error.message);
        }
    }

    async checkAuthentication() {
        const token =
            sessionStorage.getItem('token') ||
            localStorage.getItem('token') ||
            api.token;

        console.log('🔐 ProjectWizard authentication check:', {
            hasToken: !!token,
            tokenLength: token ? token.length : 0,
            currentPage: window.location.pathname.split('/').pop()
        });

        if (!token) {
            console.warn('❌ No authentication token found, redirecting to login');
            this.redirectToLogin();
            throw new Error('Authentication required');
        }

        console.log('✅ ProjectWizard authentication check passed');
    }

    redirectToLogin() {
        console.log('🔄 Redirecting to login...');
        window.location.replace('login.html');
    }

    loadFromURL() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const projectId = urlParams.get('projectId');

            if (projectId) {
                console.log('📂 Loading existing project:', projectId);
                this.projectId = projectId;
                this.loadExistingProject(projectId);
            } else {
                console.log('🆕 Creating new project');
            }
        } catch (error) {
            console.error('❌ Failed to load from URL:', error);
        }
    }

    async loadExistingProject(projectId) {
        try {
            console.log('📥 Loading project data for:', projectId);
            const project = await api.getProject(projectId);

            this.projectData = {
                title: project.title,
                document_type: project.document_type,
                topic: project.topic,
                sections: project.sections ? project.sections.map(s => s.title) : []
            };

            this.populateForm();
            console.log('✅ Project data loaded:', this.projectData);
        } catch (error) {
            console.error('❌ Failed to load project:', error);

            // 🟡 IMPORTANT: if project doesn’t exist, treat this as a NEW project
            if (error.message.includes('Project not found') || error.message.includes('404')) {
                console.warn('⚠️ Project not found. Treating as NEW project.');
                this.projectId = null;  // <– so createProject() will create a new one

                // Remove projectId from URL so we don’t keep trying to edit it
                const url = new URL(window.location.href);
                url.searchParams.delete('projectId');
                window.history.replaceState({}, '', url.toString());
            } else if (error.message.includes('401') || error.message.includes('Authentication')) {
                this.showError('Session expired. Please log in again.');
                setTimeout(() => {
                    this.redirectToLogin();
                }, 2000);
            } else {
                this.showError('Failed to load project: ' + error.message);
            }
        }
    }


    populateForm() {
        try {
            const wizardTitle = document.getElementById('wizardTitle');
            const wizardType = document.getElementById('wizardType');
            const wizardTopic = document.getElementById('wizardTopic');

            if (wizardTitle) wizardTitle.value = this.projectData.title;
            if (wizardType) wizardType.value = this.projectData.document_type;
            if (wizardTopic) wizardTopic.value = this.projectData.topic;

            if (this.projectData.sections.length > 0) {
                this.renderSections();
            }
        } catch (error) {
            console.error('❌ Failed to populate form:', error);
        }
    }

    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');

        try {
            // Cancel button
            const cancelBtn = document.getElementById('cancelBtn');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    window.location.href = 'dashboard.html';
                });
            }

            // Navigation buttons
            document
                .getElementById('step1NextBtn')
                ?.addEventListener('click', () => this.nextStep());
            document
                .getElementById('step2BackBtn')
                ?.addEventListener('click', () => this.prevStep());
            document
                .getElementById('step2NextBtn')
                ?.addEventListener('click', () => this.nextStep());
            document
                .getElementById('step3BackBtn')
                ?.addEventListener('click', () => this.prevStep());

            // ✅ Make sure Create Project calls createProject()
            document
                .getElementById('createProjectBtn')
                ?.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('🟦 Create Project button clicked');
                    this.createProject();
                });

            // Document type change
            const wizardType = document.getElementById('wizardType');
            if (wizardType) {
                wizardType.addEventListener('change', () => {
                    this.saveStep1Data();
                    this.updateStructureDescription();
                });
            }

            // Form auto-save
            const basicInfoForm = document.getElementById('basicInfoForm');
            if (basicInfoForm) {
                basicInfoForm.addEventListener('input', () => {
                    this.saveStep1Data();
                });
            }

            // AI Suggest Outline
            const suggestOutline = document.getElementById('suggestOutline');
            if (suggestOutline) {
                suggestOutline.addEventListener('click', () => {
                    this.suggestOutline();
                });
            }

            // Add Section
            const addSection = document.getElementById('addSection');
            if (addSection) {
                addSection.addEventListener('click', () => {
                    this.addSection();
                });
            }

            // Enter key support for quick section addition
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.target.classList.contains('section-input')) {
                    e.preventDefault();
                    this.addSection();
                }
            });

            console.log('✅ All event listeners setup complete');
        } catch (error) {
            console.error('❌ Failed to setup event listeners:', error);
        }
    }

    saveStep1Data() {
        try {
            const wizardTitle = document.getElementById('wizardTitle');
            const wizardType = document.getElementById('wizardType');
            const wizardTopic = document.getElementById('wizardTopic');

            if (wizardTitle) this.projectData.title = wizardTitle.value;
            if (wizardType) this.projectData.document_type = wizardType.value;
            if (wizardTopic) this.projectData.topic = wizardTopic.value;

            console.log('💾 Step 1 data saved:', {
                title: this.projectData.title,
                type: this.projectData.document_type,
                topic: this.projectData.topic
            });
        } catch (error) {
            console.error('❌ Failed to save step 1 data:', error);
        }
    }

    updateStructureDescription() {
        try {
            const type = this.projectData.document_type;
            const description = document.getElementById('structureDescription');

            if (description) {
                if (type === 'docx') {
                    description.textContent =
                        'Define the sections for your Word document. Add section titles that will structure your document.';
                } else if (type === 'pptx') {
                    description.textContent =
                        'Define the slides for your PowerPoint presentation. Add slide titles that will structure your presentation.';
                } else {
                    description.textContent = 'Define your document sections or slides';
                }
            }
        } catch (error) {
            console.error('❌ Failed to update structure description:', error);
        }
    }

    nextStep() {
        console.log(`➡️ Moving from step ${this.currentStep} to step ${this.currentStep + 1}`);

        try {
            if (this.currentStep === 1) {
                if (!this.validateStep1()) return;
                this.saveStep1Data();
                this.updateStructureDescription();
            } else if (this.currentStep === 2) {
                if (!this.validateStep2()) return;
                this.saveSections();
            }

            this.currentStep++;
            this.updateStepDisplay();
        } catch (error) {
            console.error('❌ Failed to move to next step:', error);
            this.showError('Failed to proceed: ' + error.message);
        }
    }

    prevStep() {
        console.log(`⬅️ Moving from step ${this.currentStep} to step ${this.currentStep - 1}`);

        try {
            this.currentStep--;
            this.updateStepDisplay();
        } catch (error) {
            console.error('❌ Failed to move to previous step:', error);
        }
    }

    updateStepDisplay() {
        try {
            // Hide all steps
            document.querySelectorAll('.wizard-step').forEach((step) => {
                step.classList.add('hidden');
            });

            // Show current step
            const currentStepEl = document.getElementById(`step${this.currentStep}`);
            if (currentStepEl) {
                currentStepEl.classList.remove('hidden');
            }

            // Update progress steps
            document.querySelectorAll('.progress-steps .step').forEach((step, index) => {
                const stepNum = index + 1;
                if (stepNum < this.currentStep) {
                    step.classList.add('completed');
                    step.classList.remove('active');
                } else if (stepNum === this.currentStep) {
                    step.classList.add('active');
                    step.classList.remove('completed');
                } else {
                    step.classList.remove('active', 'completed');
                }
            });

            // Update review step if we're on step 3
            if (this.currentStep === 3) {
                this.updateReviewStep();
            }

            console.log(`✅ Now on step ${this.currentStep}`);
        } catch (error) {
            console.error('❌ Failed to update step display:', error);
        }
    }

    validateStep1() {
        try {
            const title = document.getElementById('wizardTitle')?.value.trim();
            const type = document.getElementById('wizardType')?.value;
            const topic = document.getElementById('wizardTopic')?.value.trim();

            if (!title || !type || !topic) {
                this.showError('Please fill in all required fields in Step 1');
                return false;
            }

            if (title.length < 3) {
                this.showError('Project title must be at least 3 characters long');
                return false;
            }

            if (topic.length < 10) {
                this.showError(
                    'Please provide a more detailed topic description (at least 10 characters)'
                );
                return false;
            }

            console.log('✅ Step 1 validation passed');
            return true;
        } catch (error) {
            console.error('❌ Step 1 validation failed:', error);
            return false;
        }
    }

    validateStep2() {
        try {
            const sections = this.getSectionsFromUI();

            if (sections.length === 0) {
                this.showError('Please add at least one section');
                return false;
            }

            const emptyTitles = sections.filter((title) => !title.trim());
            if (emptyTitles.length > 0) {
                this.showError('Please fill in all section titles');
                return false;
            }

            console.log('✅ Step 2 validation passed with', sections.length, 'sections');
            return true;
        } catch (error) {
            console.error('❌ Step 2 validation failed:', error);
            return false;
        }
    }

    addSection(title = '') {
        try {
            const sectionsContainer = document.getElementById('sectionsContainer');
            if (!sectionsContainer) return;

            const placeholder = document.getElementById('sectionPlaceholder');
            if (placeholder) {
                placeholder.classList.add('hidden');
            }

            const sectionId = Date.now();
            const label = this.projectData.document_type === 'docx' ? 'Section title' : 'Slide title';

            const sectionHTML = `
                <div class="section-item" data-id="${sectionId}">
                    <div style="display:flex; gap:8px; align-items:center;">
                        <input 
                            type="text" 
                            class="section-input"
                            value="${title}"
                            placeholder="${label}"
                            style="flex:1;"
                        >
                        <button type="button" class="btn btn-text move-up" data-id="${sectionId}" title="Move up">⬆️</button>
                        <button type="button" class="btn btn-text move-down" data-id="${sectionId}" title="Move down">⬇️</button>
                        <button type="button" class="btn btn-text remove-section" data-id="${sectionId}" title="Delete">🗑️</button>
                    </div>
                </div>
            `;

            sectionsContainer.insertAdjacentHTML('beforeend', sectionHTML);

            const removeBtn = sectionsContainer.querySelector(
                `.remove-section[data-id="${sectionId}"]`
            );
            if (removeBtn) {
                removeBtn.addEventListener('click', () => this.removeSection(sectionId));
            }

            const moveUpBtn = sectionsContainer.querySelector(
                `.move-up[data-id="${sectionId}"]`
            );
            if (moveUpBtn) {
                moveUpBtn.addEventListener('click', () => this.moveSection(sectionId, 'up'));
            }

            const moveDownBtn = sectionsContainer.querySelector(
                `.move-down[data-id="${sectionId}"]`
            );
            if (moveDownBtn) {
                moveDownBtn.addEventListener('click', () => this.moveSection(sectionId, 'down'));
            }

            const input = sectionsContainer.querySelector(`[data-id="${sectionId}"] input`);
            if (input) {
                input.addEventListener('input', () => this.saveSections());
            }

            this.saveSections();
            console.log('✅ Added section:', title || 'New section');
        } catch (error) {
            console.error('❌ Failed to add section:', error);
        }
    }

    moveSection(sectionId, direction) {
        try {
            const container = document.getElementById('sectionsContainer');
            if (!container) return;

            const sectionEl = container.querySelector(`.section-item[data-id="${sectionId}"]`);
            if (!sectionEl) return;

            if (direction === 'up' && sectionEl.previousElementSibling) {
                container.insertBefore(sectionEl, sectionEl.previousElementSibling);
            } else if (direction === 'down' && sectionEl.nextElementSibling) {
                container.insertBefore(sectionEl.nextElementSibling, sectionEl);
            }

            this.saveSections();
            console.log(`↕️ Moved section ${sectionId} ${direction}`);
        } catch (error) {
            console.error('❌ Failed to move section:', error);
        }
    }


    removeSection(sectionId) {
        try {
            const sectionEl = document.querySelector(`[data-id="${sectionId}"]`);
            if (sectionEl) {
                sectionEl.remove();
                this.saveSections();

                const sections = this.getSectionsFromUI();
                if (sections.length === 0) {
                    const placeholder = document.getElementById('sectionPlaceholder');
                    if (placeholder) {
                        placeholder.classList.remove('hidden');
                    }
                }
            }
        } catch (error) {
            console.error('❌ Failed to remove section:', error);
        }
    }

    getSectionsFromUI() {
        try {
            const sections = [];
            document
                .querySelectorAll('#sectionsContainer .section-item input')
                .forEach((input) => {
                    if (input.value.trim()) {
                        sections.push(input.value.trim());
                    }
                });
            return sections;
        } catch (error) {
            console.error('❌ Failed to get sections from UI:', error);
            return [];
        }
    }

    saveSections() {
        try {
            const sectionsFromUI = this.getSectionsFromUI();
            console.log('🔍 Sections from UI:', sectionsFromUI);

            this.projectData.sections = sectionsFromUI;
            console.log('💾 Sections saved to projectData:', this.projectData.sections);
        } catch (error) {
            console.error('❌ Failed to save sections:', error);
        }
    }

    async suggestOutline() {
        if (!this.projectData.topic || !this.projectData.document_type) {
            this.showError('Please complete Step 1 first');
            return;
        }

        const button = document.getElementById('suggestOutline');
        if (!button) return;

        try {
            this.showLoading(button, 'AI Thinking...');

            console.log('🤖 Requesting AI outline for:', {
                topic: this.projectData.topic,
                type: this.projectData.document_type
            });

            const response = await api.suggestOutline(
                this.projectData.topic,
                this.projectData.document_type
            );

            const sectionsContainer = document.getElementById('sectionsContainer');
            if (sectionsContainer) {
                sectionsContainer.innerHTML = '';
            }

            const placeholder = document.getElementById('sectionPlaceholder');
            if (placeholder) {
                placeholder.classList.add('hidden');
            }

            if (response.outline && response.outline.length > 0) {
                response.outline.forEach((title) => {
                    this.addSection(title);
                });
                this.showSuccess(
                    `AI generated ${response.outline.length} ${this.projectData.document_type === 'docx' ? 'sections' : 'slides'
                    } successfully!`
                );
            } else {
                this.showError('AI could not generate an outline. Please try again.');
            }
        } catch (error) {
            console.error('❌ Failed to generate outline:', error);
            this.showError('Failed to generate outline: ' + error.message);
        } finally {
            this.hideLoading(button, '🚀 AI Suggest Outline');
        }
    }

    updateReviewStep() {
        try {
            document.getElementById('reviewTitle').textContent =
                this.projectData.title || '-';
            document.getElementById('reviewType').textContent = this.projectData
                .document_type
                ? this.projectData.document_type.toUpperCase()
                : '-';
            document.getElementById('reviewTopic').textContent =
                this.projectData.topic || '-';

            const sectionCount = this.projectData.sections.length;
            const sectionText = `${sectionCount} ${this.projectData.document_type === 'docx' ? 'sections' : 'slides'
                }`;
            document.getElementById('reviewSectionCount').textContent = sectionText;

            const previewContainer = document.getElementById('sectionsPreview');
            if (previewContainer) {
                if (this.projectData.sections.length > 0) {
                    previewContainer.innerHTML = this.projectData.sections
                        .map(
                            (section, index) => `
                        <div class="section-preview-item">
                            <strong>${index + 1}.</strong> ${this.escapeHtml(section)}
                        </div>
                    `
                        )
                        .join('');
                    previewContainer.classList.remove('empty-preview');
                } else {
                    previewContainer.innerHTML =
                        '<div class="empty-preview">No sections defined yet</div>';
                    previewContainer.classList.add('empty-preview');
                }
            }

            console.log(
                '✅ Review step updated with',
                this.projectData.sections.length,
                'sections'
            );
        } catch (error) {
            console.error('❌ Failed to update review step:', error);
        }
    }

    async createProject() {
        if (this.isSubmitting) {
            console.log('⏳ Already submitting, please wait...');
            return;
        }

        this.isSubmitting = true;

        const loadingOverlay = document.getElementById('loadingOverlay');
        const loadingMessage = document.getElementById('loadingMessage');

        try {
            if (loadingOverlay) loadingOverlay.classList.remove('hidden');
            if (loadingMessage) loadingMessage.textContent = 'Creating your project...';

            console.log('🔍 Project data before sending:', {
                title: this.projectData.title,
                document_type: this.projectData.document_type,
                topic: this.projectData.topic,
                sections: this.projectData.sections,
                sections_count: this.projectData.sections.length,
                sections_sample: this.projectData.sections.slice(0, 3)
            });
            console.log('=== CREATING PROJECT DEBUG ===');
            console.log('Final project data before API call:', JSON.stringify({
                title: this.projectData.title,
                document_type: this.projectData.document_type,
                topic: this.projectData.topic,
                sections: this.projectData.sections
            }, null, 2));

            let projectId = this.projectId;

            if (!projectId) {
                // 🆕 New project – create with sections
                console.log('🆕 No projectId – creating NEW project');
                const project = await api.createProject({
                    title: this.projectData.title,
                    document_type: this.projectData.document_type,
                    topic: this.projectData.topic,
                    sections: this.projectData.sections
                });
                projectId = project.id;
                console.log('✅ Project created with ID:', projectId);
                console.log('🔍 Project response:', project);
            } else {
                // ♻️ Existing project – update sections
                console.log('♻️ Existing project – updating sections for projectId:', projectId);
                console.log('Sections to save:', this.projectData.sections);
                await api.setProjectSections(projectId, this.projectData.sections);
                console.log('✅ Sections updated successfully');
            }

            this.showSuccess('Project created successfully! Redirecting to editor...');

            setTimeout(() => {
                window.location.href = `project-editor.html?projectId=${projectId}`;
            }, 1500);

        } catch (error) {
            console.error('❌ Failed to create project:', error);
            this.showError('Failed to create project: ' + error.message);
        } finally {
            this.isSubmitting = false;
            if (loadingOverlay) loadingOverlay.classList.add('hidden');
        }
    }


    // Utility methods
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showLoading(button, text) {
        if (!button) return;
        button.disabled = true;
        button.innerHTML = `<div class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></div> ${text}`;
    }

    hideLoading(button, originalText) {
        if (!button) return;
        button.disabled = false;
        button.innerHTML = originalText;
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
        try {
            const container = document.getElementById('messageContainer') || document.body;
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
            container.appendChild(notification);

            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 5000);
        } catch (error) {
            console.error('❌ Failed to show notification:', error);
        }
    }

    renderSections() {
        try {
            const sectionsContainer = document.getElementById('sectionsContainer');
            if (!sectionsContainer) return;

            sectionsContainer.innerHTML = '';

            const placeholder = document.getElementById('sectionPlaceholder');
            if (placeholder && this.projectData.sections.length > 0) {
                placeholder.classList.add('hidden');
            }

            this.projectData.sections.forEach((section) => {
                this.addSection(section);
            });

            console.log('✅ Rendered', this.projectData.sections.length, 'sections');
        } catch (error) {
            console.error('❌ Failed to render sections:', error);
        }
    }
}

// Temporary debug function
window.debugWizard = function () {
    console.log('=== WIZARD DEBUG INFO ===');
    console.log('Current step:', wizard.currentStep);
    console.log('Project data:', wizard.projectData);
    console.log('Sections from UI:', wizard.getSectionsFromUI());
    console.log(
        'Section inputs found:',
        document.querySelectorAll('#sectionsContainer .section-item input').length
    );

    document
        .querySelectorAll('#sectionsContainer .section-item input')
        .forEach((input, index) => {
            console.log(`Section ${index + 1}:`, input.value);
        });

    wizard.saveSections();
    console.log('After saveSections:', wizard.projectData.sections);
};

// Initialize wizard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏗️ DOM loaded, initializing ProjectWizard...');
    window.wizard = new ProjectWizard();
});
