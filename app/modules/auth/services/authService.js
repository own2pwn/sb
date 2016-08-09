'use strict';

const await = require('asyncawait/await');
const config = require('../../../../config/auth-config/config');
const sequelize = require('../../../components/sequelize');
const TIMEOUT = 1000 * 60 * 5;
const JWT_SECRET = require('../../../../config/config').jwt_secret;
const jwt = require('jsonwebtoken');
const axios = require('axios').create({
    baseURL: `http://${config.host}:${config.port}`
});
const os = require('os');

class TimerError extends Error {
    constructor(time) {
        var diff = time - new Date(new Date() - TIMEOUT),
            mins = Math.floor(diff / (1000 * 60)),
            seconds = Math.floor(diff / 1000) % 60;

        super(`Попробуйте снова через ${mins}:${seconds}`);

        this.name = 'TimerError';
        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends Error {
    constructor(validationErrors) {
        super('ValidationError');

        this.name = 'ValidationError';
        this.validationErrors = validationErrors;
        Error.captureStackTrace(this, this.constructor);
    }
}

exports.createAuthUser = function(userData) {
    var firstName = userData.firstName,
        lastName = userData.lastName;
    if (!firstName || !lastName ||
        firstName.length > 20 || lastName.length > 20) {
        var valErrors = [];

        firstName ? firstName.length > 20 ? valErrors.push({
            fistName: 'Поле "Имя" содержит больше 20 символов'
        }) : null : valErrors.push({
            fistName: 'Поле "Имя" пустое'
        });

        lastName ? lastName.length > 20 ? valErrors.push({
            lastName: 'Поле "Фамилия" содержит больше 20 символов'
        }) : null : valErrors.push({
            lastName: 'Поле "Фамилия" пустое'
        });

        throw new ValidationError(valErrors);
    }

    var response = await(axios.post('/user', {
        firstName: userData.firstName,
        lastName: userData.lastName,
        phone: userData.phone,
        password: '+'
    }));

    return response.data;
};

exports.saveCode = function(phone, code, sberUserId) {
    var send = await(sequelize.models.Phone.findOne({
        where: {
            number: phone,
            updatedAt: {
                $gt: new Date(new Date() - TIMEOUT)
            }
        }
    }));

    // if (send) throw new TimerError(send.updatedAt);

    return await(sequelize.models.Phone.upsert({
        number: phone,
        code,
        sberUserId,
        verified: false
    }));
};

exports.sendCode = function(phone, code) {
    // sending SMS to the user...
};

exports.verifyCode = function(phone, code) {
    return await(sequelize.models.Phone.update({
        verified: true
    }, {
        where: {
            number: phone,
            code
        }
    }));
};

exports.register = function(userData) {
    var firstName = userData.firstName,
        lastName = userData.lastName,
        email = userData.email,
        password = userData.password;

    if (!email || !password || password.length < 6 || !firstName || !lastName ||
        firstName.length > 20 || lastName.length > 20) {
        var valErrors = [];

        email ? null : valErrors.push({
            email: 'Поле email не может быть пустым'
        });

        password ? password.length > 6 ? null : valErrors.push({
            password: 'Минимальная длина пароя 6 символов'
        }) : valErrors.push({
            password: 'Поле пароль не может быть пустым'
        });

        firstName ? firstName.length > 20 ? valErrors.push({
            fistName: 'Поле "Имя" содержит больше 20 символов'
        }) : null : valErrors.push({
            fistName: 'Поле "Имя" пустое'
        });

        lastName ? lastName.length > 20 ? valErrors.push({
            lastName: 'Поле "Фамилия" содержит больше 20 символов'
        }) : null : valErrors.push({
            lastName: 'Поле "Фамилия" пустое'
        });

        throw new ValidationError(valErrors);
    }

    try {
        var response = await(axios.post('/user', {
            firstName,
            lastName,
            email,
            password
        }));

        return response.data;
    } catch (err) {
        if (err.data && err.data[0].code == 'ValidationError') {
            throw new ValidationError(err.data[0].validationErrors);
        }
        throw err;
    }
};

exports.login = function(email, password) {
    try {
        var response = await(axios.post(`/user/${email}`, {
            password
        }));
    } catch (err) {
        if (err.data && err.data[0].code == 'NotFoundError') {
            throw new Error('Not found');
        }
        throw err;
    }

    return response.data;
};

exports.generateToken = function(email) {
    return await(new Promise((resolve, reject) => {
        jwt.sign({
            email
        }, JWT_SECRET, {
            expiresIn: '2 days'
        }, (err, token) => {
            if (err) reject(err);
            resolve(token);
        });
    }));
};

exports.verifyToken = function(token) {
    return await(new Promise((resolve, reject) => {
        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) reject(err);
            resolve(decoded);
        });
    }));
};

exports.verifyUser = function(sberUserId) {
    return await(sequelize.models.SberUser.update({
        verified: true
    }, {
        where: {
            id: sberUserId
        }
    }));
};
