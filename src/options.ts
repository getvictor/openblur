import { Message, NUMBER_OF_CSS_SELECTORS, StoredConfig } from "./constants"
import "./options.css"

chrome.storage.sync.get(null, (data) => {
  const config = data as StoredConfig
  const cssSelectors: string[] = config.cssSelectors ?? []
  let disabledDomains: string = config.disabledDomains ?? ""

  // Loop over NUMBER_OF_CSS_SELECTORS elements and listen to each one.
  for (let i = 0; i < NUMBER_OF_CSS_SELECTORS; i++) {
    const input = document.getElementById(`css_selector_${String(i)}`) as HTMLInputElement
    input.value = cssSelectors[i] || ""
    input.addEventListener("change", (event) => {
      if (event.target instanceof HTMLInputElement) {
        const value = event.target.value.trim()
        if (value !== "") {
          // Validate target value
          try {
            document.querySelectorAll(value)
          } catch (error: unknown) {
            event.target.classList.add("ob-input-error")
            console.info("OpenBlur invalid CSS selector:", value, error)
            return
          }
        }
        event.target.classList.remove("ob-input-error")
        event.target.value = value
        cssSelectors[i] = value
        void chrome.storage.sync.set({ cssSelectors })
        // Send message to content script in all tabs
        void chrome.tabs
          .query({})
          .then((tabs) => {
            for (const tab of tabs) {
              console.debug(
                "OpenBlur Sending css selectors message to tab id %d, title '%s' url %s",
                tab.id,
                tab.title,
                tab.url,
              )
              if (tab.id !== undefined) {
                chrome.tabs.sendMessage(tab.id, { cssSelectors }).catch((error: unknown) => {
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
  }

  // Listen to disabled domains
  const disabledDomainsElement = document.getElementById("disabled_domains") as HTMLTextAreaElement
  disabledDomainsElement.value = disabledDomains
  disabledDomainsElement.addEventListener("change", (event) => {
    if (event.target instanceof HTMLTextAreaElement) {
      const value = event.target.value.trim()
      const domains = value
        .split(",")
        .map((domain) => domain.trim())
        .filter((domain) => domain !== "")
      const updatedDomains = domains.join(", ")
      event.target.value = updatedDomains
      if (disabledDomains !== updatedDomains) {
        disabledDomains = updatedDomains
        void chrome.storage.sync.set({ disabledDomains })
        // Send message to content script in all tabs
        void chrome.tabs
          .query({})
          .then((tabs) => {
            for (const tab of tabs) {
              console.debug(
                "OpenBlur Sending disabled domains message to tab id %d, title '%s' url %s",
                tab.id,
                tab.title,
                tab.url,
              )
              if (tab.id !== undefined) {
                const message: Message = { disabledDomains }
                chrome.tabs.sendMessage(tab.id, message).catch((error: unknown) => {
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
  })
})
