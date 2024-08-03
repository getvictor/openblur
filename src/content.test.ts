/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://example.org:8080/posts/index.html"}
 */
import { blurFilter, handleMessage, setEnabled } from "./content"
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
})
