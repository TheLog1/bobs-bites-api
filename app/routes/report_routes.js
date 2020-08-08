// Express docs: http://expressjs.com/en/api.html
const express = require('express')
// Passport docs: http://www.passportjs.org/docs/
const passport = require('passport')

// pull in Mongoose model for reports
const Report = require('../models/report')

// this is a collection of methods that help us detect situations when we need
// to throw a custom error
const customErrors = require('../../lib/custom_errors')

// we'll use this function to send 404 when non-existant document is requested
const handle404 = customErrors.handle404
// we'll use this function to send 401 when a user tries to modify a resource
// that's owned by someone else
const requireOwnership = customErrors.requireOwnership

// this is middleware that will remove blank fields from `req.body`, e.g.
// { report: { title: '', text: 'foo' } } -> { report: { text: 'foo' } }
const removeBlanks = require('../../lib/remove_blank_fields')
// passing this as a second argument to `router.<verb>` will make it
// so that a token MUST be passed for that route to be available
// it will also set `req.user`
const requireToken = passport.authenticate('bearer', { session: false })

// instantiate a router (mini app that only handles routes)
const router = express.Router()

// INDEX
// GET /reports
router.get('/reports', requireToken, (req, res, next) => {
  Report.find()
  const owner = req.user.id
  Report.find({owner: owner})
    .then(reports => {
      // `reports` will be an array of Mongoose documents
      // we want to convert each one to a POJO, so we use `.map` to
      // apply `.toObject` to each one
      return reports.map(report => report.toObject())
    })
    // respond with status 200 and JSON of the reports
    .then(reports => res.status(200).json({ reports: reports }))
    // if an error occurs, pass it to the handler
    .catch(next)
})

// SHOW
// GET /reports/5a7db6c74d55bc51bdf39793
router.get('/reports/:id', requireToken, (req, res, next) => {
  // req.params.id will be set based on the `:id` in the route
  Report.findById(req.params.id)
    .then(handle404)
    // if `findById` is succesful, respond with 200 and "report" JSON
    .then(report => res.status(200).json({ report: report.toObject() }))
    // if an error occurs, pass it to the handler
    .catch(next)
})

// CREATE
// POST /reports
router.post('/reports', requireToken, (req, res, next) => {
  const report = req.body
  // set owner of new report to be current user
  report.owner = req.user.id

  Report.create(report)
    // respond to succesful `create` with status 201 and JSON of new "report"
    .then(newReport => {
      res.status(201).json({ report: newReport.toObject() })
    })
    // if an error occurs, pass it off to our error handler
    // the error handler needs the error message and the `res` object so that it
    // can send an error message back to the client
    .catch(next)
})

// UPDATE
// PATCH /reports/5a7db6c74d55bc51bdf39793
router.patch('/reports/:id', requireToken, removeBlanks, (req, res, next) => {
  // if the client attempts to change the `owner` property by including a new
  // owner, prevent that by deleting that key/value pair
  delete req.body.report.owner

  Report.findById(req.params.id)
    .then(handle404)
    .then(report => {
      // pass the `req` object and the Mongoose record to `requireOwnership`
      // it will throw an error if the current user isn't the owner
      requireOwnership(req, report)

      // pass the result of Mongoose's `.update` to the next `.then`
      return report.updateOne(req.body.report)
    })
    // if that succeeded, return 204 and no JSON
    .then(() => res.sendStatus(204))
    // if an error occurs, pass it to the handler
    .catch(next)
})

// DESTROY
// DELETE /reports/5a7db6c74d55bc51bdf39793
router.delete('/reports/:id', requireToken, (req, res, next) => {
  Report.findById(req.params.id)
    .then(handle404)
    .then(report => {
      // throw an error if current user doesn't own `report`
      requireOwnership(req, report)
      // delete the report ONLY IF the above didn't throw
      report.deleteOne()
    })
    // send back 204 and no content if the deletion succeeded
    .then(() => res.sendStatus(204))
    // if an error occurs, pass it to the handler
    .catch(next)
})

module.exports = router
