const uuidv4 = require('uuid/v4');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt')
const log4js = require('log4js');
const logger = log4js.getLogger('Users');
logger.level = process.env.LOG_LEVEL || 'debug';

const i18n = require('i18n');
const path = require('path');
i18n.configure({
    directory: path.join(__dirname, '/../locales')
});

const mongoose = require('mongoose');
require('../config/initializers/database');

var transporter;

nodemailer.createTestAccount((err, account) => {
    if(err){
        throw new Error (err);
    }
    transporter = nodemailer.createTransport({
        debug: true,
        host: 'smtp.sendgrid.net',
        port: 465,
        secure: true, // use TLS
        auth: {
            user: 'apikey',
            pass: '<redacted>'
        }
    });
});

const UserSchema = new mongoose.Schema(
    {
        tenantId: {
            type: String,
            unique: true,
            min: [4, 'tenant id is too short'],
            required: [true, 'Missing required tenant id.']
        },
        email: {
            type: String,
            unique: true,
            min: [4, 'email address is too short'],
            required: [true, 'Missing required email address.']
        },
        _password: {
            type: String,
            unique: true,
            min: [4, 'password is too short'],
            required: [true, 'Missing required password.']
        },
        failedLogins: Number,
        accountLocked: Boolean
    },
    {
        read: 'nearest',
        usePushEach: true,
        timestamps: true
    }
);

const User = mongoose.model('User', UserSchema);

module.exports = class Users {
    constructor() {
        logger.trace('<init> entry');
        logger.trace('<init> exit');
    }
    async createUser (userToSignUp) {
        logger.trace('createUser entry');
        logger.trace('userToSignUp - tenantId:' + userToSignUp.tenantId);
        const user = await new User({tenantId: userToSignUp.tenantId, email: userToSignUp.email, _password: userToSignUp.password, _tempPassword: null, failedLogins: 0, accountLocked: false})
        await user.save();
        logger.trace('<createUser> exit', user);
        return user;
    }
    async deleteUser (id) {
        logger.trace('deleteUser entry');
        const userToDelete = await User.findByIdAndDelete(id);
        logger.trace('deleteUser exit', userToDelete);
        return userToDelete;
    }
    async findById (id) {
        logger.trace('findById entry', id);
        const user = await User.findById(id);
        logger.trace('findById exit', user);
        return user;
    }
    async findByEmail (email) {
        logger.trace('findByEmail entry', email);
        const user =  await User.findOne({'email':email});
        logger.trace('findByEmail exit', user);
        return user;
    }
    async listUsers (tenantId) {
        logger.trace('listUsers entry');
        const allUsers = await User.find({'tenantId':tenantId});
        logger.trace('listUsers exit', allUsers);
        return allUsers;
    }

    async changePassword (email, newPassword) {
        logger.trace('changePassword entry',email);
        let user = await this.findByEmail(email);
        if(user){
            user._password = newPassword;
            await user.save();
            user.save(function (err, returnedUser) {
                if (err){
                    logger.error('error in changePassword save', err);
                }else{
                    user = returnedUser;
                }
            })
        }
        logger.trace('changePassword exit', user);
        return user;
    }

    async incrementFailedLogin(email){
        logger.trace('incrementFailedLogin entry', email);
        let user = await this.findByEmail(email);
        if(user){
            ++user.failedLogins;
            if(user.failedLogins > 5){
                user.accountLocked = true;
            }
            user = await user.save();
        }
        logger.trace('incrementFailedLogin exit', user);
        return user;
    }

    async resetLoginFailure(email){
        logger.trace('resetLoginFailure entry', email);
        const user = await this.findByEmail(email);
        if(user){
            user.failedLogins=0;
            user.accountLocked = false;
            await user.save();
        }
        logger.trace('resetLoginFailure exit',user);
    }
    async resetPassword(email){
        logger.trace('resetPassword entry', email);
        const user = await this.findByEmail(email);
        const tmpPassword = uuidv4();
        user.password = await bcrypt.hash(tmpPassword, 10);
        await user.save();
        let mailOptions = {
            from: '"Blockchain Token Factory" <donotreply@ibm.com>', // sender address
            to: email,
            subject: 'Password reset request for Blockchain Token Factory user ' + email, // Subject line
            text: 'Temporary password: ' + tmpPassword
            // text: 'Hello world?', // plain text body
            // html: '<b>Hello world?</b>' // html body
        };

        // send mail with defined transport object
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                logger.error(i18n.__('failed.email.send'), error);
                throw new Error(i18n.__('failed.email.send'));
            }
        });
        logger.trace('resetPassword exit', user);
        return user;
    }
};
