import { login as sfLogin } from "./src/config/force";
import { initializeDB } from "./src/core/initialize-db";

sfLogin().then(initializeDB);