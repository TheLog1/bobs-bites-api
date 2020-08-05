process.env.TESTENV = true

let Report = require('../app/models/report.js')
let User = require('../app/models/user')

const crypto = require('crypto')

let chai = require('chai')
let chaiHttp = require('chai-http')
let server = require('../server')
chai.should()

chai.use(chaiHttp)

const token = crypto.randomBytes(16).toString('hex')
let userId
let reportId

describe('reports', () => {
  const reportParams = {
    title: '13 JavaScript tricks SEI instructors don\'t want you to know',
    text: 'You won\'believe number 8!'
  }

  before(done => {
    Report.deleteMany({})
      .then(() => User.create({
        email: 'caleb',
        hashedPassword: '12345',
        token
      }))
      .then(user => {
        userId = user._id
        return user
      })
      .then(() => Report.create(Object.assign(reportParams, {owner: userId})))
      .then(record => {
        reportId = record._id
        done()
      })
      .catch(console.error)
  })

  describe('GET /reports', () => {
    it('should get all the reports', done => {
      chai.request(server)
        .get('/reports')
        .set('Authorization', `Token token=${token}`)
        .end((e, res) => {
          res.should.have.status(200)
          res.body.reports.should.be.a('array')
          res.body.reports.length.should.be.eql(1)
          done()
        })
    })
  })

  describe('GET /reports/:id', () => {
    it('should get one report', done => {
      chai.request(server)
        .get('/reports/' + reportId)
        .set('Authorization', `Token token=${token}`)
        .end((e, res) => {
          res.should.have.status(200)
          res.body.report.should.be.a('object')
          res.body.report.title.should.eql(reportParams.title)
          done()
        })
    })
  })

  describe('DELETE /reports/:id', () => {
    let reportId

    before(done => {
      Report.create(Object.assign(reportParams, { owner: userId }))
        .then(record => {
          reportId = record._id
          done()
        })
        .catch(console.error)
    })

    it('must be owned by the user', done => {
      chai.request(server)
        .delete('/reports/' + reportId)
        .set('Authorization', `Bearer notarealtoken`)
        .end((e, res) => {
          res.should.have.status(401)
          done()
        })
    })

    it('should be succesful if you own the resource', done => {
      chai.request(server)
        .delete('/reports/' + reportId)
        .set('Authorization', `Bearer ${token}`)
        .end((e, res) => {
          res.should.have.status(204)
          done()
        })
    })

    it('should return 404 if the resource doesn\'t exist', done => {
      chai.request(server)
        .delete('/reports/' + reportId)
        .set('Authorization', `Bearer ${token}`)
        .end((e, res) => {
          res.should.have.status(404)
          done()
        })
    })
  })

  describe('POST /reports', () => {
    it('should not POST an report without a title', done => {
      let noTitle = {
        text: 'Untitled',
        owner: 'fakedID'
      }
      chai.request(server)
        .post('/reports')
        .set('Authorization', `Bearer ${token}`)
        .send({ report: noTitle })
        .end((e, res) => {
          res.should.have.status(422)
          res.should.be.a('object')
          done()
        })
    })

    it('should not POST an report without text', done => {
      let noText = {
        title: 'Not a very good report, is it?',
        owner: 'fakeID'
      }
      chai.request(server)
        .post('/reports')
        .set('Authorization', `Bearer ${token}`)
        .send({ report: noText })
        .end((e, res) => {
          res.should.have.status(422)
          res.should.be.a('object')
          done()
        })
    })

    it('should not allow a POST from an unauthenticated user', done => {
      chai.request(server)
        .post('/reports')
        .send({ report: reportParams })
        .end((e, res) => {
          res.should.have.status(401)
          done()
        })
    })

    it('should POST an report with the correct params', done => {
      let validReport = {
        title: 'I ran a shell command. You won\'t believe what happened next!',
        text: 'it was rm -rf / --no-preserve-root'
      }
      chai.request(server)
        .post('/reports')
        .set('Authorization', `Bearer ${token}`)
        .send({ report: validReport })
        .end((e, res) => {
          res.should.have.status(201)
          res.body.should.be.a('object')
          res.body.should.have.property('report')
          res.body.report.should.have.property('title')
          res.body.report.title.should.eql(validReport.title)
          done()
        })
    })
  })

  describe('PATCH /reports/:id', () => {
    let reportId

    const fields = {
      title: 'Find out which HTTP status code is your spirit animal',
      text: 'Take this 4 question quiz to find out!'
    }

    before(async function () {
      const record = await Report.create(Object.assign(reportParams, { owner: userId }))
      reportId = record._id
    })

    it('must be owned by the user', done => {
      chai.request(server)
        .patch('/reports/' + reportId)
        .set('Authorization', `Bearer notarealtoken`)
        .send({ report: fields })
        .end((e, res) => {
          res.should.have.status(401)
          done()
        })
    })

    it('should update fields when PATCHed', done => {
      chai.request(server)
        .patch(`/reports/${reportId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ report: fields })
        .end((e, res) => {
          res.should.have.status(204)
          done()
        })
    })

    it('shows the updated resource when fetched with GET', done => {
      chai.request(server)
        .get(`/reports/${reportId}`)
        .set('Authorization', `Bearer ${token}`)
        .end((e, res) => {
          res.should.have.status(200)
          res.body.should.be.a('object')
          res.body.report.title.should.eql(fields.title)
          res.body.report.text.should.eql(fields.text)
          done()
        })
    })

    it('doesn\'t overwrite fields with empty strings', done => {
      chai.request(server)
        .patch(`/reports/${reportId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ report: { text: '' } })
        .then(() => {
          chai.request(server)
            .get(`/reports/${reportId}`)
            .set('Authorization', `Bearer ${token}`)
            .end((e, res) => {
              res.should.have.status(200)
              res.body.should.be.a('object')
              // console.log(res.body.report.text)
              res.body.report.title.should.eql(fields.title)
              res.body.report.text.should.eql(fields.text)
              done()
            })
        })
    })
  })
})
