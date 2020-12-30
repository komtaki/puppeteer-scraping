# puppeteer-scraping

## How to use

### setup

```
git clone https://github.com/komtaki/puppeteer-scraping.git

cd puppeteer-scraping

docker build -t puppeteer .

cp .env.sample .env
vi .env
```

### execution

```
docker run -v $(pwd)/src/data:/app/src/data --rm --env-file=$(pwd)/.env puppeteer
```

A screenshot of the execution process will be stored in ./src/data.
