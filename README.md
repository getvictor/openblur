# OpenBlur Chrome extension

Automatically hide and blur sensitive information on any webpage.

This project is under active development. Pull requests and issues are welcome.

## Use cases

- Hide sensitive information in presentations, videos and screenshots.
- Blur sensitive information in public places such as coffee shops.

## Examples of sensitive information

- Personal information (e.g. names, addresses, phone numbers, emails).
- Technical information (e.g. IP addresses, serial numbers, API tokens).
- Financial information (e.g. credit card numbers, bank account numbers).
- Any other information that you don't want to be seen by others.

## Install OpenBlur video instructions

[![Install OpenBlur Chrome extension](http://img.youtube.com/vi/0uQiV4Bxc5I/0.jpg)](http://www.youtube.com/watch?v=0uQiV4Bxc5I)

## Building the extension for release and distribution

- Run `npm version X.X.X --no-git-tag-version` to update the version in `package.json` and `package-lock.json`
- Update `static/manifest.json` with the new version number
- `rm -rf dist`
- Run `npm run build` to generate the new `dist` folder
- `cd dist && zip -vr openblur.zip . -x "*.DS_Store"`
- Upload `openblur.zip` to the Chrome Web Store Developer Dashboard and the new GitHub release
