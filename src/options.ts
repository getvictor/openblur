import { NUMBER_OF_CSS_SELECTORS, StoredConfig } from "./constants"

chrome.storage.sync.get(null, (data) => {
  const config = data as StoredConfig
  const cssSelectors: string[] = config.cssSelectors ?? []

  // Loop over NUMBER_OF_CSS_SELECTORS elements and listen to each one.
  for (let i = 0; i < NUMBER_OF_CSS_SELECTORS; i++) {
    const input = document.getElementById(`css_selector_${String(i)}`) as HTMLInputElement
    input.value = cssSelectors[i] || ""
    input.addEventListener("change", (event) => {
      if (event.target instanceof HTMLInputElement) {
        cssSelectors[i] = event.target.value
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
})
