"use strict";

(() => {
    const supportedThemes = new Set(['light', 'dark']);
    const query = new URLSearchParams(window.location.search);
    const storedTheme = localStorage.getItem('bipes_auth_theme');
    const storedLanguage = localStorage.getItem('bipes_auth_language');
    // Auth-page strings live in static/msg/<lang>.js as `AuthMsg` (single source of
    // truth, shared with the IDE's translation files). The matching language file is
    // loaded before this script, so window.AuthMsg holds the current language.
    const authText = window.authText || window.AuthMsg || {};
    // Re-expose for the page scripts (login.js / register.js / setup.js) that read window.authText.
    window.authText = authText;

    function t(key, fallback) {
        return authText[key] || fallback;
    }

    // Replace baked-in (English) fallback text with the active language. Elements opt in
    // via data-i18n (textContent), data-i18n-placeholder, data-i18n-title (attributes),
    // and the document title via <body data-i18n-doctitle="...">.
    function applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach((el) => {
            const value = authText[el.getAttribute('data-i18n')];
            if (value) { el.textContent = value; }
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
            const value = authText[el.getAttribute('data-i18n-placeholder')];
            if (value) { el.setAttribute('placeholder', value); }
        });
        document.querySelectorAll('[data-i18n-title]').forEach((el) => {
            const value = authText[el.getAttribute('data-i18n-title')];
            if (value) { el.setAttribute('title', value); }
        });
        const docTitleKey = document.body && document.body.getAttribute('data-i18n-doctitle');
        if (docTitleKey && authText[docTitleKey]) {
            document.title = authText[docTitleKey] + ' - BIPES';
        }
    }

    let currentTheme = supportedThemes.has(query.get('theme'))
        ? query.get('theme')
        : (supportedThemes.has(storedTheme) ? storedTheme : 'light');

    const languageSelect = document.getElementById('auth-language');
    const languageOptions = languageSelect
        ? Array.from(languageSelect.options).map((option) => option.value)
        : ['en'];
    let currentLanguage = languageOptions.includes(query.get('lang'))
        ? query.get('lang')
        : (languageOptions.includes(storedLanguage) ? storedLanguage : document.documentElement.lang || 'en');

    function setBodyTheme(theme) {
        currentTheme = theme;
        document.body.classList.remove('light', 'dark');
        document.body.classList.add(theme);
        localStorage.setItem('bipes_auth_theme', theme);
        const themeButton = document.getElementById('theme') || document.getElementById('auth-theme');
        if (themeButton) {
            themeButton.classList.toggle('on', theme === 'dark');
            themeButton.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
            themeButton.textContent = t('mode', 'Mode');
            themeButton.title = t('change_theme', theme === 'dark' ? 'Change to light theme' : 'Change to dark theme');
        }
    }

    function preferredIdePath() {
        return '/ide';
    }

    function withPreferences(path) {
        const url = new URL(path, window.location.origin);
        url.searchParams.set('theme', currentTheme);
        url.searchParams.set('lang', currentLanguage);
        return `${url.pathname}${url.search}${url.hash}`;
    }

    function updateLinks() {
        document.querySelectorAll('[data-auth-preserve]').forEach((link) => {
            link.href = withPreferences(link.getAttribute('href'));
        });
        document.querySelectorAll('[data-auth-ide]').forEach((link) => {
            link.href = withPreferences(preferredIdePath());
        });
    }

    function updateUrlPreference(name, value) {
        const url = new URL(window.location.href);
        url.searchParams.set(name, value);
        window.history.replaceState({}, '', url);
    }

    function updateUrlPreferences(values) {
        const url = new URL(window.location.href);
        Object.keys(values).forEach((name) => {
            url.searchParams.set(name, values[name]);
        });
        window.history.replaceState({}, '', url);
    }

    window.authPreferences = {
        idePath: () => withPreferences(preferredIdePath()),
        path: withPreferences
    };

    document.addEventListener('DOMContentLoaded', () => {
        document.documentElement.lang = currentLanguage;
        applyTranslations();
        setBodyTheme(currentTheme);
        updateUrlPreferences({
            lang: currentLanguage,
            theme: currentTheme
        });

        if (languageSelect) {
            languageSelect.value = currentLanguage;
            languageSelect.addEventListener('change', () => {
                const nextLanguage = languageSelect.value;
                currentLanguage = nextLanguage;
                localStorage.setItem('bipes_auth_language', nextLanguage);
                updateUrlPreferences({
                    lang: nextLanguage,
                    theme: currentTheme
                });
                window.location.reload();
            });
        }

        const forumButton = document.getElementById('forum');
        if (forumButton) {
            forumButton.addEventListener('click', () => {
                window.open('https://github.com/BIPES/BIPES/discussions', '_blank', 'noopener,noreferrer');
            });
        }

        const themeButton = document.getElementById('theme') || document.getElementById('auth-theme');
        if (themeButton) {
            themeButton.addEventListener('click', () => {
                const nextTheme = document.body.classList.contains('dark') ? 'light' : 'dark';
                updateUrlPreference('theme', nextTheme);
                setBodyTheme(nextTheme);
                updateLinks();
            });
        }

        updateLinks();
    });
})();
