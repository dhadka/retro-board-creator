# Retrobot

Retrobot is based heavily off of [c2c-actions-runtime's retro board creator](https://github.com/hross/retro-board-creator), with the following major differences:

1. Adds optional `team-name` input for distinguishing multiple teams using the same repo.
2. Encodes team name, retro date, and retro driver in the project body. Reads this information to determine the next retro date and driver.
3. Automatically adds cards pointing to the last retro and identifying the next retro driver.
4. Assuming the workflow schedule is configured correctly, sends a slack notification about the retro.

```
name: Create the Retrospective Board

on:
  schedule:
    - cron: '0 14 * * 3'

jobs:
  create-board:
    runs-on: ubuntu-latest
    steps:
    - uses: hross/retro-board-creator@v1
      with: 
        repo-token: ${{ secrets.GITHUB_TOKEN }}
        handles: hross,alepauly
        only-log: true
```

## How to work with this action

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

 PASS  ./index.test.js
  ✓ throws invalid number (3ms)
  ✓ wait 500 ms (504ms)
  ✓ test runs (95ms)

...
```
