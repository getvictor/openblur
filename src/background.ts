import { Message, MODES, StoredConfig } from "./constants"

const cssToInject = "body { filter: opacity(0%); }"

let startupDone = false
let config: StoredConfig = {}
let disabledDomains: string[] = []

console.debug("OpenBlur service worker script loaded")

function startUp() {
  if (startupDone) {
    return
  }
  startupDone = true
  chrome.storage.sync.get(null, (data) => {
    setConfig(data as StoredConfig)
    void chrome.action.setIcon({ path: MODES[getModeIndex()].icon })
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
  if (isDomainDisabled(details.url)) {
    return
  }

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

  // To prevent CSS from getting stuck on the page, we remove it after a delay.
  // This is an issue with Vivaldi browser: https://github.com/getvictor/openblur/issues/30
  const removeBlurCSSDelay = 2000
  setTimeout(() => {
    chrome.scripting
      .removeCSS({
        css: cssToInject,
        target: target,
      })
      .catch(() => {
        // Ignore error. It is expected that the CSS cannot be removed if it was already removed.
      })
  }, removeBlurCSSDelay)
})

function isDomainDisabled(url: string): boolean {
  if (MODES[getModeIndex()].id !== "on") {
    // if OpenBlur is off
    return true
  }
  if (disabledDomains.length === 0 || !url) {
    return false
  }
  const urlObject = new URL(url)
  return disabledDomains.includes(urlObject.hostname)
}

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
          console.debug("OpenBlur Could not remove CSS from tab %d. Was it already removed?", target.tabId, error)
        })
    }
  }
  if (message.mode) {
    config.mode = message.mode
  }
  if (message.disabledDomains) {
    config.disabledDomains = message.disabledDomains
    setDisabledDomains()
  }
})

function getModeIndex(): number {
  if (config.mode) {
    return config.mode.index
  }
  return 1
}

function setConfig(newConfig: StoredConfig) {
  config = newConfig
  setDisabledDomains()
}

function setDisabledDomains() {
  if (config.disabledDomains) {
    // Pre-processing disabled domains for performance
    disabledDomains = config.disabledDomains.split(",").map((domain) => domain.trim())
  } else {
    disabledDomains = []
  }
}
