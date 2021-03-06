'use strict';

// work with userFund
// author: dmitrii kamaev

const util  = require('util');
const await = require('asyncawait/await');
const async = require('asyncawait/async');
const sequelize = require('../../../components/sequelize');
const errors = require('../../../components/errors');
const logger = require('../../../components/logger').getLogger('main');
const i18n   = require('../../../components/i18n');
const userFundService = require('../services/userFundService');
const entityTypes = require('../../entity/enums/entityTypes.js');
const EntitiesApi = require('../../entity/services/entitiesApi.js');
const ExtractEntity = require('../../entity/services/extractEntity.js');

module.exports = class UserFundApi {
    /**
     * constructor
     * @param  {[obj]} params {
     *    userFundId,
     * }
     * @return {[type]}        [description]
     */
    constructor(params) {
        this.userFundId = params.userFundId || null;
        this.sberUserId = params.sberUserId || null;

        this.UserFundEntity = sequelize.models.UserFundEntity;
        this.UserFund       = sequelize.models.UserFund;
    }


    /**
     * get get userFund
     * @return {[type]} [description]
     */
    get() {
        var userFundId = this.userFundId
        return await(this.UserFund.findOne({
            where: {
                id: userFundId
            }
        }));
    }


    /**
     * getCreatorId get author(user) id
     * @return {[int]}
     */
    getCreatorId() {
        return this.get().creatorId;
    }


    /**
     * getCreatorId get author(user) id
     * @return {[int]}
     */
    getTitle() {
        return this.get().title || '';
    }


    /**
     * get Entity from userFund
     * @param  {[obj]} data {
     *   userFundId, // optional
     *   type,       // get type entity
     * }
     * @return {[array]}  [ { id, title, description }, { id, title, description }]
     */
    getEntity(data) {
        data = data || {};
        var userFundId = data.userFundId || this.userFundId;
        var entities = userFundService.getEntities(userFundId)
        var userFund = entities.reduce((obj, entity) => {
                obj[entity.type].push(entity);
                return obj;
            },{
                topic: [],
                direction: [],
                fund: []
            });
        var topics = userFund.topic || [],
            directions = userFund.direction || [],
            funds = userFund.fund || [],
            res = [];
        switch (data.type) {
            case entityTypes.TOPIC:
                res = topics;
                break;
            case entityTypes.DIRECTION:
                res = directions;
                break;
            case entityTypes.FUND:
                res = funds;
                break;
            default:
                res = topics.concat(directions).concat(funds);
        }
        return res;
    }


    /**
     * filter exist relations in database,
     * return id's array only not exist relation fro entity
     * @param  {[obj]} data {
     *      userFundId, // int  optional
     *      entityIds, // array [1,2,3]
     * }
     * @return {[array]}      [1,2,3]
     */
    filterExistRelations (data) {
        var userFundId = data.userFundId || this.userFundId,
            entityIds  = data.entityIds;
        var relations = await(this.UserFundEntity.findAll({
            where: {
                userFundId,
                entityId: {
                    $in: entityIds
                }
            }
        }));
        var existInTable = {};
        relations.forEach(entity => existInTable[entity.entityId] = true);

        return entityIds.filter(entityId => {
            if (existInTable[entityId]) { return false; }
            return true;
        });
    }


    /**
     * addEntities in userFund
     * @param {[obj]} data {
     *   userFundId, // int optional
     *   entityIds,  // array [ 1, 2, 3 ]
     * }
     */
    addEntities(data) {
        var userFundId = data.userFundId || this.userFundId,
            entityIds  = data.entityIds;
        var multiRows = entityIds.map(entityId => {
            return { userFundId, entityId };
        });
        await(this.UserFundEntity.bulkCreate(multiRows));
    }


    /**
     * remove entities in userFund
     * @param  {[obj]} data {
     *   userFundId, // int optional
     *   entityIds,  // array [ 1, 2, 3 ]
     * }
     * @return {[type]}      [description]
     */
    removeEntities(data) {
        var userFundId = data.userFundId || this.userFundId,
            entityIds  = data.entityIds;
        await(this.UserFundEntity.destroy({
            where: {
                userFundId,
                entityId: {
                    $in: entityIds
                }
            }
        }));
    }

    /**
     * return remaining entities will be remove entities
     * @param  {[obj]} data {
     *    entityIds: [ 1,2,3 ] // entites which remove
     * }
     * @return {[obj]}  [ { id, title, desription } ]
     */
    remainingEntities(data) {
        var entityIds  = data.entityIds, entityIdsForRemove = {};
        entityIds.forEach(entityId => entityIdsForRemove[entityId] = true);
        var entities = this.getEntity();
        return entities.filter(entity => {
            if (!entityIdsForRemove[entity.id]) { return true; }
        });
    }


    /**
     * is empty userFund after remove entity from him
     * @param  {[obj]}  data {
     *   entityIds, // array
     * }
     * @return {Boolean}
     */
    isEmptyAfterRemoveEntity(data) {
        var entityIdsForRemove = data.entityIds, hashForRemove = {};
        entityIdsForRemove.forEach(entityId => hashForRemove[entityId] = true);
        var fundsUserFund = this.getEntity({ type: entityTypes.FUND });
        var remaningFunds = fundsUserFund.filter(fund => {
            if (!hashForRemove[fund.id]) { return true; }
        });
        if (!remaningFunds.length) { return true; }
        return false;
    }


    /**
     * add empty directions  and topics
     * @param  {[obj]}   data {
     *   entityIds: [1, 2, 3], // entityIds for remove
     * }
     * @return {[array]} [ 1,2,3,4]
     */
    addEmptyDirectionsTopics(data) {
        const TOPIC     = entityTypes.TOPIC,
              DIRECTION = entityTypes.DIRECTION,
              FUND      = entityTypes.FUND;
        var entityIdsForRemove = data.entityIds;
        var remaningEntities = this.remainingEntities({ entityIds: entityIdsForRemove });

        var hashRemaning = {};
        remaningEntities.forEach(entity => hashRemaning[entity.id] = true);
        var directions = remaningEntities.filter(entity => entity.type === DIRECTION);

        // { 1: [3,4,5], 2:[10, 9] }
        var relationDirections = new ExtractEntity({
            type: DIRECTION,
            entityIds: directions.map(entity => entity.id) || []
        }).buildTreeId();

        var emptyDirectionIds = addEmptyDirectionsTopics_(hashRemaning, relationDirections);
        entityIdsForRemove = entityIdsForRemove.concat(emptyDirectionIds);
        var topics = remaningEntities.filter(entity => entity.type === TOPIC);
        // { 1: [3,4,5], 2:[10, 9] }
        var relationTopics = new ExtractEntity({
            type: TOPIC,
            entityIds: topics.map(entity => entity.id) || []
        }).buildTreeId();
        var emptyTopicIds = addEmptyDirectionsTopics_(hashRemaning, relationTopics);
        if (emptyTopicIds.length) {
            entityIdsForRemove = entityIdsForRemove.concat(emptyTopicIds);
        }
        return entityIdsForRemove;
    }


    /**
     * if not own userfund then check exist and enable another userfund
     * @param  {[int]} userFundId // optional
     * @return {[type]}
     */
    checkEnableIfNotOwn(userFundId) {
        userFundId = userFundId || this.userFundId;
        var userFund = await(userFundService.getUserFund(userFundId));
        if (!userFund) {
            throw new errors.NotFoundError(i18n.__('UserFund'), userFundId);
        }
        if (userFundId !== userFund.id) {
            if (!userFund.enabled) {
                throw new errors.HttpError(i18n.__('UserFund disabled'), 400);
            }
        }
    }


    getUserFundEntities() {
        return userFundService.getUserFundSnapshot(this.userFundId);
    }

    /**
     * сheckEmpty userFund: throw error if empty or return userFund
     * @return {obj}
     * {
     *   id,
     *   topic: [{ id, title, description }],
     *   direction: [{ id, title, description }],
     *   fund: [{ id, title, description }]
     * }
     */
    getSnapshot() {
        var userFundEntities = this.getUserFundEntities();
        if (userFundEntities && !userFundEntities.fund.length) {
          throw new errors.HttpError(i18n.__('UserFund is empty'), 400);
        }
        return userFundEntities;
    }


    /**
     * hasNotTopicDirection exist one topic or direction in userFund
     * @return {Boolean} [description]
     */
    hasNotTopicDirection() {
        var userFundEntities = this.getUserFundEntities();
        var topic     = userFundEntities.topic     || [],
            direction = userFundEntities.direction || [];
        if (!topic.length || !direction.length) { return true; }
    }


    /**
     * create userFund
     * @param  {[obj]} data {
     *  title,
     *  description,
     *  creatorId,
     * }
     * @return {[type]}      [description]
     */
    create(data) {
        await(this.UserFund.create({
            title: data.title,
            description: data.description,
            creatorId: this.sberUserId,
            enabled: false,
        }));
    }


    /**
     * create empty userFund
     * @return {[type]}      [description]
     */
    createEmpty() {
        this.create({
            title: '',
            description: '',
            enabled: false,
        });
    }


    /**
     * remove  remove userFund
     * @return {[type]}
     */
    remove() {
        var id = this.userFundId;
        await(this.UserFund.update({
            deletedAt: new Date(),
            enabled: false, // hide for another user
        }, {
            where: {
                id,
            },
        }));
    }
}

/**
 * return empty directions topics
 * by comparison
 * @param {[obj]}  hashRemaning { 1: true, 2: true, ... }
 * from userFund after will removed
 * @param {[obj]}  relationDirections { '1': [ 2, 3, 4 ], ... }
 * it's schema association  topic: [ directions ] or direction: [ funds ]
 * @return {[array]} // list id empty topics or directions
 */
function addEmptyDirectionsTopics_ (hashRemaning, relationEntities) {
    var emptyDirectionsTopics = [];
    var entityIds = Object.keys(relationEntities);
    for (var i = 0, l = entityIds.length; i < l; i++) {
        var entityId = entityIds[i],
            nestedIds = relationEntities[entityId];
        var deleted = true;
        for (var j = 0, l1 = nestedIds.length; j < l1; j++) {
            var nestedId = nestedIds[j];
            if (hashRemaning[nestedId]) {
                deleted = false;
                break;
            }
        }
        if (deleted) {
            hashRemaning[entityId] = false; // deleted from remaning entity from userFund
            emptyDirectionsTopics.push(entityId);
        }
    }
    return emptyDirectionsTopics;
}
