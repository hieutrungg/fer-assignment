import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:3001",
  timeout: 10000,
});

export const list = (collection) =>
  api.get(collection).then(({ data }) => data);
export const get = (collection, id) =>
  api.get(`${collection}/${encodeURIComponent(id)}`).then(({ data }) => data);
export const create = (collection, payload) =>
  api.post(collection, payload).then(({ data }) => data);
export const update = (collection, id, payload) =>
  api
    .patch(`${collection}/${encodeURIComponent(id)}`, payload)
    .then(({ data }) => data);
export const remove = (collection, id) =>
  api.delete(`${collection}/${encodeURIComponent(id)}`);

export class RuleError extends Error {}

export function requireRule(condition, message) {
  if (!condition) throw new RuleError(message);
}

export function errorMessage(error) {
  if (error instanceof RuleError) return error.message;
  if (error.response?.status === 404)
    return "Không tìm thấy dữ liệu được yêu cầu.";
  return "Không kết nối được với dữ liệu. Hãy kiểm tra JSON Server và thử lại.";
}

// Serialize read-check-write operations across tabs of the demo when supported.
let pendingWrite = Promise.resolve();
export function writeDemo(action) {
  if (navigator.locks)
    return navigator.locks.request("wordquest-write", action);
  const result = pendingWrite.then(action);
  pendingWrite = result.catch(() => {});
  return result;
}
