import express from "express";
import {
  createUser,
  deleteUser,
  getUserById,
  getUserStats,
  listUsers,
  updateUser,
} from "../controllers/users.controller.js";
import {
  validateCreateUser,
  validateListUsersQuery,
  validateUpdateUser,
  validateUserIdParam,
} from "../middleware/validation.js";

/** Routeur des utilisateurs, monté sur /users par apiRouter (donc exposé sous /api/users). */
export const usersRouter = express.Router();

usersRouter.param("id", validateUserIdParam);

usersRouter.get("/", validateListUsersQuery, listUsers);
usersRouter.post("/", validateCreateUser, createUser);

// Déclarée avant "/:id" pour ne pas être capturée par le segment dynamique.
usersRouter.get("/stats", getUserStats);

usersRouter
  .route("/:id")
  .get(getUserById)
  .patch(validateUpdateUser, updateUser)
  .delete(deleteUser);
