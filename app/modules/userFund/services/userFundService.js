'use strict';

const await = require('asyncawait/await');
const async = require('asyncawait/async');
const sequelize = require('../../../components/sequelize');
const errors = require('../../../components/errors');
const i18n = require('../../../components/i18n');
const logger = require('../../../components/logger').getLogger('main');
const mailService = require('../../auth/services/mailService.js');
const _ = require('lodash')
const userConfig = require('../../../../config/user-config/config');
const axios = require('axios').create({
    baseURL: `http://${userConfig.host}:${userConfig.port}`
});
const userFundView = require('../views/userFundView')

var UserFundService = {};


UserFundService.updateUserFund = function(id, data) {
    return await(sequelize.models.UserFund.update(data, {
        where: {
            id,
            deletedAt: null
        },
    }));
};

UserFundService.getUserFund = function(id, includes, nested) {
    return await(sequelize.models.UserFund.findOne({
        where: {
            id
        },
        include: includes ? [{
            model: sequelize.models.Entity,
            as: 'topic',
            required: false,
            include: nested ? [{
                model: sequelize.models.Entity,
                as: 'direction',
                required: false,
                include: {
                    model: sequelize.models.Entity,
                    as: 'fund',
                    required: false
                }
            }, {
                model: sequelize.models.Entity,
                as: 'fund',
                required: false
            }] : undefined
        }, {
            model: sequelize.models.Entity,
            as: 'direction',
            required: false,
            include: nested ? {
                model: sequelize.models.Entity,
                as: 'fund',
                required: false
            } : undefined
        }, {
            model: sequelize.models.Entity,
            as: 'fund',
            required: false
        }] : undefined
    }));
};


UserFundService.getUserFundWithSberUser = function(id) {
    return await(sequelize.models.UserFund.findOne({
        where: {
            id
        },
        include: {
            model: sequelize.models.SberUser,
            as: 'owner',
            required: false,
        }
    }));
};


/**
 * get list user funds with data about user
 * @param  {[array]} where
 * @return {[type]}
 */
UserFundService.getUserFundsWithSberUser = function(where) {
    return await(sequelize.models.UserFund.findAll({
        where,
        include: {
            model: sequelize.models.SberUser,
            as: 'owner',
            required: false,
        }
    }));
};

/**
 * get userFunds
 * @param  {[obj]} where optional param
 * @return {[type]}
 */
UserFundService.getUserFunds = function (where) {
    if (where) { return await(sequelize.models.UserFund.findAll({ where })); }
    return await(sequelize.models.UserFund.findAll());
};

UserFundService.getTodayCreatedUserFunds = function() {
    var today = new Date(),
        year = today.getFullYear(),
        month = today.getMonth(),
        date = today.getDate();
    return await(sequelize.models.UserFund.count({
        where: {
            createdAt: {
                $lt: new Date(year, month, date + 1, 0, 0, 0, 0),
                $gt: new Date(year, month, date, 0, 0, 0, 0)
            }
        }
    }));
};


UserFundService.getEntities = function(id, includes) {
    var userFund = await(sequelize.models.UserFund.findOne({
        where: {
            id
        },
        include: {
            model: sequelize.models.Entity,
            as: 'entity',
            required: false,
            include: includes ? {
                model: sequelize.models.Entity,
                as: 'fund',
                required: false
            } : undefined
        }
    }));

    if (!userFund) throw new Error(i18n.__('Not found'));

    return userFund.entity;
};

UserFundService.getEntitiesCount = function(id) {
    return await(sequelize.models.UserFundEntity.count({
        where: {
            userFundId: id
        }
    }));
};

UserFundService.getUserFundsCount = function() {
    return await(sequelize.models.UserFund.count());
};

UserFundService.toggleEnabled = function(id, isEnabled) {
    return await(sequelize.models.UserFund.update({
        enabled: isEnabled
    }, {
        where: {
            $and: [{
                enabled: !isEnabled
            }, {
                id: id
            }]
        }
    }));
};


UserFundService.changeAmount = function(sberUserId, subscriptionId, changer, amount) {
    return await(sequelize.sequelize.transaction(t => {
        return sequelize.models.DesiredAmountHistory.create({
            subscriptionId,
            changer,
            amount
        })
            .then(desiredAmount => {
                return sequelize.models.UserFundSubscription.update({
                    currentAmountId: desiredAmount.id
                }, {
                    where: {
                        id: subscriptionId
                    }
                });
            })
            .catch(err => {
                throw err;
            });
    }));
};

