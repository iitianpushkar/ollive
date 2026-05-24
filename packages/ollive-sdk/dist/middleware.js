import { OlliveLogger } from "./client.js";
export function olliveMiddleware(logger) {
    const instance = logger ?? new OlliveLogger();
    return function attach(req, _res, next) {
        req.ollive = instance;
        next();
    };
}
//# sourceMappingURL=middleware.js.map