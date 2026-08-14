/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ResendOTPPasswordReset from "../ResendOTPPasswordReset.js";
import type * as accessRequests from "../accessRequests.js";
import type * as admin from "../admin.js";
import type * as adminActions from "../adminActions.js";
import type * as announcements from "../announcements.js";
import type * as auditLogs from "../auditLogs.js";
import type * as auth from "../auth.js";
import type * as captains from "../captains.js";
import type * as convex__generated_api from "../convex/_generated/api.js";
import type * as convex__generated_server from "../convex/_generated/server.js";
import type * as crons from "../crons.js";
import type * as donations from "../donations.js";
import type * as emails from "../emails.js";
import type * as engineHours from "../engineHours.js";
import type * as fleetDashboard from "../fleetDashboard.js";
import type * as fleets from "../fleets.js";
import type * as helpGuides from "../helpGuides.js";
import type * as http from "../http.js";
import type * as invoices from "../invoices.js";
import type * as lib_audit from "../lib/audit.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_email from "../lib/email.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_fileStorage from "../lib/fileStorage.js";
import type * as lib_notify from "../lib/notify.js";
import type * as lib_servicePredictor from "../lib/servicePredictor.js";
import type * as lib_stateTaxRules from "../lib/stateTaxRules.js";
import type * as lib_stripe from "../lib/stripe.js";
import type * as lib_validate from "../lib/validate.js";
import type * as mechanicDirectory from "../mechanicDirectory.js";
import type * as messages from "../messages.js";
import type * as notifications from "../notifications.js";
import type * as parts from "../parts.js";
import type * as preferredMechanics from "../preferredMechanics.js";
import type * as raffle from "../raffle.js";
import type * as ratings from "../ratings.js";
import type * as seedParts from "../seedParts.js";
import type * as settings from "../settings.js";
import type * as storage from "../storage.js";
import type * as users from "../users.js";
import type * as vesselDocuments from "../vesselDocuments.js";
import type * as vesselEquipment from "../vesselEquipment.js";
import type * as vessels from "../vessels.js";
import type * as waitlist from "../waitlist.js";
import type * as workOrderMessages from "../workOrderMessages.js";
import type * as workOrders from "../workOrders.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ResendOTPPasswordReset: typeof ResendOTPPasswordReset;
  accessRequests: typeof accessRequests;
  admin: typeof admin;
  adminActions: typeof adminActions;
  announcements: typeof announcements;
  auditLogs: typeof auditLogs;
  auth: typeof auth;
  captains: typeof captains;
  "convex/_generated/api": typeof convex__generated_api;
  "convex/_generated/server": typeof convex__generated_server;
  crons: typeof crons;
  donations: typeof donations;
  emails: typeof emails;
  engineHours: typeof engineHours;
  fleetDashboard: typeof fleetDashboard;
  fleets: typeof fleets;
  helpGuides: typeof helpGuides;
  http: typeof http;
  invoices: typeof invoices;
  "lib/audit": typeof lib_audit;
  "lib/auth": typeof lib_auth;
  "lib/email": typeof lib_email;
  "lib/errors": typeof lib_errors;
  "lib/fileStorage": typeof lib_fileStorage;
  "lib/notify": typeof lib_notify;
  "lib/servicePredictor": typeof lib_servicePredictor;
  "lib/stateTaxRules": typeof lib_stateTaxRules;
  "lib/stripe": typeof lib_stripe;
  "lib/validate": typeof lib_validate;
  mechanicDirectory: typeof mechanicDirectory;
  messages: typeof messages;
  notifications: typeof notifications;
  parts: typeof parts;
  preferredMechanics: typeof preferredMechanics;
  raffle: typeof raffle;
  ratings: typeof ratings;
  seedParts: typeof seedParts;
  settings: typeof settings;
  storage: typeof storage;
  users: typeof users;
  vesselDocuments: typeof vesselDocuments;
  vesselEquipment: typeof vesselEquipment;
  vessels: typeof vessels;
  waitlist: typeof waitlist;
  workOrderMessages: typeof workOrderMessages;
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
