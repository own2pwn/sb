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
        type: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                is: /^(topic|direction|fund)$/i
            }
        }
    }, {
        tableName: 'Entity',
        unserscored: true,
        paranoid: true,
        classMethods: {
            associate: function(models) {
                Entity.belongsToMany(Entity, {
                    as: 'childEntity',
                    through: 'EntityIdOtherEntityId',
                    foreignKey: 'entityId',
                    otherKey: 'otherEntityId'
                });
            }
        }
    });
    return Entity;
};
