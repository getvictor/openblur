import { Configuration } from "webpack"
import { merge } from "webpack-merge"
import config from "./webpack.common"

const merged = merge<Configuration>(config, {
  mode: "production",
  devtool: "source-map",
})

// noinspection JSUnusedGlobalSymbols
export default merged
