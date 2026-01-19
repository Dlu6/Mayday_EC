# Networking: MTN SIP Trunk Integration

The HPE server (`192.168.1.15`) is configured to handle a specialized MTN SIP trunk delivered via a physical leased line.

## Physical Connectivity
1. The leased line must be plugged into a dedicated network port.
2. The OS must have a specific interface configured with the static IP provided by MTN. On the HPE ProLiant Gen11 server (`192.168.1.15`), the available interfaces are:
   - **ens15f0**: Primary LAN (`192.168.1.15`).
   - **ens15f1**: Dedicated Leased Line port (Confirmed available for configuration).
   - **ens15f2 / ens15f3**: Additional available ports.
3. Configure dedicated DNS records provided by the supplier to resolve trunk hosts:
   - **DNS 1**: `193.108.252.50`
   - **DNS 2**: `193.108.252.51`
4. **P2P Networking (Point-to-Point)**:
   - **Local Interface IP**: `212.88.128.35`
   - **Subnet Mask**: `255.255.255.254` (`/31`)
   - **Gateway**: `212.88.128.34`

## Configuration Isolation
To ensure the leased line does not interfere with the existing cloud SIP trunk:
- Use **Policy Based Routing (PBR)** or specific static routes if the trunk gateway is on a different subnet than the default gateway.
- Bind the PJSIP transport specifically to the leased line interface IP.
- Avoid setting the leased line gateway as the default system gateway.

## Server Prerequisites (HPE Server)
Before configuring the trunk, ensure the following are in place on `192.168.1.15`:

1. **Asterisk User**: System user `asterisk` must exist for file ownership.
   ```bash
   useradd -r -s /sbin/nologin asterisk
   ```

2. **Sudo Package**: Required for Mayday application to manage Asterisk files.
   ```bash
   apt-get install -y sudo
   ```

3. **Sudoers Configuration**: `/etc/sudoers.d/mayday`
   ```
   mayday ALL=(ALL) NOPASSWD: /bin/mv, /bin/cp, /bin/rm, /bin/chown, /usr/sbin/asterisk, /bin/systemctl
   ```

4. **Directory Ownership**: Asterisk config directories must be owned by `asterisk:asterisk`.
   ```bash
   chown -R asterisk:asterisk /etc/asterisk/mayday.d/
   ```

## Asterisk PJSIP Configuration
- **Auth**: This trunk uses password authentication for individual numbers.
- **Credentials**:
  - **Tollfree**: `800266600`
  - **Numbers/Passwords** (Format: Number / Password / SIM / IMSI / Shortcode):

| Number | Password | SIM | IMSI | Shortcode |
|--------|----------|-----|------|-----------|
| 326895850 | `BeZ^VtM@5850` | 8925610003268958050 | 641107006895850 | 5850 |
| 326895851 | `BeZ^VtM@5851` | 8925610003268958051 | 641107006895851 | 5851 |
| 326895852 | `BeZ^VtM@5852` | 8925610003268958052 | 641107006895852 | 5852 |
| 326895853 | `BeZ^VtM@5853` | 8925610003268958053 | 641107006895853 | 5853 |
| 326895854 | `BeZ^VtM@5854` | 8925610003268958054 | 641107006895854 | 5854 |

## Global Asterisk Configuration
To comply with MTN requirements and ensure a clean configuration on the HPE server:
1. **User Agent**: The global `user_agent` in `pjsip.conf` must be set to `BAZZ-BUTTO`.
2. **Configuration Cleanup**: Redundant configurations (e.g., `Simi_Trunk`) should be removed from `pjsip.conf` to avoid interference and maintain a clean environment.

## Dialplan & Routing
- Ensure inbound routes match the provided DID ranges.
- Set the correct Caller ID for outbound calls to match MTN requirements.

## Compatibility Checklist
- **Codecs**: G.711u/a, G.729.
- **DTMF**: RFC 4733/2833.
- **CID**: Ensure format (e.g. +256...) matches MTN spec.

