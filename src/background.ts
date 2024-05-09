import { MODES } from "./constants"

let currentModeIndex = 1

chrome.storage.sync.get("mode", (data) => {
    if (data.mode) {
        currentModeIndex = data.mode.index
    }
    chrome.action.setBadgeText({text: MODES[currentModeIndex].text}).then(r => {})
    chrome.action.setBadgeBackgroundColor({color: MODES[currentModeIndex].color}).then(r => {})
})
