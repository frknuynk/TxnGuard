import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { env } from "./config/env.js";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    await app.listen(env.API_PORT);
}

void bootstrap();