import * as core from '@actions/core'

import {IRetroArguments, tryCreateRetro} from './retro'

function parseCommaSeparatedString(s: string): string[] {
  if (!s) return []
  return s.split(',').map(l => l.trim())
}

async function run(): Promise<void> {
  core.info('Starting retro creator')

  try {
    const args: IRetroArguments = {
      repoToken: core.getInput('repo-token', {required: true}),
      teamName: core.getInput('team-name'),
      handles: parseCommaSeparatedString(
        core.getInput('handles', {required: true})
      ),
      retroCadenceInWeeks: parseInt(core.getInput('retro-cadence-weeks')) ?? 1,
      retroDayOfWeek: parseInt(core.getInput('retro-day-of-week')) ?? 5,
      retroTitle: core.getInput('retro-title'),
      notificationUrl: core.getInput('notification-url'),
      closeAfterDays: parseInt(core.getInput('close-after-days')) ?? 0,
      createTrackingIssue: core.getInput('create-tracking-issue') === 'true',
      columns: parseCommaSeparatedString(core.getInput('columns')),
      onlyLog: core.getInput('only-log') === 'true'
    }

    core.info('Arguments parsed. Starting creation.')

    await tryCreateRetro(args)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
