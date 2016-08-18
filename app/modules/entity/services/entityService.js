'use strict';

const sequelize = require('../../../components/sequelize');
const await = require('asyncawait/await');
const _ = require('lodash');

var EntityService = {};

EntityService.getAllEntities = function(userFundId, published) {
    return await(sequelize.models.Entity.findAll({
        where: {
            published
        },
        include: {
            model: sequelize.models.UserFund,
            as: 'userFund',
            where: {
                id: userFundId
            },
            required: false
        }
    }));
};

EntityService.getEntity = function(id, userFundId, published, includes) {
    var include = includes.map(e => {
        return {
            model: sequelize.models.Entity,
            as: e,
            required: false
        };
    });
    include.push({
        model: sequelize.models.UserFund,
        as: 'userFund',
        where: {
            id: userFundId
        },
        required: false
    });
    return await(sequelize.models.Entity.findOne({
        where: {
            id: id,
            published
        },
        include
    }));
};

EntityService.getEntitiesByType = function(type, userFundId, published) {
    return await(sequelize.models.Entity.findAll({
        where: {
            type: {
                $iLike: type
            },
            published
        },
        include: {
            model: sequelize.models.UserFund,
            as: 'userFund',
            where: {
                id: userFundId
            },
            required: false
        }
    }));
};

EntityService.getEntitiesByOwnerId = function(id, type, userFundId, published) {
    var res = await(sequelize.models.Entity.findOne({
        where: {
            id: id,
            published
        },
        include: {
            model: sequelize.models.Entity,
            as: 'childEntity',
            where: {
                type: type
            },
            required: false,
            include: {
                model: sequelize.models.UserFund,
                as: 'userFund',
                where: {
                    id: userFundId
                },
                required: false
            }
        }
    }));
    if (!res) throw new Error('Not found');
    return res.childEntity;
};

EntityService.createEntity = function(data) {
    return await(sequelize.models.Entity.create({
        title: data.title,
        description: data.description,
        type: data.type,
        published: data.published,
        imgUrl: data.imgUrl
    }));
};

EntityService.updateEntity = function(id, data) {
    return await(sequelize.models.Entity.update(data, {
        where: {
            id: id,
            deletedAt: null
        }
    }));
};

EntityService.deleteEntity = function(id) {
    return await(sequelize.models.Entity.destroy({
        where: {
            id: id
        }
    }));
};


/**
 * get list Funds's name
 * @param  {[int]} entityId  [id Direction or Topic]
 * @return {[type]}          [ 'МОЙ ФОНД', 'ПОДАРИ ЖИЗНь', 'МОЙ ФОНД' ]
 */
EntityService.getListFundsName = function(entityId) {
    var listFunds = await(sequelize.models.EntityOtherEntity.findAll({
        where: { entityId }
    }));
    return listFunds.map(function(listFund) {
        var record = listFund.dataValues,
            otherEntityId = record.otherEntityId;
        // console.log('RECORD otherEntityId', record.otherEntityId);
        var entity = await(getEntityByEntityId(otherEntityId, 'fund', true));
        // console.log('ENTITY', entity);
        if (entity) { return entity.title; }
    });
};



/**
 * get entity by id, type, published
 * @param  {[int]}     id
 * @param  {[string]}  type       [ direction || topic || fund ]
 * @param  {[boolean]} published
 * @return {[type]}                [description]
 */
function getEntityByEntityId(id, type, published) {
    return await(sequelize.models.Entity.findOne({
        where: {
            id,
            type,
            published,
        }
    }));
}


EntityService.associateEntity = function(id, otherId) {
    var relationsCount = await(sequelize.models.EntityOtherEntity.count({
        where: {
            entityId: id,
            otherEntityId: otherId
        }
    }));

    if (relationsCount) throw new Error('Relation exists');

    return await(sequelize.models.EntityOtherEntity.bulkCreate([{
        entityId: id,
        otherEntityId: otherId
    }, {
        entityId: otherId,
        otherEntityId: id
    }]));
};

EntityService.removeAssociation = function(id, otherId) {
    return await(sequelize.models.EntityOtherEntity.destroy({
        where: {
            entityId: {
                $in: [id, otherId]
            },
            otherEntityId: {
                $in: [id, otherId]
            }
        }
    }));
};

EntityService.associateEntities = function(id, otherIds) {
    var creating = otherIds.map(e => {
        return [{
            entityId: id,
            otherEntityId: e
        }, {
            entityId: e,
            otherEntityId: id
        }];
    });

    var associations = _.flatten(creating);

    return await(sequelize.models.EntityOtherEntity.bulkCreate(associations));
};

EntityService.removeAssociations = function(id) {
    return await(sequelize.models.EntityOtherEntity.destroy({
        where: {
            $or: [{
                entityId: id
            }, {
                otherEntityId: id
            }]
        }
    }));
};

EntityService.getTodayFundsCount = function() {
    var today = new Date(),
        year = today.getFullYear(),
        month = today.getMonth(),
        date = today.getDate();
    return await(sequelize.models.Entity.count({
        where: {
            createdAt: {
                $lt: new Date(year, month, date + 1, 0, 0, 0, 0),
                $gt: new Date(year, month, date, 0, 0, 0, 0)
            },
            type: {
                $iLike: 'fund'
            }
        }
    }));
};

EntityService.getFundsCount = function() {
    return await(sequelize.models.Entity.count({
        where: {
            type: {
                $iLike: 'fund'
            }
        }
    }));
};

EntityService.getUserFunds = function(id, published) {
    return await(sequelize.models.Entity.findOne({
        where: {
            id,
            published
        },
        include: {
            model: sequelize.models.UserFund,
            as: 'userFund',
            required: false
        }
    }));
};

EntityService.publishAll = function() {
    return await(sequelize.models.Entity.update({
        published: true
    }, {
        where: {
            published: false
        }
    }));
};

EntityService.getEntitiesByTypeWithNested = function(type, includes) {
    var include = includes.map(e => {
        return {
            model: sequelize.models.Entity,
            as: e,
            required: false
        };
    });
    return await(sequelize.models.Entity.findAll({
        where: {
            type: {
                $or: type
            }
        },
        include
    }));
};

module.exports = EntityService;
