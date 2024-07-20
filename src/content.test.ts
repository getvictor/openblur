/**
 * @jest-environment jsdom
 */
import { blurFilter, handleMessage } from "./content"
import { Message } from "./constants"

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
})
