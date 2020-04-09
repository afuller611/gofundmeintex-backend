const express = require('express');
const router = express.Router();
const { runQuery, searchQuery } = require('../db.js')
const SQL = require('sql-template-strings')
const SqlString = require('sqlstring')
const axios = require('axios')
require('dotenv').config()


//Get all campaign details based on campaign ID
router.get('/campaign/:campaignId', (req, res, next) => {
    runQuery(SQL`SELECT * FROM Campaigns WHERE campaign_id = ${req.params.campaignId}`).then((response) => {
        runQuery(SQL`SELECT * FROM Updates WHERE campaign_id =${req.params.campaignId}`).then((updateRespone) => {
            res.status(200).json({
                ...response[0],
                updates: updateRespone
            })
        }).catch((err) => {
            console.log(err)
            next(err)
        })
    }).catch((err) => {
        console.log(err)
        res.status(500).send()
    })

})

//Get Campaigns based on search parameters
router.post('/searchCampaigns', (req, res, next) => {
    searchQuery(req.body.title || "", req.body.description || "", req.body.firstName || "", req.body.lastName || "").then((response) => {
        res.status(200).json(response)
    }).catch((err) => {
        console.log(err)
        res.status(500).json([])
    })

})

//Get confidence based on certain attributes of a campaign (might need to make this a common function to be used with "getCampaign")
router.post('/analyzeCampaign/english', (req, res, next) => {
    let azureRequestBody = {
        "Inputs": {
            "input1": {
                "ColumnNames": [
                    "auto_fb_post_mode",
                    "currencycode",
                    "goal",
                    "title",
                    "description",
                    "media_type",
                    "visible_in_search",
                    "is_charity",
                    "real_category",
                    "title_len",
                    "desc_len",
                    "amount/goal/days"
                ],
                "Values": [
                    [
                        req.body.autoFbPost ? 1 : 0,
                        req.body.currencyCode,
                        req.body.goal,
                        req.body.title,
                        req.body.description,
                        req.body.mediaType || 0,
                        req.body.visibleInSearch ? 1 : 0,
                        req.body.isCharity ? 1 : 0,
                        req.body.category,
                        req.body.title.length,
                        req.body.description.length,
                        null
                    ],
                ]
            }
        },
        "GlobalParameters": {}
    }
    axios.post(process.env.AZURE_ML_URL_ENGLISH, azureRequestBody, {
        headers: {
            "Authorization": `Bearer ${process.env.AZURE_ML_API_KEY_ENGLISH}`
        }
    }).then((azureResponse) => {
        const percentPerDay = (parseFloat(azureResponse.data.Results.output1.value.Values[0][0]) * 100).toString()
        res.status(200).json(percentPerDay)
    }).catch((err) => {
        console.log(err)
        res.status(500).send()
    })
})

router.post('/analyzeCampaign/italian', (req, res, next) => {
    let azureRequestBody = {
        "Inputs": {
            "input1": {
                "ColumnNames": [
                    "auto_fb_post_mode",
                    "goal",
                    "title",
                    "description",
                    "has_beneficiary",
                    "media_type",
                    "visible_in_search",
                    "title_len",
                    "desc_len"
                ],
                "Values": [
                    [
                        req.body.autoFbPost ? 1 : 0,
                        req.body.goal,
                        req.body.title,
                        req.body.description,
                        req.body.hasBeneficiary ? 1 : 0,
                        req.body.mediaType || 0,
                        req.body.visibleInSearch ? 1 : 0,
                        req.body.title.length,
                        req.body.description.length,
                    ],
                ]
            }
        },
        "GlobalParameters": {}
    }
    axios.post(process.env.AZURE_ML_URL_ITALIAN, azureRequestBody, {
        headers: {
            "Authorization": `Bearer ${process.env.AZURE_ML_API_KEY_ITALIAN}`
        }
    }).then((azureResponse) => {
        const percentPerDay = (parseFloat(azureResponse.data.Results.output1.value.Values[0][0]) * 100).toString()
        res.status(200).json(percentPerDay)
    }).catch((err) => {
        console.log(err)
        res.status(500).send()
    })
})





router.post('/becomeAdmin', (req, res, next) => {

    const body = `{"client_id":"gAOC1UuXf05qYgFvqKQfr12wgjXi79fM","client_secret":${process.env.AUTH0_CLIENT_SECRET},"audience":"https://gofundmeintex.auth0.com/api/v2/","grant_type":"client_credentials"}`

    axios.post(`${process.env.AUTH0_DOMAIN}/oauth/token`, body, {
        headers: {
            'content-type': 'application/json'
        }
    }).then((tokenResponse) => {
        axios.post(`${process.env.AUTH0_DOMAIN}/api/v2/users/${req.body.userId}/roles`, { roles: ['rol_PDYHow4i7JhThTBX'] }, {

            headers: {
                'content-type': 'application/json',
                Authorization: `Bearer ${tokenResponse.data.access_token}`,
                'cache-control': 'no-cache',
            },
        }).then((auth0Response) => {
            res.status(200).send()
        }).catch((err) => {
            console.log(err)
            res.status(500).send()
        })
    }).catch((err) => {
        console.log(err)
        res.status(500).send()
    })
})

module.exports = router;
