const Sequelize = require('sequelize')
const { QueryTypes } = require('sequelize');
require('dotenv').config()

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USERNAME, process.env.DB_PASSWORD, {
// const sequelize = new Sequelize("Intex-Two", "jand", "Ernie2020", {
    host: process.env.DB_SERVER,
// const sequelize = new Sequelize("shared", "mkshared", "Share0ata", {
//     host: "http://mkshared.database.windows.net",
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
const runQuery = (query) => new Promise((resolve, reject) => {
    sequelize.query(query, { raw: true, type: Sequelize.QueryTypes.RAW }).then(([results, metadata]) => {
        resolve(results)
    }).catch((err) => reject(err))
})


const searchQuery = (title, description, firstName, lastName) => new Promise((resolve, reject) => {
    sequelize.query(
        `SELECT TOP 200 * FROM Campaigns WHERE 
        title like :title 
        AND
        description like :description
        AND
        user_first_name like :firstName
        AND
        user_last_name like :lastName`,
        {
            replacements: {
                title: '%' + title + '%',
                description: '%' + description + '%',
                firstName: '%' + firstName + '%',
                lastName: '%' + lastName + '%'
            },
            type: QueryTypes.SELECT
        }).then((results) => {
            resolve(results)
        }).catch((err) => {
            console.log(err)
        })
})


module.exports = {
    sequelize,
    runQuery,
    searchQuery
}