import { init, exec } from "./src/forcegres";
import { database } from './src/config/database';
//import { cron } from "./src/cron";
import { logger } from "./src/config/logger";
//import { refreshTable } from "./src/refresh-table";

async function app() {  
  let option = '';
  for (let opt of process.argv) {
    if (opt === 'init'
      || opt === 'exec'
      || opt === 'enable'
      || opt === 'refresh') {
        option = opt;
    }
  }
  if (option === '') {
    console.log(`Unsupported argument ${process.argv.join(' ')}`);
    return process.exit(1);
  }

  switch (option) {
    case 'init': 
      return init();
    case 'exec':
      return exec();
    // case 'cron': 
    //   return cron();
    // case 'enable':
    // case 'refresh':
    //   const argIndex = process.argv.indexOf(option) + 1;
    //   if (argIndex >= process.argv.length) {
    //     console.log(`Please specify sobject name`);
    //   }
    //   return refreshTable(process.argv[argIndex]);
  }
}

app().then(() => database.disconnect())