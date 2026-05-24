import { OlliveLogger } from "./client.js";

type Req = { ollive?: OlliveLogger };
type Next = () => void;

export function olliveMiddleware(logger?: OlliveLogger) {
  const instance = logger ?? new OlliveLogger();
  return function attach(req: Req, _res: unknown, next: Next) {
    req.ollive = instance;
    next();
  };
}
