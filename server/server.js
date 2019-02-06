require('./config/config')
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const { ObjectID } = require('mongodb')
const _ = require('lodash')

const { mongoose } = require('./db/mongoose')
const weatherApp = require('../src/weatherApp')
const { Todo } = require('./models/todo')
const { User } = require('./models/user')
var { authenticate } = require('./middleware/authenticate')

const port = process.env.PORT

const app = express()
app.use(cors())
app.use(bodyParser.json())

app.get('/weather', (req, res) => {
  const address = weatherApp.address
  const weather = weatherApp.weather
  res.send(`Your current address is: ${address} and ${weather}`)
})

// Users routes
app.get('/users/me', authenticate, (req, res) => {
  res.send(req.user)
})

// POST /users {email, password}
app.post('/users', (req, res) => {
  var body = _.pick(req.body, ['email', 'password'])
  var user = new User(body)

  user
    .save()
    .then(() => {
      return user.generateAuthToken()
    })
    .then(token => {
      res.header('x-auth', token).send(user)
    })
    .catch(e => {
      res.status(400).send(e)
    })
})

// POST /users/login {email, password}
app.post('/users/login', (req, res) => {
  var body = _.pick(req.body, ['email', 'password'])

  User.findByCredentials(body.email, body.password)
    .then(user => {
      return user.generateAuthToken().then(token => {
        res.header('x-auth', token).send(user)
      })
    })
    .catch(e => {
      res.status(400).send()
    })
})

app.delete('/users/logout', authenticate, (req, res) => {
  req.user.removeToken(req.token).then(
    () => {
      res.status(200).send()
    },
    () => {
      res.status(400).send()
    }
  )
})

// Todos routes
app.get('/todos', (req, res) => {
  Todo.find().then(
    todos => {
      res.send({ todos })
    },
    e => {
      res.status(400).send(e)
    }
  )
})

app.get('/todos/:id', (req, res) => {
  var id = req.params.id

  if (!ObjectID.isValid(id)) {
    return res.status(404).send()
  }

  Todo.findById(id)
    .then(todo => {
      if (!todo) {
        return res.status(404).send()
      }

      res.send({ todo })
    })
    .catch(e => {
      res.status(400).send()
    })
})

app.post('/todos', (req, res) => {
  var todo = new Todo({
    text: req.body.text
  })

  todo.save().then(
    doc => {
      res.send(doc)
    },
    e => {
      res.status(400).send(e)
    }
  )
})

app.patch('/todos/:id', (req, res) => {
  var id = req.params.id
  var body = _.pick(req.body, ['text', 'completed'])
  if (!ObjectID.isValid(id)) {
    return res.status(404).send()
  }

  if (_.isBoolean(body.completed) && body.completed) {
    body.completedAt = new Date().getTime()
  } else {
    body.completed = false
    body.completedAt = null
  }

  Todo.findByIdAndUpdate(id, { $set: body }, { new: true })
    .then(todo => {
      if (!todo) {
        return res.status(404).send()
      }

      res.send({ todo })
    })
    .catch(e => {
      res.status(400).send()
    })
})

app.delete('/todos', (req, res) => {
  Todo.deleteMany({}).then(
    doc => {
      res.send(doc)
    },
    e => {
      res.status(400).send(e)
    }
  )
})

app.delete('/todos/:id', (req, res) => {
  var id = req.params.id

  if (!ObjectID.isValid(id)) {
    return res.status(404).send()
  }

  Todo.findByIdAndDelete(id)
    .then(todo => {
      if (!todo) {
        return res.status(404).send()
      }
      res.send({ todo })
    })
    .catch(e => {
      res.status(400).send()
    })
})

app.listen(port, () => {
  console.log(`Started on port ${port}`)
})

module.exports = { app }
