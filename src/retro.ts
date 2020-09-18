import * as core from '@actions/core'
import * as github from '@actions/github'
import {Octokit} from '@octokit/rest'
import {default as axios} from 'axios'
import * as mustache from 'mustache'

export interface IRetroArguments {
  repoToken: string
  teamName: string
  handles: string[]
  retroCadenceInWeeks: number
  retroDayOfWeek: number
  retroTitle: string
  notificationUrl: string
  closeAfterDays: number
  createTrackingIssue: boolean
  columns: string[]
  cards: string
  onlyLog: boolean
}

/**
 * Stores information about a retro.  This information is encoded as JSON in the
 * project board description.
 */
interface IRetroInfo {
  /**
   * The team name.
   */
  team: string

  /**
   * The retro date.
   */
  date: Date

  /**
   * The retro driver GitHub handle.
   */
  driver: string

  /**
   * The offset number for the current retro driver.
   */
  offset: number
}

/**
 * Extends {@link IRetroInfo} to include information about the existing
 * project board.
 */
type IRetro = IRetroInfo & {
  /**
   * The title of the retro.
   */
  title: string

  /**
   * The URL to the project board.
   */
  url: string

  /**
   * The project board id used by the GitHub client.
   */
  projectId: number
}

type KeyToIdMap = {[key: string]: number}

/**
 * Performs all the functionality to create the retros, including:
 *
 * 1. Determining if the retro already exists and, if necessary, creating a new one.
 * 2. Opening an tracking issue and assigning to the retro driver.
 * 3. Sending a slack notification the day of the retro.
 * 4. Closing old retros.
 *
 * In order to fully utilize all this functionality, this script should be invoked
 * once a day before the scheduled retro time.  For example, if the retro is
 * scheduled on Wednesdays at 2 PM EST, the GitHub Actions workflow could, for example,
 * use:
 *
 * ```
 * on:
 *   schedule:
 *     - cron: '0 14 * * *'
 * ```
 *
 * to run every day at 10 AM EST, which is when any notifications will be sent.  If the
 * workflow is scheduled multiple times a day, multiple notifications may be sent.
 */
export async function tryCreateRetro(args: IRetroArguments): Promise<void> {
  if (!args.handles.length) {
    throw Error('requires at least one handle')
  }

  if (args.onlyLog) {
    core.info('Running in debug mode, will only log messages')
  }

  const client = new github.GitHub(args.repoToken)
  const today = newDate(0, true)
  const tomorrow = newDate(1, true)
  const lastRetro = await findLatestRetro(client, args.teamName)

  if (lastRetro) {
    core.info(
      `Last retro occurred on ${lastRetro.date} with ${lastRetro.driver} driving`
    )
  }

  // If there is already a scheduled retro in the future...
  if (lastRetro && lastRetro.date > today) {
    if (lastRetro.date < tomorrow) {
      core.info('Retro happening today, sending notification')

      if (!args.onlyLog) {
        await sendNotification(args.notificationUrl, lastRetro)
      }
    }

    return
  }

  // Otherwise, the scheduled retro is in the past or no retro found...
  const lastRetroDate = lastRetro ? lastRetro.date : new Date()
  const lastRetroDriver = lastRetro ? lastRetro.driver : ''
  const lastRetroOffset = lastRetro ? lastRetro.offset : 0

  const nextRetroDate = nextDate(
    lastRetroDate,
    args.retroDayOfWeek,
    args.retroCadenceInWeeks
  )

  const nextRetroDriver = nextDriver(
    args.handles,
    lastRetroDriver,
    lastRetroOffset
  )

  const futureRetroDriver = nextDriver(args.handles, nextRetroDriver)

  core.info(
    `Next retro scheduled for ${nextRetroDate} with ${nextRetroDriver} driving`
  )

  // Close the previous retro
  if (
    lastRetro &&
    args.closeAfterDays > 0 &&
    lastRetro.date < newDate(-args.closeAfterDays)
  ) {
    await closeBoard(client, lastRetro)
    core.info(`Closed previous retro from ${lastRetro.date}`)
  }

  const projectUrl = await createBoard(
    client,
    getFullRetroTitle(args.retroTitle, nextRetroDate, args.teamName),
    {
      date: nextRetroDate,
      team: args.teamName,
      driver: nextRetroDriver,
      offset: args.handles.indexOf(nextRetroDriver)
    },
    lastRetro,
    futureRetroDriver,
    args.columns,
    args.cards,
    args.onlyLog
  )

  core.info(`Created retro board at ${projectUrl}`)

  if (args.createTrackingIssue) {
    const issueUrl = await createTrackingIssue(
      client,
      projectUrl,
      getFullRetroTitle(args.retroTitle, nextRetroDate, args.teamName),
      nextRetroDate,
      nextRetroDriver,
      args.onlyLog
    )

    core.info(`Created tracking issue at ${issueUrl}`)
  }
}

