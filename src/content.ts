import { Message, NUMBER_OF_LITERALS, StoredConfig } from "./constants"
import Optimizer from "./optimizer"

// These unique filter values identify the OpenBlur filter.
export const blurFilter = "blur(0.343em)"
const blurSelectorFilter = "blur(0.344em)"
const tagsNotToBlur = ["HEAD", "SCRIPT", "STYLE", "loc"]

const contentToBlur: string[] = []
let enabled = true
let bodyHidden = true
const localConfig: StoredConfig = {
  cssSelectors: [],
}

// Performance optimization. The performance optimization mode is enabled when we blur a lot of elements in a short period of time.
const maxBlursCount = 100
let blursCount = maxBlursCount
const performanceOptimizationResetMs = 5 * 1000
let performanceOptimizationMode = false

// For debug
const performanceLogging = false

console.debug("OpenBlur content script loaded")

function unhideBody(force?: boolean) {
  if (bodyHidden || force) {
    const message: Message = { action: "unhideBody" }
    void chrome.runtime.sendMessage(message)
    bodyHidden = false
  }
}

function processInputElement(input: HTMLInputElement | HTMLTextAreaElement, blurredElements: Set<HTMLElement>) {
  let blurTarget: HTMLElement = input
  if (performanceOptimizationMode && input.parentElement instanceof HTMLElement) {
    // In performance optimization mode, we may blur the parent.
    const grandParent = input.parentElement
    if (grandParent.style.filter.includes(blurFilter)) {
      // Treat the grandparent as the parent.
      blurTarget = grandParent
    }
  }
  if (blurredElements.has(blurTarget)) {
    // This element has already been blurred in this pass
    return
  }
  const text = ((input.value || input.getAttribute("value")) ?? "").toLowerCase()
  if (blurTarget.style.filter.includes(blurFilter)) {
    // Already blurred
    if (!enabled) {
      // We remove the blur filter if the extension is disabled.
      unblurElement(blurTarget)
      return
    }
    const blurNeeded = contentToBlur.some((content) => {
      return text.includes(content)
    })
    if (!blurNeeded) {
      unblurElement(blurTarget)
    } else {
      blurredElements.add(blurTarget)
    }
    return
  } else if (enabled && text.length > 0) {
    const blurNeeded = contentToBlur.some((content) => {
      return text.includes(content)
    })
    if (blurNeeded) {
      blurredElements.add(blurElement(blurTarget))
    }
  }
}

function processNodeWithParent(node: Node) {
  let target = node
  if (performanceOptimizationMode && target.parentElement) {
    // We must consider the parent/grandparent in performance optimization mode.
    if (node.nodeType === Node.TEXT_NODE && target.parentElement.parentElement) {
      // We must consider the grandparent for text nodes.
      target = target.parentElement.parentElement
    } else {
      target = target.parentElement
    }
  }
  processNode(target, new Set<HTMLElement>())
}

function processHtmlElement(parent: HTMLElement | null, text: string, blurredElements: Set<HTMLElement>) {
  if (parent?.style) {
    if (performanceOptimizationMode && parent.parentElement instanceof HTMLElement) {
      // In performance optimization mode, we may blur the parent's parent.
      const grandParent = parent.parentElement
      if (grandParent.style.filter.includes(blurFilter)) {
        // Treat the grandparent as the parent.
        parent = grandParent
      }
    }
    if (blurredElements.has(parent)) {
      // This element has already been blurred in this pass.
      return
    }
    text = text.toLowerCase()
    if (parent.style.filter.includes(blurFilter)) {
      // Already blurred
      if (!enabled) {
        // We remove the blur filter if the extension is disabled.
        unblurElement(parent)
        return
      }
      // In performance optimization mode, the grandparent may have been updated to have
      // completely different content.
      // Double check if the blur is still needed.
      const blurNeeded = contentToBlur.some((content) => {
        return text.includes(content)
      })
      if (!blurNeeded) {
        unblurElement(parent)
      } else {
        blurredElements.add(parent)
      }
      return
    } else if (enabled) {
      const blurNeeded = contentToBlur.some((content) => {
        return text.includes(content)
      })
      if (blurNeeded) {
        blurredElements.add(blurElement(parent))
      }
    }
  }
}

