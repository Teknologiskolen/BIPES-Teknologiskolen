/**
 * Class Management Page Module
 * Handles class creation, student management, and class viewing
 */

import { session } from '../../base/session.js';
import { DOM } from '../../base/dom.js';

class ClassesPage {
    constructor() {
        this.name = 'classes';
        this.$ = {}; // DOM elements
        this.classes = [];
        this.currentClass = null;
        this.selectedStudents = [];
        this.inited = false;
        this.sessionListenerAdded = false;

        // Create page container
        let $ = this.$ = {};
        $.container = new DOM('div', { className: 'classes-container' });

        // Only attach to DOM if section exists (for authenticated users)
        const sectionElement = DOM.get('section#classes');
        if (sectionElement) {
            $.section = new DOM(sectionElement).append($.container);
        }
    }

    init() {
        // Redirect guests to landing page
        if (!session.isLoggedIn()) {
            window.location.href = '/';
            return;
        }

        if (this.inited)
            return;

        // Add session change listener once
        if (!this.sessionListenerAdded) {
            window.addEventListener('sessionchange', (e) => {
                if (e.detail.isAuthenticated) {
                    this.renderContent();
                } else {
                    // User logged out, redirect to landing
                    window.location.href = '/';
                }
            });
            this.sessionListenerAdded = true;
        }

        // Render content
        this.renderContent();
        this.inited = true;
    }

    renderContent() {
        if (session.isTeacher()) {
            this.renderTeacherView();
        } else if (session.isStudent()) {
            this.renderStudentView();
        }
    }

    // =========================================================================
    // TEACHER VIEW
    // =========================================================================

    renderTeacherView() {
        this.$.container.$.innerHTML = `
            <div class="classes-container">
                <div class="classes-header">
                    <h1>My Classes</h1>
                    <button class="btn btn-primary" id="create-class-btn">
                        <span>+ Create New Class</span>
                    </button>
                </div>

                <div id="classes-list" class="classes-list">
                    <div class="loading">Loading classes...</div>
                </div>

                <div id="class-detail" class="class-detail" style="display: none;">
                    <!-- Class detail will be rendered here -->
                </div>
            </div>

            <!-- Create Class Modal -->
            <div id="create-class-modal" class="modal" style="display: none;">
                <div class="modal-content">
                    <span class="close">&times;</span>
                    <h2>Create New Class</h2>
                    <form id="create-class-form">
                        <div class="form-group">
                            <label for="class-name">Class Name</label>
                            <input type="text" id="class-name" required placeholder="e.g., Python Programming 101">
                        </div>
                        <div class="form-group">
                            <label for="class-description">Description (optional)</label>
                            <textarea id="class-description" rows="3" placeholder="Brief description of the class"></textarea>
                        </div>
                        <button type="submit" class="btn btn-primary">Create Class</button>
                    </form>
                </div>
            </div>

            <!-- Add Student Modal -->
            <div id="add-student-modal" class="modal" style="display: none;">
                <div class="modal-content">
                    <span class="close">&times;</span>
                    <h2>Add Student to Class</h2>
                    <div class="form-group">
                        <label for="student-search">Search Student by Name</label>
                        <input type="text" id="student-search" placeholder="Type student name...">
                        <div id="student-search-results" class="search-results"></div>
                    </div>
                    <div class="or-divider">OR</div>
                    <div class="form-group">
                        <label for="new-student-name">Create New Student</label>
                        <input type="text" id="new-student-name" placeholder="Student name">
                        <button id="create-student-btn" class="btn btn-secondary">Create Student</button>
                    </div>
                    <div id="student-password-display" style="display: none;" class="password-display">
                        <div class="password-label">Student Password</div>
                        <div class="password-value" id="generated-password"></div>
                        <button class="copy-btn" id="copy-password-btn">Copy Password</button>
                        <p style="margin-top: 10px; font-size: 0.9rem; color: #666;">
                            Give this password to the student. They will need to change it on first login.
                        </p>
                    </div>
                </div>
            </div>
        `;

        // Attach event listeners
        this.$.createClassBtn = this.$.container.$.querySelector('#create-class-btn');
        this.$.createClassModal = this.$.container.$.querySelector('#create-class-modal');
        this.$.createClassForm = this.$.container.$.querySelector('#create-class-form');
        this.$.addStudentModal = this.$.container.$.querySelector('#add-student-modal');

        this.$.createClassBtn.addEventListener('click', () => this.showCreateClassModal());
        this.$.createClassForm.addEventListener('submit', (e) => this.handleCreateClass(e));

        // Close modals
        this.$.container.$.querySelectorAll('.modal .close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });

        // Load classes
        this.loadClasses();
    }

    showCreateClassModal() {
        this.$.createClassModal.style.display = 'block';
    }

    async handleCreateClass(e) {
        e.preventDefault();

        const className = this.$.container.$.querySelector('#class-name').value;
        const description = this.$.container.$.querySelector('#class-description').value;

        try {
            const response = await fetch('/api/classes/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    class_name: className,
                    description: description
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.$.createClassModal.style.display = 'none';
                this.$.createClassForm.reset();
                this.loadClasses();
                alert(`Class created successfully! Class code: ${data.class_code}`);
            } else {
                alert('Error: ' + (data.error || 'Failed to create class'));
            }
        } catch (error) {
            alert('Network error. Please try again.');
        }
    }

    async loadClasses() {
        const container = this.$.container.$.querySelector('#classes-list');
        container.innerHTML = '<div class="loading">Loading classes...</div>';

        try {
            const response = await fetch('/api/classes/my-classes', {
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok) {
                this.classes = data.classes;
                this.renderClassesList();
            } else {
                container.innerHTML = '<div class="error">Failed to load classes</div>';
            }
        } catch (error) {
            container.innerHTML = '<div class="error">Network error</div>';
        }
    }

    renderClassesList() {
        const container = this.$.container.$.querySelector('#classes-list');

        if (this.classes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No classes yet. Create your first class to get started!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.classes.map(cls => `
            <div class="class-card" data-class-id="${cls.class_id}">
                <div class="class-card-header">
                    <h3>${cls.class_name}</h3>
                    <span class="class-code">${cls.class_code}</span>
                </div>
                <div class="class-card-body">
                    <p>${cls.description || 'No description'}</p>
                    <div class="class-stats">
                        <span>👥 ${cls.student_count} students</span>
                    </div>
                </div>
                <div class="class-card-footer">
                    <button class="btn btn-secondary view-class-btn" data-class-id="${cls.class_id}">
                        View Class
                    </button>
                </div>
            </div>
        `).join('');

        // Attach click handlers
        container.querySelectorAll('.view-class-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const classId = parseInt(e.target.dataset.classId);
                this.showClassDetail(classId);
            });
        });
    }

