class ProjectEditor {
    constructor() {
        this.project = null;
        this.sections = [];
        this.currentSection = null;
        this.refinementHistory = {};
        this.init();
    }

    async init() {
        await this.loadProjectData();
        this.setupEventListeners();
        this.renderSectionsList();
    }

    async loadProjectData() {
        const urlParams = new URLSearchParams(window.location.search);
        const projectId = urlParams.get('projectId');

        if (!projectId) {
            this.showError('No project ID specified');
            return;
        }

        try {
            this.showLoading('Loading project...');

            this.project = await api.getProject(projectId);
            this.sections = this.project.sections || [];

            this.updateUI();
            this.hideLoading();

        } catch (error) {
            this.hideLoading();
            this.showError('Failed to load project: ' + error.message);
        }
    }

    updateUI() {
        document.getElementById('projectTitle').textContent = this.project.title;

        const typeBadge = document.getElementById('documentTypeBadge');
        typeBadge.textContent = this.project.document_type.toUpperCase();

        const sectionCount = document.getElementById('sectionCount');
        sectionCount.textContent =
            `${this.sections.length} ${this.project.document_type === 'docx' ? 'sections' : 'slides'}`;

        if (this.sections.length > 0 && !this.currentSection) {
            this.selectSection(this.sections[0].id);
        }
    }

    renderSectionsList() {
        const sectionsList = document.getElementById('sectionsList');

        sectionsList.innerHTML = this.sections.map(section => `
            <div class="section-list-item ${section.id === this.currentSection?.id ? 'active' : ''}" 
                 onclick="projectEditor.selectSection(${section.id})">
                <strong>${this.escapeHtml(section.title)}</strong>
                <div style="font-size: 0.8rem; color: #666; margin-top: 4px;">
                    ${section.content ? '✓ Content ready' : '⏳ No content'}
                </div>
            </div>
        `).join('');
    }