UserFundService.getCurrentAmount = function(sberUserId, userFundId) {
    var suuf = await(sequelize.models.UserFundSubscription.findOne({
        where: {
            sberUserId,
            userFundId
        },
        include: [{
            model: sequelize.models.DesiredAmountHistory,
            as: 'currentAmount',
            required: false
        }]
    }));
    return suuf.currentAmount;
};


UserFundService.updateUserFundSubscription = function(id, data) {
    return await(sequelize.models.UserFundSubscription.update(data, {
        where: {
            id
        }
    }));
};


/**
 * update user subscriptions
 * @param  {[obj]} where
 * @param  {[obj]} data
 * @return {[type]}
 */
UserFundService.updateSubscriptions = function(where, data) {
    return await(sequelize.models.UserFundSubscription.update(
        data, { where })
    );
};


/**
 * update user subscriptions by sberUserId and returning data after update
 * @param  {[int]}  sberUserId
 * @return {[type]}
 */
UserFundService.updateSubscriptionsReturn = function(sberUserId, data) {
    return await(sequelize.models.UserFundSubscription.update(data, {
        where: {
            sberUserId,
        },
        returning: true,
    }))[1];
};


/**
 * switch subscriptions by sberUserId and userFundId
 * @param  {[int]}  sberUserId
 * @param  {[int]}  userFundId
 * @return {[type]}
 */
UserFundService.switchSubscription = function(sberUserId, userFundId, data) {
    return await(sequelize.models.UserFundSubscription.update(data, {
        where: {
            sberUserId,
            userFundId,
        },
    }));
};


/**
 * search active user fund subscription by userFundId
 * @param  {[array]} listUserFundId [73, 74 ,1]
 * @return {[type]}                [description]
 */
UserFundService.searchActiveSubscription = function(listUserFundId) {
    return await(sequelize.models.UserFundSubscription.findAll({
        where: {
            userFundId: {
                $in: listUserFundId,
            },
            enabled: true
        },
    }));
};


/**
 * return unhandled subscriptions in this month
 * @param {int[]} allDates dates need to handle
 * @param {Object} [nowDate] current date. Defaults to now
 * @return {Object[]} UserFundSubscriptions array of UserFundSubscriptions
 * @return {Number} UserFundSubscription.userFundSubscriptionId id of subscription
 * @return {Object} UserFundSubscription.payDate date user desired to pay
 * @return {Number} UserFundSubscription.amount amount desired to pay
 * @return {Number} UserFundSubscription.sberUserId id of user
 * @return {Number} UserFundSubscription.userFundId if of userFund
 * @return {Number} UserFundSubscription.bindingId bindingId od of linked card
 * @return {Object} UserFundSubscription.processedMonth date with month we curently pay
 * @return {Object} UserFundSubscription.realDate current date
 */