/**
 * Determines the next retro driver.  Retro drivers are selected in the order they appear
 * in the list of GitHub handles.
 *
 * @param handles array of GitHub handles
 * @param lastDriver the GitHub handle of the last retro driver, or '' if no previous retros found
 * @param lastOffset the offset of the last retro driver
 */
export function nextDriver(
  handles: string[],
  lastDriver: string,
  lastOffset: number = 0
): string {
  if (lastDriver) {
    let pos = handles.indexOf(lastDriver)

    // If the handle is not found, use the last offset to ensure fairness.
    if (pos < 0) {
      pos = lastOffset - 1
    }

    return handles[(pos + 1) % handles.length]
  } else {
    return handles[0]
  }
}

/**
 * Prefix used in the project board description to identify projects created
 * by this code.
 */
const bodyPrefix = 'Retrobot: '

/**
 * Encodes an IRetroInfo object into a string that can be stored in the
 * project board description or elsewhere.
 *
 * @param info the IRetroInfo object to encode
 */
function toProjectDescription(info: IRetroInfo): string {
  return bodyPrefix + JSON.stringify(info)
}

/**
 * Parses a string containing an encoded IRetroInfo object that was produced
 * by {@link toProjectDescription}.
 *
 * @param info the string representation
 * @returns the parsed IRetroInfo object
 */
function parseProjectDescription(info: string): IRetroInfo {
  if (info.startsWith(bodyPrefix)) {
    const content = JSON.parse(info.substring(bodyPrefix.length))

    return {
      team: content['team'],
      date: new Date(content['date']),
      driver: content['driver'],
      offset: parseInt(content['offset'])
    }
  } else {
    throw Error(`not a valid retro body: ${info}`)
  }
}

/**
 * Finds the last retro.
 *
 * @param client the GitHub client
 * @param teamName the team name, or '' if not defined
 * @returns information about the last retro, or undefined if no matching retro found
 */
async function findLatestRetro(
  client: github.GitHub,
  teamName: string
): Promise<IRetro | undefined> {
  core.info('Locating the last retro...')

  const projects = await client.projects.listForRepo({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo
  })

  core.info(`Found ${projects.data.length} projects in this repo`)

  const parseRetro = (
    proj: Octokit.ProjectsListForRepoResponseItem
  ): IRetro => {
    const info = parseProjectDescription(proj.body)

    return {
      title: proj.name,
      url: proj.html_url,
      projectId: proj.id,
      date: info.date,
      team: info.team,
      driver: info.driver,
      offset: info.offset
    }
  }

  const sorted = projects.data
    .filter(proj => proj.body.startsWith(bodyPrefix))
    .map(proj => parseRetro(proj))
    .filter(proj => (teamName ? teamName === proj.team : !proj.team))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .reverse()

  core.info(`Found ${sorted.length} retro projects for this repo`)

  return sorted.length > 0 ? sorted[0] : undefined
}

/**
 * Creates a new date object.
 *
 * @param offsetDays when set, specifies the number of days to offset from today
 * @param atMidnight when true, the time will be set to midnight
 */
