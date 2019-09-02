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
cp .env.example .env && vim ./env
```

* After saving your environment, compile typescript source
```
npm run build
```

* Initialize postgres database
```
npm run init
```

* Start a daemon with `npm run exec`. 

----

Update `enableSync` on `internal_sobjects` table to enable synchronization of sobjects
