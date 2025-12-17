import { Request, Response, NextFunction } from 'express';
import { verify } from 'jsonwebtoken';

interface IPayload {
    sub: string;
    email: string;
}

export function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ message: 'Token missing' });
    }

    const [, token] = authHeader.split(' ');

    try {
        const { sub, email } = verify(token, 'hackathon-secret-key') as IPayload; // TODO: move secret to env

        req.user = {
            id: sub,
            email,
        };

        return next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
    }
}
