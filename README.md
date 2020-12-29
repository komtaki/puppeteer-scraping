# puppeteer-scraping

```
docker build -t puppeteer .
docker run -v $(pwd)/src:/app/src --rm --env-file=$(pwd)/.env puppeteer
```