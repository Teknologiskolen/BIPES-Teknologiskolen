// Login page JavaScript

// Determine login type from URL
const urlParams = new URLSearchParams(window.location.search);
const loginType = window.location.pathname.includes('teacher') ? 'teacher' : 'student';
const authText = window.authText || {};

function t(key, fallback) {
    return authText[key] || fallback;
}

// Show appropriate login form
document.addEventListener('DOMContentLoaded', () => {
    if (loginType === 'teacher') {
        document.getElementById('login-title').textContent = t('teacher_login', 'Teacher Login');
        document.getElementById('login-subtitle').textContent = t('teacher_subtitle', 'Manage classes and shared projects');
        document.getElementById('teacher-login').style.display = 'block';
        setupTeacherLogin();
    } else {
        document.getElementById('login-title').textContent = t('student_login', 'Student Login');
        document.getElementById('login-subtitle').textContent = t('student_subtitle', 'Sign in with your class code, username, and password');
        document.getElementById('student-login').style.display = 'block';
        setupStudentLogin();
    }
});

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
                credentials: 'include',
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                showAlert(t('login_success', 'Login successful! Redirecting...'), 'success');
                setTimeout(() => {
                    window.location.href = window.authPreferences ? window.authPreferences.idePath() : '/ide';
                }, 1000);
            } else {
                showAlert(data.error || t('login_failed', 'Login failed'), 'error');
            }
        } catch (error) {
            showAlert(t('network_error', 'Network error. Please try again.'), 'error');
        } finally {
            setLoading(form, false);
        }
    });
}

// Student Login
function setupStudentLogin() {
    const classForm = document.getElementById('student-class-form');

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
                credentials: 'include',
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
                    showAlert(t('setup_welcome', 'Welcome! Please set up your account...'), 'success');
                    setTimeout(() => {
                        window.location.href = window.authPreferences ? window.authPreferences.path('/setup') : '/setup';
                    }, 1000);
                } else {
                    // Regular login
                    showAlert(t('login_success', 'Login successful! Redirecting...'), 'success');
                    setTimeout(() => {
                        window.location.href = window.authPreferences ? window.authPreferences.idePath() : '/ide';
                    }, 1000);
                }
            } else {
                showAlert(data.error || t('login_failed', 'Login failed'), 'error');
            }
        } catch (error) {
            showAlert(t('network_error', 'Network error. Please try again.'), 'error');
        } finally {
            setLoading(classForm, false);
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
        buttonText.innerHTML = '<span class="spinner"></span> ' + t('loading', 'Loading...');
    } else {
        button.disabled = false;
        buttonText.textContent = button.closest('form').id.includes('teacher') ? t('login_as_teacher', 'Login as Teacher') : t('login', 'Login');
    }
}
