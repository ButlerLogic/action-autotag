export type PrivateKey = string;
export type AppId = number;
export type Expiration = number;
export type Token = string;
export type Options = {
    id: AppId;
    privateKey: PrivateKey;
    now?: number;
};
export type Result = {
    appId: AppId;
    expiration: Expiration;
    token: Token;
};
export type Payload = {
    iat: number;
    exp: number;
    iss: number;
};
export type GetTokenOptions = {
    privateKey: PrivateKey;
    payload: Payload;
};
