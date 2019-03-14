const log4js = require('log4js');
const logger = log4js.getLogger('Tenants');
logger.level = process.env.LOG_LEVEL || 'debug';

const mongoose = require('mongoose');
require('../config/initializers/database');

const TenantSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            unique: true,
            min: [4, 'tenant name is too short'],
            required: [true, 'Missing required tenant name.']
        }
    },
    {
        read: 'nearest',
        usePushEach: true,
        timestamps: true
    }
);

const Tenant = mongoose.model('Tenant', TenantSchema);

module.exports = class Tenants {

    constructor() {
        logger.trace('<init> entry');
        logger.trace('<init> exit');
    }
    async createTenant(tenantToSignUp) {
        logger.trace('createTenant entry', tenantToSignUp);
        const newTenant = await new Tenant({name: tenantToSignUp});
        const _tenant = await newTenant.save();
        logger.trace('createTenant exit', _tenant);
        return _tenant;
    }
    async findById (id) {
        logger.trace('findById entry', id);
        const tenant = await Tenant.findById(id);
        logger.trace('findById exit', tenant);
        return tenant;
    }
    async findByName (name) {
        logger.trace('findByName entry', name);
        const tenant = await Tenant.findOne({'name':name});
        logger.trace('findByName exit', tenant);
        return tenant;
    }
    async listTenants () {
        logger.trace('listTenants entry');
        const allTenants = await Tenant.find({});
        logger.trace('listTenants exit', allTenants);
        return allTenants;
    }
    async deleteTenant (id) {
        logger.trace('deleteTenant entry', id);
        const tenantToDelete = await Tenant.findByIdAndDelete(id);
        logger.trace('deleteTenant exit', tenantToDelete);
        return tenantToDelete;
    }
};
