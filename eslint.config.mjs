// @ts-check

import eslint from "@eslint/js"
import tseslint from "typescript-eslint"

const config = tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    ignores: ["dist/**/*"],
  },
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
)

// noinspection JSUnusedGlobalSymbols
export default config
