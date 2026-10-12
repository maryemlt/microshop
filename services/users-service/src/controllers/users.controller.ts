import type { Request, Response } from "express";
import * as usersService from "../services/users.service.js";
import type { CreateUserInput, UpdateUserInput } from "../types.js";

type UserIdParams = { id: string };

/** GET /api/users?search=&role=&status= */
export function listUsers(_req: Request, res: Response): void {
  const users = usersService.findUsers(res.locals.userFilters ?? {});
  res.json({ data: users, meta: { count: users.length } });
}

/** GET /api/users/stats */
export function getUserStats(_req: Request, res: Response): void {
  res.json({ data: usersService.computeUserStats() });
}

/** GET /api/users/:id */
export function getUserById(req: Request<UserIdParams>, res: Response): void {
  res.json({ data: usersService.findUserById(Number(req.params.id)) });
}

/** POST /api/users */
export function createUser(req: Request<Record<string, string>, unknown, CreateUserInput>, res: Response): void {
  const user = usersService.createUser(req.body);
  res.status(201).location(`/api/users/${user.id}`).json({ data: user });
}

/** PATCH /api/users/:id */
export function updateUser(req: Request<UserIdParams, unknown, UpdateUserInput>, res: Response): void {
  const user = usersService.updateUser(Number(req.params.id), req.body);
  res.json({ data: user });
}

/** DELETE /api/users/:id */
export function deleteUser(req: Request<UserIdParams>, res: Response): void {
  usersService.deleteUser(Number(req.params.id));
  res.status(204).end();
}
