import * as core from '@actions/core'

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

/**
 * Converts a string representation of the day of week to the numeric value.  This accepts partial and
 * complete strings representing the day, such as 'fri' or 'friday', or the numeric day of week, such as '5'.
 */
export function parseDayOfWeek(value: string): number {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

  value = value.trim().toLowerCase()

  if (value === '') {
    throw Error('invalid day of week: value is empty')
  } else if (value.match(/^\d+$/)) {
    const intValue = parseInt(value)

    if (intValue < 0 || intValue >= 7) {
      throw Error(`invalid day of week: '${value}' is not a valid day of week number, expect 0-6`)
    }

    return intValue
  } else {
    let index = -1

    for (const day of days) {
      if (day.startsWith(value)) {
        if (index >= 0) {
          throw Error(`invalid day of week: matches both ${days[index]} and ${day}`)
        }

        index = days.indexOf(day)
      }
    }

    if (index < 0) {
      throw Error(`invalid day of week: '${value}' must match one of ${days.join(', ')}`)
    }

    return index
  }
}
