import * as core from '@actions/core'
import * as github from '@actions/github'
import {Octokit} from '@octokit/rest'
import {default as axios} from 'axios'

export interface IRetroArguments {
  repoToken: string
  teamName: string
  handles: string[]
  retroCadenceInWeeks: number
  retroDayOfWeek: number
  retroTitle: string
  notificationUrl: string
  closeAfter: number
  onlyLog: boolean
}

type IRetro = IRetroInfo & {
  title: string
  url: string
  projectId: number
}

interface IRetroInfo {
  team: string
  date: Date
  driver: string
}

const bodyPrefix = 'Retrobot: '

function toRetroBody(team: string, date: Date, driver: string): string {
  return (
    bodyPrefix +
    JSON.stringify({
      team: team,
      date: date,
      driver: driver
    })
  )
}

function parseRetroBody(info: string): IRetroInfo {
  if (info.startsWith(bodyPrefix)) {
    let content = JSON.parse(info.substring(bodyPrefix.length))

    return {
      team: content['team'],
      date: new Date(content['date']),
      driver: content['driver']
    }
  } else {
    throw Error(`not a valid retro body: ${info}`)
  }
}

async function sendNotification(notificationUrl: string, retro: IRetro) {
  let body = {
    username: 'Upcoming Retro',
    text: `A retro is scheduled for today! Visit ${retro.url} to add your cards. @${retro.driver} will be driving today's retro.`,
    icon_emoji: ':pickachu-dance:',
    link_names: 1
  }

  let res = await axios.post(notificationUrl, body)
  console.log(res)
}

export async function tryCreateRetro(args: IRetroArguments): Promise<void> {
  const client = new github.GitHub(args.repoToken)

  const today = newDate(0, true)
  const tomorrow = newDate(1, true)

  const lastRetro = await findLatestRetro(client, args.teamName)

  // If there is already a scheduled retro in the future...
  if (lastRetro && lastRetro.date > today) {
    core.info(
      `Retro scheduled on ${lastRetro.date} with ${lastRetro.driver} driving`
    )

    if (lastRetro.date < tomorrow) {
      core.info('Retro happening today, sending notification')

      if (!args.onlyLog) {
        sendNotification(args.notificationUrl, lastRetro)
      }
    }

    return
  }

  // Otherwise, the scheduled retro is in the past or no retro found...
  const lastRetroDate = lastRetro ? lastRetro.date : new Date()
  const lastRetroDriver = lastRetro ? lastRetro.driver : ''

  const nextRetroDate = nextDate(
    lastRetroDate,
    args.retroDayOfWeek,
    args.retroCadenceInWeeks
  )

  const nextRetroDriver = nextDriver(args.handles, lastRetroDriver)
  const futureRetroDriver = nextDriver(args.handles, nextRetroDriver)

  core.info(
    `Next retro scheduled for ${nextRetroDate} with ${nextRetroDriver} driving`
  )

  if (!args.onlyLog) {
    if (lastRetro && args.closeAfter > 0 && lastRetro.date < newDate(-args.closeAfter)) {
      await closeBoard(client, lastRetro)
      core.info(`Closed previous retro from ${lastRetro.date}`)
    }

    const projectUrl = await createBoard(
      client,
      args.retroTitle,
      nextRetroDate,
      args.teamName,
      nextRetroDriver,
      lastRetro,
      futureRetroDriver
    )

    core.info(`Created retro board at ${projectUrl}`)

    const issueUrl = await createTrackingIssue(
      client,
      projectUrl,
      getFullRetroTitle(args.retroTitle, nextRetroDate, args.teamName),
      nextRetroDate,
      nextRetroDriver
    )

    core.info(`Created tracking issue at ${issueUrl}`)
  } else {
    core.info(
      `Skipping project/issue creation because we are running in log mode only.`
    )
  }
}

function nextDriver(handles: string[], lastDriver: string): string {
  if (lastDriver) {
    const pos = handles.indexOf(lastDriver)
    return handles[(pos + 1) % handles.length]
  } else {
    return handles[0]
  }
}

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
    const info = parseRetroBody(proj.body)

    return {
      title: proj.name,
      url: proj.html_url,
      projectId: proj.id,
      date: info.date,
      team: info.team,
      driver: info.driver
    }
  }

  const sorted = projects.data
    .filter(proj => proj.body.startsWith(bodyPrefix))
    .map(proj => parseRetro(proj))
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  core.info(`Found ${sorted.length} retro projects for this repo`)

  return sorted.length > 0 ? sorted[0] : undefined
}

function newDate(offsetDays: number = 0, atMidnight: boolean = false): Date {
  let date = new Date()
  date.setDate(date.getDate() + offsetDays)

  if (atMidnight) {
    date.setHours(0, 0, 0, 0)
  }

  return date
}

function nextDate(
  lastRetroDate: Date,
  retroDayOfWeek: number,
  retroCadenceInWeeks: number
): Date {
  let nextDate = new Date(lastRetroDate)
  nextDate.setDate(nextDate.getDate() + retroCadenceInWeeks * 7)

  if (nextDate < new Date()) {
    nextDate = new Date()
    nextDate.setDate(nextDate.getDate() + (retroCadenceInWeeks - 1) * 7)
  }

  // adjust day of week if necessary
  const daysToAdd = (7 + retroDayOfWeek - nextDate.getDay()) % 7
  nextDate.setDate(nextDate.getDate() + daysToAdd)

  return nextDate
}

function toReadableDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

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

async function closeBoard(
  client: github.GitHub,
  retro: IRetro
): Promise<void> {
  await client.projects.update({
    project_id: retro.projectId,
    state: "closed"
  })
}

async function createBoard(
  client: github.GitHub,
  title: string,
  date: Date,
  team: string,
  currentDriver: string,
  lastRetro: IRetro | undefined,
  nextDriver: string
): Promise<string> {
  const project = await client.projects.createForRepo({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    name: getFullRetroTitle(title, date, team),
    body: toRetroBody(team, date, currentDriver)
  })

  if (!project) {
    return ''
  }

  const columnNames = [
    'Went well',
    'Went meh',
    'Could have gone better',
    'Action items!'
  ]
  const columnMap: {[name: string]: number} = {}

  for (const name of columnNames) {
    const column = await client.projects.createColumn({
      project_id: project.data.id,
      name
    })

    columnMap[name] = column.data.id
  }

  await client.projects.createCard({
    column_id: columnMap['Action items!'],
    note: `Today's retro driver: ${currentDriver}`
  })

  await client.projects.createCard({
    column_id: columnMap['Action items!'],
    note: `Next retro driver: ${nextDriver}`
  })

  if (lastRetro) {
    await client.projects.createCard({
      column_id: columnMap['Action items!'],
      note: `Last retro: ${lastRetro.url}`
    })
  }

  return project.data.html_url
}

async function createTrackingIssue(
  client: github.GitHub,
  projectUrl: string,
  title: string,
  retroDate: Date,
  retroDriver: string
): Promise<string> {
  const readableDate = toReadableDate(retroDate)

  const issue = await client.issues.create({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    title: title,
    body: `Hey @${retroDriver},\n\nYou are scheduled to drive the next retro on ${retroDate}. The retro board has been created at ${projectUrl}. Please remind the team beforehand to fill out their cards.\n\nBest Regards,\nRetrobot`
  })

  await client.issues.addAssignees({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: issue.data.number,
    assignees: [retroDriver]
  })

  return issue.data.html_url
}
