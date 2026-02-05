/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accessRequests from "../accessRequests.js";
import type * as auth from "../auth.js";
import type * as convex__generated_api from "../convex/_generated/api.js";
import type * as convex__generated_server from "../convex/_generated/server.js";
import type * as http from "../http.js";
import type * as messages from "../messages.js";
import type * as notifications from "../notifications.js";
import type * as ratings from "../ratings.js";
import type * as storage from "../storage.js";
import type * as users from "../users.js";
import type * as vesselEquipment from "../vesselEquipment.js";
import type * as vessels from "../vessels.js";
import type * as workOrders from "../workOrders.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accessRequests: typeof accessRequests;
  auth: typeof auth;
  "convex/_generated/api": typeof convex__generated_api;
  "convex/_generated/server": typeof convex__generated_server;
  http: typeof http;
  messages: typeof messages;
  notifications: typeof notifications;
  ratings: typeof ratings;
  storage: typeof storage;
  users: typeof users;
  vesselEquipment: typeof vesselEquipment;
  vessels: typeof vessels;
  workOrders: typeof workOrders;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
