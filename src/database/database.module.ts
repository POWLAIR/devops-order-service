import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Order } from "../orders/entities/order.entity";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        host: configService.get("database.host"),
        port: configService.get("database.port"),
        username: configService.get("database.username"),
        password: configService.get("database.password"),
        database: configService.get("database.database"),
        entities: [Order],
        synchronize: false, // Désactivé car on utilise des migrations SQL
        logging: configService.get<string>("nodeEnv") === "development",
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
