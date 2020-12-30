# puppeteer-scraping

## How to use

### setup

```
git git@github.com:komtaki/puppeteer-scraping.git

cd puppeteer-scraping

docker build -t puppeteer .

cp .env.sampie .env
vi .env
```

### execution

```
docker run -v $(pwd)/src:/app/src --rm --env-file=$(pwd)/.env puppeteer
```

A screenshot of the execution process will be stored in ./src/data.
