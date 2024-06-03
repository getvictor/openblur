## QA test plan

### Static site

Use https://fleetdm.com/ or similar for testing.

- Enable/disable blurring
- Enable/disable/change a blur literal
- Ensure the secret doesn't appear (flicker) during reload.

### Static file

Use https://victoronsoftware.com/sitemap.xml or similar for testing.

- Enable/disable blurring
- Enable/disable/change a blur literal
- Note: the secret may appear (flicker) during reload because this is just a file and not an actual webpage.

### Dynamic site

Use Tines or similar for testing.

- Create a Webhook action and blur the webhook secret.
