// Student First-Time Setup JavaScript
const authText = window.authText || {};

function t(key, fallback) {
    return authText[key] || fallback;
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('setup-form');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const strengthIndicator = document.getElementById('password-strength');

    // Password strength indicator
    newPasswordInput.addEventListener('input', () => {
        const password = newPasswordInput.value;
        const strength = calculatePasswordStrength(password);

        strengthIndicator.className = 'password-strength';
        if (password.length > 0) {
            if (strength < 3) {
                strengthIndicator.classList.add('weak');
            } else if (strength < 5) {
                strengthIndicator.classList.add('medium');
            } else {
                strengthIndicator.classList.add('strong');
            }
        }
    });

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        // Validation
        if (newPassword !== confirmPassword) {
            showAlert(t('passwords_no_match', 'Passwords do not match'), 'error');
            return;
        }

        if (newPassword.length < 8) {
            showAlert(t('new_password_min', 'New password must be at least 8 characters'), 'error');
            return;
        }

        setLoading(true);
        clearAlert();

        try {
            // Change password
            const passwordResponse = await fetch('/api/auth/student/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword
                })
            });

            const passwordData = await passwordResponse.json();

            if (!passwordResponse.ok) {
                showAlert(passwordData.error || t('password_change_failed', 'Failed to change password'), 'error');
                setLoading(false);
                return;
            }

            // Success
            showAlert(t('setup_complete', 'Account setup complete! Redirecting to IDE...'), 'success');
            setTimeout(() => {
                window.location.href = window.authPreferences ? window.authPreferences.idePath() : '/ide';
            }, 1500);

        } catch (error) {
            showAlert(t('network_error', 'Network error. Please try again.'), 'error');
        } finally {
            setLoading(false);
        }
    });
});

// Calculate password strength
function calculatePasswordStrength(password) {
    let strength = 0;

    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    return strength;
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
function setLoading(isLoading) {
    const button = document.querySelector('button[type="submit"]');
    const buttonText = button.querySelector('.btn-text');

    if (isLoading) {
        button.disabled = true;
        buttonText.innerHTML = '<span class="spinner"></span> ' + t('setting_up', 'Setting up...');
    } else {
        button.disabled = false;
        buttonText.textContent = t('complete_setup', 'Complete Setup');
    }
}
