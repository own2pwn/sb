'use strict';

const sequelize = require('../../../components/sequelize');
const await = require('asyncawait/await');
const async = require('asyncawait/async');
const excel = require('../../../components/excel');
const moment = require('moment');
const parse = require('csv-parse');
const path = require('path')
const fs = require('fs')
const colors = {
    ORANGE: 'FFCC66',
    WHITE: 'FFFFFF'
}

var StatementService = {};


/**
 * get all statement (files)
 * @param  {[obj]} where
 * @return {[type]}
 */
StatementService.getAll = function(where) {
    return await(sequelize.sequelize.query(`
    SELECT "id",
        "fileName",
        "dateStart",
        "dateEnd",
        "recommendation",
        "status",
        ARRAY((SELECT DISTINCT "statementId" FROM "StatementOrder"
            WHERE "StatementOrder"."statementId" != "Statement".id
            AND "StatementOrder"."deletedAt" IS NULL)) AS "conflicts"
    FROM "Statement"
          WHERE "Statement"."deletedAt" IS NULL`, {
            type: sequelize.sequelize.QueryTypes.SELECT
         }))
};


StatementService.parseStatement = function(file) {
    if (file instanceof Buffer) file = file.toString()
    return await(new Promise((resolve, reject) => {
        var opts = { delimiter: ';' }
        parse(file, opts, function(err, output) {
            if (err) reject(err);
            output.splice(0, 1);
            resolve(output.map(row => {
                var chargeDate = moment.utc(row[6], 'DD.MM.YYYY').toDate(),
                    supplyDate = moment.utc(row[7], 'DD.MM.YYYY').toDate();

                return {
                    sberAcquOrderNumber: row[14],
                    chargeDate,
                    supplyDate,
                    amount: row[9] * 100,
                }
            }))
        })
    }))
};

StatementService.createStatement = function(data) {
    return await(sequelize.models.Statement.create(data))
}


/**
 * recommendation write in excel.
 * get calculated data for accountant, transform and write in .xlsx
 * @param  {[type]} countPayments { payments: [{"id": 1, "payment": 123456, "title": "qwerty"}], sumModulo: 2345 }
 * @return {[type]}
 */
StatementService.writeInExcel = function(countPayments) {
    var fundPayments = countPayments.payments,
        remainderDivision = countPayments.sumModulo;
    var dataForSheet = [
        ['id', 'Имя фонда', 'рекомендуем начислить в этом периоде (коп.)']
    ];
    fundPayments.forEach((fundPayment) => {
        dataForSheet.push(
            [fundPayment.id, fundPayment.title, fundPayment.payment]
        );
    });
    dataForSheet.push(['Остатки', ' ', remainderDivision]);

    var sheet = excel.createSheets(
        [{
            name: 'Рекомендация',
            value: dataForSheet,
        }]
    );
    var fileName = `recommendation/recommendation_${Date.now()}.xlsx`
    excel.write(
        path.join(__dirname, `../../../../public/uploads/${fileName}`),
        sheet
    );
    return fileName;
};

StatementService.getBuffer = function(wb) {
    return excel.writeBuffer(wb)
}

StatementService.getExcelStatement = function(statementId) {
    var statementOrders = await(sequelize.sequelize.query(`
      SELECT
  "outer"."id",
  "outer"."sberAcquOrderNumber",
  "outer"."statementId",
  "outer"."chargeDate",
  "outer"."supplyDate",
  "outer"."amount",
  (SELECT id
   FROM "StatementOrder" AS "conflict"
   WHERE "conflict"."sberAcquOrderNumber" = "outer"."sberAcquOrderNumber"
         AND "conflict".id != "outer".id
         AND "conflict"."deletedAt" IS NULL
   LIMIT 1) :: BOOLEAN AS "conflict"
FROM "StatementOrder" AS "outer"
WHERE "outer"."statementId" = :statementId
      AND "outer"."deletedAt" IS NULL`, {
          type: sequelize.sequelize.QueryTypes.SELECT,
          replacements: {
              statementId
          }
      }))

    var headers = [
        ['id',
        'sberAcquOrderNumber',
        'statementId',
        'Дата списания',
        'Дата зачисления',
        'сумма (коп.)',
        'конфликт?']
    ]
    var data = statementOrders.map(order => {
        var style = { },
            conflictCell = ''
        if (order.conflict) {
            style.fill = {
                type: 'pattern',
                patternType: 'solid',
                fgColor: colors.ORANGE
            }
            conflictCell = 'ДА'
        }

        return [
          order.id,
          order.sberAcquOrderNumber,
          order.statementId,
          moment(order.chargeDate).format('DD-MM-YYYY'),
          moment(order.supplyDate).format('DD-MM-YYYY'),
          order.amount,
          conflictCell
        ]
        .map(e => ({value: e, style}))
    });
    var sheets = excel.createSheets(
        [
            {
                name: 'Sheet 1',
                value: headers.concat(data)
            }
        ]
    );

    return sheets;
}

/**
 * count payments to all funds
 * @param {[array]} paidOrders
 * @return {[object]} {
 *      payments: [{"id": 1, "payment": 123456, "title": "qwerty"}, ...],
 *      sumModulo: 2345
 *  }
 */
StatementService.countPayments = function(approvedOrders) {
    var fundsArray = [];
    var sumModulo = 0;

    approvedOrders.forEach(order => {
        var funds = order.userFundSnapshot.fund;
        var fundsCount = funds.length;
        var fundPayment = Math.trunc(order.amount / fundsCount);
        var modulo = order.amount - (fundPayment * fundsCount);

        funds.forEach(fund => {
            fund.payment = fundPayment;
            var fundIndex = fundsArray.findIndex((elem, index) =>
                elem.id === fund.id);
            // prevent fund duplication in result array
            if (fundIndex != -1) {
                fundsArray[fundIndex].payment += fund.payment;
            } else {
                fundsArray.push(fund);
            }
        });
        sumModulo += modulo;
    });

    var result = {
        payments: fundsArray,
        sumModulo: sumModulo
    };
    return result;
}

//TODO: delete it for production build!
StatementService.generateReportTest = function(sberOrderId) {
    var orders = await (sequelize.models.Order.findAll({
        attributes: ['amount', 'userFundSnapshot'],
        where: {
            sberAcquOrderId: sberOrderId,
            userFundSnapshot: {
                $ne: null
            }
        }
    }));
    return StatementService.countPayments(orders);
};

StatementService.updateStatement = function(id, data) {
    return await(sequelize.sequelize.transaction(t => {
        return sequelize.models.Statement.update(data, {
            where: {
                id
            }
        })
        .then(() => {
            if (!data.statementOrders || !data.statementOrders.length) return;

            var statementOrders = data.statementOrders.map(order => {
                return Object.assign(order, {
                    statementId: id
                })
            })

            return sequelize.models.StatementOrder.bulkCreate(statementOrders)
        })
    }))
}

StatementService.deleteStatement = function(where) {
    return await(sequelize.sequelize.transaction(t => {
        return sequelize.models.Statement.update({
          deletedAt: new Date()
        }, {
          where,
          returning: true
        })
        .then(res => {
            var ids = res[1].map(statement => statement.id)
            return sequelize.models.StatementOrder.update({
                deletedAt: new Date()
            }, {
                where: {
                    statementId: {
                        $in: ids
                    }
                }
            })
        })
    }))
}

module.exports = StatementService;