    selectSection(sectionId) {
        this.currentSection = this.sections.find(s => s.id === sectionId);
        if (!this.currentSection) return;

        document.querySelectorAll('.section-list-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeItem = document.querySelector(`[onclick="projectEditor.selectSection(${sectionId})"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }

        document.getElementById('noSectionSelected').classList.add('hidden');
        document.getElementById('sectionEditor').classList.remove('hidden');

        this.updateSectionEditor();
    }

    updateSectionEditor() {
        if (!this.currentSection) return;

        document.getElementById('currentSectionTitle').textContent = this.currentSection.title;

        const contentElement = document.getElementById('sectionContent');
        contentElement.style.color = '#111';
        contentElement.style.fontStyle = 'normal';

        if (this.currentSection.content) {
            contentElement.textContent = this.currentSection.content;
        } else {
            contentElement.textContent =
                'No content generated yet. Click "Generate Content" to create content for this section.';
            contentElement.style.color = '#666';
            contentElement.style.fontStyle = 'italic';
        }

        this.loadRefinementHistory();
    }

    async loadRefinementHistory() {
        if (!this.currentSection) return;

        const historyElement = document.getElementById('refinementHistory');
        const historyList = document.getElementById('historyList');

        try {
            const history = await api.getSectionHistory(this.currentSection.id);

            const refinements = history.refinements || [];
            const comments = history.comments || [];
            const feedback = history.feedback || [];

            if (
                refinements.length === 0 &&
                comments.length === 0 &&
                feedback.length === 0
            ) {
                historyList.innerHTML = `
                    <div class="history-item">
                        <div class="prompt">No refinement history yet</div>
                        <div class="timestamp">Refine this section to see history</div>
                    </div>
                `;
            } else {
                const refinementHtml = refinements.map(r => `
                    <div class="history-item">
                        <div class="prompt"><strong>Refinement:</strong> ${this.escapeHtml(r.user_prompt || '')}</div>
                        <div class="timestamp">${new Date(r.created_at).toLocaleString()}</div>
                    </div>
                `).join('');

                const commentHtml = comments.map(c => `
                    <div class="history-item">
                        <div class="prompt"><strong>Comment:</strong> ${this.escapeHtml(c.text || '')}</div>
                        <div class="timestamp">${new Date(c.created_at).toLocaleString()}</div>
                    </div>
                `).join('');

                const feedbackHtml = feedback.map(f => `
                    <div class="history-item">
                        <div class="prompt"><strong>Feedback:</strong> ${f.type === 'like' ? '👍 Like' : '👎 Dislike'}</div>
                        <div class="timestamp">${new Date(f.created_at).toLocaleString()}</div>
                    </div>
                `).join('');

                historyList.innerHTML = refinementHtml + commentHtml + feedbackHtml;
            }

            historyElement.classList.remove('hidden');
        } catch (error) {
            console.error('Failed to load refinement history:', error);
            historyList.innerHTML = `
                <div class="history-item">
                    <div class="prompt">Failed to load history</div>
                    <div class="timestamp">${error.message}</div>
                </div>
            `;
            historyElement.classList.remove('hidden');
        }
    }

    setupEventListeners() {
        document.getElementById('backToDashboard').addEventListener('click', () => {
            window.location.href = 'dashboard.html';
        });

        document.getElementById('generateContent').addEventListener('click', () => {
            this.generateAllContent();
        });

        document.getElementById('exportProject').addEventListener('click', () => {
            this.exportProject();
        });

        document.getElementById('regenerateSection').addEventListener('click', () => {
            this.regenerateSection();
        });

        document.getElementById('copyContent').addEventListener('click', () => {
            this.copyContent();
        });

        document.getElementById('refineContent').addEventListener('click', () => {
            this.refineContent();
        });

        document.getElementById('likeBtn').addEventListener('click', () => {
            this.recordFeedback('like');
        });

        document.getElementById('dislikeBtn').addEventListener('click', () => {
            this.recordFeedback('dislike');
        });

        document.getElementById('saveComment').addEventListener('click', () => {
            this.saveComment();
        });

        document.getElementById('refinementPrompt').addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.refineContent();
            }
        });
    }

    async generateAllContent() {
        if (!this.project) return;

        try {
            this.showLoading('Generating content for all sections...');

            await api.generateContent(this.project.id);
            await this.loadProjectData();

            this.showSuccess('Content generated successfully!');

        } catch (error) {
            this.showError('Failed to generate content: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    async regenerateSection() {
        if (!this.currentSection) return;

        try {
            this.showLoading('Regenerating section content...');

            const response = await api.refineSection(
                this.currentSection.id,
                'Regenerate this section with fresh content'
            );

            this.currentSection.content = response.new_content;
            this.updateSectionEditor();

            this.showSuccess('Section regenerated successfully!');
            await this.loadRefinementHistory();

        } catch (error) {
            this.showError('Failed to regenerate section: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    async refineContent() {
        if (!this.currentSection) return;

        const prompt = document.getElementById('refinementPrompt').value.trim();
        if (!prompt) {
            this.showError('Please enter refinement instructions');
            return;
        }

        try {
            this.showLoading('Refining content...');

            const response = await api.refineSection(this.currentSection.id, prompt);

            this.currentSection.content = response.new_content;
            this.updateSectionEditor();
            document.getElementById('refinementPrompt').value = '';

            this.showSuccess('Content refined successfully!');
            await this.loadRefinementHistory();

        } catch (error) {
            this.showError('Failed to refine content: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    async exportProject() {
        if (!this.project) return;

        try {
            this.showLoading('Preparing download...');
            await api.exportProject(this.project.id);
            this.hideLoading();
            this.showSuccess('Export started! Check your downloads.');
        } catch (error) {
            this.hideLoading();
            this.showError('Failed to export: ' + error.message);
        }
    }

    copyContent() {
        if (!this.currentSection?.content) return;

        navigator.clipboard.writeText(this.currentSection.content)
            .then(() => {
                this.showSuccess('Content copied to clipboard!');
            })
            .catch(() => {
                this.showError('Failed to copy content');
            });
    }

    async recordFeedback(type) {
        if (!this.currentSection) return;

        try {
            await api.sendFeedback(this.currentSection.id, type);
            this.showSuccess(`Feedback recorded: ${type}`);

            const button = document.getElementById(type === 'like' ? 'likeBtn' : 'dislikeBtn');
            const originalHTML = button.innerHTML;

            button.innerHTML = type === 'like' ? '👍 Liked!' : '👎 Disliked!';
            button.style.opacity = '0.7';

            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.style.opacity = '1';
            }, 2000);

            await this.loadRefinementHistory();
        } catch (error) {
            this.showError('Failed to record feedback: ' + error.message);
        }
    }

    async saveComment() {
        const comment = document.getElementById('userComment').value.trim();
        if (!comment || !this.currentSection) return;

        try {
            await api.addComment(this.currentSection.id, comment);
            this.showSuccess('Comment saved!');
            document.getElementById('userComment').value = '';
            await this.loadRefinementHistory();
        } catch (error) {
            this.showError('Failed to save comment: ' + error.message);
        }
    }

    // Utility methods
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text ?? '';
        return div.innerHTML;
    }

    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        const messageEl = document.getElementById('loadingMessage');

        messageEl.textContent = message;
        overlay.classList.remove('hidden');
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        overlay.classList.add('hidden');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
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
            notification.remove();
        }, 5000);
    }
}

const projectEditor = new ProjectEditor();
