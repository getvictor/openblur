import CopyWebpackPlugin from "copy-webpack-plugin";

module.exports = {
    entry: {
        background: './src/background.ts',
        content: './src/content.ts',
        popup: './src/popup.ts',
    },
    resolve: {
        extensions: [".ts"],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                loader: "ts-loader",
                exclude: /node_modules/,
            },
        ],
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                { from: "./src/manifest.json" },
                { from: "./src/popup.html" },
                { from: "./src/popup.css" },
            ],
        }),
    ],
    optimization: {
        minimize: false,
    },
}
