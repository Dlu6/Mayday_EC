//electron-softphone/src/services/ringtoneService.js
/**
 * Ringtone Service
 * Manages ringtone selection and preferences for incoming calls.
 */
import { EventEmitter } from "events";

// Import available ringtone files
import traditionalRingtone from "../assets/sounds/Traditional.mp3";
import highwayRingtone from "../assets/sounds/Highway.mp3";
import nodyRingtone from "../assets/sounds/Nody.mp3";
import suspenseRingtone from "../assets/sounds/Suspense.mp3";
import promiseRingtone from "../assets/sounds/promise.mp3";
import ringbackRingtone from "../assets/sounds/ringback.mp3";

// Storage key for persisting ringtone preference
const STORAGE_KEY = "preferredRingtone";
const DEFAULT_RINGTONE_ID = "traditional";

// Available ringtones configuration
export const AVAILABLE_RINGTONES = [
    {
        id: "traditional",
        name: "Traditional",
        file: traditionalRingtone,
        description: "Classic traditional phone ring (Default)",
    },
    {
        id: "highway",
        name: "Highway",
        file: highwayRingtone,
        description: "Highway ringtone",
    },
    {
        id: "nody",
        name: "Nody",
        file: nodyRingtone,
        description: "Nody ringtone",
    },
    {
        id: "suspense",
        name: "Suspense",
        file: suspenseRingtone,
        description: "Suspense ringtone",
    },
    {
        id: "promise",
        name: "Promise",
        file: promiseRingtone,
        description: "Promise ringtone",
    },
    {
        id: "classic",
        name: "Classic",
        file: ringbackRingtone,
        description: "Classic ringback tone",
    },
];

// Event emitter for ringtone changes
const ringtoneEvents = new EventEmitter();

/**
 * Get the currently selected ringtone ID from localStorage
 * @returns {string} The selected ringtone ID
 */
export const getSelectedRingtoneId = () => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && AVAILABLE_RINGTONES.some((r) => r.id === saved)) {
            return saved;
        }
    } catch (error) {
        console.warn("Error reading ringtone preference:", error);
    }
    return DEFAULT_RINGTONE_ID;
};

/**
 * Get the currently selected ringtone object
 * @returns {object} The selected ringtone configuration
 */
export const getSelectedRingtone = () => {
    const id = getSelectedRingtoneId();
    return (
        AVAILABLE_RINGTONES.find((r) => r.id === id) ||
        AVAILABLE_RINGTONES.find((r) => r.id === DEFAULT_RINGTONE_ID)
    );
};

/**
 * Get the URL/path of the selected ringtone audio file
 * @returns {string} The ringtone audio file URL
 */
export const getSelectedRingtoneUrl = () => {
    const ringtone = getSelectedRingtone();
    return ringtone?.file || promiseRingtone;
};

/**
 * Set the preferred ringtone
 * @param {string} ringtoneId - The ID of the ringtone to set
 * @returns {boolean} Success status
 */
export const setSelectedRingtone = (ringtoneId) => {
    try {
        const ringtone = AVAILABLE_RINGTONES.find((r) => r.id === ringtoneId);
        if (!ringtone) {
            console.warn(`Invalid ringtone ID: ${ringtoneId}`);
            return false;
        }

        localStorage.setItem(STORAGE_KEY, ringtoneId);
        ringtoneEvents.emit("ringtoneChanged", ringtone);
        console.log(`Ringtone preference saved: ${ringtone.name}`);
        return true;
    } catch (error) {
        console.error("Error saving ringtone preference:", error);
        return false;
    }
};

/**
 * Get a ringtone by ID
 * @param {string} ringtoneId - The ringtone ID
 * @returns {object|undefined} The ringtone configuration
 */
export const getRingtoneById = (ringtoneId) => {
    return AVAILABLE_RINGTONES.find((r) => r.id === ringtoneId);
};

/**
 * Get the ringtone URL by ID
 * @param {string} ringtoneId - The ringtone ID
 * @returns {string} The ringtone audio file URL
 */
export const getRingtoneUrl = (ringtoneId) => {
    const ringtone = getRingtoneById(ringtoneId);
    return ringtone?.file || promiseRingtone;
};

// Export the event emitter for subscribing to changes
export const ringtoneServiceEvents = ringtoneEvents;

// Default export as service object
export const ringtoneService = {
    AVAILABLE_RINGTONES,
    getSelectedRingtoneId,
    getSelectedRingtone,
    getSelectedRingtoneUrl,
    setSelectedRingtone,
    getRingtoneById,
    getRingtoneUrl,
    events: ringtoneEvents,
};

export default ringtoneService;
