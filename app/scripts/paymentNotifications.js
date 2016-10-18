'use strict'

const models = require('../components/sequelize').models;
const async = require('asyncawait/async');
const await = require('asyncawait/await');
const userService = require('../modules/user/services/userService')
const userFundService = require('../modules/userFund/services/userFundService')
const mail = require('../modules/mail')
const argv = require('yargs').argv;
const nowDate = argv.now ? new Date(argv.now) : new Date();


(async(function() {
    var sberUsers = await (models.SberUser.findAll({
        where: {
            authId: {
                $not: null
            },
            notified: false,
            categories: 'all'
        },
        include: {
            model: models.UserFund,
            as: 'userFund',
            where: {
                updatedAt: {
                    $lt: new Date(nowDate.getTime() - 1000 * 60 * 60 * 24 * 14)
                },
                enabled: false
            }
        }
    }));

    var ids = sberUsers.map(sberUser => sberUser.authId).join(',');
    var authUsers = ids ? userService.getAuthUsersByIds(ids) : [];
    authUsers.forEach(authUser => {
        try {
            mail.sendPendingDraft(authUser.email, {
                userName: authUser.firstName
            })
        } catch (err) {
            logger.critical(err)
        }
    })

    await (models.SberUser.update({
        notified: true
    }, {
        where: {
            authId: {
                $in: ids
            }
        }
    }))

    var dayAfterTommorow = new Date(nowDate.getTime() + 1000 * 60 * 60 * 24 * 2),
        subscriptions = userFundService.getUnhandledSubscriptions([nowDate.getDate()], dayAfterTommorow),
        ids = subscriptions.filter(sub => sub.categories == 'all')
                           .map(subscription => subscription.sberUserAuthId)
                           .join(','),
        authUsers = ids ? userService.getAuthUsersByIds(ids) : [];

    subscriptions.forEach(subscription => {
        var authUser = authUsers.find(authUser => {
            return authUser.id == subscription.sberUserAuthId
        })
        try {
            mail.sendBeforePayment(authUser.email, {
                userName: authUser.firstName,
                amount: subscription.amount
            })
        } catch (err) {
            logger.critical(err)
        }
    })
}))();