export function processNode(node: Node, blurredElements: Set<HTMLElement>) {
  if (node instanceof HTMLElement && tagsNotToBlur.includes(node.tagName)) {
    return
  }
  if (node.nodeType === Node.TEXT_NODE && node.textContent !== null && node.textContent.trim().length > 0) {
    const text = node.textContent
    processHtmlElement(node.parentElement, text, blurredElements)
    return
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    const elem = node as HTMLElement
    switch (elem.tagName) {
      case "INPUT": {
        const input = elem as HTMLInputElement
        if (input.type === "text") {
          processInputElement(input, blurredElements)
          input.addEventListener("input", inputEventListener)
        }
        return
      }
      case "TEXTAREA": {
        const textarea = elem as HTMLTextAreaElement
        processInputElement(textarea, blurredElements)
        textarea.addEventListener("input", inputEventListener)
        return
      }
      case "SELECT": {
        const select = elem as HTMLSelectElement
        let text = ""
        if (select.selectedIndex >= 0) {
          text = select.options[select.selectedIndex].text
        }
        processHtmlElement(select, text, blurredElements)
        select.addEventListener("change", selectOnChangeListener)
        return
      }
    }
  }
  // We should only get here if node has not been processed
  if (node.childNodes.length > 0) {
    if (node instanceof HTMLElement) {
      let blurred = false
      const startingCount = blurredElements.size
      if (node.style.filter.includes(blurFilter)) {
        blurred = true
      }
      Array.from(node.childNodes).forEach((value) => {
        processNode(value, blurredElements)
      })
      if (blurred && startingCount >= blurredElements.size) {
        // The element was already blurred, but no children were blurred.
        // So we unblur.
        // This will trigger a second pass by blurStyleObserver. This is fine since this situation is rare.
        unblurElement(node)
      }
    } else {
      Array.from(node.childNodes).forEach((value) => {
        processNode(value, blurredElements)
      })
    }
  }
}

// The blurStyleObserver is used to reapply the blur filter if it is removed.
// The style changes should not be common.
const blurStyleObserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === "attributes") {
      const elem = mutation.target as HTMLElement
      if (!elem.style.filter.includes(blurFilter)) {
        processNodeWithParent(mutation.target)
      }
    }
  })
})

function blurElement(elem: HTMLElement): HTMLElement {
  let blurTarget: HTMLElement = elem
  if (performanceOptimizationMode) {
    const ok = Optimizer.addElement(elem)
    if (!ok && elem.parentElement) {
      blurTarget = elem.parentElement
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
  // Note: observing the same element multiple times is a no-op.
  blurStyleObserver.observe(elem, {
    attributes: true,
    attributeFilter: ["style"],
  })
  if (blurTarget === elem) {
    console.debug(
      "OpenBlur blurred element id:%s, class:%s, tag:%s, text:%s",
      elem.id,
      elem.className,
      elem.tagName,
      elem.textContent,
    )
  } else {
    console.debug(
      "OpenBlur blurred parent element id:%s, class:%s, tag:%s, elementText:%s",
      blurTarget.id,
      blurTarget.className,
      blurTarget.tagName,
      elem.textContent,
    )
  }
  blursCount--
  if (blursCount <= 0) {
    if (!performanceOptimizationMode) {
      console.debug("OpenBlur performance optimization mode enabled")
      performanceOptimizationMode = true
    }
  }
  return blurTarget
}

function unblurElement(elem: HTMLElement) {
  elem.style.filter = elem.style.filter.replace(blurFilter, "")
  if (performanceOptimizationMode) {
    Optimizer.removeElement(elem)
  }
  console.debug(
    "OpenBlur unblurred element id:%s, class:%s, tag:%s, text:%s",
    elem.id,
    elem.className,
    elem.tagName,
    elem.textContent,
  )
}

const observer = new MutationObserver((mutations) => {
  const startTime = performance.now()
  let addedNodesFound = false
  // Performance optimization: for a lot of mutations, we do a full scan instead.
  const mutationsTriggerFullScan = 50
  if (mutations.length >= mutationsTriggerFullScan) {
    processNode(document, new Set<HTMLElement>())
    addedNodesFound = mutations.some((mutation) => {
      return mutation.addedNodes.length > 0
    })
  } else {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length > 0) {
        addedNodesFound = true
        mutation.addedNodes.forEach((node) => {
          processNodeWithParent(node)
        })
      } else {
        processNodeWithParent(mutation.target)
      }
    })
  }
  if (addedNodesFound) {
    setCssSelectors(localConfig.cssSelectors ?? [])
  }
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (performanceLogging) {
    const duration = performance.now() - startTime
    if (duration > 2) {
      if (mutations.length >= mutationsTriggerFullScan) {
        console.log("OpenBlur MutationObserver took %f ms for full scan", duration)
      } else {
        console.log("OpenBlur MutationObserver took %f ms for mutations", duration, mutations)
      }
    }
  }
})

function inputEventListener(event: Event) {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
    processInputElement(event.target, new Set<HTMLElement>())
  }
}

