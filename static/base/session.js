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

        // Renew the session only while the user is actively working. Real input
        // events (editing blocks, clicking, typing) mark activity; passively watching
        // MQTT telemetry produces no input, so the session is allowed to lapse — the
        // intended behaviour. Capture phase so Blockly can't swallow the events first.
        this._lastActivity = Date.now();
        this._activityHandler = () => { this._lastActivity = Date.now(); };
        ['pointerdown', 'keydown'].forEach((ev) =>
            window.addEventListener(ev, this._activityHandler, { passive: true, capture: true }));

        await this.checkSession();
        // Every 5 minutes, ping /api/auth/me (which refreshes the server session) ONLY
        // if the user interacted since the last tick. Active editing therefore never
        // expires; an idle tab lapses ~1h after the last interaction. We do NOT force
        // a redirect here — that's left to explicit actions (e.g. connecting a device)
        // so an actively-editing user is never yanked away mid-edit.
        this.checkInterval = setInterval(() => {
            if (Date.now() - this._lastActivity <= 5 * 60 * 1000)
                this.checkSession();
        }, 5 * 60 * 1000);
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
        if (this._activityHandler) {
            ['pointerdown', 'keydown'].forEach((ev) =>
                window.removeEventListener(ev, this._activityHandler, { capture: true }));
            this._activityHandler = null;
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
