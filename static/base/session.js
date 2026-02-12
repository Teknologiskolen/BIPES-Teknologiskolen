/**
 * Session Management Module
 * Handles user authentication state and session management
 */

class SessionManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.userRole = null; // 'teacher', 'student', or null
        this.checkInterval = null;
    }

    /**
     * Initialize session management
     * Call this on page load
     */
    async init() {
        // Skip session management in guest mode (no user-info element means no auth)
        if (!document.getElementById('user-info')) {
            this.clearSession();
            return;
        }
        await this.checkSession();
        // Check session every 5 minutes
        this.checkInterval = setInterval(() => this.checkSession(), 5 * 60 * 1000);
    }

    /**
     * Check current session status
     * @returns {Promise<Object|null>} User object or null
     */
    async checkSession() {
        try {
            const response = await fetch('/api/auth/me', {
                method: 'GET',
                credentials: 'include'
            });

            if (response.ok) {
                this.currentUser = await response.json();
                this.isAuthenticated = true;
                this.userRole = this.currentUser.user_type;
                this.onSessionChange();
                return this.currentUser;
            } else {
                this.clearSession();
                return null;
            }
        } catch (error) {
            console.error('Session check failed:', error);
            this.clearSession();
            return null;
        }
    }

    /**
     * Get current user
     * @returns {Object|null}
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    isLoggedIn() {
        return this.isAuthenticated;
    }

    /**
     * Get user role
     * @returns {string|null} 'teacher', 'student', or null
     */
    getRole() {
        return this.userRole;
    }

    /**
     * Check if current user is a teacher
     * @returns {boolean}
     */
    isTeacher() {
        return this.userRole === 'teacher';
    }

    /**
     * Check if current user is a student
     * @returns {boolean}
     */
    isStudent() {
        return this.userRole === 'student';
    }

    /**
     * Logout current user
     */
    async logout() {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            this.clearSession();
            window.location.href = '/';
        }
    }

    /**
     * Clear local session data
     */
    clearSession() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.userRole = null;
        this.onSessionChange();
    }

    /**
     * Called when session changes
     * Override this method or listen to custom events
     */
    onSessionChange() {
        // Dispatch custom event for other modules to listen
        window.dispatchEvent(new CustomEvent('sessionchange', {
            detail: {
                isAuthenticated: this.isAuthenticated,
                user: this.currentUser,
                role: this.userRole
            }
        }));
    }

    /**
     * Cleanup on page unload
     */
    destroy() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
    }
}

// Export singleton instance
export const session = new SessionManager();

// Auto-initialize on module load
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        session.init();
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        session.destroy();
    });
}
