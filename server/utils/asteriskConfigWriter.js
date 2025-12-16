// utils/asteriskConfigWriter.js
import fs from "fs/promises";
import amiService from "../services/amiService.js";
import sequelize from "../config/sequelize.js";
import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);

export const updatePJSIPConfig = async (trunkData) => {
  try {
    const pjsipPath = "/etc/asterisk/pjsip.conf";

    // Read existing config
    let existingConfig = await fs.readFile(pjsipPath, "utf8");

    if (trunkData.delete) {
      // Enhanced regex pattern to match all trunk-related sections
      const sections = [
        trunkData.name, // base endpoint
        `${trunkData.name}_auth`, // auth section
        `${trunkData.name}_aor`, // aor section
        `${trunkData.name}_reg`, // registration section
        `${trunkData.name}_identify`, // identify section
      ].join("|");

      const regexPattern = new RegExp(
        `\\[(${sections})\\][^[]*(?=\\[|$)`,
        "gs"
      );

      // Remove all matching sections
      existingConfig = existingConfig.replace(regexPattern, "");

      // Clean up any multiple blank lines
      existingConfig = existingConfig.replace(/\n{3,}/g, "\n\n");

      // Write the cleaned config back
      const tempFile = `/tmp/pjsip_${Date.now()}.conf`;
      await fs.writeFile(tempFile, existingConfig);
      await execAsync(`sudo mv ${tempFile} ${pjsipPath}`);
      await execAsync(`sudo chown asterisk:asterisk ${pjsipPath}`);
      await execAsync(`sudo chmod 644 ${pjsipPath}`);

      return true;
    }

    // If not deleting, continue with the existing create/update logic
    // Remove any existing configuration for this trunk
    const regexPattern = new RegExp(
      `\\[${trunkData.name}[^\\[]*\\]([^\\[]*\\n)*`,
      "g"
    );
    existingConfig = existingConfig.replace(regexPattern, "");

    const newConfig = `
[${trunkData.name}_auth]
type=auth
auth_type=userpass
username=${trunkData.username}
password=${trunkData.password}

[${trunkData.name}_aor]
type=aor
contact=sip:${trunkData.host}:5060
qualify_frequency=60
max_contacts=1
remove_existing=yes

[${trunkData.name}]
type=endpoint
context=${trunkData.context}
disallow=all
allow=${trunkData.codecs}
transport=${trunkData.transport}
auth=${trunkData.name}_auth
aors=${trunkData.name}_aor
send_pai=yes
send_rpid=yes
direct_media=no
rtp_symmetric=yes
force_rport=yes
rewrite_contact=yes
identify_by=auth,username,ip

[${trunkData.name}_reg]
type=registration
outbound_auth=${trunkData.name}_auth
server_uri=${
      trunkData.host.startsWith("sip:")
        ? trunkData.host
        : `sip:${trunkData.host}`
    }
client_uri=sip:${trunkData.username}@${trunkData.host}
contact_user=${trunkData.username}
transport=${trunkData.transport}
retry_interval=60
expiration=3600
max_retries=10000
auth_rejection_permanent=no
line=yes
endpoint=${trunkData.name}

[${trunkData.name}_identify]
type=identify
endpoint=${trunkData.name}
match=${trunkData.host.replace("sip:", "").replace("siptrunk.", "")}
match_header=To: .*<sip:.*@${trunkData.host}>.*
`;

    // Write to a temporary file first
    const tempFile = `/tmp/pjsip_${Date.now()}.conf`;
    await fs.writeFile(tempFile, existingConfig + newConfig);

    // Use sudo to move the file and set proper permissions
    await execAsync(`sudo mv ${tempFile} ${pjsipPath}`);
    await execAsync(`sudo chown asterisk:asterisk ${pjsipPath}`);
    await execAsync(`sudo chmod 644 ${pjsipPath}`);

    return true;
  } catch (error) {
    console.error("Error writing PJSIP config:", error);
    throw error;
  }
};

