import mongoose from "mongoose";
import { AuditLog } from "../models/index.js";

export function snapshot(document) {
  if (!document) return null;
  const value = typeof document.toObject === "function" ? document.toObject({ virtuals: false }) : document;
  return JSON.parse(JSON.stringify(value));
}

function resolve(value, context) {
  return typeof value === "function" ? value(context) : value;
}

/**
 * Runs a state-changing Express controller and its audit insert in one transaction.
 * The response is captured and is not sent until MongoDB commits both writes.
 */
export function auditedRoute(definition, controller) {
  return async function runAuditedRoute(req, res, next) {
    const session = await mongoose.startSession();
    const originalJson = res.json;
    let responseBody;
    let responseCaptured = false;

    res.json = function captureJson(body) {
      responseBody = body;
      responseCaptured = true;
      return res;
    };

    try {
      req.afterCommitJobs = [];
      await session.withTransaction(async () => {
        // withTransaction may retry its callback after a transient database error;
        // reset side effects so the successful attempt sends each email only once.
        req.afterCommitJobs = [];
        req.dbSession = session;
        const previousState = definition.loadPrevious ? snapshot(await definition.loadPrevious(req, session)) : null;
        await controller(req, res);
        if (!responseCaptured) throw new Error("An audited controller must return a JSON response");

        const context = { req, responseBody, previousState };
        const newState = definition.newState === null ? null : snapshot(resolve(definition.newState, context));
        const entityId = resolve(definition.entityId, { ...context, newState });
        const familyId = resolve(definition.familyId, { ...context, newState });
        const actorId = resolve(definition.actorId, { ...context, newState }) || req.user?._id || null;
        const action = resolve(definition.action, { ...context, newState });

        await AuditLog.create([{
          familyId: familyId || null,
          actorId,
          action,
          entityType: definition.entityType,
          entityId,
          previousState,
          newState,
        }], { session });
      });

      res.json = originalJson;
      delete req.dbSession;
      const response = originalJson.call(res, responseBody);
      const jobs = req.afterCommitJobs;
      delete req.afterCommitJobs;
      void Promise.allSettled(jobs.map((job) => job()));
      return response;
    } catch (error) {
      res.json = originalJson;
      delete req.dbSession;
      delete req.afterCommitJobs;
      return next(error);
    } finally {
      await session.endSession();
    }
  };
}

export function afterCommit(req, job) {
  if (!Array.isArray(req.afterCommitJobs)) throw new Error("afterCommit can only be used inside an audited route");
  req.afterCommitJobs.push(job);
}

export function responseEntity(key) {
  return ({ responseBody }) => responseBody?.[key] || null;
}

export function stateId({ newState, previousState }) {
  return newState?._id || newState?.id || previousState?._id || previousState?.id;
}

export function stateFamilyId({ newState, previousState }) {
  return newState?.familyId || previousState?.familyId || newState?._id;
}
