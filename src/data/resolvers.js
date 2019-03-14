// data/resolvers.js

const Users  = require('../models/Users.js');
const _users = new Users();

const Tenants = require('../models/Tenants.js');
const _tenants = new Tenants();

const bcrypt = require('bcrypt');
const jsonwebtoken = require('jsonwebtoken');

const log4js = require('log4js');
const logger = log4js.getLogger('resolvers');
logger.level = process.env.LOG_LEVEL || 'debug';

const mongoose = require('mongoose');
require('../config/initializers/database');

const i18n = require('i18n');
const path = require('path');
i18n.configure({
    directory: path.join(__dirname, '/../locales')
});

const { AuthenticationError, ApolloError } = require ('apollo-server');

class AuthToken {
    constructor(authToken) {
        this.authToken = authToken;
    }
}

const resolvers = {
    Query: {
        // fetch the profile of currently authenticated user
        async me (_, args, { user }) {
            logger.trace('me entry', user);
            // make sure user is logged in
            if (!user) {
                throw new Error('You are not authenticated!')
            }
            // user is authenticated
            const whoAmI = await _users.findById(user.id)
            logger.trace('me exit', whoAmI );
            return whoAmI;
        },
        async listTenants (_, args, {  })  {
            // return all tenants
            logger.trace('listTenants entry');
            const tenants =  await _tenants.listTenants();
            logger.trace('listTenants exit', tenants);
            return tenants;
        },
        async listUsers (_, args, { user })  {            
            // return all users
            logger.trace('listUsers entry');
            const users =  await _users.listUsers(user.tenantId);
            logger.trace('listUsers exit', users);
            return users;
        }
    },
    Mutation: {
        // Handle user signup
        async createUser (_, { tenantId, email, password }) {
            logger.trace('createUser entry', {tenantId, email});
            const existingUser = await _users.findByEmail (email);
            if(existingUser){
                throw new ApolloError(i18n.__('duplicate.user.fail'));
            }
            const user = await _users.createUser({
                tenantId,
                email,
                password: await bcrypt.hash(password, 10)
            })
            if (!user) {
                throw new Error(i18n.__('create.user.fail'))
            }
            logger.trace('createUser exit', user );
            // return newly created user
            return user;
        },
        async deleteUser (_, { id }) {
            logger.trace('deleteUser entry', id);
            const deletedUser = await _users.deleteUser(id)
            if (!deletedUser) {
                throw new AuthenticationError(i18n.__('no.user.id'))
            }
            logger.trace('deleteUser exit', deletedUser);
            return deletedUser;
        },
        // Handles user login
        async login (_, { email, password }) {
            logger.trace('login entry', email);
            let user = await  _users.findByEmail(email)
            logger.trace('login user', user);
            if (!user) {
                throw new AuthenticationError(i18n.__('no.user.email'))
            }

            const valid = await bcrypt.compare(password, user._password)
            if (!valid) {
                // update failed login count
                user = await _users.incrementFailedLogin(email)
                logger.error('incrementFailedLogin user', user);
                if (user.accountLocked) {
                    throw new AuthenticationError(i18n.__('too.many.login.attempts'))
                }else{
                    throw new AuthenticationError(i18n.__('incorrect.password'))
                }
            }else{
                await _users.resetLoginFailure(email)
            }
            // return json web token
            const authToken = new AuthToken(jsonwebtoken.sign({
                tenantId: user.tenantId,
                id: user.id,
                email: user.email
            },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }) )
            logger.trace('login authToken', authToken);

            return authToken;

        },
        async resetPassword (_, { email }) {
            logger.trace('resetPassword entry', email);
            let user = await _users.findByEmail(email)
            if (!user) {
                throw new AuthenticationError(i18n.__('no.user.email'))
            }
            await _users.resetPassword(email)
            logger.trace('resetPassword exit', user );
            return user;
        },
        // Handles change password
        async changePassword(_, { email, currentpassword, newpassword }) {
            logger.trace('changePassword entry', email);
            var user = await _users.findByEmail(email)
            if (!user) {
                throw new AuthenticationError(i18n.__('no.user.email'))
            }
            const valid = await bcrypt.compare(currentpassword, user._password)
            if (!valid) {
                throw new AuthenticationError(i18n.__('incorrect.password'))
            }
            var newEncryptedPassword = await bcrypt.hash(newpassword, 10);
            user = await _users.changePassword(email, newEncryptedPassword);
            logger.trace('changePassword exit', user.toJSON() );
            return user;
        },
        async createTenant (_, { name }) {
            logger.trace('createTenant entry', name);
            var existingTenant = await _tenants.findByName(name)
            if(existingTenant){
                logger.error('createTenant existing tenant throwing error', existingTenant);
                throw new ApolloError(i18n.__('duplicate.tenant.fail'));
            }
            const tenantCreated = await _tenants.createTenant(name)
            if (!tenantCreated) {
                throw new ApolloError(i18n.__('no.tenant.fail'), 'CREATE_FAIL', {});
            }
            logger.trace('createTenant exit', tenantCreated);
            return tenantCreated;
        },
        async deleteTenant(_, { id }) {
            logger.trace('deleteTenant entry', id);
            const deletedTenant = await _tenants.deleteTenant(id)
            if (!deletedTenant) {
                throw new ApolloError(i18n.__('no.tenant.fail'), 'DELETE_FAIL', {});
            }
            logger.trace('deleteTenant exit', deletedTenant);
            return deletedTenant;
        }
    }
}

const mongoInitializeDB =  function() {
    logger.trace('Resolvers init entry');
    mongoose.connection.once('open', function() { 
        logger.trace('Mongo DB is opened');
    }); 
    mongoose.connection.on('connected', async function() {
        logger.trace('Mongo DB is connected');
        const tenantName = 'Project Lion';
        const email = 'lion@projectlion.com';
        const password = 'lion';
        var tenant = await _tenants.findByName(tenantName);
        if(!tenant){
            tenant = await _tenants.createTenant(tenantName);
        }
        logger.trace('Default tenant', tenant);
        const tenantId = tenant.id;
        var user = await _users.findByEmail (email);
        if(!user){
            user = await _users.createUser({
                tenantId, email,
                password: await bcrypt.hash(password, 10)
            })
        }
        logger.trace('Default user', user);
    }); 
};

module.exports.resolvers = resolvers
module.exports.init = mongoInitializeDB;
