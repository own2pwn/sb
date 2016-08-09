"use strict";

module.exports = function(sequelize, DataTypes) {
    var Order = sequelize.define('Order', {
        SberUserUserFundId: {
            type: DataTypes.INTEGER,
            references: {
                model: 'SberUserUserFund',
                key: 'id'
            },
            allowNull: false,
            field: 'sberUserUserFundId'
        },
        orderNumber: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: DataTypes.INTEGER,
        },
        orderId: {
            type: DataTypes.STRING
        },
        amount: {
            allowNull: false,
            type: DataTypes.INTEGER,
        },
        errorCode: {
            type: DataTypes.INTEGER
        },
        errorMessage: {
            type: DataTypes.TEXT
        },
        actionCode: {
            type: DataTypes.INTEGER
        },
        listFunds: {
            type: DataTypes.ARRAY(DataTypes.STRING),
        },
        listDirTopicFunds: {
            type: DataTypes.ARRAY(DataTypes.STRING),
        },
        createdAt: {
            allowNull: false,
            type: DataTypes.DATE,
        },
        updatedAt: {
            allowNull: false,
            type: DataTypes.DATE,
        },
        deletedAt: {
            type: DataTypes.DATE
        }
    }, {
        tableName: 'Order',
        unserscored: true,
        paranoid: true,
        classMethods: {
            associate: function(models) {
              Order.belongsTo(models.SberUserUserFund, {
                  as: 'sberUserUserFund',
                  foreginKey: 'sberUserUserFundId'
              });
            }
        }
    });
    return Order;
};