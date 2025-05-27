import 'dotenv/config';
import { AGUIWebSocketServer } from './server/websocket';
declare const app: import("express-serve-static-core").Express;
declare let wsServer: AGUIWebSocketServer | null;
export { app, wsServer };
//# sourceMappingURL=index.d.ts.map