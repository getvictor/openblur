import { MODES, NUMBER_OF_LITERALS, StoredConfig } from "./constants"
import "./popup.css"

console.debug("OpenBlur popup script loaded")

const debounce = function <T extends (...args: Parameters<T>) => ReturnType<T>>(
  callback: T,
  waitMs: number,
): (...args: Parameters<T>) => void {
  let debounceTimer: number
  return function (this: ThisParameterType<T>, ...args: Parameters<T>): void {
    window.clearTimeout(debounceTimer)
    debounceTimer = window.setTimeout(() => callback.apply(this, args), waitMs)
  }
}

let literals: string[] = []
const getInputListener = (i: number) => {
  const listener: EventListener = (event: Event) => {
    if (event.target instanceof HTMLInputElement) {
      if (literals[i] === event.target.value) {
        // No change
        return
      }
      literals[i] = event.target.value
      void chrome.storage.sync.set({ literals })
      // Send message to content script in all tabs
      void chrome.tabs
        .query({})
        .then((tabs) => {
          for (const tab of tabs) {
            console.debug(
              "OpenBlur Sending literals message to tab id %d, title '%s' url %s",
              tab.id,
              tab.title,
              tab.url,
            )
            if (tab.id !== undefined) {
              chrome.tabs.sendMessage(tab.id, { literals }).catch((error: unknown) => {
                // We ignore tabs without a proper URL, like chrome://extensions/
                if (tab.url) {
                  console.info(
                    "OpenBlur Could not send message to tab with title '%s' and url %s. Was OpenBlur just installed?",
                    tab.title,
                    tab.url,
                    error,
                  )
                }
              })
            }
          }
        })
        .catch((error: unknown) => {
          console.error("OpenBlur Could not query tabs", error)
        })
    }
  }
  return listener
}

const checkbox = document.getElementById("enabled") as HTMLInputElement
const checkboxSpan = document.getElementById("enabled-span") as HTMLInputElement
chrome.storage.sync.get(null, (data) => {
  console.debug("OpenBlur got data from storage", data)
  const config = data as StoredConfig
  checkbox.checked = !(config.mode?.id === "off")
  // Once we set the checkbox to its initial value, enable transition animation for it
  setTimeout(() => {
    checkboxSpan.classList.add("ob-enable-span-transition")
  }, 500)
  const mode = config.mode ?? MODES[1]
  void chrome.action.setIcon({ path: MODES[mode.index].icon })
  literals = config.literals ?? []

  // Loop over NUMBER_OF_LITERALS elements and listen to each one.
  for (let i = 0; i < NUMBER_OF_LITERALS; i++) {
    const input = document.getElementById(`item_${String(i)}`) as HTMLInputElement
    input.value = literals[i] || ""
    // Listening to "input" updates the value while typing
    input.addEventListener("input", debounce(getInputListener(i), 1000))
    input.addEventListener("change", getInputListener(i))
  }
})
checkbox.addEventListener("change", (event) => {
  if (event.target instanceof HTMLInputElement) {
    const mode = event.target.checked ? MODES[1] : MODES[0]
    void chrome.storage.sync.set({ mode: mode })
    void chrome.action.setIcon({ path: mode.icon })
    // Send message to content script in all tabs
    chrome.tabs
      .query({})
      .then((tabs) => {
        for (const tab of tabs) {
          console.debug("OpenBlur Sending mode message to tab id %d, title '%s' url %s", tab.id, tab.title, tab.url)
          if (tab.id !== undefined) {
            chrome.tabs.sendMessage(tab.id, { mode: mode }).catch((error: unknown) => {
              // We ignore tabs without a proper URL, like chrome://extensions/
              if (tab.url) {
                console.info(
                  "OpenBlur Could not send message to tab with title '%s' and url %s. Was OpenBlur just installed?",
                  tab.title,
                  tab.url,
                  error,
                )
              }
            })
          }
        }
      })
      .catch((error: unknown) => {
        console.error("OpenBlur Could not query tabs", error)
      })
  }
})

// Options page
const optionsElement = document.querySelector("#go-to-options")
if (!optionsElement) {
  console.error("OpenBlur could not find options element")
} else {
  optionsElement.addEventListener("click", function () {
    // This code is based on Chrome for Developers documentation
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage().catch((error: unknown) => {
        console.error("OpenBlur could not open options page", error)
      })
    } else {
      window.open(chrome.runtime.getURL("options.html"))
    }
  })
}
