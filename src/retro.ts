import * as core from '@actions/core'
import * as github from '@actions/github'
import { Octokit } from '@octokit/rest'
import { default as axios } from 'axios'

export interface IRetroArguments {
  repoToken: string
  teamName: string
  handles: string[]
  retroCadenceInWeeks: number
  retroDayOfWeek: number
  retroTitle: string
  notificationUrl: string
  onlyLog: boolean
}

type IRetro = IRetroInfo & {
  title: string,
  url: string
}

interface IRetroInfo {
  team: string,
  date: Date,
  driver: string
}

const bodyPrefix = "Retrobot: "

function toRetroBody(team: string, date: Date, driver: string): string {
  return bodyPrefix + JSON.stringify({
    team: team,
    date: date,
    driver: driver
  })
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
    'username': 'Upcoming Retro',
    'text': `Visit ${retro.url} to add your cards.`,
    'icon_emoji': ':pickachu-dance:',
    'link_names':  1
  }

  let res = await axios.post(notificationUrl, body)
  console.log(res)
}

export async function tryCreateRetro(args: IRetroArguments): Promise<void> {
  const client = new github.GitHub(args.repoToken)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate()+1)

  core.info('Looking for latest retro date...')

  // find the last retro
  const lastRetro = await findLatestRetro(client, args.teamName)

  // If there is a retro and it's in the future, handle it.
  if (lastRetro) {
    if (lastRetro.date > today && lastRetro.date < tomorrow) {
      core.info("Retro happening today, sending notification")
      if (!args.onlyLog) {
        sendNotification(args.notificationUrl, lastRetro)
      }
      return
    } else if (lastRetro.date > today) {
      core.info("Retro hasn't happened yet, skip creating a new one")
      return
    }
  }

  // Otherwise, there is a retro in the past or no retro at all. Create a new one.
  const lastRetroDate = lastRetro ? lastRetro.date : new Date()
  const lastRetroDriver = lastRetro ? lastRetro.driver : ''

  const nextRetroDate = nextDate(
    lastRetroDate,
    args.retroDayOfWeek,
    args.retroCadenceInWeeks
  )

  const nextRetroDriver = nextDriver(args.handles, lastRetroDriver)
  const futureRetroDriver = nextDriver(args.handles, nextRetroDriver)

  core.info(`Next retro scheduled for ${nextRetroDate} with ${nextRetroDriver} driving`)

  if (!args.onlyLog) {
    const projectUrl = await createBoard(
      client,
      args.retroTitle,
      nextRetroDate,
      args.teamName,
      nextRetroDriver,
      lastRetro,
      futureRetroDriver
    )

    //await createTrackingIssue(client, projectUrl, nextRetroDriver)
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

// look at all of the repo projects and give back the last retro
async function findLatestRetro(
  client: github.GitHub,
  teamName: string
): Promise<IRetro | undefined> {
  const projects = await client.projects.listForRepo({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo
  })

  const parseRetro = (proj: Octokit.ProjectsListForRepoResponseItem): IRetro => {
    const info = parseRetroBody(proj.body)

    return {
      title: proj.name,
      url: proj.html_url,
      date: info.date,
      team: info.team,
      driver: info.driver
    }
  }

  core.info(`Found ${projects.data.length} for this repo`)

  const sorted = projects.data
    .filter(proj => proj.body.startsWith(bodyPrefix))
    .map(proj => parseRetro(proj))
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  core.info(`Found ${sorted.length} retro projects for this repo`)

  return sorted.length > 0 ? sorted[0] : undefined
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

function getFullRetroTitle(
  retroTitle: string,
  retroDate: Date,
  teamName: string
): string {
  const readableDate = retroDate.toLocaleDateString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })

  if (retroTitle) {
    return `${retroTitle}${readableDate}`
  } else if (teamName) {
    return `${teamName} Retro on ${readableDate}`
  } else {
    return `Retro on ${readableDate}`
  }
}

// create the retro board and return the URL
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

  const columnNames = ['Went well', 'Went meh', 'Could have gone better', 'Action items!']
  const columnMap: { [name: string]: number } = {}

  for (const name of columnNames) {
    const column = await client.projects.createColumn({
      project_id: project.data.id,
      name
    })

    columnMap[name] = column.data.id
  }

  if (lastRetro) {
    await client.projects.createCard({
      column_id: columnMap['Action items!'],
      note: `Last retro: ${lastRetro.url}`
    })
  }

  await client.projects.createCard({
    column_id: columnMap['Action items!'],
    note: `Next retro driver: ${nextDriver}`
  })

  return project.data.html_url
}

// // create a tracking issue for the retro
// async function createTrackingIssue(
//   client: github.GitHub,
//   projectUrl: string,
//   retroDriver: string
// ): Promise<number> {
//   const issue = await client.issues.create({
//     owner: github.context.repo.owner,
//     repo: github.context.repo.repo,
//     title: `The next retro driver is @${retroDriver}`,
//     body: `Hey @${retroDriver} please remind everyone to fill out the retrospective board at ${projectUrl}`
//   })

//   await client.issues.addAssignees({
//     owner: github.context.repo.owner,
//     repo: github.context.repo.repo,
//     issue_number: issue.data.number,
//     assignees: [retroDriver]
//   })

//   return issue.data.number
// }