UserFundService.getUnhandledSubscriptions = function(allDates, nowDate) {
    return await(sequelize.sequelize.query(`
    SELECT
    "UserFundSubscription"."id"                                    AS "userFundSubscriptionId",
    "payDayHistory"."payDate"                                      AS "payDate",
    "DesiredAmountHistory"."amount"                                AS "amount",
    "SberUser"."id"                                                AS "sberUserId",
    "SberUser"."authId"                                            AS "sberUserAuthId",
    "SberUser"."categories"                                        AS "categories",
    "userFund"."id"                                                AS "userFundId",
    "Card"."bindingId"                                             AS "bindingId",
    "payDayHistory"."processedMonth"                               AS "processedMonth",
    :currentDate::date                                             AS "realDate"
    FROM "UserFundSubscription" AS "UserFundSubscription"
    INNER JOIN "UserFund" AS "userFund" ON "UserFundSubscription"."userFundId" = "userFund"."id"
                                           AND ("userFund"."deletedAt" IS NULL
                                                AND "userFund"."enabled" = TRUE)
    JOIN (SELECT DISTINCT ON ("subscriptionId", date_part('month', "createdAt"))
            "subscriptionId",
            "payDate",
            CASE WHEN date_part('day', (date_trunc('month', :currentDate::date) + INTERVAL '1 month - 1 day')) = date_part('day', :currentDate::date)
            AND date_part('day', "PayDayHistory"."payDate") > date_part('day', :currentDate::date)
            OR date_part('day',  :currentDate::date) >= date_part('day', "PayDayHistory"."payDate")
          THEN date_trunc('month', :currentDate::date)
          ELSE date_trunc('month', :currentDate::date - INTERVAL '1 month') END AS "processedMonth",
            "createdAt"
          FROM "PayDayHistory"
          WHERE
            date_part('day', "PayDayHistory"."payDate") IN (:allDates)
          ORDER BY "subscriptionId", date_part('month', "createdAt"), "createdAt" DESC) AS "payDayHistory"
      ON "payDayHistory"."subscriptionId" = "UserFundSubscription"."id"
    JOIN "DesiredAmountHistory" ON "DesiredAmountHistory"."id" = "UserFundSubscription"."currentAmountId"
    JOIN "SberUser" ON "SberUser"."id" = "UserFundSubscription"."sberUserId"
    JOIN "Card" ON "SberUser"."currentCardId" = "Card"."id" AND "Card"."deletedAt" IS NULL
  WHERE "UserFundSubscription"."enabled" = TRUE
        AND ("UserFundSubscription"."id", "payDayHistory"."processedMonth") NOT IN (SELECT
                                                                                          "id",
                                                                                          date_trunc('month', "scheduledPayDate")
                                                                                  FROM
                                                                                     "UserFundSubscription"
                                                                                  JOIN
                                                                                     "Order"
                                                                                  ON
                                                                                     "UserFundSubscription"."id" = "Order"."userFundSubscriptionId"
                                                                                  WHERE
                                                                                      date_trunc('month', "Order"."scheduledPayDate")
                                                                                           BETWEEN
                                                                                           date_trunc('month',:currentDate::date - INTERVAL '5 days')
                                                                                           AND date_trunc('month', :currentDate::date))
  AND "UserFundSubscription"."createdAt" < "payDayHistory"."processedMonth"`, {
      type: sequelize.sequelize.QueryTypes.SELECT,
      replacements: {
          allDates,
          currentDate: nowDate || new Date().toISOString()
      }
  }));
};


/**
 * getUserFundWithIncludes
 * @param  {[int]} id
 * @return {[obj]}
 * { id: 1,
  fund:
   [ { id: 132,
       type: 'fund',
       title: 'Старость в радость',
       imgUrl: 'entities/entity-1477476253012.png',
       createdAt: '2016-10-26T10:04:13.023Z',
       deletedAt: null,
       published: true,
       updatedAt: '2016-10-26T10:05:48.600Z',
       description: 'Благотворительный фонд «Старость в радость» оказывает комплексную помощь пожилым людям и инвалидам, живущим в государственных домах престарелых.
       UserFundEntity: [Object] }, ...
     ],
  title: null,
  topic:
   [ { id: 20,
       type: 'topic',
       title: 'Пожилые люди',
       imgUrl: 'entities/entity-1474628677277.png',
       createdAt: '2016-09-23T09:42:34.274Z',
       deletedAt: null,
       published: true,
       updatedAt: '2016-09-24T12:13:54.668Z',
       description: 'Нажимая кнопку "Помогать", вы равномерно распределяете своё пожертвование между всеми фондами, которые помогают лицам пожилого возраста',
       UserFundEntity: [Object] } ],
  enabled: false,
  createdAt: '2016-11-11T09:58:08.221Z',
  creatorId: 1,
  deletedAt: null,
  direction:
   [ { id: 32,
       type: 'direction',
       title: 'Помощь ветеранам ВОВ',
       imgUrl: 'entities/entity-1477574251162.png',
       createdAt: '2016-09-23T09:53:44.413Z',
       deletedAt: null,
       published: true,
       updatedAt: '2016-10-27T13:17:31.167Z',
       description: 'Помощь ветеранам ВОВ',
       UserFundEntity: [Object] }, ...
    ],
  updatedAt: '2016-11-11T09:58:08.221Z',
  description: null }
 */
 UserFundService.getUserFundWithIncludes = function(id) {
     return await(sequelize.models.UserFund.findOne({
         where: {
             id
         },
         include: [
           {
             model: sequelize.models.Entity,
             as: 'topic',
             required: false,
         }, {
             model: sequelize.models.Entity,
             as: 'direction',
             required: false,
         },
         {
             model: sequelize.models.Entity,
             as: 'fund',
             required: false
         }]
     }));
 };
 
