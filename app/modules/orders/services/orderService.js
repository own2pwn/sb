'use strict';

const await = require('asyncawait/await');
const async = require('asyncawait/async');
const sequelize = require('../../../components/sequelize');

exports.getOrderWithInludes = function(orderNumber) {
    return await(sequelize.models.Order.findOne({
        where: {
            orderNumber
        },
        include: [{
            model: sequelize.models.SberUserUserFund,
            as: 'sberUserUserFund',
            include: [{
                model: sequelize.models.SberUser,
                as: 'sberUser'
            },{
                model: sequelize.models.DesiredAmountHistory,
                as: 'currentAmount'
            }]
        }]
    }))
};

exports.updateInfo = function(data) {
    
}