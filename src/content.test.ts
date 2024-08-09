/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://example.org:8080/posts/index.html"}
 */
import { blurFilter, handleMessage, processNode, setEnabled } from "./content"
import { Message } from "./constants"

beforeEach(() => {
  setEnabled(true)
})

describe("blur", () => {
  test("blur a secret", () => {
    document.body.innerHTML = `
    <div id="testDiv">
      "My secret"
    </div>`
    // Set value to blur as a message
    const message: Message = {
      literals: ["secret"],
    }
    handleMessage(message)
    const testDiv = document.getElementById("testDiv") as HTMLInputElement
    expect(testDiv).toBeDefined()
    expect(testDiv.style.filter).toBe(blurFilter)
  })

  test("disable for a domain", () => {
    document.body.innerHTML = `
    <div id="testDiv">
      "My secret"
    </div>`
    // Set value to blur as a message
    const message: Message = {
      literals: ["secret"],
      disabledDomains: "www.my-site.com, example.org, github.com",
    }
    handleMessage(message)
    const testDiv = document.getElementById("testDiv") as HTMLInputElement
    expect(testDiv).toBeDefined()
    expect(testDiv.style.filter).not.toBe(blurFilter)
  })

  test("disable for a domain and unblur", () => {
    document.body.innerHTML = `
    <div id="testDiv">
      "My secret"
    </div>`
    // Set value to blur as a message
    let message: Message = {
      literals: ["secret"],
    }
    handleMessage(message)
    let testDiv = document.getElementById("testDiv") as HTMLInputElement
    expect(testDiv).toBeDefined()
    expect(testDiv.style.filter).toBe(blurFilter)

    // Now we disable the domain, and expect the blur to be removed
    message = {
      disabledDomains: "www.my-site.com, example.org, github.com",
    }
    handleMessage(message)
    testDiv = document.getElementById("testDiv") as HTMLInputElement
    expect(testDiv).toBeDefined()
    expect(testDiv.style.filter).not.toBe(blurFilter)
  })

  test("unblur with text change", () => {
    document.body.innerHTML = `
    <div id="testDiv">
      "My secret"
    </div>`
    // Set value to blur as a message
    const message: Message = {
      literals: ["secret"],
    }
    handleMessage(message)
    let testDiv = document.getElementById("testDiv") as HTMLInputElement
    expect(testDiv).toBeDefined()
    expect(testDiv.style.filter).toBe(blurFilter)

    // Run again and make sure it didn't get unblurred.
    processNode(document.body, new Set<HTMLElement>())
    testDiv = document.getElementById("testDiv") as HTMLInputElement
    expect(testDiv).toBeDefined()
    expect(testDiv.style.filter).toBe(blurFilter)

    // Now we change the text, and expect the blur to be removed
    if (testDiv.firstChild) {
      testDiv.firstChild.nodeValue = "Change"
    }
    processNode(document.body, new Set<HTMLElement>())

    testDiv = document.getElementById("testDiv") as HTMLInputElement
    expect(testDiv).toBeDefined()
    expect(testDiv.style.filter).not.toBe(blurFilter)
  })

  test("unblur with text change to div", () => {
    document.body.innerHTML = `
    <div id="testDiv">
      "My secret"
    </div>`
    // Set value to blur as a message
    const message: Message = {
      literals: ["secret"],
    }
    handleMessage(message)
    let testDiv = document.getElementById("testDiv") as HTMLInputElement
    expect(testDiv).toBeDefined()
    expect(testDiv.style.filter).toBe(blurFilter)

    // Now we change the text to div, and expect the blur to be removed
    testDiv.removeChild(testDiv.firstChild as Node)
    testDiv.appendChild(document.createElement("div"))
    processNode(document.body, new Set<HTMLElement>())

    testDiv = document.getElementById("testDiv") as HTMLInputElement
    expect(testDiv).toBeDefined()
    expect(testDiv.style.filter).not.toBe(blurFilter)
  })
})
