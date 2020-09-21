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