export const updateDialplanConfig = async (routeData) => {
  try {
    // If this is a delete operation, handle differently
    if (routeData.delete) {
      await amiService.executeAction({
        Action: "Command",
        Command: `dialplan remove context outbound-route-${routeData.id}`,
      });
      return true;
    }

    // Validate pattern
    if (!routeData.pattern) {
      throw new Error("Pattern is required for outbound route");
    }

    // Ensure pattern starts with underscore for pattern matching
    const pattern = routeData.pattern.startsWith("_")
      ? routeData.pattern
      : `_${routeData.pattern}`;

    // Create a unique context for this route
    const dialplanConfig = `
[outbound-route-${routeData.id}]
exten => ${pattern},1,NoOp(Outbound Route: ${routeData.name})
same => n,Set(OUTBOUND_ROUTE_ID=${routeData.id})
same => n,Set(OUTBOUND_TRUNK=${routeData.primaryTrunkId})
same => n,Set(CALLERID(num)=${routeData.callerIdNumber || "${CALLERID(num)}"})
same => n,Dial(PJSIP/\${EXTEN}@${routeData.primaryTrunkId}-endpoint)
same => n,Hangup()

[from-internal]
include => outbound-route-${routeData.id}
`;

    // Write to a separate file for this route
    const routeConfigPath = `/etc/asterisk/outbound-route-${routeData.id}.conf`;
    await fs.writeFile(routeConfigPath, dialplanConfig);

    // Include the route config in extensions.conf if not already included
    const extensionsPath = "/etc/asterisk/extensions.conf";
    const includeStatement = `#include outbound-route-${routeData.id}.conf\n`;

    try {
      let extensionsContent = await fs.readFile(extensionsPath, "utf8");
      if (!extensionsContent.includes(includeStatement)) {
        await fs.appendFile(extensionsPath, includeStatement);
      }
    } catch (error) {
      console.error("Error managing extensions.conf:", error);
      throw error;
    }

    // Reload dialplan
    await amiService.executeAction({
      Action: "Command",
      Command: "dialplan reload",
    });

    return true;
  } catch (error) {
    console.error("Error updating dialplan config:", error);
    throw error;
  }
};

export const updateRTPConfig = async () => {
  try {
    const { Stun, Turn } = await import("../models/networkConfigModel.js");

    // Force sync with database to ensure we have latest data
    await sequelize.sync();

    // Get active STUN and TURN servers
    const stuns = await Stun.findAll({
      where: { active: true },
      raw: true,
    });

    const turns = await Turn.findAll({
      where: { active: true },
      raw: true,
    });

    // Build RTP configuration
    let rtpContent = `[general]
rtpstart=10000
rtpend=20000
ice_support=yes
`;

    // Add STUN configurations
    if (stuns.length > 0) {
      stuns.forEach((stun) => {
        rtpContent += `stunaddr=${stun.server}:${stun.port}\n`;
      });
    }

    // Add TURN configurations if available
    if (turns.length > 0) {
      turns.forEach((turn) => {
        let turnConfig = `turnaddr=${turn.server}:${turn.port}`;
        if (turn.username && turn.password) {
          turnConfig += `?transport=udp&username=${turn.username}&password=${turn.password}`;
        }
        turnConfig += "\n";
        rtpContent += turnConfig;
      });
    }

    // Write to rtp.conf
    await fs.writeFile("/etc/asterisk/rtp.conf", rtpContent);

    return true;
  } catch (error) {
    console.error("Error updating RTP configuration:", error);
    throw error;
  }
};

