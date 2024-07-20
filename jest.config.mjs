/** @type {import('ts-jest').JestConfigWithTsJest} **/
// noinspection JSUnusedGlobalSymbols
export default {
  setupFiles: ["./__mocks__/chrome.js"],
  testEnvironment: "node",
  transform: {
    "^.+.tsx?$": ["ts-jest", {}],
  },
}
