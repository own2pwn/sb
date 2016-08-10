'use strict';

const Controller = require('nodules/controller').Controller;
const await = require('asyncawait/await');
const entityService = require('../services/entityService');
const entityView = require('../views/entityView');
const userFundView = require('../../userFund/views/userFundView');
const errors = require('../../../components/errors');

class EntityController extends Controller {
    /**
     * @api {post} /entity create new Entity
     * @apiName create new Entity
     * @apiGroup Admin
     *
     * @apiParam {String} [title] title name of the entity
     * @apiParam {String} [decsription] entity text decsription
     * @apiParam {String="fund","topic","direction"} type type of the entity
     * @apiParam {Number[]} entityId id of entities need to associate
     *
     * @apiParamExample {json} Example request:
     * {
     *     "title": "sample title",
     *     "description": "sample description",
     *     "type": "topic",
     *     "entities": [1, 2, 3]
     * }
     *
     * @apiSuccess {Object} Entity created entity object
     * @apiSuccessExample {json} Success-Response:
     *     HTTP/1.1 200 OK
     *     Location: '/entity/1'
     *     {
     *         "id": 1,
     *         "type": "topic",
     *         "title": "sample title",
     *         "description": "sample description",
     *         "createdAt": "2016-06-20T15:46:59.196Z",
     *         "updatedAt": "2016-06-24T09:36:48.822Z"
     *     }
     *
     * @apiError (Error 400) ValidationError wrong type
     *
     * @param {actionContext} actionContext
     * @return {Object} Entity
     */
    actionCreateEntity(actionContext) {
        try {
            var data     = actionContext.request.body,
                entities = data.entities;
            var entity = await(entityService.createEntity(data));
            await(entityService.associateEntities(entity.id, entities));
            actionContext.response.statusCode = 201;
            actionContext.response.set('Location', `/entity/${entity.id}`);
            return entityView.renderEntity(entity);
        } catch (err) {
            if (err.name == 'SequelizeValidationError') {
                throw new errors.ValidationError(err.errors);
            } else {
                throw err;
            }
        }
    };
    /**
     * @api {get} /entity/:type get entities by type
     * @apiName get entities by type
     * @apiGroup Entity
     *
     * @apiParam {String="fund","topic","direction"} type type of entities
     *
     * @apiSuccess {Object[]} Entities array of entities with scecific :type
     * @apiSuccessExample {json} Success-Response:
     *     HTTP/1.1 200 OK
     * [
     *  {
     *    "id": 3,
     *    "type": "Direction",
     *    "title": "rak",
     *    "description": null,
     *    "createdAt": "2016-06-20T15:46:59.311Z",
     *    "updatedAt": "2016-06-20T15:46:59.311Z"
     *  },
     *  {
     *    "id": 4,
     *     "type": "Direction",
     *    "title": "priyut",
     *    "description": null,
     *    "createdAt": "2016-06-20T15:46:59.336Z",
     *    "updatedAt": "2016-06-20T15:46:59.336Z"
     *  },
     *  {
     *    "id": 5,
     *    "type": "Fund",
     *    "title": "super fund",
     *    "description": null,
     *    "createdAt": "2016-06-20T15:46:59.387Z",
     *    "updatedAt": "2016-06-20T15:46:59.387Z"
     *  },
     *  {
     *    "id": 6,
     *    "type": "Topic",
     *    "title": "super topic1",
     *    "description": null,
     *    "createdAt": "2016-06-20T15:48:05.985Z",
     *    "updatedAt": "2016-06-20T15:48:05.985Z"
     *  }
     * ]
     *
     * @param {Object} actionContext
     * @param {String} type
     * @return {Object} Entity
     */
    actionGetEntitiesByType(actionContext, type) {
        var userFundId = actionContext.request.user.userFund.id;
        var published = actionContext.request.published;
        var entities = await(entityService.getEntitiesByType(type, userFundId, published));
        return entityView.renderEntities(entities);
    };
    /**
     * @api {get} /entity/:id get Entity by id
     * @apiName get Entity
     * @apiGroup Entity
     *
     * @apiParam {Number} id unique identifier of Entity
     *
     * @apiSuccess {Object} Entity object
     * @apiSuccessExample {json} Success-Response:
     *     HTTP/1.1 200 OK
     *     {
     *         "id": 1,
     *         "type": "topic",
     *         "title": "sample title",
     *         "description": "sample description",
     *         "createdAt": "2016-06-20T15:46:59.196Z",
     *         "updatedAt": "2016-06-24T09:36:48.822Z"
     *     }
     *
     * @apiError (Error 404) NotFoundError entity with this id not found
     *
     * @param {Object} actionContext
     * @param {Integer} id id of entity
     * @return {Object} Entity
     */
    actionGetEntity(actionContext, id) {
        var userFundId = actionContext.request.user.userFund.id,
            published = actionContext.request.published,
            include = actionContext.request.query.include;
        var entity = await(entityService.getEntity(id, userFundId, published, include));
        if (!entity) throw new errors.NotFoundError('Entity', id);
        return entityView.renderEntity(entity);
    };
    /**
     * @api {delete} /entity/:id delete entity by id
     * @apiName delete Entity
     * @apiGroup Admin
     *
     *
     * @param {Object} actionContext
     * @param {Integer} id
     */
    actionDeleteEntity(actionContext, id) {
        var deleted = await(entityService.deleteEntity(id));
        if (!deleted) throw new errors.NotFoundError('Entity', id);
        return null;
    };
    /**
     * @api {put} /entity/:id update entity by id
     * @apiName update Entity
     * @apiGroup Admin
     *
     * @apiParam {Number} id unique Entity identifier
     *
     * @apiParamExample {json} Example request:
     * {
     *     "title": "sample title",
     *     "description": "sample description",
     *     "type": "topic",
     *     "entities": [1, 2, 3]
     * }
     *
     * @apiError (Error 404) NotFound entity with this id not found
     * @apiError (Error 400) ValidationError wrong type field
     *
     *
     * @param {Object} actionContext
     * @param {Integer} id
     */
    actionUpdateEntity(actionContext, id) {
        try {
            var data = actionContext.request.body,
                entities = data.entities;
            delete data.id;
            await(entityService.removeAssociations(id));
            var entity = await(entityService.updateEntity(id, data));
            await(entityService.associateEntities(entity.id, entities));
            if (!entity[0]) throw new errors.NotFoundError('Entity', id);
            return null;
        } catch (err) {
            if (err.name == 'SequelizeValidationError') {
                throw new errors.ValidationError(err.errors);
            } else {
                throw err;
            }
        }
    };
    /**
     * @api {get} /entity/:id/:type get associated entities by id
     * @apiName get Entity By Associated Id
     * @apiGroup Entity
     *
     *
     * @apiParam {Number} id identifier of Entity
     * @apiParam {String="fund","topic","direction"} type type of entities
     *
     * @apiSuccess {Object[]} Entities array of entities related to :id
     *
     * @apiError (Error 404) NotFoundError Entity not found
     *
     * @param {Object} actionContext
     * @param {Integer} id
     * @param {String} type
     * @return {Object[]} entities
     */
    actionGetEntitiesByAssociatedId(actionContext, id, type) {
        try {
            var userFundId = actionContext.request.user.userFund.id,
                published = actionContext.request.published;
            var entities =
                await(entityService.getEntitiesByOwnerId(id, type, userFundId, published));
            return entityView.renderEntities(entities);
        } catch (err) {
            if (err.message == 'Not found') {
                throw new errors.NotFoundError('Entity', id);
            }
            throw err;
        }
    };

