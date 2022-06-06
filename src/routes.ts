import Router from '@koa/router';
import { PrismaClient, User } from '@prisma/client';
import bcript from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = new Router();

const prisma = new PrismaClient();

type NewTweet = {
  text: string;
  userId: string;
}

type UserResponse = {
  id: string;
  name: string;
  username: string;
  email: string;
  accessToken: string;
}

router.get('/tweets', async (ctx) => {
  const [, token] = ctx.request.headers?.authorization?.split(' ') || [];

  if (!token) {
    ctx.status = 401;
    return;
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET || '');
    const tweets = await prisma.tweet.findMany();
    ctx.body = tweets;
  } catch (error) {
    ctx.status = 401;
    return;
  }

});

router.post('/tweets', async (ctx) => {
  const [, token] = ctx.request.headers?.authorization?.split(' ') || [];

  if (!token) {
    ctx.status = 401;
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || '');
    const userId = String(payload.sub);

    const tweet: NewTweet = {
      text: ctx.request.body.text,
      userId,
    }

    const newTweet = await prisma.tweet.create({
      data: tweet
    });

    ctx.body = newTweet;
  } catch (error) {

    ctx.status = 401;
    return;
  }
});

router.post('/signup', async (ctx) => {
  const SALT_ROUNDS = 10;
  const { name, username, email, password } = ctx.request.body;

  const hashPassword = bcript.hashSync(password, SALT_ROUNDS);
  try {
    const user = {
      name,
      username,
      email,
      password: hashPassword,
    } as User;

    const newUser = await prisma.user.create({
      data: user
    });

    const accessToken = jwt.sign({
      sub: user.id
    }, process.env.JWT_SECRET || '', { expiresIn: '24h' });

    const userResponse: UserResponse = {
      id: newUser.id,
      name: newUser.name,
      username: newUser.username,
      email: newUser.email,
      accessToken,
    }

    ctx.body = userResponse;

  } catch (error: any) {
    console.log(error.meta.target);
    if (error.meta) {
      if ((error.meta?.target.indexOf('email') > -1)) {
        ctx.body = "Email de usuário já existente";
      } else if ((error.meta?.target.indexOf('username') > -1)) {
        ctx.body = "Username de usuário já existente";
      } else {
        ctx.body = 'Email ou nome de usuário já existe';
      }
      ctx.status = 422;

      return;
    }

    ctx.status = 500;
    ctx.body = 'Internal error';
  }
});

router.get('/login', async ctx => {
  const [, token] = ctx.request.headers.authorization?.split(' ') || [];
  const [email, plainTextPassoword] = Buffer.from(token, 'base64').toString().split(':');

  const user = await prisma.user.findUnique({
    where: {
      email,
    }
  });

  if (!user) {
    ctx.status = 404;
    return;
  }

  const passwordMatch = bcript.compareSync(plainTextPassoword, user.password);

  if (passwordMatch) {
    const accessToken = jwt.sign({
      sub: user.id
    }, process.env.JWT_SECRET || '', { expiresIn: '24h' });

    const userResponse = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      accessToken
    }

    ctx.body = userResponse;
    return;
  }

  ctx.status = 404;
});

export { router };