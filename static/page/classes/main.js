/**
 * Class Management Page Module
 * Handles class creation, student management, and class viewing
 */

import { session } from '../../base/session.js';
import { DOM } from '../../base/dom.js';

// =============================================================================
// LOCAL TRANSLATIONS (self-contained, independent of the global Msg object)
// =============================================================================
const CLASSES_I18N = {
    en: {
        myClasses: 'My Classes',
        createNewClass: '+ Create New Class',
        addClass: '+ Add class',
        createNewClassTitle: 'Create New Class',
        loadingClasses: 'Loading classes...',
        className: 'Class Name',
        classNamePlaceholder: 'e.g., Python Programming 101',
        descriptionOptional: 'Description (optional)',
        descriptionPlaceholder: 'Brief description of the class',
        createClass: 'Create Class',
        addStudentToClass: 'Add Student to Class',
        searchStudentByName: 'Search Student by Name',
        searchStudentPlaceholder: 'Type student name...',
        or: 'OR',
        createNewStudent: 'Create New Student',
        studentNamePlaceholder: 'Student name',
        createStudent: 'Create Student',
        studentPassword: 'Student Password',
        copyPassword: 'Copy Password',
        passwordHint: 'Give this password to the student. They will need to change it on first login.',
        classCreatedSuccess: 'Class created successfully! Class code:',
        errorPrefix: 'Error:',
        failedToCreateClass: 'Failed to create class',
        networkErrorRetry: 'Network error. Please try again.',
        failedToLoadClasses: 'Failed to load classes',
        networkError: 'Network error',
        noClassesYet: 'No classes yet. Create your first class to get started!',
        noDescription: 'No description',
        studentsSuffix: 'students',
        viewClass: 'View Class',
        deleteClass: 'Delete class',
        deleteClassConfirm: 'Delete class "{name}"? This cannot be undone.',
        failedToDeleteClass: 'Failed to delete class',
        loadingClassDetails: 'Loading class details...',
        failedToLoadStudents: 'Failed to load students',
        backToClasses: '← Back to Classes',
        classCodeLabel: 'Class Code:',
        copyClassCode: 'Copy class code',
        studentsHeader: 'Students',
        addStudent: '+ Add Student',
        studentName: 'Student Name',
        status: 'Status',
        actions: 'Actions',
        active: 'Active',
        pendingSetup: 'Pending Setup',
        removeFromClass: 'Remove from class',
        deleteStudent: 'Delete student account',
        deleteStudentConfirm: 'Permanently delete {name}? This removes the account from ALL classes and deletes all their projects. This cannot be undone.',
        failedToDeleteStudent: 'Failed to delete student',
        showCode: 'Show one-time code',
        clickToCopyCode: 'Click to copy code',
        initialCodeLabel: 'One-time code',
        codeCopied: 'Copied to clipboard!',
        noCodeAvailable: 'No code available; the student has already changed their password.',
        teachersHeader: 'Teachers',
        coTeacherEmailPlaceholder: 'Co-teacher email',
        addCoTeacher: 'Add co-teacher',
        loadingTeachers: 'Loading teachers...',
        failedToLoadTeachers: 'Failed to load teachers',
        you: 'you',
        ownerBadge: 'Owner',
        coTeacherBadge: 'Co-teacher',
        removeTeacher: 'Remove from class',
        removeTeacherConfirm: 'Remove {name} from this class?',
        enterCoTeacherEmail: 'Please enter a teacher email',
        failedToAddCoTeacher: 'Failed to add co-teacher',
        failedToRemoveTeacher: 'Failed to remove teacher',
        classCodeCopied: 'Class code copied!',
        removeStudentConfirm: 'Remove this student from the class?',
        noStudentsFound: 'No students found',
        enterStudentName: 'Please enter a student name',
        failedToCreateStudent: 'Failed to create student',
        passwordCopied: 'Password copied!',
        failedToAddStudent: 'Failed to add student',
        failedToRemoveStudent: 'Failed to remove student',
        notEnrolled: 'You are not enrolled in any classes yet.',
        teacher: 'Teacher:'
    },
    da: {
        myClasses: 'Mine klasser',
        createNewClass: '+ Opret ny klasse',
        addClass: '+ Tilføj klasse',
        createNewClassTitle: 'Opret ny klasse',
        loadingClasses: 'Indlæser klasser...',
        className: 'Klassenavn',
        classNamePlaceholder: 'f.eks. Python-programmering 101',
        descriptionOptional: 'Beskrivelse (valgfri)',
        descriptionPlaceholder: 'Kort beskrivelse af klassen',
        createClass: 'Opret klasse',
        addStudentToClass: 'Tilføj elev til klasse',
        searchStudentByName: 'Søg efter elev på navn',
        searchStudentPlaceholder: 'Skriv elevens navn...',
        or: 'ELLER',
        createNewStudent: 'Opret ny elev',
        studentNamePlaceholder: 'Elevnavn',
        createStudent: 'Opret elev',
        studentPassword: 'Elevadgangskode',
        copyPassword: 'Kopiér adgangskode',
        passwordHint: 'Giv denne adgangskode til eleven. Eleven skal ændre den ved første login.',
        classCreatedSuccess: 'Klassen blev oprettet! Klassekode:',
        errorPrefix: 'Fejl:',
        failedToCreateClass: 'Kunne ikke oprette klasse',
        networkErrorRetry: 'Netværksfejl. Prøv igen.',
        failedToLoadClasses: 'Kunne ikke indlæse klasser',
        networkError: 'Netværksfejl',
        noClassesYet: 'Ingen klasser endnu. Opret din første klasse for at komme i gang!',
        noDescription: 'Ingen beskrivelse',
        studentsSuffix: 'elever',
        viewClass: 'Vis klasse',
        deleteClass: 'Slet klasse',
        deleteClassConfirm: 'Slet klassen "{name}"? Dette kan ikke fortrydes.',
        failedToDeleteClass: 'Kunne ikke slette klassen',
        loadingClassDetails: 'Indlæser klassedetaljer...',
        failedToLoadStudents: 'Kunne ikke indlæse elever',
        backToClasses: '← Tilbage til klasser',
        classCodeLabel: 'Klassekode:',
        copyClassCode: 'Kopiér klassekode',
        studentsHeader: 'Elever',
        addStudent: '+ Tilføj elev',
        studentName: 'Elevnavn',
        status: 'Status',
        actions: 'Handlinger',
        active: 'Aktiv',
        pendingSetup: 'Afventer opsætning',
        removeFromClass: 'Fjern fra klasse',
        deleteStudent: 'Slet elevkonto',
        deleteStudentConfirm: 'Slet {name} permanent? Dette fjerner kontoen fra ALLE klasser og sletter alle deres projekter. Dette kan ikke fortrydes.',
        failedToDeleteStudent: 'Kunne ikke slette eleven',
        showCode: 'Vis engangskode',
        clickToCopyCode: 'Klik for at kopiere kode',
        initialCodeLabel: 'Engangskode',
        codeCopied: 'Kopieret til udklipsholder!',
        noCodeAvailable: 'Ingen kode tilgængelig; eleven har allerede ændret sin adgangskode.',
        teachersHeader: 'Lærere',
        coTeacherEmailPlaceholder: 'Medlærers e-mail',
        addCoTeacher: 'Tilføj medlærer',
        loadingTeachers: 'Indlæser lærere...',
        failedToLoadTeachers: 'Kunne ikke indlæse lærere',
        you: 'dig',
        ownerBadge: 'Ejer',
        coTeacherBadge: 'Medlærer',
        removeTeacher: 'Fjern fra klasse',
        removeTeacherConfirm: 'Fjern {name} fra denne klasse?',
        enterCoTeacherEmail: 'Indtast venligst en lærers e-mail',
        failedToAddCoTeacher: 'Kunne ikke tilføje medlærer',
        failedToRemoveTeacher: 'Kunne ikke fjerne lærer',
        classCodeCopied: 'Klassekode kopieret!',
        removeStudentConfirm: 'Fjern denne elev fra klassen?',
        noStudentsFound: 'Ingen elever fundet',
        enterStudentName: 'Indtast venligst et elevnavn',
        failedToCreateStudent: 'Kunne ikke oprette elev',
        passwordCopied: 'Adgangskode kopieret!',
        failedToAddStudent: 'Kunne ikke tilføje elev',
        failedToRemoveStudent: 'Kunne ikke fjerne elev',
        notEnrolled: 'Du er ikke tilmeldt nogen klasser endnu.',
        teacher: 'Lærer:'
    },
    de: {
        myClasses: 'Meine Klassen',
        createNewClass: '+ Neue Klasse erstellen',
        addClass: '+ Klasse hinzufügen',
        createNewClassTitle: 'Neue Klasse erstellen',
        loadingClasses: 'Klassen werden geladen...',
        className: 'Klassenname',
        classNamePlaceholder: 'z. B. Python-Programmierung 101',
        descriptionOptional: 'Beschreibung (optional)',
        descriptionPlaceholder: 'Kurze Beschreibung der Klasse',
        createClass: 'Klasse erstellen',
        addStudentToClass: 'Schüler zur Klasse hinzufügen',
        searchStudentByName: 'Schüler nach Namen suchen',
        searchStudentPlaceholder: 'Namen des Schülers eingeben...',
        or: 'ODER',
        createNewStudent: 'Neuen Schüler anlegen',
        studentNamePlaceholder: 'Name des Schülers',
        createStudent: 'Schüler anlegen',
        studentPassword: 'Schülerpasswort',
        copyPassword: 'Passwort kopieren',
        passwordHint: 'Geben Sie dieses Passwort an den Schüler weiter. Es muss bei der ersten Anmeldung geändert werden.',
        classCreatedSuccess: 'Klasse erfolgreich erstellt! Klassencode:',
        errorPrefix: 'Fehler:',
        failedToCreateClass: 'Klasse konnte nicht erstellt werden',
        networkErrorRetry: 'Netzwerkfehler. Bitte versuchen Sie es erneut.',
        failedToLoadClasses: 'Klassen konnten nicht geladen werden',
        networkError: 'Netzwerkfehler',
        noClassesYet: 'Noch keine Klassen. Erstellen Sie Ihre erste Klasse, um loszulegen!',
        noDescription: 'Keine Beschreibung',
        studentsSuffix: 'Schüler',
        viewClass: 'Klasse anzeigen',
        deleteClass: 'Klasse löschen',
        deleteClassConfirm: 'Klasse "{name}" löschen? Dies kann nicht rückgängig gemacht werden.',
        failedToDeleteClass: 'Klasse konnte nicht gelöscht werden',
        loadingClassDetails: 'Klassendetails werden geladen...',
        failedToLoadStudents: 'Schüler konnten nicht geladen werden',
        backToClasses: '← Zurück zu den Klassen',
        classCodeLabel: 'Klassencode:',
        copyClassCode: 'Klassencode kopieren',
        studentsHeader: 'Schüler',
        addStudent: '+ Schüler hinzufügen',
        studentName: 'Name des Schülers',
        status: 'Status',
        actions: 'Aktionen',
        active: 'Aktiv',
        pendingSetup: 'Einrichtung ausstehend',
        removeFromClass: 'Aus Klasse entfernen',
        deleteStudent: 'Schülerkonto löschen',
        deleteStudentConfirm: '{name} dauerhaft löschen? Dies entfernt das Konto aus ALLEN Klassen und löscht alle Projekte. Dies kann nicht rückgängig gemacht werden.',
        failedToDeleteStudent: 'Schüler konnte nicht gelöscht werden',
        showCode: 'Einmalcode anzeigen',
        clickToCopyCode: 'Zum Kopieren klicken',
        initialCodeLabel: 'Einmalcode',
        codeCopied: 'In die Zwischenablage kopiert!',
        noCodeAvailable: 'Kein Code verfügbar; der Schüler hat sein Passwort bereits geändert.',
        teachersHeader: 'Lehrkräfte',
        coTeacherEmailPlaceholder: 'E-Mail der Mitlehrkraft',
        addCoTeacher: 'Mitlehrkraft hinzufügen',
        loadingTeachers: 'Lehrkräfte werden geladen...',
        failedToLoadTeachers: 'Lehrkräfte konnten nicht geladen werden',
        you: 'Sie',
        ownerBadge: 'Eigentümer',
        coTeacherBadge: 'Mitlehrkraft',
        removeTeacher: 'Aus Klasse entfernen',
        removeTeacherConfirm: '{name} aus dieser Klasse entfernen?',
        enterCoTeacherEmail: 'Bitte eine Lehrer-E-Mail eingeben',
        failedToAddCoTeacher: 'Mitlehrkraft konnte nicht hinzugefügt werden',
        failedToRemoveTeacher: 'Lehrkraft konnte nicht entfernt werden',
        classCodeCopied: 'Klassencode kopiert!',
        removeStudentConfirm: 'Diesen Schüler aus der Klasse entfernen?',
        noStudentsFound: 'Keine Schüler gefunden',
        enterStudentName: 'Bitte geben Sie einen Schülernamen ein',
        failedToCreateStudent: 'Schüler konnte nicht angelegt werden',
        passwordCopied: 'Passwort kopiert!',
        failedToAddStudent: 'Schüler konnte nicht hinzugefügt werden',
        failedToRemoveStudent: 'Schüler konnte nicht entfernt werden',
        notEnrolled: 'Sie sind noch in keiner Klasse eingeschrieben.',
        teacher: 'Lehrer:'
    }
};