    /**
     * @api {post} /entity/:id/:otherId associate entities
     * @apiName associate Entity
     * @apiGroup Admin
     *
     * @apiError (Error 404) NotFoundError entity with :id or :otherId not found
     *
     * @param {Object} actionContext
     * @param {Integer} id
     * @param {Integer} otherId
     *
     */
    actionAssociate(actionContext, id, otherId) {
        try {
            await(entityService.associateEntity(id, otherId));
        } catch (err) {
            if (err.message == 'Relation exists') {
                throw new errors.HttpError('Relation exists', 400);
            }
            var ids = [id, otherId].join(' OR ');
            throw new errors.NotFoundError('Entity', ids);
        }
        return null;
    };
    /**
     * @api {get} /entity get all entities
     * @apiName All Entities
     * @apiGroup Entity
     *
     * @apiSuccess {Object[]} Entities array of all entities
     *
     * @param {Object} actionContext
     * @return {Object[]} entities
     */
    actionGetAllEntities(actionContext) {
        var userFundId = actionContext.request.user.userFund.id,
            published = actionContext.request.published;
        var entities = await(entityService.getAllEntities(userFundId, published));
        return entityView.renderEntities(entities);
    };
    /**
     * @api {delete} /entity/:id/:otherId remove entities association
     * @apiName remove association
     * @apiGroup Admin
     *
     * @apiParam {Number} id identifier of entity which OWNS relation
     * @apiParam {Number} otherId identifier of entity which OWNED by
     *
     *
     * @apiError (Error 404) NotFoundError entity with :id or :otherId not found
     *
     * @param {Object} actionContext
     * @param {Integer} id
     * @param {Integer} otherId
     */
    actionRemoveAssociation(actionContext, id, otherId) {
        var deletedCount = await(entityService.removeAssociation(id, otherId));
        if (!deletedCount) {
            throw new errors.HttpError('Relation don\'t exists', 400);
        }
        return null;
    };
    /**
     * @api {get} /entity/fund/today get today created Funds
     * @apiName get today created funds
     * @apiGroup Entity
     *
     * @apiSuccess {Number} count count of funds created today
     *
     * @param {Object} actionContext
     */
    actionGetTodayFundsCount(actionContext) {
        var count = await(entityService.getTodayFundsCount());
        return {
            count: count
        };
    };
    /**
     * @api {get} /entity/:id/user-fund get user funds
     * @apiName get user funds associated with this entity
     * @apiGroup Entity
     *
     * @apiSuccess {Object[]} userFunds
     *
     * @apiError (Error 404) NotFoundError entity with :id not found
     *
     * @param {Object} actionContext
     * @param {Integer} id
     * @return {Object[]} UserFunds
     */
    actionGetUserFunds(actionContext, id) {
        var published = actionContext.request.published,
            entity = await(entityService.getUserFunds(id, published));
        if (!entity) throw new errors.NotFoundError('Entity', id);
        return userFundView.renderUserFunds(entity.userFund);
    };
    /**
     * @api {post} /entity/publishall publish all (test)
     * @apiName publish all
     * @apiGroup Admin
     * @param  {[type]} actionContext [description]
     * @return {[type]}               [description]
     */
    actionPublishAll(actionContext) {
        return await(entityService.publishAll());
    };
    /**
     * @api {get} /entity/all get entities with include
     * @apiNane get entities with include
     * @apiGroup Admin
     * @apiParam (Query Params) {String="fund","topic","direction"} type=["fund","direction","topic"] type of enties
     * @apiParam (Query Params) {String="fund","topic","direction"} type of nested entities
     *
     * @apiSuccessExample {json} example:
     *
     * 			[    {
        "id": 8,
        "type": "direction",
        "title": "sample title",
        "description": "sample description",
        "createdAt": "2016-08-04T10:11:26.585Z",
        "updatedAt": "2016-08-04T10:11:26.585Z",
        "imgUrl": "http://www58.lan:3000/entity_pics/defaultDirection.png",
        "published": false,
        "topics": [
            {
                "id": 1,
                "type": "topic",
                "title": "sample title",
                "description": "sample description",
                "createdAt": "2016-08-04T09:41:04.483Z",
                "updatedAt": "2016-08-04T09:41:37.110Z",
                "imgUrl": "http://www58.lan:3000/entity_pics/defaultTopic.png",
                "published": true
            },
            {
                "id": 2,
                "type": "topic",
                "title": "sample title",
                "description": "sample description",
                "createdAt": "2016-08-04T09:41:04.626Z",
                "updatedAt": "2016-08-04T09:41:37.110Z",
                "imgUrl": "http://www58.lan:3000/entity_pics/defaultTopic.png",
                "published": true
            }
        ]
    }
]
     *
     */
    actionGetEntitiesWithNested(actionContext) {
        var includes = actionContext.request.query.include;
        var type = actionContext.request.query.type;
        try {
            var entities = await(entityService.getEntitiesByTypeWithNested(type, includes));
        } catch (err) {
            throw new errors.HttpError('Wrong "include" or "type" query param!', 400);
        }
        return entityView.renderEntities(entities);
    };
}

module.exports = EntityController;
