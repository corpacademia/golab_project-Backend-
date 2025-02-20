const express  = require('express')
const multer = require('multer')


const {
  getOrganizationUser,
  createLab,
  getAllLab,
  getLabOnId,
  assignLab,
  getAssignLabOnId,
  ec2Terraform,
  getInstanceOnParameters,
  getInstanceDetailsForPricing,
  getLabsConfigured,
  updateLabsOnConfig,
  runTf,
  instanceToData,
  vmToGoldenImage,
  getAwsInstanceDetails,
  awsConfigure,
  goldenToInstance,
  organizations,
  amiInformation,
  insertUsers,
  lab_batch,
  organizations_parameter,
  getLabBatchAssessment,
  sendEmail,
  deleteVm,
  deleteOrgAssignedCloudVms,
  handleLaunchSoftwareOrStop,
  getOperatingSystemsFromDataBase,
  getDecryptPasswordFromCloud,
  addOrganizationUser,updateAssessmentStorage,createCloudAssignedInstance,
  getAssignLabOnLabId,deleteSuperVm,ConnectCorpAwsAccount,ConnectOrgAws,getCloudAssignedInstance,
  checkCloudAssignedInstanceLaunched,stopInstance,getSofwareDetails,getUserDecryptPasswordFromCloud,
  getNewIpFromCloud,deleteLab,getLabCatalogues,getAwsInstanceDetailsOfUsers,updatetAwsInstanceDetailsOfUsers,updatetAwsLabInstanceDetails,
  checkLabCloudInstanceLaunched,
} = require('../Controllers/labController')

const Router = require("express")
const router = Router()

// Set up multer storage options
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Folder where files will be uploaded
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Use the original file name
  },
});

// Create the upload middleware using multer
const upload = multer({ storage: storage });

router.post('/labconfig',createLab)
router.get('/getCatalogues',getAllLab)
router.post('/getLabOnId',getLabOnId)
router.post('/assignlab',assignLab)
router.post('/getAssignedLabs',getAssignLabOnId)
router.post('/getInstances',getInstanceOnParameters)
router.post('/getInstanceDetails',getInstanceDetailsForPricing)
router.post('/getLabsConfigured',getLabsConfigured)
router.post('/updateConfigOfLabs',updateLabsOnConfig)
router.post('/python',ec2Terraform);
router.post('/pythontf',runTf);
router.post('/instancetodata',instanceToData)
router.post('/createGoldenImage',vmToGoldenImage)
router.post('/awsCreateInstanceDetails',getAwsInstanceDetails)
router.post('/amiInformation',awsConfigure)
router.post('/goldenToInstance',goldenToInstance)
router.get('/organizations',organizations)
router.post('/checkvmcreated',amiInformation)
router.post('/insertUsers',insertUsers);
router.post('/batchAssignment',lab_batch);
router.post('/getOrgDetails',organizations_parameter);
router.post('/getAssessments',getLabBatchAssessment);
router.post('/deletevm',deleteVm)
router.post('/deleteAssessment',deleteOrgAssignedCloudVms)
router.post('/deletesupervm',deleteSuperVm)
router.post('/runSoftwareOrStop',handleLaunchSoftwareOrStop)
router.post('/sendmail',upload.single('file'),sendEmail)
router.get('/getOs',getOperatingSystemsFromDataBase)
router.post('/decryptPassword',getDecryptPasswordFromCloud)
router.post('/addOrganizationUser',addOrganizationUser)
router.post('/getOrganizationUsers',getOrganizationUser)
router.post('/updateAssessmentStorage',updateAssessmentStorage)
router.post('/launchInstance',createCloudAssignedInstance),
router.post('/getAssignLabOnId',getAssignLabOnLabId)
router.get('/connectCorpAws',ConnectCorpAwsAccount)
router.post('/connectOrgAws',ConnectOrgAws)
router.post('/getAssignedInstance',getCloudAssignedInstance)
router.post('/checkLabStatus',checkCloudAssignedInstanceLaunched)
router.post('/stopInstance',stopInstance)
router.get('/getSoftwareDetails',getSofwareDetails)
router.post('/userDecryptPassword',getUserDecryptPasswordFromCloud)
router.post('/getPublicIp',getNewIpFromCloud)
router.post('/deleteLab',deleteLab)
router.get('/getPublicCatalogues',getLabCatalogues)
router.post('/awsInstanceOfUsers',getAwsInstanceDetailsOfUsers)
router.post('/updateawsInstanceOfUsers',updatetAwsInstanceDetailsOfUsers)
router.post('/updateawsInstance',updatetAwsLabInstanceDetails)
router.post('/checkIsLabInstanceLaunched',checkLabCloudInstanceLaunched)

module.exports = router;