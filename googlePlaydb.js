const Sequelize = require('sequelize')
require('dotenv').config()

const sequelize = new Sequelize(process.env.GOOGLE_PLAY_DB_NAME, process.env.GOOGLE_PLAY_DB_USERNAME, process.env.GOOGLE_PLAY_DB_PASSWORD, {
    host: process.env.GOOGLE_PLAY_DB_SERVER,
    dialect: "mssql",
    dialectOptions: {
        options: {
            encrypt: true,
            trustServerCertificate: true
        }
    },
    define: {
        timestamps: false
    },
    pool: {
        max: 5,
        min: 2,
        acquire: 15000,
        idle: 10000,
    },
    logging: false
})


Sequelize.DATE.prototype._stringify = function _stringify(date, options) {
    return this._applyTimezone(date, options).format('YYYY-MM-DD HH:mm:ss.SSS');
};

//We'll do queries like this unless we want to grab some other stuff from using models. We'll see, this might be easiest
const runGoogleQuery = (query) => new Promise((resolve, reject) => {
    sequelize.query(query, { raw: true, type: Sequelize.QueryTypes.RAW }).then(([results, metadata]) => {
        resolve(results)
    }).catch((err) => reject(err))
})

module.exports = {
    sequelize,
    runGoogleQuery
}