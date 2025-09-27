import { Router } from 'express';

import { userController } from '../controllers/UserController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { getUserValidation, updateUserValidation, deleteUserValidation, paginationValidation } from '../validators/user';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// GET /users - Get all users with pagination
router.get('/', validate(paginationValidation), userController.getAllUsers);

// GET /users/:id - Get user by ID
router.get('/:id', validate(getUserValidation), userController.getUserById);

// PUT /users/:id - Update user
router.put('/:id', validate(updateUserValidation), userController.updateUser);

// DELETE /users/:id - Delete user
router.delete('/:id', validate(deleteUserValidation), userController.deleteUser);

export default router;