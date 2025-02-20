const Router = require('express')
const Pool = require('../db/dbConnect')


const {
    restartInstance,
    checkIsstarted,

}=require('../Controllers/awsRestartController')

const router = Router()

router.post('/restart_instance',restartInstance);
router.post('/checkisstarted',checkIsstarted)


module.exports = router;