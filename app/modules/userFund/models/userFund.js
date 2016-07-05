'use strict';

module.exports = function(sequelize, DataTypes) {
    var UserFund = sequelize.define('UserFund', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: DataTypes.INTEGER,
        },
        title: {
            type: DataTypes.STRING,
            validate: {
                max: 50
            }
        },
        description: {
            type: DataTypes.TEXT,
            validate: {
                max: 2000
            }
        },
        creatorId: {
            type: DataTypes.INTEGER,
            references: {
                model: 'SberUser',
                key: 'id'
            },
            allowNull: true
        }
    }, {
        tableName: 'UserFund',
        unserscored: true,
        paranoid: true,
        classMethods: {
            associate: function(models) {
                UserFund.belongsToMany(models.Entity, {
                    as: 'entity',
                    through: 'UserFundEntity',
                    foreignKey: 'userFundId',
                    otherKey: 'entityId'
                });
                UserFund.hasMany(models.SberUser, {
                    as: 'members',
                    foreignKey: 'userFundId'
                });
                UserFund.belongsTo(models.SberUser, {
                    as: 'owner',
                    foreignKey: 'creatorId'
                });
            }
        }
    });
    return UserFund;
};