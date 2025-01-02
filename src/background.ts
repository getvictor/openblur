import { Message, Mode, MODES } from "./constants"

const cssToInject = "body { filter: opacity(0%); }"

let currentModeIndex = 1
let startupDone = false

console.debug("OpenBlur service worker script loaded")

function startUp() {
  if (startupDone) {
    return
  }
  startupDone = true
  chrome.storage.sync.get("mode", (data) => {
    if (data.mode && typeof data.mode === "object") {
      currentModeIndex = (data.mode as Mode).index
    }
    void chrome.action.setIcon({ path: MODES[currentModeIndex].icon })
  })
  // Inject script into all tabs.
  chrome.tabs
    .query({})
    .then((tabs) => {
      for (const tab of tabs) {
        if (tab.id !== undefined) {
          const target: chrome.scripting.InjectionTarget = {
            tabId: tab.id,
            allFrames: true,
          }
          chrome.scripting
            .executeScript({
              target: target,
              files: ["content.js"],
            })
            .catch((error: unknown) => {
              console.info("OpenBlur could not inject content script into tab %d", tab.id, error)
            })
        }
      }
    })
    .catch((error: unknown) => {
      console.error("OpenBlur service worker could not query tabs at startup", error)
    })
}

// Ensure the background script always runs.
chrome.runtime.onStartup.addListener(startUp)
chrome.runtime.onInstalled.addListener(startUp)
startUp()

// Hide the body content until OpenBlur processes the content and blurs the secrets.
chrome.webNavigation.onCommitted.addListener(function (details) {
  if (MODES[currentModeIndex].id === "on") {
    const target: chrome.scripting.InjectionTarget = {
      tabId: details.tabId,
      frameIds: [details.frameId],
    }
    chrome.scripting
      .insertCSS({
        css: cssToInject,
        target: target,
      })
      .catch((error: unknown) => {
        console.info("OpenBlur Could not inject CSS into tab %d", details.tabId, error)
      })
  }
})

// Unhide the body content.
chrome.runtime.onMessage.addListener(function (request, sender) {
  const message = request as Message
  if (sender.tab && message.action === "unhideBody") {
    if (sender.tab.id !== undefined) {
      const target: chrome.scripting.InjectionTarget = {
        tabId: sender.tab.id,
      }
      if (sender.frameId !== undefined) {
        target.frameIds = [sender.frameId]
      }
      chrome.scripting
        .removeCSS({
          css: cssToInject,
          target: target,
        })
        .catch((error: unknown) => {
          console.info("OpenBlur Could not remove CSS from tab %d", target.tabId, error)
        })
    }
  }
  if (message.mode) {
    currentModeIndex = message.mode.index
  }
})