UserFundService.setPayDate = function(subscriptionId, payDate) {
    return await(sequelize.models.PayDayHistory.create({
        subscriptionId,
        payDate
    }));
};

UserFundService.getUserFundSnapshot = function(id) {
    var userFund = await(sequelize.models.UserFund.findOne({
        attributes: ['id', 'creatorId', 'enabled'],
        where: {
            id
        },
        include: {
            attributes: ['id', 'title', 'type'],
            model: sequelize.models.Entity,
            as: 'entity',
            required: false
        }
    }));

    return userFundView.renderUserFundSnapshot(userFund)
};


/**
 * get userFund Subscriptions by fields
 * @param  {[obj]} where
 * @return {[type]}
 */
UserFundService.getSubscriptions = function(where) {
    return await(sequelize.models.UserFundSubscription.findAll({ where }));
};

UserFundService.getUserFundSubscriptionByOrder = function(sberAcquOrderNumber) {
    var order = await(sequelize.models.Order.findOne({
        where: {
            sberAcquOrderNumber
        },
        include: {
            model: sequelize.models.UserFundSubscription,
            as: 'userFundSubscription'
        }
    }));
    if (!order) throw new Error('Not found');

    return order.userFundSubscription;
};

UserFundService.countEntities = function(id) {
    return await(sequelize.models.UserFundEntity.count({
        where: {
            userFundId: id
        }
    }))
}

UserFundService.getSubscribers = function(params) {
    var include = params.include,
        exclude = params.exclude;

    if (typeof exclude === 'undefined' || !exclude.length) {
        exclude = null;
    }

    return await(sequelize.sequelize.query(`
      SELECT q."userFundId" AS id
FROM (SELECT DISTINCT "userFundId"
      FROM "UserFundEntity"
      ${include && include.length ? `WHERE "entityId" IN (:include)` : ``}
      ORDER BY "userFundId") AS q
WHERE q."userFundId" NOT IN (SELECT "userFundId"
                             FROM "UserFundEntity"
                             WHERE "UserFundEntity"."entityId" IN (:exclude))`,{
        replacements: {
            include,
            exclude
        },
        type: sequelize.sequelize.QueryTypes.SELECT
      }))
}

UserFundService.subscribeUserFunds = function(userFundsIds, fundId) {
    var relations = userFundsIds.map(userFundId => ({
        userFundId,
        entityId: fundId
    }))

    return await(sequelize.models.UserFundEntity.bulkCreate(relations))
}

//TODO: refactor
UserFundService.getFullSubscribers = function(entityIds) {
    return await(sequelize.sequelize.query(`SELECT
  "SberUser".id,
  "SberUser"."authId"
FROM "SberUser"
  JOIN "UserFund" ON "UserFund"."creatorId" = "SberUser".id
                     AND "UserFund"."deletedAt" IS NULL
                     AND "UserFund".id IN (SELECT "userFundId"
                                           FROM "UserFundEntity"
                                             INNER JOIN (SELECT DISTINCT "otherEntityId"
                                                         FROM "EntityOtherEntity"
                                                           JOIN "Entity"
                                                             ON "EntityOtherEntity"."otherEntityId" = "Entity".id AND
                                                                "Entity".type = 'direction'
                                                         WHERE "entityId" IN (:entityIds) AND "Entity".published = TRUE AND
                                                               "Entity"."deletedAt" IS NULL) AS q
                                               ON "UserFundEntity"."entityId" = q."otherEntityId"
                                           GROUP BY "userFundId"
                                           HAVING count(*) = (SELECT count(*)
                                                              FROM "EntityOtherEntity"
                                                                JOIN "Entity"
                                                                  ON "EntityOtherEntity"."otherEntityId" = "Entity".id
                                                                     AND "Entity".type = 'direction'
                                                              WHERE
                                                                "entityId" IN (:entityIds) AND "Entity".published = TRUE))
WHERE "SberUser"."authId" IS NOT NULL`, {
                     replacements: {
                        entityIds
                     },
                     type: sequelize.sequelize.QueryTypes.SELECT
                   }))
}

UserFundService.unsubscribeUserFunds = function(userFunds, entities) {
    return await(sequelize.models.UserFundEntity.destroy({
        where: {
            userFundId: {
               $in: userFunds
            },
            entityId: {
                $in: entities
            }
        }
    }))
}

module.exports = UserFundService;
