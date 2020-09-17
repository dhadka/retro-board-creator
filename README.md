# Retrobot

Retrobot is based heavily off of [hross/retro-board-creator](https://github.com/hross/retro-board-creator), with the following additions:

1. Adds `team-name` input to distinguish multiple teams using the same repo.
2. Stores and reads the current retro settings in the project description (encoded as JSON).
3. As a result, the retro date and driver can be updated by modifying the JSON. This makes it easy to skip weeks, change drivers, etc.
4. Initializes the retro board with cards showing the current driver, the next driver, and a link to the last retro.
5. Option to send slack notifications on the day of the retro.
6. Option to close prior retro boards.
7. Option to customize the retro board columns.

## Example workflow

```
name: Create the Retrospective Board

on:
  schedule:
    - cron: '0 14 * * *'

jobs:
  create-board:
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

**`columns`** - Comma separated list of column names. If not specified, defaults to `"Went well", "Went meh", "Could have gone better", Action items!"`.  The last column is prepopulated with cards indicating the current and next retro driver.

**`only-log`** - Log what actions would be performed, but do not actually create the retro board, issue, or notifications.  Useful for testing.

## Changing the schedule

Retrobot uses information stored in the project board description.  It is encoded as a JSON string and can be easily edited to change the upcoming retro schedule.

### Changing date

Does the retro fall on a holiday?  Need to reschedule it to a different day or week?  Find and change the `date` field in the JSON.  Retrobot will automatically use the new date.  Furthermore, the subsequent retro will be scheduled approximately N weeks, where N is the `retro-cadence-weeks` value, from the new date.

### Changing cadence or day of week

Modify the `retro-cadence-weeks` and/or `retro-day-of-week` settings in the Action workflow.  You will need to manually changing any existing retro project boards, but all future retros will use the new schedule.

### Changing retro driver

The retro driver order can be changed at any time by editing the `handles` setting.  You can also add or remove handles at any time.  However, this will not change any existing retro project boards.  If you need update the driver for the existing retro, please make the following changes:

1. Update the `driver` field in the JSON
2. Edit the `handles` setting in the Actions workflow file to correct the sequence.

This is necessary to keep the ordering of retro drivers consistent.  Just changing the `driver` field will disrupt the sequence.  For example, if `bob` and `erica` need to swap their dates, you would change the workflow as follows:

**Before:**
```
handles: alice,bob,charlie,denise,erica
```

**After:**
```
handles: alice,erica,charlie,denise,bob
```

This ensures the retro driver sequence for all other individuals is unchanged. `erica` will be the next retro driver, followed by `charlie`, `denise`, `bob`, and `alice` before repeating.

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
