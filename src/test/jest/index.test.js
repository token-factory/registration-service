const chai = require('chai');
const assert = chai.assert;
const log4js = require('log4js');
const logger = log4js.getLogger('Users');
logger.level = process.env.LOG_LEVEL || 'debug';
const uuidv4 = require('uuid/v4');

// application dependencies..
const app = require('../../app')
const mongoose = require('mongoose');
require('../../config/initializers/database');

const request = require('supertest');
const tenantName = uuidv4()

describe('outer describe', function () {
    // Before test suite, let's create a tenant
    // then after we are done, we delete the tenant.
    var tenantId;
    var userId;
    var emailAddress;

    beforeAll(async(done) => {
        logger.info('create tenant');
        const res = await request(app).post('/registration')
            .set('Accept', 'application/json')
            .set('Content-Type', 'application/json')
            .send({'query':'mutation { createTenant(name: "'+ tenantName + '") {id name} }'} )
        tenantId = JSON.parse(res.text)['data']['createTenant']['id'];
        logger.info('beforeAll tenantId', tenantId);
        done();
    })
    beforeAll(async(done) => {
        logger.info('List tenants');
        const res = await request(app).post('/registration')
            .set('Accept', 'application/json')
            .set('Content-Type', 'application/json')
            .send({'query':'{ listTenants { id name } } '} )
        const listOfTenants = JSON.parse(res.text)['data']['listTenants']
        let found = false;
        listOfTenants.forEach(function(entry) {
            if(entry.id === tenantId){
                found = true;
            }
        });
        assert.isTrue (found, 'Failed to find tenant' + tenantId);
        done();
    });
    
    afterAll(async(done) => {
        logger.info('Delete tenant');
        const res = await request(app).post('/registration')
            .set('Accept', 'application/json')
            .set('Content-Type', 'application/json')
            .send({'query':'mutation { deleteTenant(id:"'+ tenantId +'"){ id name } }'} )
        
        const deletedTenant = await JSON.parse(res.text)['data']['deleteTenant'];
        assert.isNotNull(deletedTenant.id);
        logger.info('Deleted: ' + deletedTenant);
  
        logger.info('Closing mongoose connection');
        await mongoose.connection.close();
        logger.info('After closing mongoose connection, marking done');
        done();
 
    });

    //  End beforeAll / afterAll section

    // Before each test, let's create a user
    // then after we are done, we delete the user.
    beforeEach(async(done) => {

        var oneInAMillion = Math.floor(Math.random() * (1000000) + 1);
        emailAddress = 'john' + oneInAMillion + '@example.com';
        logger.info('Sign up new user: ' + emailAddress);

        const res = await request(app).post('/registration')
            .set('Accept', 'application/json')
            .set('Content-Type', 'application/json')
            .send({'query':'mutation { createUser (tenantId: "'+ tenantId +'", email: "' + emailAddress + '", password: "password") { email id tenantId }   }'} )
        const createdUser = await JSON.parse(res.text)['data']['createUser'];
        userId = createdUser.id;
        logger.info('Created user with id ' + userId);
        assert.isNotNull(createdUser.id);
        assert.equal (createdUser.email, emailAddress);
        assert.equal (createdUser.tenantId, tenantId);
        done();
    })
    afterEach(async(done) => {
        logger.info('Delete user by id ' + userId);
        await request(app).post('/registration')
            .set('Accept', 'application/json')
            .set('Content-Type', 'application/json')
            .send({'query':'mutation { deleteUser ( id: "'+ userId + '") { id } }'} )
        done();

    })
    //  End before each / after each section

    describe('Create tenant -- fail (empty tenant name)', () => {
        it('Create tenant -- fail', async(done) => {
            logger.info('create tenant');
            const res = await request(app).post('/registration')
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                .send({'query':'mutation { createTenant(name: "' + '") {id name} }'} )
            const createdTenant = await JSON.parse(res.text)['data']['createTenant'];
            assert.isNull(createdTenant );
            const result = JSON.parse(res.text)['errors'][0]['message'];
            const expectedResult = 'Tenant validation failed: name: Missing required tenant name.';
            assert.isNotNull(result )
            assert.equal (result, expectedResult);
            done();
        });
    });

    describe('Create user -- fail (empty email id)', () => {
        it('Create user -- fail', async(done) => {
            var oneInAMillion = Math.floor(Math.random() * (1000000) + 1);
            emailAddress = 'john' + oneInAMillion + '@example.com';
            logger.info('Sign up new user: ' + emailAddress);

            const res = await request(app).post('/registration')
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                .send({'query':'mutation { createUser (tenantId: "'+ tenantId +'", email: "' + '", password: "password") { email id tenantId }   }'} )
            const createdUser = await JSON.parse(res.text)['data']['createUser'];
            assert.isNull(createdUser );
            const result = JSON.parse(res.text)['errors'][0]['message'];
            const expectedResult = 'User validation failed: email: Missing required email address.';
            assert.isNotNull(result )
            assert.equal (result, expectedResult);
            done();
        });
    });

    describe('Create user -- fail (empty tenant id)', () => {
        it('Create user -- fail', async(done) => {
            var oneInAMillion = Math.floor(Math.random() * (1000000) + 1);
            emailAddress = 'john' + oneInAMillion + '@example.com';
            logger.info('Sign up new user: ' + emailAddress);

            const res = await request(app).post('/registration')
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                .send({'query':'mutation { createUser (tenantId: "'+ '", email: "' + emailAddress + '", password: "password") { email id tenantId }   }'} )
            const createdUser = await JSON.parse(res.text)['data']['createUser'];
            assert.isNull(createdUser );
            const result = JSON.parse(res.text)['errors'][0]['message'];
            const expectedResult = 'User validation failed: tenantId: Missing required tenant id.';
            assert.isNotNull(result )
            assert.equal (result, expectedResult);
            done();
        });
    });


    describe('Logging in user', () => {
        it('Login User', async(done) => {
            logger.info('Login user');
            let res = await request(app).post('/registration')
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                .send({'query':' mutation { login(email: "' + emailAddress + '", password: "password") {authToken}  }'} )
            JSON.parse(res.text)['data']['login']
            assert.isNotNull(JSON.parse(res.text)['data']['login'] )
            done();
        })
    });

    describe('Logging in user', () => {
        var bearerToken;
        it('Login User', async(done) => {
            logger.info('Login user');
            let res = await request(app).post('/registration')
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                .send({'query':' mutation { login(email: "' + emailAddress + '", password: "password") {authToken} }'} )
            bearerToken = JSON.parse(res.text)['data']['login']['authToken']
            assert.isNotNull(JSON.parse(res.text)['data']['login']['authToken'] )

            logger.info('Get logged in user info');
            res = await request(app).post('/registration')
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                .set('Authorization', 'Bearer ' + bearerToken)
                .send({'query':' {me { email      }    }'} )
            assert.isNotNull(JSON.parse(res.text)['data']['me'] );
            done();
        })
    });

    describe('List users', () => {
        var bearerToken;
        it('List Users', async(done) => {
            logger.info('Login user');
            let res = await request(app).post('/registration')
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                .send({'query':' mutation { login(email: "' + emailAddress + '", password: "password") {authToken} }'} )
            bearerToken = JSON.parse(res.text)['data']['login']['authToken']
            assert.isNotNull(JSON.parse(res.text)['data']['login']['authToken'] )

            logger.info('Get list of users');
            res = await request(app).post('/registration')
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                .set('Authorization', 'Bearer ' + bearerToken)
                .send({'query':' {listUsers { email      }    }'} )
            assert.isNotNull(JSON.parse(res.text)['data']['listUsers'] );
            assert.equal(JSON.parse(res.text)['data']['listUsers'].length, 1, 'list of users count');
            done();
        })
    });




    describe('Looking myself up -- fail (no bearer)', () => {
        it('me', async(done) => {
            logger.info('Looking myself up -- fail (no bearer)');
            let res = await request(app).post('/registration')
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                .send({'query':' {me {  email      }    }'} )
            assert.isNull(JSON.parse(res.text)['data']['me'] );
            assert.isNotNull(JSON.parse(res.text)['errors'][0]['message'] )
            done();
        })
    });

    describe('Logging in user -- fail (incorrect password)', () => {
        it('Login User', async(done) => {
            logger.info('Logging in user -- fail (incorrect password)');
            let res = await request(app).post('/registration')
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                .send({'query':' mutation { login(email: "' + emailAddress + '", password: "NOT_ACTUAL_PASSWORD") {authToken} } '} )
            assert.isNull(JSON.parse(res.text)['data']['login'] );
            const result = JSON.parse(res.text)['errors'][0]['message'];
            const expectedResult = 'Incorrect password';
            assert.isNotNull(result )
            assert.equal (result, expectedResult);
            done();
        })
    });

    describe('Logging in user -- fail (too many attempts lock account)', () => {
        it('Login User', async (done) => {
            async function loginFailure(count, tooManyLoginsCheck){
                logger.info('Enter loginFailure', [count, tooManyLoginsCheck]);
                const res = await request(app).post('/registration')
                    .set('Accept', 'application/json')
                    .set('Content-Type', 'application/json')
                    .send({'query':' mutation { login(email: "' + emailAddress + '", password: "NOT_ACTUAL_PASSWORD") {authToken}  }'} )
                assert.isNull(JSON.parse(res.text)['data']['login'] );
                if(tooManyLoginsCheck){
                    const result = JSON.parse(res.text)['errors'][0]['message'];
                    const expectedResult = 'Too many failed login attempts';
                    assert.isNotNull(result )
                    assert.equal (result, expectedResult);
                }else{
                    assert.isNull(JSON.parse(res.text)['data']['login'] );
                    const result = JSON.parse(res.text)['errors'][0]['message'];
                    const expectedResult = 'Incorrect password';
                    assert.isNotNull(result )
                    assert.equal (result, expectedResult);
                }
                logger.info('Exit loginFailure', [count, tooManyLoginsCheck]);
            }
            logger.info('Logging in user -- fail (too many attempts lock account)');
            await loginFailure(1);       // failure 1
            await loginFailure(2);       // failure 2
            await loginFailure(3);       // failure 3
            await loginFailure(4);       // failure 4
            await loginFailure(5);       // failure 5
            await loginFailure(6, true);   // failure 6 -- account locked
            done();
        });
    });

    describe('Reset password for user', () => {
        it('Reset password', async(done) => {
            logger.info('Reset password');
            let res = await request(app).post('/registration')
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                .send({'query':'mutation { resetPassword(email: "' + emailAddress + '") {id email} }'} )
            assert.isNotNull(JSON.parse(res.text)['data']['resetPassword'] );
            assert.notExists(JSON.parse(res.text)['errors'])
            done();
        })
    });

    describe('Change password', () => {
        var bearerToken;
        it('Login User', async(done) => {
            logger.info('Change password');
            let res = await request(app).post('/registration')
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                .send({'query':' mutation { login(email: "' + emailAddress + '", password: "password") {authToken} }'} )
            bearerToken = JSON.parse(res.text)['data']['login']['authToken']
            assert.isNotNull(JSON.parse(res.text)['data']['login']['authToken'] )
            done();
        })
        it('Change password: pass', async (done) => {
            logger.info('Change password - pass');
            let res = await request(app).post('/registration')
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                .set('Authorization', 'Bearer ' + bearerToken)
                .send({'query':'mutation { changePassword (email: "' + emailAddress + '", currentpassword: "password", newpassword: "password1") {email tenantId}   }'} )
            const result = JSON.parse(res.text)['errors'];
            assert.notExists(result )
            assert.isNotNull(JSON.parse(res.text)['data']['changePassword'] );
            // verify login works with new password
            res = await request(app).post('/registration')
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                .send({'query':' mutation { login(email: "' + emailAddress + '", password: "password1") {authToken} }'} )
            bearerToken = JSON.parse(res.text)['data']['login']['authToken']
            assert.isNotNull(JSON.parse(res.text)['data']['login']['authToken'] )
            done();
        })
    });
    describe('Change password -- fail', () => {
        var bearerToken;
        it('Login User', async(done) => {
            logger.info('Change password - fail');
            let res = await request(app).post('/registration')
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                .send({'query':' mutation { login(email: "' + emailAddress + '", password: "password") {authToken}}'} )
            bearerToken = JSON.parse(res.text)['data']['login']['authToken']
            assert.isNotNull(JSON.parse(res.text)['data']['login']['authToken'] )
            done();
        })
        it('Change password: invalid password', async(done) => {
            logger.info('Change password - invalid');
            let res = await request(app).post('/registration')
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                .set('Authorization', 'Bearer ' + bearerToken)
                .send({'query':'mutation { changePassword (email: "' + emailAddress + '", currentpassword: "NOT_ACTUAL_PASSWORD", newpassword: "password1")  {id email}  }'} )
            assert.isNull(JSON.parse(res.text)['data']['changePassword'] );
            const result = JSON.parse(res.text)['errors'][0]['message'];
            const expectedResult = 'Incorrect password';
            assert.isNotNull(result )
            assert.equal (result, expectedResult);
            done();
        })
    });
});
