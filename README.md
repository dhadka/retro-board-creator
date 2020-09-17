# Retrobot

Retrobot is based heavily off of [c2c-actions-runtime's retro board creator](https://github.com/hross/retro-board-creator), with the following major differences:

1. Adds optional `team-name` input for distinguishing multiple teams using the same repo.
2. Encodes team name, retro date, and retro driver in the project body. Reads this information to determine the next retro date and driver.
3. Automatically adds cards pointing to the last retro and identifying the current and next retro driver.
4. Designed to be run daily as it will also close old retro boards and send a Slack notification the day of the retro.

## Example workflow

```
name: Create the Retrospective Board

on:
  schedule:
    - cron: '0 14 * * *'

jobs:
  create-board:
    runs-on: ubuntu-latest
    steps:
    - uses: dhadka/retrobot@master
      with: 
        repo-token: ${{ secrets.GITHUB_TOKEN }}
        handles: alice,bob,charlie,denise,erica
```

## Custom options

**`team-name`** - Team name to include in the retro title and announcements. This is useful if multiple teams are using retrobot within the same repo.

**`retro-cadence-weeks`** - The frequency of retros, in weeks.  The default is weekly, `2` is bi-weekly, and so on.

**`retro-day-of-week`** - The day of the week to hold the retro. `0` is Sunday, `1` is Monday, and so on.  The default is `5` (Friday).

**`retro-title`** - Custom title to use for the retro. The date of the retro is appended.  The default is `Retro on `.

**`notification-url`** - Slack incoming webhooks url to send a notification the day of the retro.  This requires the Action schedule trigger to be configured to run a few hours before the start of the retro.

**`close-after-days`** - When set, the previous retro board will be automatically closed after the given number of days.

**`create-tracking-issue`** - If `true`, will create a tracking issue for the upcoming retro and assign it to the driver.  Default is `false`.

**`only-log`** - Log what actions would be performed, but do not actually create the retro board, issue, or notifications.  Useful for testing.

## How to contribute

Install the dependencies  
```bash
$ npm install
```

Build the typescript and package it for distribution
```bash
$ npm run build && npm run pack
```

Run the tests :heavy_check_mark:  
```bash
$ npm test
```
