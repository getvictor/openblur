// @ts-check

import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'

let config = tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    // ...tseslint.configs.recommendedTypeChecked,
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
