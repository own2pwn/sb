'use strict'

// create enums
// dmitrii kamaev


module.exports = class Enum {
    /**
     * new Enum({ DIRECTION: 'direction', FUND: 'fund'});
     * @return {[obj]} { DIRECTION: 'direction', direction: 'DIRECTION', FUND: 'fund', fund: 'FUND' }
     *
     */
    constructor (obj) {
      Object.keys(obj).forEach((key) => {
        var value = obj[key];
        this[key] = value;
        this[value] = key;
      });
    }
};
