const express = require('express');
const ctrl = require('../controllers/userController');
const { protect, restrictTo } = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { createAdminValidator } = require('../validators/userValidators');

const router = express.Router();
router.use(protect);

router.get('/', ctrl.listUsers);
router.post('/', restrictTo('super_admin'), createAdminValidator, validate, ctrl.createAdmin);
router.patch('/:id', restrictTo('super_admin'), ctrl.updateAdmin);
router.delete('/:id', restrictTo('super_admin'), ctrl.deleteAdmin);

module.exports = router;
