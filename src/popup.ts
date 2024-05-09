import { MODES, NUMBER_OF_ITEMS } from "./constants"

console.log("Hello, world from popup!")

const checkbox = document.getElementById("enabled") as HTMLInputElement
chrome.storage.sync.get("mode", (data) => {
    checkbox.checked = !(data.mode && data.mode.id === "off");
    const mode = data.mode || MODES[1]
    chrome.action.setBadgeText({text: mode.text}).then(r => {})
    chrome.action.setBadgeBackgroundColor({color: mode.color}).then(r => {})
})
checkbox.addEventListener("change", (event) => {
    if (event.target instanceof HTMLInputElement) {
        const mode = event.target.checked ? MODES[1] : MODES[0]
        chrome.storage.sync.set({mode}, () => {})
        chrome.action.setBadgeText({text: mode.text}).then(r => {})
        chrome.action.setBadgeBackgroundColor({color: mode.color}).then(r => {})
    }
})

// Loop over NUMBER_OF_ITEMS elements and listen to each one.
for (let i = 0; i < NUMBER_OF_ITEMS; i++) {
    const input = document.getElementById(`item_${i}`) as HTMLInputElement
    // TODO: optimize to get all stored items at once
    chrome.storage.sync.get(`item_${i}`, (data) => {
        input.value = data[`item_${i}`] || ""
    })
    input.addEventListener("change", (event) => {
        if (event.target instanceof HTMLInputElement) {
            chrome.storage.sync.set({[`item_${i}`]: event.target.value}, () => {})
        }
    })
}
