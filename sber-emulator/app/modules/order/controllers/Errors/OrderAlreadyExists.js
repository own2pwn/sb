'use strict';
const ControllerError = require('nodules/controller/ControllerError');
const i18n = require('../../../../components/i18n');

module.exports = class extends ControllerError {

    /**
     * @param {Error} exception
     * @public
     * @constructor
     */
    constructor(exception) {
        super(exception);
        this.status = 200;
        this.errorCode = 1;
        this.errorMessage = i18n.__('Order already processed');
    }
};
