# puppeteer-scraping

## How to use

### setup

```
docker build -t puppeteer .
cp .env.sampie .env
vi .env
```

### execution
```
docker run -v $(pwd)/src:/app/src --rm --env-file=$(pwd)/.env puppeteer
```