function t(key) {
    var l = (window.bipes && bipes.lang) || 'en';
    var d = CLASSES_I18N[l] || CLASSES_I18N.en;
    return (d && d[key] != null) ? d[key] : (CLASSES_I18N.en[key] != null ? CLASSES_I18N.en[key] : key);
}

// Escape server-supplied strings (class/student names, descriptions) before they are
// interpolated into innerHTML. Without this, a class or student named e.g.
// `<img src=x onerror=...>` executes script in the teacher's session (stored XSS).
function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
}

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
                    <h1>${t('myClasses')}</h1>
                    <button class="btn btn-primary" id="create-class-btn">
                        <span>${t('createNewClass')}</span>
                    </button>
                </div>

                <div id="classes-list" class="classes-list">
                    <div class="loading">${t('loadingClasses')}</div>
                </div>

                <div id="class-detail" class="class-detail" style="display: none;">
                    <!-- Class detail will be rendered here -->
                </div>
            </div>

            <!-- Create Class Modal -->
            <div id="create-class-modal" class="modal" style="display: none;">
                <div class="modal-content">
                    <h2>${t('createNewClassTitle')}</h2>
                    <form id="create-class-form">
                        <div class="form-group">
                            <label for="class-name">${t('className')}</label>
                            <input type="text" id="class-name" required placeholder="${t('classNamePlaceholder')}">
                        </div>
                        <div class="form-group">
                            <label for="class-description">${t('descriptionOptional')}</label>
                            <textarea id="class-description" rows="3" placeholder="${t('descriptionPlaceholder')}"></textarea>
                        </div>
                        <button type="submit" class="btn btn-primary">${t('createClass')}</button>
                    </form>
                </div>
            </div>

            <!-- Add Student Modal -->
            <div id="add-student-modal" class="modal" style="display: none;">
                <div class="modal-content">
                    <h2>${t('addStudentToClass')}</h2>
                    <div class="form-group">
                        <label for="student-search">${t('searchStudentByName')}</label>
                        <input type="text" id="student-search" placeholder="${t('searchStudentPlaceholder')}">
                        <div id="student-search-results" class="search-results"></div>
                    </div>
                    <div class="or-divider">${t('or')}</div>
                    <div class="form-group">
                        <label for="new-student-name">${t('createNewStudent')}</label>
                        <input type="text" id="new-student-name" placeholder="${t('studentNamePlaceholder')}">
                        <button id="create-student-btn" class="btn btn-secondary">${t('createStudent')}</button>
                    </div>
                    <div id="student-password-display" style="display: none;" class="password-display">
                        <div class="password-label">${t('studentPassword')}</div>
                        <div class="password-value" id="generated-password"></div>
                        <button class="copy-btn" id="copy-password-btn">${t('copyPassword')}</button>
                        <p style="margin-top: 10px; font-size: 0.9rem; color: #666;">
                            ${t('passwordHint')}
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

        // Close modals by clicking outside the content — the system's close pattern
        // (no × button). Clicking the dimmed backdrop (the .modal itself) dismisses it;
        // clicks inside .modal-content don't reach this handler.
        this.$.container.$.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal)
                    modal.style.display = 'none';
            });
        });

        // Load classes
        this.loadClasses();
    }

    showCreateClassModal() {
        this.$.createClassModal.style.display = 'flex';
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
                alert(`${t('classCreatedSuccess')} ${data.class_code}`);
            } else {
                alert(t('errorPrefix') + ' ' + (data.error || t('failedToCreateClass')));
            }
        } catch (error) {
            alert(t('networkErrorRetry'));
        }
    }

    async loadClasses() {
        const container = this.$.container.$.querySelector('#classes-list');
        container.innerHTML = `<div class="loading">${t('loadingClasses')}</div>`;

        try {
            const response = await fetch('/api/classes/my-classes', {
                credentials: 'include'
            });

            const data = await response.json();

            if (response.ok) {
                this.classes = data.classes;
                this.renderClassesList();
            } else {
                container.innerHTML = `<div class="error">${t('failedToLoadClasses')}</div>`;
            }
        } catch (error) {
            container.innerHTML = `<div class="error">${t('networkError')}</div>`;
        }
    }

    renderClassesList() {
        const container = this.$.container.$.querySelector('#classes-list');

        if (this.classes.length === 0) {
            this.$.createClassBtn.style.display = 'none';
            container.innerHTML = `
                <button class="add-class-ghost" type="button">${t('addClass')}</button>
            `;
            container.querySelector('.add-class-ghost').addEventListener('click', () => this.showCreateClassModal());
            return;
        }

        this.$.createClassBtn.style.display = '';
        container.innerHTML = this.classes.map(cls => `
            <div class="class-card" data-class-id="${cls.class_id}">
                <div class="class-card-header">
                    <h3>${esc(cls.class_name)}</h3>
                    <span class="class-code">${esc(cls.class_code)}</span>
                </div>
                <div class="class-card-body">
                    <p>${esc(cls.description || t('noDescription'))}</p>
                    <div class="class-stats">
                        <span class="class-stat"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="7" r="2.5"/><path d="M2.5 16c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5"/><path d="M13 5.2a2.5 2.5 0 0 1 0 4.6M14.5 16c0-1.8-.7-3.4-1.9-4.3"/></svg> ${cls.student_count} ${t('studentsSuffix')}</span>
                    </div>
                </div>
                <div class="class-card-footer">
                    <button class="btn btn-secondary view-class-btn" data-class-id="${cls.class_id}">
                        ${t('viewClass')}
                    </button>
                    <button class="btn-icon delete-class-btn" data-class-id="${cls.class_id}" data-class-name="${esc(cls.class_name)}" title="${t('deleteClass')}">
                        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 5.5h13M8 5.5V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M6 5.5l.7 10a1 1 0 0 0 1 .9h4.6a1 1 0 0 0 1-.9l.7-10"/></svg>
                    </button>
                </div>
            </div>
        `).join('');

        // Attach click handlers
        container.querySelectorAll('.view-class-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const classId = parseInt(e.currentTarget.dataset.classId);
                this.showClassDetail(classId);
            });
        });

        container.querySelectorAll('.delete-class-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const classId = parseInt(e.currentTarget.dataset.classId);
                const name = e.currentTarget.dataset.className;
                if (confirm(t('deleteClassConfirm').replace('{name}', name))) {
                    this.deleteClass(classId);
                }
            });
        });
    }

    async deleteClass(classId) {
        try {
            const response = await fetch(`/api/classes/${classId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const data = await response.json().catch(() => ({}));
            if (response.ok) {
                // Hide the detail view in case the deleted class was open, then refresh.
                const detail = this.$.container.$.querySelector('#class-detail');
                if (detail) detail.style.display = 'none';
                this.loadClasses();
            } else {
                alert(data.error || t('failedToDeleteClass'));
            }
        } catch (error) {
            alert(t('networkError'));
        }
    }

    async showClassDetail(classId) {
        this.currentClass = this.classes.find(c => c.class_id === classId);

        const container = this.$.container.$.querySelector('#class-detail');
        container.style.display = 'block';
        container.innerHTML = `<div class="loading">${t('loadingClassDetails')}</div>`;

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
            container.innerHTML = `<div class="error">${t('failedToLoadStudents')}</div>`;
        }
    }

    renderClassDetail(students) {
        const container = this.$.container.$.querySelector('#class-detail');

        container.innerHTML = `
            <div class="class-detail-header">
                <button class="btn btn-secondary back-btn" id="back-to-list">
                    ${t('backToClasses')}
                </button>
                <h2>${esc(this.currentClass.class_name)}</h2>
                <div class="class-code-display">
                    ${t('classCodeLabel')} <strong>${esc(this.currentClass.class_code)}</strong>
                    <button class="btn-icon" id="copy-class-code" title="${t('copyClassCode')}"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="7" width="9" height="10" rx="1.5"/><path d="M4 13H3.5A1.5 1.5 0 0 1 2 11.5v-7A1.5 1.5 0 0 1 3.5 3h7A1.5 1.5 0 0 1 12 4.5V5"/></svg></button>
                </div>
                <button class="btn btn-danger" id="delete-class-btn">${t('deleteClass')}</button>
            </div>

            <div class="tab-content active" id="students-tab">
                <div class="students-header">
                    <h3>${t('studentsHeader')} (${students.length})</h3>
                    <button class="btn btn-primary" id="add-student-btn">${t('addStudent')}</button>
                </div>

                <table class="students-table">
                    <thead>
                        <tr>
                            <th>${t('studentName')}</th>
                            <th>${t('status')}</th>
                            <th>${t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${students.map(student => `
                            <tr>
                                <td>${esc(student.student_name)}</td>
                                <td>
                                    ${student.password_changed ?
                                        `<span class="badge badge-success">${t('active')}</span>` :
                                        `<span class="badge badge-warning">${t('pendingSetup')}</span>`}
                                    ${(!student.password_changed && student.initial_password) ?
                                        `<span class="initial-code" data-code="${esc(student.initial_password)}" title="${t('clickToCopyCode')}">${esc(student.initial_password)}</span>` : ''}
                                </td>
                                <td>
                                    <button class="btn-icon remove-student-btn" data-student-id="${student.student_id}" title="${t('removeFromClass')}">
                                        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 5.5h13M8 5.5V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M6 5.5l.7 10a1 1 0 0 0 1 .9h4.6a1 1 0 0 0 1-.9l.7-10"/></svg>
                                    </button>
                                    <button class="btn-icon delete-student-btn" data-student-id="${student.student_id}" data-student-name="${esc(student.student_name)}" title="${t('deleteStudent')}">
                                        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="6.5" r="3"/><path d="M2.5 16.5c0-3 2.5-5 5.5-5 1 0 1.9.2 2.7.6"/><path d="M13 12.5l4 4M17 12.5l-4 4"/></svg>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div class="tab-content active" id="teachers-tab">
                <div class="students-header">
                    <h3>${t('teachersHeader')}</h3>
                    <div class="add-co-teacher">
                        <input type="email" id="co-teacher-email" placeholder="${t('coTeacherEmailPlaceholder')}" />
                        <button class="btn btn-primary" id="add-co-teacher-btn">${t('addCoTeacher')}</button>
                    </div>
                </div>
                <div id="teachers-list"><div class="loading">${t('loadingTeachers')}</div></div>
            </div>

        `;

        // Event listeners
        container.querySelector('#back-to-list').addEventListener('click', () => {
            container.style.display = 'none';
        });

        container.querySelector('#copy-class-code').addEventListener('click', () => {
            navigator.clipboard.writeText(this.currentClass.class_code);
            alert(t('classCodeCopied'));
        });

        container.querySelector('#delete-class-btn').addEventListener('click', () => {
            if (confirm(t('deleteClassConfirm').replace('{name}', this.currentClass.class_name))) {
                this.deleteClass(this.currentClass.class_id);
            }
        });

        container.querySelector('#add-student-btn').addEventListener('click', () => {
            this.showAddStudentModal();
        });

        // Remove student buttons (unenroll from this class only)
        container.querySelectorAll('.remove-student-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const studentId = e.currentTarget.dataset.studentId;
                if (confirm(t('removeStudentConfirm'))) {
                    await this.removeStudent(studentId);
                }
            });
        });

        // Delete student buttons (permanently delete the account + all their data)
        container.querySelectorAll('.delete-student-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const studentId = e.currentTarget.dataset.studentId;
                const name = e.currentTarget.dataset.studentName;
                if (confirm(t('deleteStudentConfirm').replace('{name}', name))) {
                    await this.deleteStudentAccount(studentId);
                }
            });
        });

        // One-time code shown inline for students who haven't finished setup; click to copy.
        container.querySelectorAll('.initial-code').forEach(el => {
            el.addEventListener('click', async (e) => {
                const code = e.currentTarget.dataset.code;
                try { await navigator.clipboard.writeText(code); } catch (err) {}
                alert(`${t('initialCodeLabel')}: ${code}\n\n${t('codeCopied')}`);
            });
        });

        // Co-teachers
        const addCoTeacherBtn = container.querySelector('#add-co-teacher-btn');
        const coTeacherEmail = container.querySelector('#co-teacher-email');
        addCoTeacherBtn.addEventListener('click', () => this.addCoTeacher());
        coTeacherEmail.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); this.addCoTeacher(); }
        });
        this.loadClassTeachers();
    }

    async loadClassTeachers() {
        const list = this.$.container.$.querySelector('#teachers-list');
        if (!list) return;
        try {
            const response = await fetch(`/api/classes/${this.currentClass.class_id}/teachers`, {
                credentials: 'include'
            });
            const data = await response.json();
            if (response.ok) {
                this.renderClassTeachers(data.teachers);
            } else {
                list.innerHTML = `<div class="error">${data.error || t('failedToLoadTeachers')}</div>`;
            }
        } catch (error) {
            list.innerHTML = `<div class="error">${t('failedToLoadTeachers')}</div>`;
        }
    }

    renderClassTeachers(teachers) {
        const list = this.$.container.$.querySelector('#teachers-list');
        if (!list) return;

        list.innerHTML = `
            <table class="students-table">
                <tbody>
                    ${teachers.map(teacher => `
                        <tr>
                            <td>${esc(teacher.full_name)}${teacher.is_self ? ` (${t('you')})` : ''}</td>
                            <td>${esc(teacher.email)}</td>
                            <td>
                                ${teacher.is_owner
                                    ? `<span class="badge badge-success">${t('ownerBadge')}</span>`
                                    : `<span class="badge badge-warning">${t('coTeacherBadge')}</span>`}
                            </td>
                            <td>
                                ${teachers.length > 1 ?
                                    `<button class="btn-icon remove-teacher-btn" data-teacher-id="${teacher.teacher_id}" data-teacher-name="${esc(teacher.full_name)}" title="${t('removeTeacher')}">
                                        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 5.5h13M8 5.5V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M6 5.5l.7 10a1 1 0 0 0 1 .9h4.6a1 1 0 0 0 1-.9l.7-10"/></svg>
                                    </button>` : ''}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        list.querySelectorAll('.remove-teacher-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const teacherId = e.currentTarget.dataset.teacherId;
                const name = e.currentTarget.dataset.teacherName;
                if (confirm(t('removeTeacherConfirm').replace('{name}', name))) {
                    await this.removeCoTeacher(teacherId);
                }
            });
        });
    }

    async addCoTeacher() {
        const input = this.$.container.$.querySelector('#co-teacher-email');
        const email = (input.value || '').trim();
        if (!email) { alert(t('enterCoTeacherEmail')); return; }
        try {
            const response = await fetch(`/api/classes/${this.currentClass.class_id}/teachers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            if (response.ok) {
                input.value = '';
                this.loadClassTeachers();
            } else {
                alert(data.error || t('failedToAddCoTeacher'));
            }
        } catch (error) {
            alert(t('networkError'));
        }
    }

    async removeCoTeacher(teacherId) {
        try {
            const response = await fetch(`/api/classes/${this.currentClass.class_id}/teachers/${teacherId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const data = await response.json().catch(() => ({}));
            if (response.ok) {
                // If a teacher removed themselves, they no longer have access — go back to the list.
                this.loadClasses();
                this.loadClassTeachers();
            } else {
                alert(data.error || t('failedToRemoveTeacher'));
            }
        } catch (error) {
            alert(t('networkError'));
        }
    }

    async showStudentCode(studentId) {
        try {
            const response = await fetch(`/api/classes/${this.currentClass.class_id}/students/${studentId}/code`, {
                credentials: 'include'
            });
            const data = await response.json();

            if (response.ok) {
                try { await navigator.clipboard.writeText(data.initial_password); } catch (e) {}
                alert(`${t('initialCodeLabel')}: ${data.initial_password}\n\n${t('codeCopied')}`);
            } else {
                alert(data.error || t('noCodeAvailable'));
                // The code may have just been used; refresh so the button disappears.
                this.showClassDetail(this.currentClass.class_id);
            }
        } catch (error) {
            alert(t('networkError'));
        }
    }

    showAddStudentModal() {
        this.$.addStudentModal.style.display = 'flex';   // flex => centered (see .modal CSS)

        // The modal lives in the persistent teacher-view DOM, so attaching listeners here
        // every time it opens would stack duplicates — one click would then fire createStudent
        // multiple times (created several identical students). Strip prior listeners by
        // replacing the interactive nodes with clones before wiring fresh ones.
        let searchInput = this.$.container.$.querySelector('#student-search');
        searchInput.replaceWith(searchInput.cloneNode(true));
        searchInput = this.$.container.$.querySelector('#student-search');

        let createBtn = this.$.container.$.querySelector('#create-student-btn');
        createBtn.replaceWith(createBtn.cloneNode(true));
        createBtn = this.$.container.$.querySelector('#create-student-btn');

        const searchResults = this.$.container.$.querySelector('#student-search-results');
        const newStudentName = this.$.container.$.querySelector('#new-student-name');

        // Reset the modal to a clean state on each open.
        searchInput.value = '';
        searchResults.innerHTML = '';
        newStudentName.value = '';
        const pwDisplay = this.$.container.$.querySelector('#student-password-display');
        if (pwDisplay) pwDisplay.style.display = 'none';

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
                            ${esc(student.student_name)}
                        </div>
                    `).join('');

                    searchResults.querySelectorAll('.search-result-item').forEach(item => {
                        item.addEventListener('click', async () => {
                            await this.addExistingStudent(parseInt(item.dataset.studentId));
                        });
                    });
                } else {
                    searchResults.innerHTML = `<div class="no-results">${t('noStudentsFound')}</div>`;
                }
            } catch (error) {
                console.error('Search failed:', error);
            }
        });

        // Create new student
        createBtn.addEventListener('click', async () => {
            const name = newStudentName.value.trim();
            if (!name) {
                alert(t('enterStudentName'));
                return;
            }

            await this.createStudent(name, createBtn);
        });
    }

    async createStudent(name, createBtn) {
        // Guard against a rapid double-click submitting twice before the request returns.
        if (this._creatingStudent) return;
        this._creatingStudent = true;
        if (createBtn) createBtn.disabled = true;
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
                    alert(t('passwordCopied'));
                });

                // Refresh student list after 3 seconds
                setTimeout(() => {
                    this.$.addStudentModal.style.display = 'none';
                    this.showClassDetail(this.currentClass.class_id);
                }, 3000);
            } else {
                alert(t('errorPrefix') + ' ' + (data.error || t('failedToCreateStudent')));
            }
        } catch (error) {
            alert(t('networkError'));
        } finally {
            this._creatingStudent = false;
            if (createBtn) createBtn.disabled = false;
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
                alert(t('errorPrefix') + ' ' + (data.error || t('failedToAddStudent')));
            }
        } catch (error) {
            alert(t('networkError'));
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
                alert(t('failedToRemoveStudent'));
            }
        } catch (error) {
            alert(t('networkError'));
        }
    }

    async deleteStudentAccount(studentId) {
        try {
            const response = await fetch(`/api/classes/${this.currentClass.class_id}/students/${studentId}/account`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const data = await response.json().catch(() => ({}));
            if (response.ok) {
                this.showClassDetail(this.currentClass.class_id);
            } else {
                alert(data.error || t('failedToDeleteStudent'));
            }
        } catch (error) {
            alert(t('networkError'));
        }
    }

    // =========================================================================
    // STUDENT VIEW
    // =========================================================================

    renderStudentView() {
        this.$.container.$.innerHTML = `
            <div class="classes-container">
                <div class="classes-header">
                    <h1>${t('myClasses')}</h1>
                </div>

                <div id="student-classes-list" class="classes-list">
                    <div class="loading">${t('loadingClasses')}</div>
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
                    container.innerHTML = `<div class="empty-state">${t('notEnrolled')}</div>`;
                } else {
                    container.innerHTML = data.classes.map(cls => `
                        <div class="class-card">
                            <div class="class-card-header">
                                <h3>${esc(cls.class_name)}</h3>
                                <span class="class-code">${esc(cls.class_code)}</span>
                            </div>
                            <div class="class-card-body">
                                <p><strong>${t('teacher')}</strong> ${esc(cls.teacher_name)}</p>
                            </div>
                        </div>
                    `).join('');
                }
            }
        } catch (error) {
            container.innerHTML = `<div class="error">${t('failedToLoadClasses')}</div>`;
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