## Peer Configuration Details
The following parameters are used for the static peer configuration on the leased line:

- **Trunk Type**: Peer
- **Host Name/IP**: `41.210.168.115/32`
- **SIP Server Domain**: `ucaas.mtn.co.ug`
- **Trunk Number**: `+256326895850`
- **DDI Range**: `+256326895850` to `+256326895909`
- **User Agent**: `BAZZ-BUTTO`

## Persistence (systemd-networkd)
To ensure the leased line configuration survives reboots, `systemd-networkd` is used.

1. **Configuration File**: `/etc/systemd/network/10-ens15f1.network`
   ```ini
   [Match]
   Name=ens15f1

   [Network]
   Address=212.88.128.35/31
   DNS=193.108.252.50
   DNS=193.108.252.51

   [Route]
   Gateway=212.88.128.34
   Table=100

   [RoutingPolicyRule]
   From=212.88.128.35
   Table=100
   ```

2. **Link Configuration**: `/etc/systemd/network/10-ens15f1.link`
   ```ini
   [Match]
   OriginalName=ens15f1

   [Link]
   MACAddressPolicy=persistent
   ```

2. **Activation**:
   ```bash
   systemctl enable systemd-networkd
   systemctl restart systemd-networkd
   ```

## Implementation Log (HPE Server - Jan 2026)
This section tracks the manual configuration steps performed to activate the leased line.

1. **Physical Link Confirmation**:
   - `ens15f1` was identified as the physical port.
   - Initial state was `DOWN`.
   - `ip link set ens15f1 up` established the `LOWER_UP` link.

2. **Initial (Incorrect) Configuration**:
   - Assigning `41.210.168.115/32` (trunk host endpoint) to the interface.
   - Result: No connectivity.

3. **Corrected Configuration (Jan 13, 2026)**:
   - Applied P2P IP: `ip addr add 212.88.128.35/31 dev ens15f1`
   - Configured Policy-Based Routing (Table 100):
     ```bash
     ip route add default via 212.88.128.34 dev ens15f1 table 100
     ip rule add from 212.88.128.35 lookup 100
     ```

3. **Persistent Configuration (Completed)**:
   - Configured `/etc/systemd/network/10-ens15f1.network` as detailed above.
   - Enabled and started `systemd-networkd`.

4. **Verification & Troubleshooting**:
   - `ip addr show ens15f1` confirms `212.88.128.35/31`.
   - **Static ARP Attempt**: Manually set `ip neigh replace 212.88.128.34 lladdr 88:69:3d:8c:cb:bc dev ens15f1 nud permanent` based on IPv6 discovery findings.
   - **Current Issue**: Pings to Gateway `212.88.128.34` and Trunk Host `41.210.168.115` still return `Destination Host Unreachable` or timeout, even with static ARP.
   - **DNS**: `nslookup` queries to MTN DNS (`193.108.252.50`) via the leased line are timing out.
   - **Constraint**: Layer 2 (Physical) is verified UP via IPv6 discovery of MAC `88:69:3d:8c:cb:bc`. However, Layer 3 traffic is blocked. This likely indicates a missing VLAN ID (tagging) or a provider-side access list.

## GUI Configuration
The trunk can be managed via the `client/src/components/Trunks.js` component in the Mayday web interface.

### Add Trunk Dialog Mappings
When using the **"+ Add Trunk"** dialog (`TrunkDialog.js`), use the following mapping:

| GUI Field | Value / Usage | Internal Mapping |
|-----------|---------------|------------------|
| **Name** | `MTN-Trunk` (Unique ID) | `name` |
| **Host** | `ucaas.mtn.co.ug` | `host` -> `fromDomain` |
| **Default User** | `326895850` | `defaultUser` -> `fromUser` |
| **Password** | `BeZ^VtM@5850` | `password` |
| **Active** | Toggle ON | `active` / `enabled` |

