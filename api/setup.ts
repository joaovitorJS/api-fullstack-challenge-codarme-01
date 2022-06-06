import Koa from 'koa';
import { router } from './routes';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';

const app = new Koa();

app.use(cors());
app.use(bodyParser());
app.use(router.routes());
app.use(router.allowedMethods());

export { app };
