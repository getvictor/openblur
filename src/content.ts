import { NUMBER_OF_LITERALS} from "./constants"
import Optimizer from "./optimizer"

const blurFilter = "blur(0.343em)" // This unique filter value identifies the OpenBlur filter.
const tagsNotToBlur = ["HEAD", "SCRIPT", "STYLE", "loc"]

const contentToBlur: string[] = []
let enabled = true
let bodyHidden = true
let doFullScan = false

// Performance optimization. The performance optimization mode is enabled when we blur a lot of elements in a short period of time.
const maxBlursCount = 100
let blursCount = maxBlursCount
const performanceOptimizationResetMs = 5 *1000
let performanceOptimizationMode = false

console.debug("OpenBlur content script loaded")

function unhideBody() {
    if (bodyHidden) {
        void chrome.runtime.sendMessage({action: "unhideBody"})
        bodyHidden = false
    }
}

function processInputElement(input: HTMLInputElement | HTMLTextAreaElement) {
    let blurTarget : HTMLElement = input
    if (performanceOptimizationMode && input.parentElement instanceof HTMLElement) {
        // In performance optimization mode, we may blur the parent.
        const grandParent = input.parentElement as HTMLElement
        if (grandParent.style?.filter.includes(blurFilter)) {
            // Treat the grandparent as the parent.
            blurTarget = grandParent
        }
    }
    const text = (input.value || input.getAttribute("value")) ?? ""
    if (blurTarget.style.filter.includes(blurFilter)) {
        // Already blurred
        if (!enabled) {
            // We remove the blur filter if the extension is disabled.
            unblurElement(blurTarget)
            return
        }
        const blurNeeded = contentToBlur.some((content) => {
            return text.includes(content);
        })
        if (!blurNeeded) {
            unblurElement(blurTarget)
        }
        return
    } else if (enabled && text.length > 0) {
        const blurNeeded = contentToBlur.some((content) => {
            return text.includes(content);
        })
        if (blurNeeded) {
            blurElement(blurTarget)
        }
    }
}

function processNode(node: Node) {
    if (node instanceof HTMLElement && tagsNotToBlur.includes(node.tagName)) {
        return
    }
    if (node.childNodes.length > 0) {
        Array.from(node.childNodes).forEach(processNode)
    }
    if (node.nodeType === Node.TEXT_NODE && node.textContent !== null && node.textContent.trim().length > 0) {
        let parent = node.parentElement
        if (parent?.style) {
            const text = node.textContent!
            if (performanceOptimizationMode && parent.parentElement instanceof HTMLElement) {
                // In performance optimization mode, we may blur the parent's parent.
                const grandParent = parent.parentElement as HTMLElement
                if (grandParent.style?.filter.includes(blurFilter)) {
                    // Treat the grandparent as the parent.
                    parent = grandParent
                }
            }
            if (parent.style.filter.includes(blurFilter)) {
                // Already blurred
                if (!enabled) {
                    // We remove the blur filter if the extension is disabled.
                    unblurElement(parent)
                    return
                }
                if (doFullScan) {
                    // Double check if the blur is still needed.
                    const blurNeeded = contentToBlur.some((content) => {
                        return text.includes(content);
                    })
                    if (!blurNeeded) {
                        unblurElement(parent)
                    }
                }
                return
            } else if (enabled) {
                const blurNeeded = contentToBlur.some((content) => {
                    return text.includes(content);
                })
                if (blurNeeded) {
                    blurElement(parent)
                }
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
    let blurTarget: HTMLElement = elem
    if (performanceOptimizationMode) {
        const ok = Optimizer.addElement(elem)
        if (!ok) {
            blurTarget = elem.parentElement!
            void Optimizer.addElement(elem)
        }
    }
    if (blurTarget.style.filter.length == 0) {
        blurTarget.style.filter = blurFilter
    } else {
        // The element already has a filter. Append our blur filter to the existing filter.
        // We assume that the semicolon(;) is never present in the filter string. This has been the case in our limited testing.
        blurTarget.style.filter += ` ${blurFilter}`
    }
    console.debug("OpenBlur blurred element id:%s, class:%s, tag:%s, text:%s", elem.id, elem.className, elem.tagName, elem.textContent)
    blursCount--
    if (blursCount <= 0) {
        if (!performanceOptimizationMode) {
            console.debug("OpenBlur performance optimization mode enabled")
            performanceOptimizationMode = true
        }
    }
}

function unblurElement(elem: HTMLElement) {
    elem.style.filter = elem.style.filter.replace(blurFilter, "")
    if (performanceOptimizationMode) {
        Optimizer.removeElement(elem)
    }
    console.debug("OpenBlur unblurred element id:%s, class:%s, tag:%s, text:%s", elem.id, elem.className, elem.tagName, elem.textContent)
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
    const inputs = document.getElementsByTagName("INPUT")
    for (const input of inputs) {
        input.removeEventListener("input", inputEventListener)
    }
}

function disconnect() {
    observer.disconnect()
    disconnectInputs()
    if (performanceOptimizationMode) {
        Optimizer.clear()
        performanceOptimizationMode = false
    }
}

function setLiterals(literals: string[]) {
    contentToBlur.length = 0
    for (let i = 0; i < NUMBER_OF_LITERALS; i++) {
        const item: string = literals[i]
        if (item && item.trim().length > 0) {
            contentToBlur.push(item.trim())
        }
    }
    if (enabled) {
        doFullScan = true
        observe()
        doFullScan = false
    }
    unhideBody()
}

chrome.storage.sync.get(null, (data) => {
    if (data.mode && data.mode.id === "off") {
        enabled = false
    }
    const literals: string[] = data.literals || []
    setLiterals(literals);
})

// Listen for messages from popup.
chrome.runtime.onMessage.addListener((request) => {
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

setInterval(() => {
    blursCount = maxBlursCount
}, performanceOptimizationResetMs)
