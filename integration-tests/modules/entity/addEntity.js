'use strict'

const services = require('../../services');
const chakram = require('chakram');
const util = require('util');
const expect = chakram.expect;

module.exports = function(context) {
    chakram.addMethod('checkAddEntity', function(respObj) {
        var statusCode = respObj.response.statusCode,
            body       = respObj.response.body;
        this.assert(
            statusCode === 200,
            'Error status ' + statusCode + '; body:' + util.inspect(body, { depth:5 })
        );
        return chakram.wait();
    });

    return function () {
        var url      = services.url.concatUrl('user-fund/'+context.listEntities[0].id);
        var response = chakram.post(url);
        expect(response).checkAddEntity();
        return chakram.wait();
    };
};
