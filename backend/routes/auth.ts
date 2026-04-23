import { Request, Response, Router } from 'express';
import Token from '../models/token';
import {
  buildFrontendRedirectUrl,
  buildMercadoLivreAuthUrl,
  exchangeAuthCode,
  getValidToken,
  mercadoLivreRequest,
  toHttpError,
} from '../lib/mercadoLibre';

const router = Router();

router.get('/login', (req: Request, res: Response) => {
  try {
    res.json({ url: buildMercadoLivreAuthUrl() });
  } catch (error) {
    const httpError = toHttpError(error, 'Unable to create the Mercado Livre authorization URL.');
    res.status(httpError.status).json({ error: httpError.message, details: httpError.details });
  }
});

router.get('/callback', async (req: Request, res: Response): Promise<void> => {
  const code = req.query.code as string;

  if (!code) {
    res.status(400).json({ error: 'Authorization code was not provided by Mercado Livre.' });
    return;
  }

  try {
    const token = await exchangeAuthCode(code);
    const redirectUrl = buildFrontendRedirectUrl('success');

    console.log(`Mercado Livre seller authenticated successfully. Seller ID: ${token.user_id}`);

    if (redirectUrl) {
      res.redirect(redirectUrl);
      return;
    }

    res.send('Seller authenticated successfully. You can return to the frontend.');
  } catch (error) {
    const httpError = toHttpError(error, 'Authentication with Mercado Livre failed.');
    const redirectUrl = buildFrontendRedirectUrl('error', httpError.message);

    console.error('Mercado Livre authentication error:', httpError.details ?? httpError.message);

    if (redirectUrl) {
      res.redirect(redirectUrl);
      return;
    }

    res.status(httpError.status).json({ error: httpError.message, details: httpError.details });
  }
});

router.get('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = await getValidToken();
    const seller = await mercadoLivreRequest<{
      id: number;
      nickname: string;
      email?: string;
      user_type?: string;
      points?: number;
    }>({
      method: 'GET',
      url: '/users/me',
    });

    res.json({
      authenticated: true,
      expires_at: token.expires_at,
      seller: {
        id: seller.id,
        nickname: seller.nickname,
        email: seller.email ?? '',
        user_type: seller.user_type ?? 'seller',
        points: seller.points ?? 0,
      },
    });
  } catch (error) {
    const httpError = toHttpError(error, 'Unable to load the seller session.');

    if (httpError.status === 401) {
      res.json({ authenticated: false });
      return;
    }

    res.status(httpError.status).json({ error: httpError.message, details: httpError.details });
  }
});

router.get('/me', async (req: Request, res: Response): Promise<void> => {
  try {
    const token = await getValidToken();
    const seller = await mercadoLivreRequest<{
      id: number;
      nickname: string;
      email?: string;
      user_type?: string;
      points?: number;
    }>({
      method: 'GET',
      url: '/users/me',
    });

    res.json({
      message: 'Seller data loaded successfully.',
      expires_at: token.expires_at,
      profile: {
        id: seller.id,
        nickname: seller.nickname,
        email: seller.email ?? '',
        user_type: seller.user_type ?? 'seller',
        points: seller.points ?? 0,
      },
    });
  } catch (error) {
    const httpError = toHttpError(error, 'Unable to load the seller profile.');
    res.status(httpError.status).json({ error: httpError.message, details: httpError.details });
  }
});

router.delete('/session', async (req: Request, res: Response): Promise<void> => {
  await Token.deleteMany({});
  res.status(204).send();
});

export default router;
