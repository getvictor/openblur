import { MODES } from "./constants"

const cssToInject = "body { visibility: hidden; }"

let currentModeIndex = 1

console.debug("OpenBlur service worker script loaded")

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

// Hide the body content until OpenBlur processes the content and blurs the secrets.
chrome.webNavigation.onCommitted.addListener(
    function(details) {
        if (MODES[currentModeIndex].id === "on") {
            let target: chrome.scripting.InjectionTarget = {
                tabId: details.tabId,
                frameIds: [details.frameId],
            }
            void chrome.scripting.insertCSS({
                css: cssToInject,
                target: target,
            })
        }
    }
)

// Unhide the body content.
chrome.runtime.onMessage.addListener(
    function(request, sender, _sendResponse) {
        if (sender.tab && request.action === "unhideBody") {
            let target: chrome.scripting.InjectionTarget = {
                tabId: sender.tab.id!,
            }
            if (sender.frameId !== undefined) {
                target.frameIds = [sender.frameId]
            }
            void chrome.scripting.removeCSS({
                css: cssToInject,
                target: target,
            })
        }
        if (request.mode) {
            currentModeIndex = request.mode.index
        }
    }
)
