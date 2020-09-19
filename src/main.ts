import * as core from '@actions/core'
import {IRetroArguments, tryCreateRetro} from './retro'

const defaultTitleTemplate = '{{ team }} Retro on {{{ date }}}'

const defaultIssueTemplate = `Hey {{ driver }},
      
You are scheduled to drive the next retro on {{ date }}. The retro board has been created at {{{ url }}}. Please remind the team beforehand to fill out their cards.

Need help? Found a bug? Visit https://github.com/dhadka/retrobot.

Best Regards,

Retrobot`

const defaultNotificationTemplate =
  '<!here|here> A retro is scheduled for today! Visit <{{{ url }}}|the retro board> to add your cards. CC retro driver @{{ driver }}.'

export function getList(name: string, options?: core.InputOptions): string[] {
  const value = getString(name, options)
  if (!value) return []
  return value.split(',').map(l => l.trim())
}

export function getString(name: string, options?: core.InputOptions & {default?: string}): string {
  return core.getInput(name, options) || (options?.default ?? '')
}

export function getInt(name: string, options?: core.InputOptions & {default?: number}): number {
  const value = parseInt(core.getInput(name, options))
  
  if (isNaN(value)) {
    return options?.default ?? NaN
  }

  return value
}

export function getBoolean(name: string, options?: core.InputOptions): boolean {
  return getString(name, options).toLowerCase() === 'true'
}

async function run(): Promise<void> {
  core.info('Starting retro creator')

  try {
    const args: IRetroArguments = {
      repoToken: getString('repo-token', {required: true}),
      teamName: getString('team-name'),
      handles: getList('handles', {required: true}),
      retroCadenceInWeeks: getInt('retro-cadence-weeks', {default: 1}),
      retroDayOfWeek: getInt('retro-day-of-week', {default: 5}),
      titleTemplate: getString('title-template', {default: defaultTitleTemplate}),
      notificationUrl: getString('notification-url'),
      notificationTemplate: getString('notification-template', {default: defaultNotificationTemplate}),
      closeAfterDays: getInt('close-after-days', {default: 0}),
      createTrackingIssue: getBoolean('create-tracking-issue'),
      issueTemplate: getString('issue-template', {default: defaultIssueTemplate}),
      columns: getList('columns'),
      cards: getString('cards'),
      onlyLog: getBoolean('only-log')
    }

    core.info('Arguments parsed. Starting creation.')

    await tryCreateRetro(args)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
