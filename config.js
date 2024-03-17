export default {
    APP_CLIENTID: process.env.VUE_APP_CLIENTID,
    MASSEUTSENDELSEAPI_BASEURL: process.env.VUE_APP_MASSEUTSENDELSEAPI_BASE_URL,
    MATRIKKELPROXY_CLIENTID: process.env.VUE_APP_MATRIKKELPROXY_CLIENTID,
    EXCLUDED_OWNER_IDS: process.env.VUE_APP_EXCLUDED_OWNER_IDS ? process.env.VUE_APP_EXCLUDED_OWNER_IDS.split(',') : undefined,
    MOCK_MATRIKKEL_API: process.env.VUE_APP_MOCK_MATRIKKEL_API || false, 
    MOCK_MASSEUTSENDELSE_API: process.env.VUE_APP_MOCK_MASSEUTSENDELSE_API || false,
    MOCK_ENABLED: process.env.VUE_APP_MOCK_MATRIKKEL_API === 'true' || process.env.VUE_APP_MOCK_MASSEUTSENDELSE_API === 'true',
    AZUREAD_CLIENTID: process.env.VUE_APP_AZUREAD_CLIENTID,
    AZUREAD_SCOPE: process.env.VUE_APP_AZUREAD_SCOPE,
    AZUREAD_AUTHORITYURL: process.env.VUE_APP_AZUREAD_AUTHORITYURL,
}
