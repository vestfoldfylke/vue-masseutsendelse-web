# masseutsendelse-web
Prod and test hosted on vercel.

## Environment variables
| Enviromnent variable | Description |
|---|---|
| VUE_APP_MASSEUTSENDELSEAPI_BASE_URL | The base url of the MasseutsendelseAPI |
| VUE_APP_MATRIKKELPROXY_CLIENTID | The ClientId that the MatrikkelProxyAPI should use when contacting the Matrikkel |
| VUE_APP_EXCLUDED_OWNER_IDS | Commase pparated list of person/organization numbers that should be automatically excluded |
| VUE_APP_MOCK_MATRIKKEL_API (Development) | Should the MatrikkelProxyAPI be mocked? (true/false) |
| VUE_APP_MOCK_MASSEUTSENDELSE_API (Development) | Should the MasseutsendelseAPI be mocked? (true/false) |
| VUE_APP_AZUREAD_CLIENTID | The Azure Appregistration clientId |
| VUE_APP_AZUREAD_AUTHORITYURL | https://login.microsoftonline.com/**TenantID** |
| VUE_APP_AZUREAD_SCOPE | https://URL.telemarkfylke.no/user_impersonation

## Project installation and setup
### Install all project dependencies
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```