function selectOnChangeListener(event: Event) {
  if (event.target instanceof HTMLSelectElement) {
    const select = event.target
    let text = ""
    if (select.selectedIndex >= 0) {
      text = select.options[select.selectedIndex].text
    }
    processHtmlElement(select, text, new Set<HTMLElement>())
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
  processNode(document, new Set<HTMLElement>())
}

function disconnectInputs() {
  const inputs = document.getElementsByTagName("INPUT")
  for (const input of inputs) {
    input.removeEventListener("input", inputEventListener)
  }
}

function disconnect() {
  observer.disconnect()
  blurStyleObserver.disconnect()
  disconnectInputs()
}

function setLiterals(literals: string[]) {
  contentToBlur.length = 0
  for (let i = 0; i < NUMBER_OF_LITERALS; i++) {
    const item: string = literals[i]
    if (item && item.trim().length > 0) {
      contentToBlur.push(item.trim().toLowerCase())
    }
  }
  if (enabled) {
    observe()
  }
  unhideBody()
}

function setCssSelectors(selectors: string[], unblur?: boolean) {
  const currentSelectors = localConfig.cssSelectors ?? []
  // Determine if there is a change
  let selectorsChanged = true
  if (
    currentSelectors.length === selectors.length &&
    currentSelectors.every((value, index) => {
      return value === selectors[index]
    })
  ) {
    selectorsChanged = false
  }
  if (selectorsChanged || unblur) {
    // Unblur the current/old elements.
    for (const selector of currentSelectors) {
      if (selector && selector.trim().length > 0) {
        try {
          const elements = document.querySelectorAll(selector)
          elements.forEach((element) => {
            if (element.nodeType === Node.ELEMENT_NODE) {
              const elem = element as HTMLElement
              elem.style.filter = elem.style.filter.replace(blurSelectorFilter, "")
            }
          })
        } catch (error: unknown) {
          console.info("OpenBlur could not query CSS selector:", selector, error)
        }
      }
    }
  }
  if (enabled) {
    // Now, blur the new elements.
    for (const selector of selectors) {
      if (selector && selector.trim().length > 0) {
        let count = 0
        try {
          const elements = document.querySelectorAll(selector)
          elements.forEach((element) => {
            if (element.nodeType === Node.ELEMENT_NODE) {
              const elem = element as HTMLElement
              if (!elem.style.filter.includes(blurSelectorFilter)) {
                if (elem.style.filter.length == 0) {
                  elem.style.filter = blurSelectorFilter
                  count++
                } else {
                  // The element already has a filter. Append our blur filter to the existing filter.
                  elem.style.filter += ` ${blurSelectorFilter}`
                  count++
                }
              }
            }
          })
        } catch (error: unknown) {
          console.info("OpenBlur could not query CSS selector:", selector, error)
        }
        if (count > 0) {
          console.debug("OpenBlur blurred %d elements with selector %s", count, selector)
        }
      }
    }
  }
  if (selectorsChanged) {
    localConfig.cssSelectors = selectors
  }
}

chrome.storage.sync.get(null, (data) => {
  const config = data as StoredConfig
  if (config.mode?.id === "off") {
    enabled = false
  }
  if (isDisabledForDomain(config.disabledDomains)) {
    enabled = false
  }
  const literals: string[] = config.literals ?? []
  setLiterals(literals)
  if (config.cssSelectors && config.cssSelectors.length > 0) {
    setCssSelectors(config.cssSelectors)
  }
})

function isDisabledForDomain(disabledDomains: string | undefined) {
  if (!disabledDomains) {
    return false
  }
  const hostname = window.location.hostname
  const domains = disabledDomains.split(",").map((domain) => domain.trim())
  return domains.includes(hostname)
}

export function handleMessage(request: unknown) {
  console.debug("OpenBlur received message from popup", request)
  const message = request as Message

  if (message.mode) {
    if (message.mode.id === "off") {
      disableOnMessage()
    } else {
      enableOnMessage()
    }
  }
  if (message.disabledDomains !== undefined) {
    if (isDisabledForDomain(message.disabledDomains)) {
      disableOnMessage()
    } else {
      enableOnMessage()
    }
  }
  if (message.literals) {
    setLiterals(message.literals)
  }
  if (message.cssSelectors) {
    setCssSelectors(message.cssSelectors)
  }
}

function disableOnMessage() {
  enabled = false
  disconnect()
  processNode(document, new Set<HTMLElement>())
  if (performanceOptimizationMode) {
    Optimizer.clear()
    performanceOptimizationMode = false
  }
  setCssSelectors(localConfig.cssSelectors ?? [], true) // clear selector blurs
}

function enableOnMessage() {
  enabled = true
  observe()
  setCssSelectors(localConfig.cssSelectors ?? [])
}

// Listen for messages from popup.
chrome.runtime.onMessage.addListener(handleMessage)

setInterval(() => {
  blursCount = maxBlursCount
}, performanceOptimizationResetMs)

// Page lifecycle events. Used for back/forward navigation.
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    // The page was restored from the browser cache.
    // We need to reconnect the extension listener.
    chrome.runtime.onMessage.addListener(handleMessage)
    unhideBody(true)
  }
})

window.addEventListener("pagehide", (event) => {
  if (event.persisted) {
    // The page is being saved into the browser cache.
    // We need to disconnect the extension listener.
    chrome.runtime.onMessage.removeListener(handleMessage)
  }
})

export function setEnabled(value: boolean) {
  enabled = value
}
