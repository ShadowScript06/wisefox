import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

let producer: Redis | null = null;
let consumer: Redis | null = null;
let ops: Redis | null = null;

function connectRedis() {
  try {
    const REDIS_URL = process.env.REDIS_URL;

    if (!REDIS_URL) {
      throw new Error("REDIS_URL missing");
    }

    producer = new Redis(REDIS_URL);
    consumer = new Redis(REDIS_URL);
    ops = new Redis(REDIS_URL);

    console.log("Redis connected");
  } catch (error) {
    console.log(error);
  }
}

const redisClients = {
  get producer(): Redis {
    if (!producer) throw new Error("Producer not initialized");
    return producer;
  },

  get consumer(): Redis {
    if (!consumer) throw new Error("Consumer not initialized");
    return consumer;
  },

  get ops(): Redis {
    if (!ops) throw new Error("Ops client not initialized");
    return ops;
  },

  connectRedis,
};

export default redisClients;
