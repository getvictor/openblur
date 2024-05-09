import { NUMBER_OF_ITEMS} from "./constants"

const contentToBlur: string[] = []
const blurFilter = "blur(6px)"

function processNode(node: Node) {
    if (node.childNodes.length > 0) {
        Array.from(node.childNodes).forEach(processNode)
    }
    if (node.nodeType === Node.TEXT_NODE && node.textContent !== null && node.textContent.trim().length > 0) {
        const parent = node.parentElement
        if (parent !== null && (parent.tagName === 'SCRIPT' || parent.style.filter === blurFilter)) {
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
    elem.style.filter = blurFilter
    console.debug("blurred id:" + elem.id + " class:" + elem.className + " tag:" + elem.tagName + " text:" + elem.textContent)
}

const observer = new MutationObserver((mutations, observer) => {
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
        const item = data[`item_${i}`]
        if (item) {
            contentToBlur.push(item)
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
