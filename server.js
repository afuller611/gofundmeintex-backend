const express = require('express')
const app = express()
const port = 80
const apiroutes = require('./routes')
const cors = require('cors')
const bodyParser = require("body-parser");
const morgan = require("morgan");

require('dotenv').config()

app.use(bodyParser.json()); //Give us req.body

app.use(cors()) // Enable CORS
app.use(morgan('dev')); // Logs events to console

//All routes will go through here
app.use('/api', apiroutes)

app.listen(process.env.PORT || port, () => console.log(`Listening at port ${process.env.PORT || port}`))


