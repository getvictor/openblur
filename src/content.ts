import { NUMBER_OF_ITEMS} from "./constants"

const blurFilter = "blur(0.343em)" // This unique filter value identifies the OpenBlur filter.
const tagsNotToBlur = ["SCRIPT", "STYLE", "loc"]

let contentToBlur: string[] = []
let enabled = true
let bodyHidden = true

console.debug("OpenBlur content script loaded")

function unhideBody() {
    if (bodyHidden) {
        void chrome.runtime.sendMessage({action: "unhideBody"})
        bodyHidden = false
    }
}

function processInputElement(input: HTMLInputElement | HTMLTextAreaElement) {
    let text = input.value || input.getAttribute("value") || ""
    if (input.style.filter.includes(blurFilter)) {
        // Already blurred
        if (!enabled) {
            // We remove the blur filter if the extension is disabled.
            input.style.filter = input.style.filter.replace(blurFilter, "")
            return
        }
        const blurNeeded = contentToBlur.some((content) => {
            return text.includes(content);
        })
        if (!blurNeeded) {
            input.style.filter = input.style.filter.replace(blurFilter, "")
        }
        return
    }
    if (enabled && text.length > 0) {
        const blurNeeded = contentToBlur.some((content) => {
            return text.includes(content);
        })
        if (blurNeeded) {
            blurElement(input)
        }
    }
}

function processNode(node: Node) {
    if (node.childNodes.length > 0) {
        Array.from(node.childNodes).forEach(processNode)
    }
    if (node.nodeType === Node.TEXT_NODE && node.textContent !== null && node.textContent.trim().length > 0) {
        const parent = node.parentElement
        if (parent !== null && parent.style) {
            if (tagsNotToBlur.includes(parent.tagName)) {
                return
            } else if (parent.style.filter.includes(blurFilter)) {
                // Already blurred
                if (!enabled) {
                    // We remove the blur filter if the extension is disabled.
                    parent.style.filter = parent.style.filter.replace(blurFilter, "")
                }
                return
            }
            const text = node.textContent!
            if (enabled) {
                contentToBlur.some((content) => {
                    if (text.includes(content)) {
                        blurElement(parent!)
                        return true
                    }
                    return false
                })
            }
        }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
        const elem = node as HTMLElement
        if (elem.tagName === "INPUT") {
            const input = elem as HTMLInputElement
            if (input.type === "text") {
                processInputElement(input);
                input.addEventListener("input", inputEventListener)
            }
        } else if (elem.tagName === "TEXTAREA") {
            const textarea = elem as HTMLTextAreaElement
            processInputElement(textarea)
            textarea.addEventListener("input", inputEventListener)
        }
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
    console.debug("OpenBlur blurred element id:%s, class:%s, tag:%s, text:%s", elem.id, elem.className, elem.tagName, elem.textContent)
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

function inputEventListener(event: Event) {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        processInputElement(event.target)
    }
}

function observe() {
    observer.observe(document, {
        attributes: false,
        characterData: true,
        childList: true,
        subtree: true,
    })

    // Loop through all elements on the page.
    processNode(document)
}

function disconnectInputs() {
    let inputs = document.getElementsByTagName("INPUT")
    for (let i = 0; i < inputs.length; i++) {
        inputs[i].removeEventListener("input", inputEventListener)
    }
}

function disconnect() {
    observer.disconnect()
    disconnectInputs()
}

function setLiterals(literals: string[]) {
    contentToBlur.length = 0
    for (let i = 0; i < NUMBER_OF_ITEMS; i++) {
        const item: string = literals[i]
        if (item && item.trim().length > 0) {
            contentToBlur.push(item.trim())
        }
    }
    if (enabled) {
        observe()
    }
    unhideBody()
}

chrome.storage.sync.get(null, (data) => {
    if (data.mode && data.mode.id === "off") {
        enabled = false
    }
    let literals: string[] = data.literals || []
    setLiterals(literals);
})

// Listen for messages from popup.
chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
    console.debug("OpenBlur received message from popup", request)

    if (request.mode) {
        if (request.mode.id === "off") {
            enabled = false
            disconnect()
            processNode(document)
        } else {
            enabled = true
            observe()
        }
    }
    if (request.literals) {
        setLiterals(request.literals)
    }
})
