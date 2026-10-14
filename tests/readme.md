Check Node (18 or newer):
   node -v
Create a new project:
   mkdir ~/playwright_practice && cd ~/playwright_practice
   npm init playwright@latest

Answer the prompts as follows:

Language: JavaScript
Tests folder: tests
GitHub Actions: No
Install browsers: Yes

The installer creates playwright.config.js, tests/example.spec.js and package.json, and downloads the browsers.

Copy my file in. Put dynamic-elements.spec.js in the tests folder.
Limit the config to one browser, to keep runs fast. In playwright.config.js, keep only the chromium project in the projects array and delete the firefox and webkit entries. Also set workers: 1.
Run the sample test first to confirm setup works:
   npx playwright test example.spec.js --project=chromium --headed

This should finish in a few seconds. It uses playwright.dev, not the practice site.

Then run the practice file:
   npx playwright test dynamic-elements.spec.js --project=chromium --headed --reporter=list
View the report after a run:
   npx playwright show-report

If step 5 hangs, the problem is your machine or network, not my script. Check for a VPN, a proxy or a stuck install. In that case, run npx playwright install chromium again and send me the output.