// @ts-check

import tseslint from 'typescript-eslint'

let config = tseslint.config(
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
    {
        ignores: ["dist/**/*"],
    },
    {
        languageOptions: {
            parserOptions: {
                project: "./tsconfig.json"
            }
        }
    }
)

export default config
