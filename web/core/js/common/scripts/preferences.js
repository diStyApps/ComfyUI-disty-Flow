const PREFS_KEY = 'FlowMenuPref';

class PreferencesManager {
    constructor(defaultPrefs) {
        this.preferences = { ...defaultPrefs };
        this.loadPreferences();
    }

    loadPreferences() {
        const storedPrefs = localStorage.getItem(PREFS_KEY);
        if (storedPrefs) {
            try {
                const parsedPrefs = JSON.parse(storedPrefs);
                this.preferences = { ...this.preferences, ...parsedPrefs };
            } catch (e) {
                console.error('Error parsing preferences from localStorage:', e);
            }
        }
    }

    savePreferences() {
        try {
            localStorage.setItem(PREFS_KEY, JSON.stringify(this.preferences));
        } catch (e) {
            console.error('Error saving preferences to localStorage:', e);
        }
    }

    get(prefKey) {
        return this.preferences[prefKey];
    }

    set(prefKey, value) {
        this.preferences[prefKey] = value;
        this.savePreferences();
    }

    addPreference(prefKey, defaultValue) {
        if (!(prefKey in this.preferences)) {
            this.preferences[prefKey] = defaultValue;
            this.savePreferences();
        }
    }
}

export { PreferencesManager, };
