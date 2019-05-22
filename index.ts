import { login as sfLogin, force } from "./src/config/force";
import { init } from "./src/init";
import { cron } from "./src/cron";
import { logger } from "./src/config/logger";
import { refreshTable } from "./src/refresh-table";

function app() {  
  let option = '';
  for (let opt of process.argv) {
    if (opt === 'init'
      || opt === 'cron'
      || opt === 'enable'
      || opt === 'refresh') {
        option = opt;
    }
  }
  if (option === '') {
    console.log(`Unsupported argument ${process.argv.join(' ')}`);
    return process.exit(1);
  }

  sfLogin().then(() => {
    switch (option) {
      case 'init': 
        return init();
      case 'cron': 
        return cron();
      case 'enable':
      case 'refresh':
        const argIndex = process.argv.indexOf(option) + 1;
        if (argIndex >= process.argv.length) {
          console.log(`Please specify sobject name`);
        }
        return refreshTable(process.argv[argIndex]);
    }
  }).then(() => {
    const usage = force.limitInfo.apiUsage;
    if (usage !== undefined) {
      logger.info(`API usage: ${usage.used} / ${usage.limit}`);
    }
  }).catch((err: any) => {
    logger.error(err);
    process.exit(1);
  })
}

app();