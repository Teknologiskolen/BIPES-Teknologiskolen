// Login page JavaScript

// Determine login type from URL
const urlParams = new URLSearchParams(window.location.search);
const loginType = window.location.pathname.includes('teacher') ? 'teacher' : 'student';

// Show appropriate login form
document.addEventListener('DOMContentLoaded', () => {
    if (loginType === 'teacher') {
        document.getElementById('login-title').textContent = 'Teacher Login';
        document.getElementById('login-subtitle').textContent = 'Manage your classes and students';
        document.getElementById('teacher-login').style.display = 'block';
        setupTeacherLogin();
    } else {
        document.getElementById('login-title').textContent = 'Student Login';
        document.getElementById('login-subtitle').textContent = 'Access your projects';
        document.getElementById('student-login').style.display = 'block';
        setupStudentLogin();
        setupTabs();
    }
});

// Tab switching for student login
function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');

            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// Teacher Login
function setupTeacherLogin() {
    const form = document.getElementById('teacher-login-form');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('teacher-email').value;
        const password = document.getElementById('teacher-password').value;

        setLoading(form, true);
        clearAlert();

        try {
            const response = await fetch('/api/auth/teacher/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                showAlert('Login successful! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = '/ide';
                }, 1000);
            } else {
                showAlert(data.error || 'Login failed', 'error');
            }
        } catch (error) {
            showAlert('Network error. Please try again.', 'error');
        } finally {
            setLoading(form, false);
        }
    });
}

// Student Login
function setupStudentLogin() {
    const classForm = document.getElementById('student-class-form');
    const emailForm = document.getElementById('student-email-form');

    // Class code login
    classForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const classCode = document.getElementById('class-code').value.toUpperCase();
        const studentName = document.getElementById('student-name').value;
        const password = document.getElementById('student-password-class').value;

        setLoading(classForm, true);
        clearAlert();

        try {
            const response = await fetch('/api/auth/student/login/class', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    class_code: classCode,
                    student_name: studentName,
                    password: password
                })
            });

            const data = await response.json();

            if (response.ok) {
                if (!data.password_changed) {
                    // First time login - redirect to setup page
                    showAlert('Welcome! Please set up your account...', 'success');
                    setTimeout(() => {
                        window.location.href = '/setup';
                    }, 1000);
                } else {
                    // Regular login
                    showAlert('Login successful! Redirecting...', 'success');
                    setTimeout(() => {
                        window.location.href = '/ide';
                    }, 1000);
                }
            } else {
                showAlert(data.error || 'Login failed', 'error');
            }
        } catch (error) {
            showAlert('Network error. Please try again.', 'error');
        } finally {
            setLoading(classForm, false);
        }
    });

    // Email login
    emailForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('student-email').value;
        const password = document.getElementById('student-password-email').value;

        setLoading(emailForm, true);
        clearAlert();

        try {
            const response = await fetch('/api/auth/student/login/email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                if (!data.password_changed) {
                    // First time login - redirect to setup page
                    showAlert('Welcome! Please set up your account...', 'success');
                    setTimeout(() => {
                        window.location.href = '/setup';
                    }, 1000);
                } else {
                    // Regular login
                    showAlert('Login successful! Redirecting...', 'success');
                    setTimeout(() => {
                        window.location.href = '/ide';
                    }, 1000);
                }
            } else {
                showAlert(data.error || 'Login failed', 'error');
            }
        } catch (error) {
            showAlert('Network error. Please try again.', 'error');
        } finally {
            setLoading(emailForm, false);
        }
    });

    // Auto-uppercase class code
    document.getElementById('class-code').addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });
}

// Alert functions
function showAlert(message, type) {
    const container = document.getElementById('alert-container');
    container.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
}

function clearAlert() {
    const container = document.getElementById('alert-container');
    container.innerHTML = '';
}

// Loading state
function setLoading(form, isLoading) {
    const button = form.querySelector('button[type="submit"]');
    const buttonText = button.querySelector('.btn-text');

    if (isLoading) {
        button.disabled = true;
        buttonText.innerHTML = '<span class="spinner"></span> Loading...';
    } else {
        button.disabled = false;
        buttonText.textContent = button.closest('form').id.includes('teacher') ? 'Login as Teacher' : 'Login';
    }
}
