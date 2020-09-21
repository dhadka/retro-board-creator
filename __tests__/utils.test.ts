import {getString, getInt, getBoolean, getList} from '../src/utils'

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
