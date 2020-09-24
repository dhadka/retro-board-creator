import {getString, getInt, getBoolean, getList, parseDayOfWeek} from '../src/utils'

function getInputName(name: string): string {
  return `INPUT_${name.replace(/ /g, '_').toUpperCase()}`
}

function setInput(name: string, value: string): void {
  process.env[getInputName(name)] = value
}

test('test getString', async () => {
  const name = 'foo_string'

  expect(getString(name)).toBe('')
  expect(getString(name, {default: 'bar'})).toBe('bar')

  setInput(name, '')
  expect(getString(name)).toBe('')
  expect(getString(name, {default: 'bar'})).toBe('bar')

  setInput(name, 'baz')
  expect(getString(name)).toBe('baz')
  expect(getString(name, {default: 'bar'})).toBe('baz')
})

test('test getInt', async () => {
  const name = 'foo_int'

  expect(getInt(name)).toBeNaN()
  expect(getInt(name, {default: 5})).toBe(5)

  setInput(name, '')
  expect(getInt(name)).toBeNaN()
  expect(getInt(name, {default: 5})).toBe(5)

  setInput(name, '10')
  expect(getInt(name)).toBe(10)
  expect(getInt(name, {default: 5})).toBe(10)
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

test('test parseDayOfWeek', async () => {
  expect(() => parseDayOfWeek('')).toThrowError()
  expect(() => parseDayOfWeek('   ')).toThrowError()

  expect(() => parseDayOfWeek('-1')).toThrowError()
  expect(() => parseDayOfWeek('7')).toThrowError()

  expect(parseDayOfWeek('0')).toBe(0)
  expect(parseDayOfWeek('1')).toBe(1)
  expect(parseDayOfWeek('2')).toBe(2)
  expect(parseDayOfWeek('3')).toBe(3)
  expect(parseDayOfWeek('4')).toBe(4)
  expect(parseDayOfWeek('5')).toBe(5)
  expect(parseDayOfWeek('6')).toBe(6)

  expect(parseDayOfWeek(' 1 ')).toBe(1)

  expect(parseDayOfWeek('sunday')).toBe(0)
  expect(parseDayOfWeek('monday')).toBe(1)
  expect(parseDayOfWeek('tuesday')).toBe(2)
  expect(parseDayOfWeek('wednesday')).toBe(3)
  expect(parseDayOfWeek('thursday')).toBe(4)
  expect(parseDayOfWeek('friday')).toBe(5)
  expect(parseDayOfWeek('saturday')).toBe(6)

  expect(parseDayOfWeek(' friday ')).toBe(5)
  expect(parseDayOfWeek('FRIDAY')).toBe(5)
  expect(parseDayOfWeek('fri')).toBe(5)

  expect(parseDayOfWeek('tu')).toBe(2)
  expect(parseDayOfWeek('th')).toBe(4)
  expect(() => parseDayOfWeek('t')).toThrowError()
  expect(() => parseDayOfWeek('foo')).toThrowError()
})
