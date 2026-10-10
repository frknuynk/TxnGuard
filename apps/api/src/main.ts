import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { env } from "./config/env.js";
import helmet from "helmet";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.use(helmet());
    app.enableCors({
        origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
        credentials: true,
    });
    if (env.NODE_ENV !== "production") {
        const config = new DocumentBuilder()
            .setTitle("TxnGuard API")
            .setDescription("Merchant transaction ingestion and fraud monitoring API")
            .setVersion("1.0")
            .addBearerAuth()
            .addApiKey({ type: "apiKey", name: "x-api-key", in: "header" }, "api-key")
            .build();
        SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, config));
    }
    await app.listen(env.API_PORT);
}

void bootstrap();
