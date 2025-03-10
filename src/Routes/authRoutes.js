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
    getTokenAndGetUserDetails,
    logoutController,
    updateUserController,
    getUsersFromOrganization,
    deleteUsers,
    updateUser,
}=require('../Controllers/authController')

const router = Router();

router.post('/signup',signupController);
router.post('/login',loginController);
router.get("/allUsers",getAllUsers);
router.post('/addUser',addUser);
router.post('/getuserdata/:id',getUserData);
router.put('/updateUserOrganization',updateUserOrganization);
router.put('/updateUserRole',updateUserRole);
router.get('/user_profile', getTokenAndGetUserDetails, (req, res) => {
    res.json({ user: req.userData });
  });
router.get('/logout',logoutController);
router.put('/updateUser/:id',updateUserController)
router.get('/getUsersFromOrganization/:orgId',getUsersFromOrganization);
router.post('/deleteOrganizationUsers',deleteUsers)
router.put('/updateUserFromSuperadmin/:id',updateUser)

module.exports = router;