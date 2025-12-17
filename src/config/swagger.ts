import swaggerJSDoc from 'swagger-jsdoc';
import path from 'path';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Nota Fiscal API',
      version: '1.0.0',
      description: 'API de Nota Fiscal com Node.js, Express, TypeScript, Postgres e uma integração fictícia com SERPRO.',
      contact: {
        name: 'API Support',
        url: 'http://www.example.com/support',
        email: 'support@example.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor Local',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    path.join(__dirname, '../modules/**/*.routes.ts'),
    path.join(__dirname, '../modules/**/*Routes.ts'),
    path.join(__dirname, '../integrations/**/*.routes.ts'),
    path.join(__dirname, '../modules/**/*.routes.js'),
    path.join(__dirname, '../modules/**/*Routes.js'),
    path.join(__dirname, '../integrations/**/*.routes.js'),
  ],
};

export const swaggerSpec = swaggerJSDoc(options);
