# renton-mobile

Renton mobile is an Expo app for discovering verified rental homes in Nigeria. It currently uses the monorepo's shared mock listing data; the API does not yet expose mobile listing or authentication endpoints.

## Run locally

```bash
npm run start -w renton-mobile
```

Press `a` to open Android, or use `npm run web -w renton-mobile` for a browser preview. iOS simulator and device builds require macOS or EAS Build.

## Current scope

- Browse published listings by city, keyword, bedrooms and annual rent
- Save homes locally on the device
- Open a listing for its details and amenities
- Expo Router navigation for native and web previews

Authentication, applications, landlord workflows and push notifications will connect after the API endpoints are available.