function newDate(offsetDays: number = 0, atMidnight: boolean = false): Date {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)

  if (atMidnight) {
    date.setHours(0, 0, 0, 0)
  }

  return date
}

/**
 * Returns the date of the next retro.
 *
 * @param lastRetroDate the date of the last retro, or an initial date if no previous retros scheduled
 * @param retroDayOfWeek the day of week to schedule the retro, from 0-7 where 0 is Sunday
 * @param retroCadenceInWeeks the frequency of retros, in weeks
 */
export function nextDate(
  lastRetroDate: Date,
  retroDayOfWeek: number,
  retroCadenceInWeeks: number
): Date {
  let date = new Date(lastRetroDate)
  date.setDate(date.getDate() + retroCadenceInWeeks * 7)

  if (date < new Date()) {
    date = new Date()
    date.setDate(date.getDate() + (retroCadenceInWeeks - 1) * 7)
  }

  // adjust day of week if necessary
  const daysToAdd = (7 + retroDayOfWeek - date.getDay()) % 7
  date.setDate(date.getDate() + daysToAdd)

  return date
}

/**
 * Converts the given date into a human readable string in the form DD-MM-YYYY.
 *
 * @param date the date
 */
function toReadableDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Returns the title of the retro.
 *
 * @param retroTitle custom title text, or '' to use the default
 * @param retroDate the date of the retro
 * @param teamName the team name, or '' if no team is set
 */
function getFullRetroTitle(
  retroTitle: string,
  retroDate: Date,
  teamName: string
): string {
  const readableDate = toReadableDate(retroDate)

  if (retroTitle) {
    return `${retroTitle}${readableDate}`
  } else if (teamName) {
    return `${teamName} Retro on ${readableDate}`
  } else {
    return `Retro on ${readableDate}`
  }
}

/**
 * Closes the last retro board.
 *
 * @param client the GitHub client
 * @param retro the retro to close
 */
async function closeBoard(client: github.GitHub, retro: IRetro): Promise<void> {
  await client.projects.update({
    project_id: retro.projectId,
    state: 'closed'
  })
}

/**
 * Creates a new project board for the retro.
 *
 * In addition to creating the project board and setting up the columns, this also populates the
 * board with a few standard cards including:
 *
 *   1. The current retro driver
 *   2. The next retro driver
 *   3. A link to the previous retro
 *
 * These cards will be added to the last column, which should be reserved for "action items" or
 * informational use.
 *
 * @param client the GitHub client
 * @param title the title of the retro
 * @param retroInfo information used to create and schedule the new retro
 * @param lastRetro the last retro, or undefined
 * @param futureDriver the retro driver for the next retro, which hasn't been scheduled yet
 * @param columnNames custom column names, or [] to use the defaults
 */
async function createBoard(
  client: github.GitHub,
  title: string,
  retroInfo: IRetroInfo,
  lastRetro: IRetro | undefined,
  futureDriver: string,
  columnNames: string[],
  cards: string,
  logOnly: boolean
): Promise<string> {
  let projectId = 0
  let projectUrl = ''

  if (!logOnly) {
    const project = await client.projects.createForRepo({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      name: title,
      body: toProjectDescription(retroInfo)
    })

    if (!project) {
      return ''
    }

    projectId = project.data.id
    projectUrl = project.data.html_url
  }

  if (!columnNames.length) {
    columnNames = [
      'Went well',
      'Went meh',
      'Could have gone better',
      'Action items!'
    ]
  }

  const columnMap = await populateColumns(
    client,
    projectId,
    columnNames,
    logOnly
  )

  if (!cards && columnNames.length > 0) {
    // TODO: For backwards compat, create default cards
    const lastColumnName = columnNames[columnNames.length-1]

    cards = `Today's retro driver: {{ driver }} => ${lastColumnName}
      Next retro driver: {{ next-driver }} => ${lastColumnName}
      {{ #last-retro }}Last retro: {{ url }}{{ /last-retro }} => ${lastColumnName}`
  }

  if (cards) {
    const view = createView(title, retroInfo, lastRetro, futureDriver)
    await populateCards(client, cards, view, columnMap, logOnly)
  }

  return projectUrl
}

