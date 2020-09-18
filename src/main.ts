import * as core from '@actions/core'
import {IRetroArguments, tryCreateRetro} from './retro'

const defaultTitleTemplate = '{{ team }} Retro on {{ date }}'

const defaultIssueTemplate = `Hey {{ driver }},
      
You are scheduled to drive the next retro on {{ date }}. The retro board has been created at {{ url }}. Please remind the team beforehand to fill out their cards.

Need help? Found a bug? Visit https://github.com/dhadka/retrobot.

Best Regards,

Retrobot`

const defaultNotificationTemplate =
  '<!here|here> A retro is scheduled for today! Visit <{{{ url }}}|the retro board> to add your cards. CC retro driver @{{ driver }}.'

function parseCSV(s: string): string[] {
  if (!s) return []
  return s.split(',').map(l => l.trim())
}

async function run(): Promise<void> {
  core.info('Starting retro creator')

  try {
    const args: IRetroArguments = {
      repoToken: core.getInput('repo-token', {required: true}),
      teamName: core.getInput('team-name'),
      handles: parseCSV(core.getInput('handles', {required: true})),
      retroCadenceInWeeks: parseInt(core.getInput('retro-cadence-weeks')) ?? 1,
      retroDayOfWeek: parseInt(core.getInput('retro-day-of-week')) ?? 5,
      titleTemplate: core.getInput('title-template') || defaultTitleTemplate,
      notificationUrl: core.getInput('notification-url'),
      notificationTemplate: core.getInput('notification-template') || defaultNotificationTemplate,
      closeAfterDays: parseInt(core.getInput('close-after-days')) ?? 0,
      createTrackingIssue: core.getInput('create-tracking-issue') === 'true',
      issueTemplate: core.getInput('issue-template') || defaultIssueTemplate,
      columns: parseCSV(core.getInput('columns')),
      cards: core.getInput('cards'),
      onlyLog: core.getInput('only-log') === 'true'
    }

    core.info('Arguments parsed. Starting creation.')

    await tryCreateRetro(args)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
