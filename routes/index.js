const express = require('express');
const router = express.Router();
const { runQuery, searchQuery } = require('../db.js')
const { runGoogleQuery } = require('../googlePlaydb.js')
const SQL = require('sql-template-strings')
const SqlString = require('sqlstring')
const axios = require('axios')
const LanguageDetect = require('languagedetect');
const lngDetector = new LanguageDetect();
require('dotenv').config()


router.post('/googleplaystore', async (req, res, next) => {
    try {
        let appRating = await analyzeGooglePlayStoreApp(req.body)
        console.log(appRating)
        res.status(200).json(appRating)
    } catch (err) {
        console.log(err)
        res.status(500).send("Error ")
    }
})

const analyzeGooglePlayStoreApp = (body) => {
    return new Promise((resolve, reject) => {
        let azureRequestBody = {
                "Inputs": {
                  "input1": {
                    "ColumnNames": [
                      "App",
                      "Category",
                      "Size",
                      "Content Rating",
                      "Genres",
                      "Android Ver"
                    ],
                    "Values": [
                      [
                        body.name,
                        body.category,
                        body.size,
                        body.contentRating,
                        body.genres,
                        body.androidVersion
                      ]
                    ]
                  }
                },
                "GlobalParameters": {}
              }

        axios.post(process.env.AZURE_ML_GOOGLE_PLAY_URL, azureRequestBody, {
            headers: {
                "Authorization": `Bearer ${process.env.AZURE_ML_GOOGLE_PLAY_API_KEY}`
            }
        }).then((azureResponse) => {
            const installs = (azureResponse.data.Results.output1.value.Values[0][0])
            resolve(installs)
        }).catch((err) => {
            console.log(err)
            reject(err)
        })
    })
}


router.post('/addGooglePlayApp', async (req, res, next) => {
    query = SQL`INSERT INTO GooglePlayStoreApps (App, Category, Rating, Reviews, Size, Installs, Type, Price, Content_Rating, Genres, Current_Ver, Android_Ver, days_since_update)
    VALUES
    (${name}, ${category}, ${averageRating}, ${numReviews}, ${size}, ${numIntalls}, ${type}, ${price}, ${contentRating}, ${genres}, ${version}, ${androidVersion}, ${lastUpdated})`
    runGoogleQuery(query).then((res) => {
        console.log(res)
        res.status(200).send("Done")
    }).catch((err) => {
        console.log(err)
    })
})

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
    searchQuery(req.body.title || "", req.body.description || "", req.body.firstName || "", req.body.lastName || "", req.body.asc).then((response) => {
        res.status(200).json(response)
    }).catch((err) => {
        console.log(err)
        res.status(500).json([])
    })

})

//Get confidence based on certain attributes of a campaign
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




//Give user admin rights so they can do searches
router.post('/becomeAdmin', (req, res, next) => {

    const body = `{"client_id":"gAOC1UuXf05qYgFvqKQfr12wgjXi79fM","client_secret": "${process.env.AUTH0_CLIENT_SECRET}","audience":"https://gofundmeintex.auth0.com/api/v2/","grant_type":"client_credentials"}`

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


//hit AZURE ML Studio for english campaigns
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

//hit AZURE ML Studio for italian campaigns
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
