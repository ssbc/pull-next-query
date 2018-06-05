const pull = require('pull-stream')
const Next = require('pull-next')

const get = require('lodash.get')
const set = require('lodash.set')
const merge = require('lodash.merge')

module.exports = nextStepper

const defaultOpts = {
  reverse: false,
  limit: 100,
  query: [{
    $filter: {
    }
  }]
}

function nextStepper (createStream, opts = {}, stepOn = ['value', 'timestamp']) {
  if (!Array.isArray(opts.query)) throw new Error('pull-next-query expects opts.query to be an Array (a verbose Map-Filter-Reduce query)')

  const _opts = merge({}, defaultOpts, opts)
  const movingBound = _opts.reverse === true ? '$lt' : '$gt'

  var last = null
  var count = -1

  return Next(() => {
    if (last) {
      if (count === 0) return

      const lastValue = get(last, stepOn)
      if (lastValue == null) return

      incrementOpts(_opts, lastValue)
      last = null
    }

    return pull(
      createStream(_opts),
      pull.through(
        (msg) => {
          count++
          if (!msg.sync) {
            last = msg
          }
        },
        (err) => {
            // retry on errors...
          if (err) {
            count = -1
            return count
          }
          // sif there were no result, stop stepper
          if (last == null) last = {}
        }
      )
    )
  })

  function incrementOpts (opts, lastValue) {
    set(_opts, ['query', 0, '$filter', ...stepOn], { [movingBound]: lastValue })
  }
}
