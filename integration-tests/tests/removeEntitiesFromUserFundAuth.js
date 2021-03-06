'use strict'

// author: dm-kamaev
// remove entities from userFund, when user auth
// userFund not must be empty, but this removal userFund

const util = require('util');
const chakram = require('chakram');
const expect = chakram.expect;
const services = require('../services');
const config_db = require('../config/db.json');
const config_admin = require('../config/admin.json');
const pgp = require('pg-promise')();
const db = pgp(config_db);
const logger = require('./../../app/components/logger/').getLogger('main');
const Context = require('./../../app/components/context');
const entityTypes = require('../../app/modules/entity/enums/entityTypes.js');

const logout = require('../modules/user/logout.js');
const register = require('../modules/user/register.js');
const getUserInfo = require('../modules/user/getUserInfo.js');
const EntitiesApi = require('../modules/entity/entitiesApi.js');
const UserFundApi = require('../modules/userFund/userFundApi.js');
const UserFundApiDb = require('../modules/userFund/userFundApiDb.js');
const FUND      = entityTypes.FUND,
      DIRECTION = entityTypes.DIRECTION,
      TOPIC     = entityTypes.TOPIC;
chakram.setRequestDefaults(config_admin);


describe('Remove entities from userFund (auth user) =>', function() {
    const context   = new Context();
    const userFundApi = new UserFundApi(context);
    const userFundApiDb = new UserFundApiDb(context);
    const entitiesApi = new EntitiesApi(context);

    // --------------------------------------------------------------------------
    before('Logout',   logout(context));
    before('Register', register(context));

    // --------------------------------------------------------------------------
    before('Search random topic',     () => entitiesApi.searchRandomEntity(TOPIC));
    before('Search random direction', () => entitiesApi.searchRandomEntity(DIRECTION));
    before('Search random fund',      () => entitiesApi.searchRandomEntity(FUND));


    // --------------------------------------------------------------------------
    before('Get user info', getUserInfo(context));
    before('Enable userFund via db', () => userFundApiDb.enableUserFund());

    // --------------------------------------------------------------------------
    it(`Add ${TOPIC} in userFund`,() => userFundApi.addEntity(context.get(TOPIC)));

    it(`Try remove ${TOPIC} from userFund`, () =>
        userFundApi.notRemoveLastEntity(context.get(TOPIC))
    );

    it('Clean userFund via db', () => userFundApiDb.cleanUserFund());


    // --------------------------------------------------------------------------
    it(`Add ${DIRECTION} in userFund`,() => userFundApi.addEntity(context.get(DIRECTION)));

    it(`Try remove ${DIRECTION} from userFund`,()=>
        userFundApi.notRemoveLastEntity(context.get(DIRECTION))
    );

    it('Clean userFund via db', () => userFundApiDb.cleanUserFund());


    // --------------------------------------------------------------------------
    it(`Add ${FUND} in userFund`,() => userFundApi.addEntity(context.get(FUND)));

    it(`Try remove ${FUND} from userFund`,()=>
        userFundApi.notRemoveLastEntity(context.get(FUND))
    );

    it('Clean userFund via db', () => userFundApiDb.cleanUserFund());


    // --------------------------------------------------------------------------
    after('Terminate db connection pool', () => pgp.end());
});