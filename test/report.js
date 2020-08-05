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
    species: 'brown t',
    potency: 3,
    info: 'bite not good but good',
    medicallySignificant: false
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
          res.body.report.species.should.eql(reportParams.species)
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
    it('should not POST an report without a species', done => {
      let noSpecies = {
        potency: 3,
        info: 'bite not good but good',
        medicallySignificant: false
      }
      chai.request(server)
        .post('/reports')
        .set('Authorization', `Bearer ${token}`)
        .send({ report: noSpecies })
        .end((e, res) => {
          res.should.have.status(422)
          res.should.be.a('object')
          done()
        })
    })

    it('should not POST an report without info', done => {
      let noInfo = {
        species: 'brown t',
        potency: 3,
        medicallySignificant: false
      }
      chai.request(server)
        .post('/reports')
        .set('Authorization', `Bearer ${token}`)
        .send({ report: noInfo })
        .end((e, res) => {
          res.should.have.status(422)
          res.should.be.a('object')
          done()
        })
    })
    it('should not POST an report without potency', done => {
      let noPotency = {
        species: 'brown t',
        info: 'bite not good but good',
        medicallySignificant: false
      }
      chai.request(server)
        .post('/reports')
        .set('Authorization', `Bearer ${token}`)
        .send({ report: noPotency })
        .end((e, res) => {
          res.should.have.status(422)
          res.should.be.a('object')
          done()
        })
    })
    it('should not POST an report without medical significance', done => {
      let noMedicallySignificant = {
        species: 'brown t',
        potency: 3,
        info: 'bite not good but good'
      }
      chai.request(server)
        .post('/reports')
        .set('Authorization', `Bearer ${token}`)
        .send({ report: noMedicallySignificant })
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
        species: 'brown t',
        potency: 3,
        info: 'bite not good but good',
        medicallySignificant: false
      }
      chai.request(server)
        .post('/reports')
        .set('Authorization', `Bearer ${token}`)
        .send({ report: validReport })
        .end((e, res) => {
          res.should.have.status(201)
          res.body.should.be.a('object')
          res.body.should.have.property('report')
          res.body.report.should.have.property('species')
          res.body.report.species.should.eql(validReport.species)
          done()
        })
    })
  })

  describe('PATCH /reports/:id', () => {
    let reportId

    const fields = {
      species: 'brown t',
      potency: 3,
      info: 'bite not good but good',
      medicallySignificant: false
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
          res.body.report.species.should.eql(fields.species)
          res.body.report.potency.should.eql(fields.potency)
          res.body.report.info.should.eql(fields.info)
          res.body.report.medicallySignificant.should.eql(fields.medicallySignificant)
          done()
        })
    })

    it('doesn\'t overwrite fields with empty strings', done => {
      chai.request(server)
        .patch(`/reports/${reportId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ report: { info: '' } })
        .then(() => {
          chai.request(server)
            .get(`/reports/${reportId}`)
            .set('Authorization', `Bearer ${token}`)
            .end((e, res) => {
              res.should.have.status(200)
              res.body.should.be.a('object')
              res.body.report.species.should.eql(fields.species)
              res.body.report.potency.should.eql(fields.potency)
              res.body.report.info.should.eql(fields.info)
              res.body.report.medicallySignificant.should.eql(fields.medicallySignificant)
              done()
            })
        })
    })
  })
})
