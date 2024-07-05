import type { Configuration } from "webpack"
import { merge } from "webpack-merge"
import config from "./webpack.common"

/*
  Note: Trying to use native ESM with webpack TS config hits the following issue:
  https://webpack.js.org/api/cli/#typeerror-err_unknown_file_extension-unknown-file-extension-ts-for-webpackconfigts
 */

const merged = merge<Configuration>(config, {
  mode: "development",
  devtool: "inline-source-map",
})

// noinspection JSUnusedGlobalSymbols
export default merged