export const updateAsteriskConfig = async () => {
  try {
    const networkConfigPath = "/etc/asterisk/mayday.d/pjsip_network.conf";
    const tempFile = "/tmp/mayday.conf";

    // Get all active configurations
    const { ExternIp, LocalNet } = await import(
      "../models/networkConfigModel.js"
    );
    const externIps = await ExternIp.findAll({ where: { active: true } });
    const localNets = await LocalNet.findAll({ where: { active: true } });

    // Build configuration content
    let configContent = `;==========================================
; Mayday Network Configuration
; Auto-generated - Do not edit manually
;==========================================\n\n`;

    // Add External IP configurations
    if (externIps.length > 0) {
      configContent += `[external_media_address]\n`;
      externIps.forEach((ip) => {
        configContent += `external_media_address=${ip.address}\n`;
      });
      configContent += `\n`;
    }

    // Add Local Network configurations
    if (localNets.length > 0) {
      configContent += `[local_nets]\n`;
      localNets.forEach((net) => {
        configContent += `local_net=${net.network}\n`;
      });
      configContent += `\n`;
    }

    // Write to temp file
    await fs.writeFile(tempFile, configContent);

    // Create directory if it doesn't exist
    await execAsync(`sudo mkdir -p /etc/asterisk/mayday.d`);

    // Move file using sudo
    await execAsync(`sudo mv ${tempFile} ${networkConfigPath}`);
    await execAsync(`sudo chown asterisk:asterisk ${networkConfigPath}`);
    await execAsync(`sudo chmod 644 ${networkConfigPath}`);

    // Reload PJSIP
    const reloadResult = await amiService.executeAction({
      Action: "Command",
      Command: "module reload res_pjsip.so",
    });

    if (!reloadResult || reloadResult.response === "Error") {
      throw new Error(reloadResult?.message || "Failed to reload PJSIP module");
    }

    return true;
  } catch (error) {
    console.error("Error updating Asterisk configurations:", error);
    throw new Error(
      "Failed to update Asterisk configuration: " + error.message
    );
  }
};

export const updateIVRConfig = async (ivrData) => {
  try {
    const { id, name } = ivrData;

    const dialplanConfig = `
[ivr-${id}]
exten => s,1,NoOp(IVR Flow: ${name})
 same => n,Answer()
 same => n,Set(ivrId=${id})
 same => n,AGI(agi://localhost:4574)
 same => n,Hangup()
`;
    await fs.appendFile("/etc/asterisk/extensions.conf", dialplanConfig);

    // Reload configurations
    await amiService.executeAction({
      Action: "Command",
      Command: "dialplan reload",
    });

    return true;
  } catch (error) {
    console.error("Error updating IVR configuration:", error);
    throw error;
  }
};

// Runs automatically when the server starts to configure Asterisk Contexts and RTP
export const updateContextsConfig = async () => {
  try {
    const extensionsContextsPath =
      "/etc/asterisk/mayday.d/extensions_mayday_contexts.conf";
    const tempFile = "/tmp/extensions_append.conf";

    const contextsContent = `
[from-sip]
include => from-sip-custom
switch => Realtime

[from-voip-provider]
include => from-voip-provider-custom
switch => Realtime

[from-internal]
include => from-internal-custom
switch => Realtime

[mayday-mixmonitor-context]
switch => Realtime
`;

    // Write to temp file
    await fs.writeFile(tempFile, contextsContent);

    // Move file using sudo
    await execAsync(`sudo mv ${tempFile} ${extensionsContextsPath}`);
    await execAsync(`sudo chown asterisk:asterisk ${extensionsContextsPath}`);
    await execAsync(`sudo chmod 644 ${extensionsContextsPath}`);

    // Append include directive to extensions.conf using tee
    await execAsync(
      `echo "#include mayday.d/extensions_mayday_contexts.conf" | sudo tee -a /etc/asterisk/extensions.conf`
    );

    // Reload dialplan
    await amiService.executeAction({
      Action: "Command",
      Command: "dialplan reload",
    });

    return true;
  } catch (error) {
    console.error("Error updating contexts configuration:", error);
    throw error;
  }
};
