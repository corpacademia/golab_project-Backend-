const Router = require('express')
const Pool = require('../db/dbConnect')


const {
    restartInstance,
    checkIsstarted,
    automateInstanceVolume,

}=require('../Controllers/awsRestartController')

const router = Router()

router.post('/restart_instance',restartInstance);
router.post('/checkisstarted',checkIsstarted);
router.post('/automateInstanceVolume',automateInstanceVolume);


module.exports = router;