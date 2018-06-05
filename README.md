# pull-next-query

This is designed to work with stepping queries in [ssb-query](https://github.com/dominictarr/ssb-query) (a scuttlebot plugin).

This module is designed to consume a stream of messages from your database, but only streaming one cup at a time.
This is needed as muxrpc doesn't currently provide back-pressure for remote queries, meaning without this your poor client's only option is to quaff the entire database in one go.

The idea is you say something like "gimme all the poll type messages going backwards in time based on when they were published".
The first query grabs a chunk of 100 messages, and you stream those.
When this stream is done, a new stream is set up which picks up the next 100 messages, but starting from where the last query finished.

In this was you step through your database.


## API

```js
Stepper(sbot.query.read, opts, stepOn)
```

`sbot.query.read` - this module is written to work with `ssb-query`, this (or something with the same API) must be the first argument.

`opts` - the options for the query. Looks like a common flumeview-query, but with a `query` property which is a map-filter-reduce type query. Read more in these docs : https://github.com/flumedb/flumeview-query . The query here must be an Array - a really verbose MFR query.

`stepOn` - (array) the path of the value to increment on with each iteration of the stream. 


## Example usage (asserted timestamp)

```js
const pull = require('pull-stream')
const Stepper = require('pull-next-query')

const opts = {
  limit: 100,
  reverse: true,
  query: [{
    $filter: {
      value: {
        timestamp: { $lt: Date.now() }, // asserted timestamp
        content: {
          type: 'poll'
        }
      }
    }
  }]
}

pull(
  Stepper(sbot.query.read, opts, ['value', 'timestamp']),
  pull.log()
)
```

This query will step back (from the present time) and fetch chunks of 100 'poll' type messages from the database, and stream these out to be logged (in thicase).
Once one the block of 100 messages has been read out, a new new query will be made, with opts adjusted to shift the window of the query, so that you're continuing from where the previous block left off.

The final argument `['value', 'timestamp']` specifies the field on which to step.

**NOTE** : it's really important that you step based on a value which is covered by an `ssb-query` index, and that your initial query has a filter that matches that value - in this example it's `value.timestamp` that I've set up a filter on, and I'm also stepping based on that.

## Example usage (received timestamp)

```js
const pull = require('pull-stream')
const Stepper = require('pull-next-query')

const opts = {
  limit: 100,
  reverse: true,
  query: [{
    $filter: {
      timestamp: { $lt: Date.now() }, // received timestamp
      value: {
        content: {
          type: 'poll'
        }
      }
    }
  }]
}

pull(
  Stepper(sbot.query.read, opts, ['timestamp']),
  pull.log()
)
```

spot the difference!
