const express = require('express')
const app = express()
const port = 80
const apiroutes = require('./routes')
const cors = require('cors')
const bodyParser = require("body-parser");

require('dotenv').config()

app.use(bodyParser.json());

app.use(cors())

app.use('/api', apiroutes)
// app.get('/', (req, res) => res.send('Hello World!'))

app.listen(process.env.PORT || port, () => console.log(`Listening at port ${process.env.PORT || port}`))


