import { OlliveLogger } from "./client.js";
type Req = {
    ollive?: OlliveLogger;
};
type Next = () => void;
export declare function olliveMiddleware(logger?: OlliveLogger): (req: Req, _res: unknown, next: Next) => void;
export {};
//# sourceMappingURL=middleware.d.ts.map