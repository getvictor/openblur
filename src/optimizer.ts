// This file tracks what has been blurred on the page.

const countSlack = 5
const recentMs = 300

interface BlurredItem {
    blurredAt: Date;
    recentCount: number;
}

const blurredMap = new Map<string, BlurredItem>()

function getUniquePath(element: HTMLElement): string {
    if (element.id && element.id !== "") {
        return `id("${element.id}")`
    }
    if (element.parentElement === null) {
        return element.tagName;
    }

    let siblingIndex= 0
    const siblings = element.parentElement.childNodes
    // If there is only one sibling, then no need to add an index
    for (let i = 1; i < siblings.length; i++) {
        if (siblings[i] instanceof HTMLElement) {
            const sibling= siblings[i] as HTMLElement
            if (sibling === element) {
                return `${getUniquePath(element.parentElement)}/${element.tagName}[${siblingIndex}]`
            }
            if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === element.tagName) {
                siblingIndex++;
            }
        }
    }
    return `${getUniquePath(element.parentNode as HTMLElement)}/${element.tagName}`
}

const Optimizer = {
    addElement: (elem: HTMLElement) : boolean => {
        const path = getUniquePath(elem)
        const now = new Date()
        if (blurredMap.has(path)) {
            // Element has already been blurred
            const item = blurredMap.get(path)!
            const diff = now.getTime() - item.blurredAt.getTime()
            if (diff < recentMs) {
                if (item.recentCount > countSlack) {
                    // Element has been blurred too many times recently. This is a performance issue.
                    return false
                }
                item.blurredAt = now
                item.recentCount++
            } else {
                item.blurredAt = now
                item.recentCount = 1
            }
        } else {
            blurredMap.set(path, { blurredAt: now, recentCount: 1 })
        }
        return true
    },
    removeElement: (elem: HTMLElement) => {
        const path = getUniquePath(elem)
        blurredMap.delete(path)
    },
    clear: () => {
        blurredMap.clear()
    },
}

export default Optimizer
