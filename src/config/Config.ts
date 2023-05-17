export interface RemoteDatabase {
  filename: string;
}

export interface Config {
  rootUrl: string;
  french: RemoteDatabase;
  english: RemoteDatabase;
}

export function loadConfig(): Config {
  let envJson = process.env.ENV_JSON;
  if (envJson === undefined) {
    throw new Error(`ENV_JSON is undefined`);
  }
  console.log(envJson);
  const config: Config = JSON.parse(envJson);
  console.log(config);
  return config;
}