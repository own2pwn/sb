'use strict';

module.exports = function(sequelize, DataTypes) {
    var Entity = sequelize.define('Entity', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: DataTypes.INTEGER,
        },
        title: {
            type: DataTypes.STRING
        },
        description: {
            type: DataTypes.TEXT
        },
        imgUrl: {
            type: DataTypes.STRING
        },
        type: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                is: {
                    args: /^(topic|direction|fund)$/i,
                    msg: 'Тип может быть только "fund", "topic" или "direction"'
                }
            }
        },
        published: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {
        tableName: 'Entity',
        unserscored: true,
        paranoid: true,
        classMethods: {
            associate: function(models) {
                Entity.belongsToMany(Entity, {
                    as: 'childEntity',
                    through: 'EntityOtherEntity',
                    foreignKey: 'entityId',
                    otherKey: 'otherEntityId'
                });
                Entity.belongsToMany(models.UserFund, {
                    as: 'userFund',
                    through: 'UserFundEntity',
                    foreignKey: 'entityId',
                    otherKey: 'userFundId'
                });
                Entity.belongsToMany(Entity, {
                    as: 'fund',
                    through: 'EntityOtherEntity',
                    foreignKey: 'entityId',
                    otherKey: 'otherEntityId',
                    scope: {
                        type: {
                            $iLike: 'fund'
                        }
                    }
                });
                Entity.belongsToMany(Entity, {
                    as: 'topic',
                    through: 'EntityOtherEntity',
                    foreignKey: 'entityId',
                    otherKey: 'otherEntityId',
                    scope: {
                        type: {
                            $iLike: 'topic'
                        }
                    }
                });
                Entity.belongsToMany(Entity, {
                    as: 'direction',
                    through: 'EntityOtherEntity',
                    foreignKey: 'entityId',
                    otherKey: 'otherEntityId',
                    scope: {
                        type: {
                            $iLike: 'direction'
                        }
                    }
                });
            }
        }
    });
    return Entity;
};
