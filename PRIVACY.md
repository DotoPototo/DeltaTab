# Delta Tab privacy policy

_Last updated: 9 November 2026_

Delta Tab is a browser extension that replaces your new tab page with a wallpaper, a clock and an optional dashboard of widgets. It has no account, no analytics, no advertising and no server of its own. The developer receives none of your data.

## What is stored on your device

Delta Tab keeps these in your browser's own extension storage:

- your settings, dashboard layout and widget settings, including the places, countries, repositories, feed addresses and status pages you choose;
- your notes (Scratchpad);
- your wallpapers, and the colours worked out from them;
- cached copies of what widgets fetched, so new tabs open instantly and work offline. These include feed items, forecasts, holidays, release notes and, if you connect GitHub, your GitHub username and the titles, repositories, authors, links and check status of your pull requests (including those in private repositories);
- your GitHub access token, if you add one. It is kept apart from your other settings and is never included in a backup.

None of this is sent to the developer. Some of it is sent to the service it is for, as the next section explains. A backup file contains your settings, layout and notes (not your wallpapers or GitHub token), and is only created when you choose to export one.

**Browsing history and top sites.** The Recent Work widget can read your browsing history, and the Shortcuts widget your most-visited sites. Each needs your permission, which the browser asks for when you choose "Allow access" on the widget. They are read and matched on your device, and nothing about them is sent anywhere.

## What is sent, to whom, and when

Delta Tab talks directly to the services below. Nothing goes through a Delta Tab server, because there isn't one. Delta Tab only requests https:// addresses, and ignores any response that a site redirects to plain HTTP.

| Feature | Sent to | What is sent | When |
| --- | --- | --- | --- |
| Daily wallpaper (on by default) | Wikimedia, or Bing if you choose it | a request for today's image (nothing about you). Bing's request includes your browser language, to pick the regional image. | when a new tab opens, and a few times a day in the background, while a daily source is selected |
| Weather | [Open-Meteo](https://open-meteo.com/en/terms) | the place you choose (coordinates), and the text you type when searching for it | only after you allow Weather to share it, then when the forecast refreshes |
| Calendar holidays | [Nager.Date](https://date.nager.at) | your country | only after you allow Calendar holidays to share it, then when the calendar refreshes |
| Calendar settings | Nager.Date | a request for the list of supported countries (nothing about you) | when you open the Calendar's settings |
| GitHub | [GitHub](https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement) | your GitHub access token | only after you allow GitHub to share it, then when the widget refreshes |
| Release Radar | GitHub | the names of the repositories you track, and your access token if you've allowed GitHub to share it | when the widget refreshes |
| Feeds | Hacker News (through Algolia's search service), Reddit, Lobsters, and the feed addresses you add | a request for each feed, at the address you gave | when you add a feed (to check it works) and when the widget refreshes |
| Service Status | the status pages you choose | a request for each page | when you add a page (to check it works) and when the widget refreshes |

A feed or status address is sent exactly as you entered it. If it contains something private, such as a key in a private feed's link, that goes to the site it belongs to, and to wherever that site redirects the request.

Each service receives your IP address and browser details, as with any web request, and handles them under its own privacy policy.

**Your consent.** Weather, Calendar holidays and GitHub each ask before sending anything about you. They explain what is sent and where, and nothing is sent until you choose Allow. You can stop sharing for each one, separately, at any time in Settings → Data & Privacy; it stops at once, including any request that was waiting to go. Browsing history and top sites use the browser's own permission prompt, and you can revoke them in the browser's extension settings.

## What Delta Tab never does

- It does not sell, rent or share your data with anyone else.
- It does not use your data for advertising, profiling or credit decisions.
- It does not collect analytics, crash reports or usage statistics.
- It does not send your data anywhere except to the service a feature is for, as listed above.

## Limited Use

The use of information received from Chrome APIs (and the equivalent Firefox APIs) adheres to the [Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/policies), including the Limited Use requirements. Data is used only to provide the features described above, which are the extension's single purpose: a new tab page with your wallpaper, the time and an optional dashboard.

## Removing your data

- **Uninstalling** the extension deletes everything it stored in your browser.
- **Settings → Data & Privacy** lets you clear cached data, stop sharing for each feature, and reset settings.
- **Revoking access:** history and top-sites access can be revoked in the browser's extension settings, and a GitHub token can be revoked on GitHub.

## Changes

If Delta Tab ever starts handling data differently, this page will be updated first. The extension will also tell you inside the app before the change takes effect.

## Contact

Questions or concerns: open an issue at [github.com/DotoPototo/DeltaTab](https://github.com/DotoPototo/DeltaTab/issues).
