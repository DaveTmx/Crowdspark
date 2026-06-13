// backend/routes/users.js
// All routes here require admin role.

const express = require('express');
const router  = express.Router();
const uc = require('../controllers/userController');
const { authenticate, adminOnly } = require('../middleware/rbac');

// Every route below requires a valid token AND admin role
router.use(authenticate, adminOnly);

router.get('/',                  uc.list);
router.get('/audit-log',         uc.auditLog);
router.get('/:id',               uc.getOne);
router.patch('/:id/role',        uc.changeRole);
router.patch('/:id/status',      uc.changeStatus);
router.delete('/:id',            uc.remove);

module.exports = router;
