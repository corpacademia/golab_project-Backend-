const {Pool} = require('pg');
const {Router} = require('express');

const router = Router();

const {
    getOrganizationStats
}=require('../Controllers/organizationController');


router.get('/getOrgUsersCount/:orgId', getOrganizationStats);

module.exports = router;