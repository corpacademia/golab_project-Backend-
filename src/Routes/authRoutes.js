const Router = require('express')
const Pool = require('../db/dbConnect')

//import auth controllers
const {
    signupController,
    loginController,
    getAllUsers,
    addUser,
    getUserData,
    updateUserOrganization,
    updateUserRole,
}=require('../Controllers/authController')

const router = Router();

router.post('/signup',signupController);
router.post('/login',loginController);
router.get("/allUsers",getAllUsers);
router.post('/addUser',addUser);
router.post('/getuserdata/:id',getUserData);
router.put('/updateUserOrganization',updateUserOrganization);
router.put('/updateUserRole',updateUserRole)

module.exports = router;