### Advanced Settings
After creation, click the **⚙️ Advanced Settings** (Manage Trunk) icon for the new trunk to configure specialized SIP parameters (`TrunkEdit.js`):
- **Transport**: `transport-udp`
- **Codecs**: `ulaw,alaw`
- **Type**: Set to **Peer** (Required for the leased line trunk type).
- **User Agent**: `BAZZ-BUTTO` (Required by MTN). This is set globally in `pjsip.conf` under the `[global]` section.
- **Inbound Context**: `from-voip-provider` (Default).

## Asterisk Configuration Maintenance (Jan 13, 2026)
1. **Global User Agent Update**:
   ```ini
   [global]
   type=global
   user_agent=BAZZ-BUTTO
   ```
2. **Simi_Trunk Removal**:
   - **Configuration File**: Verified and removed all `Simi_Trunk` related sections (`[Simi_Trunk_auth]`, `[Simi_Trunk_aor]`, `[Simi_Trunk]`, `[Simi_Trunk_reg]`, `[Simi_Trunk_identify]`) from `/etc/asterisk/pjsip.conf`.
   - **Database Tables**: Removed redundant entries from Realtime tables to ensure no interference:
     ```sql
     DELETE FROM ps_endpoints WHERE id LIKE "%Simi%";
     DELETE FROM ps_aors WHERE id LIKE "%Simi%";
     DELETE FROM ps_auths WHERE id LIKE "%Simi%";
     DELETE FROM ps_endpoint_identify WHERE id LIKE "%Simi%" OR endpoint LIKE "%Simi%";
     ```
   - **Verification**: Performed `pjsip reload` in Asterisk and verified via `pjsip show endpoints` that only desired endpoints (e.g., test extensions 1001, 1002) remain.

## Final Implementation Summary (Jan 13, 2026)
- **Interface**: `ens15f1` active with `212.88.128.35/31`.
- **Global User Agent**: Set to `BAZZ-BUTTO` in `/etc/asterisk/pjsip.conf`.
- **System Cleanliness**: All `Simi_Trunk` remnants removed from files and database.
- **Ready for GUI**: System is prepared for the user to add the `MTN-Trunk` via the Mayday web interface.

## SRTP Module Fix (Required for WebRTC Calls)
The HPE server's Asterisk was compiled without SRTP support. To enable WebRTC/DTLS-SRTP calls:

1. **Install libsrtp2-dev**:
   ```bash
   apt-get install -y libsrtp2-dev
   ```

2. **Recompile res_srtp module from Asterisk source**:
   ```bash
   cd /usr/src/asterisk
   ./configure --with-srtp
   make res
   cp res/res_srtp.so /usr/lib/asterisk/modules/
   ```

3. **Load the module**:
   ```bash
   asterisk -rx "module load res_srtp.so"
   ```

4. **Verify**:
   ```bash
   asterisk -rx "module show like srtp"
   # Should show: res_srtp.so    Secure RTP (SRTP)    Running    core
   ```

## DNS Resolution Fix
MTN DNS servers (`193.108.252.50`, `193.108.252.51`) are not directly reachable from the leased line. Added static hosts entry:

```bash
echo "41.210.168.115 ucaas.mtn.co.ug" >> /etc/hosts
```

## Trunk Activation Status (Jan 13, 2026)
- **MTN_TRUNK endpoint**: ✅ Available (RTT: ~42ms)
- **Contact**: `sip:ucaas.mtn.co.ug:5060`
- **Qualify**: 60 seconds
- **Identify**: Matches `41.210.168.115/32`
- **Outbound Auth**: `MTN_TRUNK_auth` (username: `326895850`)
- **Caller ID**: `+256326895850`

## MixMonitor Fix
Removed the `W` option from MixMonitor that was causing warnings. The `W` option requires a volume level parameter:
```sql
UPDATE voice_extensions SET appdata = REPLACE(appdata, ',bW', ',b') 
WHERE app="MixMonitor" AND appdata LIKE "%,bW%";
```

