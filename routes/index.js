const express = require('express');
const router = express.Router();
const { runQuery, searchQuery } = require('../db.js')
const SQL = require('sql-template-strings')
const SqlString = require('sqlstring')
const axios = require('axios')
require('dotenv').config()


router.get('/test', (req, res, next) => {
    res.status(200).json({ id: "123" })
})

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
        })
    }).catch((err) => {
        console.log(err)
    })

})

//Get campaigns based on search - What are our search parameters going to be?

router.post('/searchCampaigns', (req, res, next) => {
    searchQuery(req.body.title || "", req.body.description || "", req.body.firstName || "", req.body.lastName || "").then((response) => {
        res.status(200).json(response)
    }).catch((err) => {
        console.log(err)
        res.status(500).json([])
    })

})


//Get confidence based on certain attributes of a campaign (might need to make this a common function to be used with "getCampaign")


router.get('/testGetCampaigns', (req, res, next) => {
    runQuery(SQL`SELECT TOP 1000 * FROM Campaigns`).then((response) => {
        res.status(200).json(response)
    }).catch((err) => {
        console.log(err)
    })

})

router.get('/test', (req, res, next) => {
    res.status(200).json({ success: true, message: "you hit el servero" })
})

router.post('/analyzeCampaign', (req, res, next) => {
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
                        req.body.autoFbPost || 0,
                        req.body.currencyCode,
                        req.body.goal,
                        req.body.title,
                        req.body.description,
                        req.body.mediaType || 0,
                        req.body.visibleInSearch || 0,
                        req.body.isCharity || 0,
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
    axios.post(process.env.AZURE_ML_URL, azureRequestBody, {
        headers: {
            "Authorization" : `Bearer ${process.env.AZURE_ML_API_KEY}`
        }
    }).then((azureResponse) => {
        const percentPerDay = parseFloat(azureResponse.data.Results.output1.value.Values[0][0]) * 100
        res.status(200).json(percentPerDay)
    }).catch((err) => {
        console.log(err)
        res.status(500).send()
    })
})

module.exports = router;
