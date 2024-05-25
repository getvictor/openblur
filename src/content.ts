import { NUMBER_OF_ITEMS} from "./constants"

const contentToBlur: string[] = []
const blurFilter = "blur(0.343em)" // This unique filter value identifies the OpenBlur filter.

function processNode(node: Node) {
    if (node.childNodes.length > 0) {
        Array.from(node.childNodes).forEach(processNode)
    }
    if (node.nodeType === Node.TEXT_NODE && node.textContent !== null && node.textContent.trim().length > 0) {
        const parent = node.parentElement
        if (parent !== null && (parent.tagName === 'SCRIPT' || parent.style.filter.includes(blurFilter))) {
            // Already blurred
            return
        }
        const text = node.textContent!
        contentToBlur.some((content) => {
            if (text.includes(content)) {
                blurElement(parent!)
                return true
            }
            return false
        })

    }
}

function blurElement(elem: HTMLElement) {
    if (elem.style.filter.length == 0) {
        elem.style.filter = blurFilter
    } else {
        // The element already has a filter. Append our blur filter to the existing filter.
        // We assume that the semicolon(;) is never present in the filter string. This has been the case in our limited testing.
        elem.style.filter += ` ${blurFilter}`
    }
    console.debug("blurred id:" + elem.id + " class:" + elem.className + " tag:" + elem.tagName + " text:" + elem.textContent)
}

const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach(processNode)
        } else {
            processNode(mutation.target)
        }
    })
})

let enabled = true
const keys = ["mode"]
for (let i = 0; i < NUMBER_OF_ITEMS; i++) {
    keys.push(`item_${i}`)
}

chrome.storage.sync.get(keys, (data) => {
    if (data.mode && data.mode.id === "off") {
        enabled = false
    }
    for (let i = 0; i < NUMBER_OF_ITEMS; i++) {
        const item: string = data[`item_${i}`]
        if (item && item.trim().length > 0) {
            contentToBlur.push(item.trim())
        }
    }
    if (enabled) {
        observer.observe(document, {
            attributes: false,
            characterData: true,
            childList: true,
            subtree: true,
        })

        // Loop through all elements on the page.
        processNode(document)
    }
})
