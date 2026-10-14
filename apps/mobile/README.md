# renton-mobile (not built yet)

iOS and Android app from one codebase.

## Planned stack

- React Native with Expo; builds and store submissions through EAS
- Uses `renton-shared` for domain types, reference data (cities, property types, budgets) and the API client
- Talks only to `apps/api`; sign-in uses the same JWTs as the web app
- Push notifications through Expo Push for application decisions, rent reminders and repair updates


