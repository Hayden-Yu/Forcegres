import { login as sfLogin, force } from "./src/config/force";
import { init } from "./src/init";
import { cron } from "./src/cron";
import { logger } from "./src/config/logger";

function app() {  
  const option = process.argv[process.argv.length - 1];
  if (option !== 'init' && option !== 'cron') {
    console.log(`Unsupported argument ${process.argv.join(' ')}`);
    return process.exit(1);
  }

  sfLogin().then(() => {
    switch (option) {
      case 'init': 
        return init();
      case 'cron': 
        return cron();
      default: 
        return Promise.resolve();
    }
  }).then(() => {
    const usage = force.limitInfo.apiUsage;
    if (usage !== undefined) {
      logger.info(`API usage: ${usage.used} / ${usage.limit}`);
    }
  });
}

app();