
# Delete Sentry Releases

GitHub Action to delete Sentry releases after a set time of inactivity.

## Quickstart

- Sample workflow:

  ```yaml
  on:
    workflow_dispatch:
    schedule:
      - cron: '0 15 * * 1'

  jobs:
    delete-sentry-releases:
      runs-on: ubuntu-latest
      timeout-minutes: 5

      steps:
        - name: Do action
          uses: nefrob/sentry-release-deletion@v1.0.0
          with:
            sentryToken: 'YOUR_SENTRY_API_ACCESS_TOKEN_WITH_RELEASES_SCOPE'
            organization: 'YOUR_SENTRY_ORGANIZATION_NAME'
            inactiveDays: 30
  ```
