import {nextDate, nextDriver, IRetroArguments, tryCreateRetro} from '../src/retro'
import {getString, getInt, getBoolean, getList} from '../src/main'

function getInputName(name: string): string {
  return `INPUT_${name.replace(/ /g, "_").toUpperCase()}`
}

function setInput(name: string, value: string): void {
  process.env[getInputName(name)] = value;
}

test('test getString', async () => {
  const name = 'foo_string'

  expect(getString(name)).toBe('')
  expect(getString(name, { default: 'bar' })).toBe('bar')

  setInput(name, '')
  expect(getString(name)).toBe('')
  expect(getString(name, { default: 'bar' })).toBe('bar')

  setInput(name, 'baz')
  expect(getString(name)).toBe('baz')
  expect(getString(name, { default: 'bar' })).toBe('baz')
})

test('test getInt', async () => {
  const name = 'foo_int'

  expect(getInt(name)).toBeNaN()
  expect(getInt(name, { default: 5 })).toBe(5)

  setInput(name, '')
  expect(getInt(name)).toBeNaN()
  expect(getInt(name, { default: 5 })).toBe(5)

  setInput(name, '10')
  expect(getInt(name)).toBe(10)
  expect(getInt(name, { default: 5 })).toBe(10)
})

test('test getBoolean', async () => {
  const name = 'foo_boolean'

  expect(getBoolean(name)).toBeFalsy()

  setInput(name, '')
  expect(getBoolean(name)).toBeFalsy()

  setInput(name, 'false')
  expect(getBoolean(name)).toBeFalsy()

  setInput(name, 'true')
  expect(getBoolean(name)).toBeTruthy()

  setInput(name, 'TRUE')
  expect(getBoolean(name)).toBeTruthy()
})

test('test getList', async () => {
  const name = 'foo_list'

  expect(getList(name)).toStrictEqual([])

  setInput(name, '')
  expect(getList(name)).toStrictEqual([])

  setInput(name, 'foo')
  expect(getList(name)).toStrictEqual(['foo'])

  setInput(name, 'foo,bar')
  expect(getList(name)).toStrictEqual(['foo', 'bar'])

  setInput(name, ' foo  , bar ')
  expect(getList(name)).toStrictEqual(['foo', 'bar'])
})

test('test nextDate', async () => {
  expect(nextDate(new Date('2020-09-13T12:00:00.000Z'), 3, 2)).toStrictEqual(new Date('2020-09-30T12:00:00.000Z'))
  expect(nextDate(new Date('2020-09-14T12:00:00.000Z'), 3, 2)).toStrictEqual(new Date('2020-09-30T12:00:00.000Z'))
  expect(nextDate(new Date('2020-09-15T12:00:00.000Z'), 3, 2)).toStrictEqual(new Date('2020-09-30T12:00:00.000Z'))
  expect(nextDate(new Date('2020-09-16T12:00:00.000Z'), 3, 2)).toStrictEqual(new Date('2020-09-30T12:00:00.000Z'))
  expect(nextDate(new Date('2020-09-17T12:00:00.000Z'), 3, 2)).toStrictEqual(new Date('2020-10-07T12:00:00.000Z'))
  expect(nextDate(new Date('2020-09-18T12:00:00.000Z'), 3, 2)).toStrictEqual(new Date('2020-10-07T12:00:00.000Z'))
  expect(nextDate(new Date('2020-09-19T12:00:00.000Z'), 3, 2)).toStrictEqual(new Date('2020-10-07T12:00:00.000Z'))

  expect(nextDate(new Date('2020-09-13T12:00:00.000Z'), 4, 1)).toStrictEqual(new Date('2020-09-24T12:00:00.000Z'))
  expect(nextDate(new Date('2020-09-14T12:00:00.000Z'), 4, 1)).toStrictEqual(new Date('2020-09-24T12:00:00.000Z'))
  expect(nextDate(new Date('2020-09-15T12:00:00.000Z'), 4, 1)).toStrictEqual(new Date('2020-09-24T12:00:00.000Z'))
  expect(nextDate(new Date('2020-09-16T12:00:00.000Z'), 4, 1)).toStrictEqual(new Date('2020-09-24T12:00:00.000Z'))
  expect(nextDate(new Date('2020-09-17T12:00:00.000Z'), 4, 1)).toStrictEqual(new Date('2020-09-24T12:00:00.000Z'))
  expect(nextDate(new Date('2020-09-18T12:00:00.000Z'), 4, 1)).toStrictEqual(new Date('2020-10-01T12:00:00.000Z'))
  expect(nextDate(new Date('2020-09-19T12:00:00.000Z'), 4, 1)).toStrictEqual(new Date('2020-10-01T12:00:00.000Z'))
})

test('text nextDriver', async () => {
  const handles = ['alice', 'bob', 'charlie', 'denise', 'erica']

  expect(nextDriver(handles, '')).toBe('alice')
  expect(nextDriver(handles, 'alice')).toBe('bob')
  expect(nextDriver(handles, 'denise')).toBe('erica')
  expect(nextDriver(handles, 'erica')).toBe('alice')

  expect(nextDriver(handles, 'frank')).toBe('alice')
  expect(nextDriver(handles, 'frank', 1)).toBe('bob')
})
