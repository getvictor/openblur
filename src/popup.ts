import { MODES, NUMBER_OF_ITEMS } from "./constants"

console.debug("OpenBlur popup script loaded")

const checkbox = document.getElementById("enabled") as HTMLInputElement
chrome.storage.sync.get(null, (data) => {
    console.debug("OpenBlur got data from storage", data)
    checkbox.checked = !(data.mode && data.mode.id === "off")
    const mode = data.mode || MODES[1]
    void chrome.action.setBadgeText({text: mode.text})
    void chrome.action.setBadgeBackgroundColor({color: mode.color})
    let literals: string[] = data.literals || []

    // Loop over NUMBER_OF_ITEMS elements and listen to each one.
    for (let i = 0; i < NUMBER_OF_ITEMS; i++) {
        const input = document.getElementById(`item_${i}`) as HTMLInputElement
        input.value = literals[i] || ""
        input.addEventListener("change", async (event) => {
            if (event.target instanceof HTMLInputElement) {
                literals[i] = event.target.value
                void chrome.storage.sync.set({literals})
                // Send message to content script in all tabs
                const tabs = await chrome.tabs.query({})
                for (const tab of tabs) {
                    console.debug("OpenBlur Sending message to tab id %d, url %s", tab.id, tab.url)
                    void chrome.tabs.sendMessage(tab.id!, {literals})
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
            console.debug("OpenBlur Sending message to tab id %d, url %s", tab.id, tab.url)
            void chrome.tabs.sendMessage(tab.id!, {mode: mode})
        }
    }
})
