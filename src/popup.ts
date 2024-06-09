import { MODES, NUMBER_OF_LITERALS } from "./constants"

console.debug("OpenBlur popup script loaded")

const checkbox = document.getElementById("enabled") as HTMLInputElement
chrome.storage.sync.get(null, (data) => {
    console.debug("OpenBlur got data from storage", data)
    checkbox.checked = !(data.mode && data.mode.id === "off")
    const mode = data.mode || MODES[1]
    void chrome.action.setBadgeText({text: mode.text})
    void chrome.action.setBadgeBackgroundColor({color: mode.color})
    const literals: string[] = data.literals || []

    // Loop over NUMBER_OF_LITERALS elements and listen to each one.
    for (let i = 0; i < NUMBER_OF_LITERALS; i++) {
        const input = document.getElementById(`item_${i}`) as HTMLInputElement
        input.value = literals[i] || ""
        input.addEventListener("change", async (event) => {
            if (event.target instanceof HTMLInputElement) {
                literals[i] = event.target.value
                void chrome.storage.sync.set({literals})
                // Send message to content script in all tabs
                const tabs = await chrome.tabs.query({})
                for (const tab of tabs) {
                    console.debug("OpenBlur Sending literals message to tab id %d, title '%s' url %s", tab.id, tab.title, tab.url)
                    chrome.tabs.sendMessage(tab.id!, {literals})
                        .catch((error) => {
                            // We ignore tabs without a proper URL, like chrome://extensions/
                            if (tab.url) {
                                console.info("OpenBlur Could not send message to tab with title '%s' and url %s. Was OpenBlur just installed?", tab.title, tab.url, error)
                            }
                        })
                }
            }
        })
    }
})
checkbox.addEventListener("change", async (event) => {
    if (event.target instanceof HTMLInputElement) {
        const mode = event.target.checked ? MODES[1] : MODES[0]
        void chrome.storage.sync.set({"mode": mode})
        void chrome.action.setBadgeText({text: mode.text})
        void chrome.action.setBadgeBackgroundColor({color: mode.color})
        // Send message to content script in all tabs
        const tabs = await chrome.tabs.query({})
        for (const tab of tabs) {
            console.debug("OpenBlur Sending mode message to tab id %d, title '%s' url %s", tab.id, tab.title, tab.url)
            chrome.tabs.sendMessage(tab.id!, {mode: mode})
                .catch((error) => {
                    // We ignore tabs without a proper URL, like chrome://extensions/
                    if (tab.url) {
                        console.info("OpenBlur Could not send message to tab with title '%s' and url %s. Was OpenBlur just installed?", tab.title, tab.url, error)
                    }
                })
        }
    }
})
