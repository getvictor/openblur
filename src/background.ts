import { MODES } from "./constants"

let currentModeIndex = 1

function startUp() {
    chrome.storage.sync.get("mode", (data) => {
        if (data.mode) {
            currentModeIndex = data.mode.index
        }
        void chrome.action.setBadgeText({text: MODES[currentModeIndex].text})
        void chrome.action.setBadgeBackgroundColor({color: MODES[currentModeIndex].color})
    })
}

// Ensure the background script always runs.
chrome.runtime.onStartup.addListener(startUp)
chrome.runtime.onInstalled.addListener(startUp)