interface ILastRetroView {
  title: string
  date: string
  driver: string
  url: string
}

interface IRetroView {
  title: string
  date: string
  driver: string
  team: string
  'next-driver': string
  'last-retro': ILastRetroView | undefined
}

function createView(
  title: string,
  retroInfo: IRetroInfo,
  lastRetro: IRetro | undefined,
  futureDriver: string
): IRetroView {
  const view: IRetroView = {
    title,
    date: toReadableDate(retroInfo.date),
    driver: retroInfo.driver,
    team: retroInfo.team,
    'next-driver': futureDriver,
    'last-retro': undefined
  }

  if (lastRetro) {
    view['last-retro'] = {
      title: lastRetro.title,
      date: toReadableDate(lastRetro.date),
      driver: lastRetro.driver,
      url: lastRetro.url
    }
  }

  return view
}

async function populateColumns(
  client: github.GitHub,
  projectId: number,
  columnNames: string[],
  logOnly: boolean
): Promise<KeyToIdMap> {
  const columnMap: KeyToIdMap = {}

  for (const name of columnNames) {
    core.info(`Creating column '${name}'`)

    if (!logOnly) {
      const column = await client.projects.createColumn({
        project_id: projectId,
        name
      })

      columnMap[name] = column.data.id
    }
  }

  return columnMap
}

async function populateCards(
  client: github.GitHub,
  cards: string,
  view: IRetroView,
  columnMap: KeyToIdMap,
  logOnly: boolean
): Promise<void> {
  if (!cards) {
    core.info('No cards to render')
    return
  }

  for (const card of cards.split('\n').map(c => c.trim()).reverse()) {
    const parts = card.split('=>').map(p => p.trim())

    const text = mustache.render(parts[0], view)
    const column = parts[1]

    if (text) {
      core.info(`Adding card '${text}' to column '${column}'`)

      if (!logOnly) {
        const columnId = columnMap[column]

        if (columnId) {
          await client.projects.createCard({
            column_id: columnId,
            note: text
          })
        } else {
          core.info(`Card not rendered, no matching column: ${column}`)
        }
      }
    } else {
      core.info(`Card not rendered, text is empty: ${parts[0]}`)
    }
  }
}

/**
 * Creates a tracking issue for the retro driver.
 *
 * @param client the GitHub client
 * @param projectUrl the project board url
 * @param title the title of the retro
 * @param retroDate the date of the retro
 * @param retroDriver the GitHub handle of the retro driver
 */
async function createTrackingIssue(
  client: github.GitHub,
  projectUrl: string,
  title: string,
  retroDate: Date,
  retroDriver: string,
  logOnly: boolean
): Promise<string> {
  const readableDate = toReadableDate(retroDate)
  let issueUrl = ''

  if (!logOnly) {
    const issue = await client.issues.create({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      title,
      body: `Hey @${retroDriver},
      
  You are scheduled to drive the next retro on ${readableDate}. The retro board has been created at ${projectUrl}. Please remind the team beforehand to fill out their cards.

  Need help? Found a bug? Visit https://github.com/dhadka/retrobot.

  Best Regards,

  Retrobot`
    })

    await client.issues.addAssignees({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      issue_number: issue.data.number,
      assignees: [retroDriver]
    })

    issueUrl = issue.data.html_url
  }

  return issueUrl
}

/**
 * Sends a slack notification announcing a retro is scheduled for today.
 *
 * @param notificationUrl the incoming webhooks notification url
 * @param retro information about the upcoming retro
 */
async function sendNotification(
  notificationUrl: string,
  retro: IRetro
): Promise<void> {
  const body = {
    username: 'Retrobot',
    text: `<!here|here> A retro is scheduled for today! Visit <${retro.url}|the retro board> to add your cards. CC retro driver @${retro.driver}.`,
    icon_emoji: ':rocket:',
    link_names: 1
  }

  const res = await axios.post(notificationUrl, body)
  core.info(res.statusText)
}
