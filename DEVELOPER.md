# Developer

## Running tests

> yarn test

## Build

> yarn build

## TODO

- [ ] WASM
  - [ ] Bundle the SQL.js WASM file

- [ ] Deploy the database on a custom image
  - Build the image
  - Serve the content as a static resource
  - Deploy it
  - Deploy the Nginx conf
  - Restart Nginx

- Indicate that Github is logging personal information (https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages)

- Serve the project from other provider
  - https://www.jsdelivr.com/
  - https://codesandbox.io/
  - https://unpkg.com/

- Check if can use something else than Dexie for the storage

- Publish the Lerna workspace page

- Log word count with the sequence

- Obtain the version / progress of the Github Pages build

## Features

- [ ] Database
  - [x] Log the progress of the initialization at startup
  - [x] Log the number of words and sequences at startup

- [ ] Database command
  - [ ] Indicate the status of the initialization ('status')
  - [ ] Indicate the number of sequences
  - [ ] Indicate the number of words
