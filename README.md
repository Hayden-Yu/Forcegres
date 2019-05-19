# Forcegres
----
Data syncronization from salesforce to postgreSQL db

## Usage

* Checkout the project
```
git clone git@github.com:Hayden-Yu/Forcegres.git
```

* Install dependencies
```
cd Forcegres
npm i
```

* Edit environment settings
```
cp ./src/environments/environments.example.ts ./src/environments/environments.ts && vim ./src/environments/environments.ts
```

* After saving your environment, compile typescript source
```
npm run build
```

* Initialize postgres database
```
npm run init
```

* Schedule data refresh task with `npm run cron` to job scheduler of your choice 

----

Update `enableSync` on `internal_sobjects` table to enable synchronization of sobjects

You can also edit `resources/data.psql` to include sobjects to sync prior to compiling