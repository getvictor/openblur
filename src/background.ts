import { MODES } from "./constants"

let currentModeIndex = 1

function startUp() {
    chrome.storage.sync.get("mode", (data) => {
        if (data.mode) {
            currentModeIndex = data.mode.index
        }
        chrome.action.setBadgeText({text: MODES[currentModeIndex].text}).then(r => {})
        chrome.action.setBadgeBackgroundColor({color: MODES[currentModeIndex].color}).then(r => {})
    })
}

// Ensure the background script always runs.
chrome.runtime.onStartup.addListener(startUp)
chrome.runtime.onInstalled.addListener(startUp)
