import {nextDate, nextDriver} from '../src/retro'

test('test nextDate', async () => {
  expect(nextDate(new Date('2020-09-13T12:00:00.000Z'), 3, 2)).toStrictEqual(
    new Date('2020-09-30T12:00:00.000Z')
  )
  expect(nextDate(new Date('2020-09-14T12:00:00.000Z'), 3, 2)).toStrictEqual(
    new Date('2020-09-30T12:00:00.000Z')
  )
  expect(nextDate(new Date('2020-09-15T12:00:00.000Z'), 3, 2)).toStrictEqual(
    new Date('2020-09-30T12:00:00.000Z')
  )
  expect(nextDate(new Date('2020-09-16T12:00:00.000Z'), 3, 2)).toStrictEqual(
    new Date('2020-09-30T12:00:00.000Z')
  )
  expect(nextDate(new Date('2020-09-17T12:00:00.000Z'), 3, 2)).toStrictEqual(
    new Date('2020-10-07T12:00:00.000Z')
  )
  expect(nextDate(new Date('2020-09-18T12:00:00.000Z'), 3, 2)).toStrictEqual(
    new Date('2020-10-07T12:00:00.000Z')
  )
  expect(nextDate(new Date('2020-09-19T12:00:00.000Z'), 3, 2)).toStrictEqual(
    new Date('2020-10-07T12:00:00.000Z')
  )

  expect(nextDate(new Date('2020-09-13T12:00:00.000Z'), 4, 1)).toStrictEqual(
    new Date('2020-09-24T12:00:00.000Z')
  )
  expect(nextDate(new Date('2020-09-14T12:00:00.000Z'), 4, 1)).toStrictEqual(
    new Date('2020-09-24T12:00:00.000Z')
  )
  expect(nextDate(new Date('2020-09-15T12:00:00.000Z'), 4, 1)).toStrictEqual(
    new Date('2020-09-24T12:00:00.000Z')
  )
  expect(nextDate(new Date('2020-09-16T12:00:00.000Z'), 4, 1)).toStrictEqual(
    new Date('2020-09-24T12:00:00.000Z')
  )
  expect(nextDate(new Date('2020-09-17T12:00:00.000Z'), 4, 1)).toStrictEqual(
    new Date('2020-09-24T12:00:00.000Z')
  )
  expect(nextDate(new Date('2020-09-18T12:00:00.000Z'), 4, 1)).toStrictEqual(
    new Date('2020-10-01T12:00:00.000Z')
  )
  expect(nextDate(new Date('2020-09-19T12:00:00.000Z'), 4, 1)).toStrictEqual(
    new Date('2020-10-01T12:00:00.000Z')
  )
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
