export const createRegisterOptions = (extension, config) => ({
  instanceId: config?.pjsip?.instance_id || Date.now().toString(),
  regId: 1,
  registrar: {
    uri: config?.registrar_uri || `sip:${config?.server_ip || "65.1.149.92"}`,
    wsServers: [`wss://${config?.server_ip || "65.1.149.92"}:8089/ws`],
  },
  contactName: extension,
});
