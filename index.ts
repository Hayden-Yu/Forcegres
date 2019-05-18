import { login as sfLogin } from "./src/config/force";
import { initializeDB } from "./src/init";

sfLogin().then(initializeDB);