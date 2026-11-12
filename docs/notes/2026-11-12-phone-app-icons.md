# Phone app icons, splash and offline screen

`npm run app-assets` (scripts/build-app-assets.mts) draws the YG monogram from
`brand.ts` and `tokens.ts` in Mona Sans with Playwright, and writes the iPhone
icon and launch screen, the Android launcher icons (square, round, adaptive)
and splash screens, and `mobile/www/offline.html`. The app shows the offline
page when the site can't be reached (Capacitor `server.errorPath`), with a
Try again button. A unit test checks the page and config follow the brand.