    async showClassDetail(classId) {
        this.currentClass = this.classes.find(c => c.class_id === classId);

        const container = this.$.container.$.querySelector('#class-detail');
        container.style.display = 'block';
        container.innerHTML = '<div class="loading">Loading class details...</div>';

        // Load students
        try {
            const response = await fetch(`/api/classes/${classId}/students`, {
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok) {
                this.renderClassDetail(data.students);
            }
        } catch (error) {
            container.innerHTML = '<div class="error">Failed to load students</div>';
        }
    }

    renderClassDetail(students) {
        const container = this.$.container.$.querySelector('#class-detail');

        container.innerHTML = `
            <div class="class-detail-header">
                <button class="btn btn-secondary back-btn" id="back-to-list">
                    ← Back to Classes
                </button>
                <h2>${this.currentClass.class_name}</h2>
                <div class="class-code-display">
                    Class Code: <strong>${this.currentClass.class_code}</strong>
                    <button class="btn-icon" id="copy-class-code" title="Copy class code">📋</button>
                </div>
            </div>

            <div class="tab-content active" id="students-tab">
                <div class="students-header">
                    <h3>Students (${students.length})</h3>
                    <button class="btn btn-primary" id="add-student-btn">+ Add Student</button>
                </div>

                <table class="students-table">
                    <thead>
                        <tr>
                            <th>Student Name</th>
                            <th>Password</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${students.map(student => `
                            <tr>
                                <td>${student.student_name}</td>
                                <td>
                                    ${student.password ?
                                        `<code>${student.password}</code>` :
                                        '<span class="password-hidden">****</span>'}
                                </td>
                                <td>
                                    ${student.password_changed ?
                                        '<span class="badge badge-success">Active</span>' :
                                        '<span class="badge badge-warning">Pending Setup</span>'}
                                </td>
                                <td>
                                    <button class="btn-icon remove-student-btn" data-student-id="${student.student_id}" title="Remove from class">
                                        🗑️
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

        `;

        // Event listeners
        container.querySelector('#back-to-list').addEventListener('click', () => {
            container.style.display = 'none';
        });

        container.querySelector('#copy-class-code').addEventListener('click', () => {
            navigator.clipboard.writeText(this.currentClass.class_code);
            alert('Class code copied!');
        });

        container.querySelector('#add-student-btn').addEventListener('click', () => {
            this.showAddStudentModal();
        });

        // Remove student buttons
        container.querySelectorAll('.remove-student-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const studentId = e.target.dataset.studentId;
                if (confirm('Remove this student from the class?')) {
                    await this.removeStudent(studentId);
                }
            });
        });
    }

    showAddStudentModal() {
        this.$.addStudentModal.style.display = 'block';

        const searchInput = this.$.container.$.querySelector('#student-search');
        const searchResults = this.$.container.$.querySelector('#student-search-results');
        const createBtn = this.$.container.$.querySelector('#create-student-btn');
        const newStudentName = this.$.container.$.querySelector('#new-student-name');

        // Search students
        searchInput.addEventListener('input', async (e) => {
            const query = e.target.value.trim();
            if (query.length < 2) {
                searchResults.innerHTML = '';
                return;
            }

            try {
                const response = await fetch(`/api/classes/${this.currentClass.class_id}/students/search`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ search_query: query })
                });

                const data = await response.json();

                if (response.ok && data.students.length > 0) {
                    searchResults.innerHTML = data.students.map(student => `
                        <div class="search-result-item" data-student-id="${student.student_id}">
                            ${student.student_name}
                        </div>
                    `).join('');

                    searchResults.querySelectorAll('.search-result-item').forEach(item => {
                        item.addEventListener('click', async () => {
                            await this.addExistingStudent(parseInt(item.dataset.studentId));
                        });
                    });
                } else {
                    searchResults.innerHTML = '<div class="no-results">No students found</div>';
                }
            } catch (error) {
                console.error('Search failed:', error);
            }
        });

        // Create new student
        createBtn.addEventListener('click', async () => {
            const name = newStudentName.value.trim();
            if (!name) {
                alert('Please enter a student name');
                return;
            }

            await this.createStudent(name);
        });
    }

    async createStudent(name) {
        try {
            const response = await fetch(`/api/classes/${this.currentClass.class_id}/students/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ student_name: name })
            });

            const data = await response.json();

            if (response.ok) {
                // Show password
                const passwordDisplay = this.$.container.$.querySelector('#student-password-display');
                const passwordValue = this.$.container.$.querySelector('#generated-password');
                passwordValue.textContent = data.initial_password;
                passwordDisplay.style.display = 'block';

                this.$.container.$.querySelector('#copy-password-btn').addEventListener('click', () => {
                    navigator.clipboard.writeText(data.initial_password);
                    alert('Password copied!');
                });

                // Refresh student list after 3 seconds
                setTimeout(() => {
                    this.$.addStudentModal.style.display = 'none';
                    this.showClassDetail(this.currentClass.class_id);
                }, 3000);
            } else {
                alert('Error: ' + (data.error || 'Failed to create student'));
            }
        } catch (error) {
            alert('Network error');
        }
    }

    async addExistingStudent(studentId) {
        try {
            const response = await fetch(`/api/classes/${this.currentClass.class_id}/students/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ student_id: studentId })
            });

            const data = await response.json();

            if (response.ok) {
                this.$.addStudentModal.style.display = 'none';
                this.showClassDetail(this.currentClass.class_id);
            } else {
                alert('Error: ' + (data.error || 'Failed to add student'));
            }
        } catch (error) {
            alert('Network error');
        }
    }

    async removeStudent(studentId) {
        try {
            const response = await fetch(`/api/classes/${this.currentClass.class_id}/students/${studentId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                this.showClassDetail(this.currentClass.class_id);
            } else {
                alert('Failed to remove student');
            }
        } catch (error) {
            alert('Network error');
        }
    }

    // =========================================================================
    // STUDENT VIEW
    // =========================================================================

    renderStudentView() {
        this.$.container.$.innerHTML = `
            <div class="classes-container">
                <div class="classes-header">
                    <h1>My Classes</h1>
                </div>

                <div id="student-classes-list" class="classes-list">
                    <div class="loading">Loading classes...</div>
                </div>
            </div>
        `;

        this.loadStudentClasses();
    }

    async loadStudentClasses() {
        const container = this.$.container.$.querySelector('#student-classes-list');

        try {
            const response = await fetch('/api/students/my-classes', {
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok) {
                if (data.classes.length === 0) {
                    container.innerHTML = '<div class="empty-state">You are not enrolled in any classes yet.</div>';
                } else {
                    container.innerHTML = data.classes.map(cls => `
                        <div class="class-card">
                            <div class="class-card-header">
                                <h3>${cls.class_name}</h3>
                                <span class="class-code">${cls.class_code}</span>
                            </div>
                            <div class="class-card-body">
                                <p><strong>Teacher:</strong> ${cls.teacher_name}</p>
                            </div>
                        </div>
                    `).join('');
                }
            }
        } catch (error) {
            container.innerHTML = '<div class="error">Failed to load classes</div>';
        }
    }

    // Page lifecycle methods
    load() {
        // Called when page becomes visible
        if (session.isLoggedIn()) {
            this.renderContent();
        }
    }

    deinit() {
        // Clean up when page is hidden
        // Nothing to clean up currently, but method is required by navigation
    }

    empty() {
        // Return empty page state
        return { classes: [] };
    }
}

// Export instance
export let classes = new ClassesPage();
