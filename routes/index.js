const express = require('express');
const router = express.Router();
const { runQuery, searchQuery } = require('../db.js')
const SQL = require('sql-template-strings')
const SqlString = require('sqlstring')
const axios = require('axios')
const LanguageDetect = require('languagedetect');
const lngDetector = new LanguageDetect();
require('dotenv').config()


//Get all campaign details based on campaign ID
router.get('/campaign/:campaignId', async (req, res, next) => {
    try {
        let campaigns = await runQuery(SQL`SELECT * FROM Campaigns WHERE campaign_id = ${req.params.campaignId}`)

        let updates = await runQuery(SQL`SELECT * FROM Updates WHERE campaign_id =${req.params.campaignId}`)

        let campaign = campaigns[0]
        let body = {
            goal: campaign.goal,
            description: campaign.description,
            title: campaign.title,
            currencyCode: campaign.currencycode,
            category: campaign.real_category,
            categoryId: campaign.categoryId,
            autoFbPost: campaign.aut0_fb_post_mode,
            isCharity: campaign.is_charity,
            visibleInSearch: campaign.visible_in_search,
            mediaType: campaign.media_type,
            hasBeneficiary: campaign.has_beneficiary
        }

        let languageArray = lngDetector.detect(campaign.title + " " + campaign.description, 1)
        let language = languageArray[0][0]
        let score = ""
        if (language === "italian") {
            score = await analyzeItalianCampaign(body)
        } else {
            score = await analyzeEnglishCampaign(body)
        }
        res.status(200).json({
            ...campaign,
            updates,
            score: score,
            language: language.charAt(0).toUpperCase() + language.substr(1)
        })
    } catch (err) {
        res.status(500).send()
    }
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
    analyzeEnglishCampaign(req.body).then((percentPerDay) => {
        res.status(200).json(percentPerDay)
    }).catch((err) => {
        res.status(500).send()
    })
})

router.post('/analyzeCampaign/italian', (req, res, next) => {
    analyzeItalianCampaign(req.body).then((percentPerDay) => {
        res.status(200).json(percentPerDay)
    }).catch((err) => {
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
        }).then(() => {
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

const analyzeEnglishCampaign = (body) => {
    return new Promise((resolve, reject) => {
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
                            body.autoFbPost ? 1 : 0,
                            body.currencyCode,
                            body.goal,
                            body.title,
                            body.description,
                            body.mediaType || 0,
                            body.visibleInSearch ? 1 : 0,
                            body.isCharity ? 1 : 0,
                            body.category,
                            body.title.length,
                            body.description.length,
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
            resolve(percentPerDay)
        }).catch((err) => {
            console.log(err)
            reject(err)
        })
    })
}


const analyzeItalianCampaign = (body) => {
    return new Promise((resolve, reject) => {
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
                            body.autoFbPost ? 1 : 0,
                            body.goal,
                            body.title,
                            body.description,
                            body.hasBeneficiary ? 1 : 0,
                            body.mediaType || 0,
                            body.visibleInSearch ? 1 : 0,
                            body.title.length,
                            body.description.length,
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
            resolve(percentPerDay)
        }).catch((err) => {
            console.log(err)
            reject(err)
        })
    })
}

module.exports = router;
