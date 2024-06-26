## Building the extension for release and distribution

- Run `npm version X.X.X --no-git-tag-version` to update the version in `package.json` and `package-lock.json`
- Update `static/manifest.json` with the new version number
- `rm -rf dist`
- Run `npm run build` to generate the new `dist` folder
- `cd dist && zip -vr openblur.zip . -x "*.DS_Store"`
- Upload `openblur.zip` to the Chrome Web Store Developer Dashboard and the new GitHub release
