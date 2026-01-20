import { useState } from "react";
import {
    Box,
    Typography,
    Paper,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    TextField,
    InputAdornment,
    Tabs,
    Tab,
    Chip,
    Divider,
    Card,
    CardContent,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TableContainer,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SearchIcon from "@mui/icons-material/Search";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import QueueIcon from "@mui/icons-material/Queue";
import PhoneIcon from "@mui/icons-material/Phone";
import SettingsIcon from "@mui/icons-material/Settings";
import GroupIcon from "@mui/icons-material/Group";
import ArticleIcon from "@mui/icons-material/Article";
import DashboardIcon from "@mui/icons-material/Dashboard";
import RouteIcon from "@mui/icons-material/AltRoute";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";

// ============================================
// FAQ DATA - Organized by Category
// ============================================
const faqData = {
    dashboard: [
        {
            question: "What metrics are shown on the Dashboard?",
            answer: `The Dashboard displays real-time call center metrics:
• **Waiting Calls**: Calls currently in queue waiting for an agent
• **Talking Calls**: Active calls with agents
• **Available Agents**: Agents ready to take calls
• **Answered Calls**: Total calls answered today
• **Abandoned Calls**: Calls where caller hung up before being answered
• **Average Wait Time**: Mean time callers spend in queue
• **Average Talk Time**: Mean call duration
• **Service Level**: Percentage of calls answered within target time`,
        },
        {
            question: "How often does the Dashboard update?",
            answer:
                "Dashboard metrics update in real-time via WebSocket connection. You will see a green indicator when connected. If disconnected, try refreshing the page.",
        },
        {
            question: "What is the Agent Availability section?",
            answer:
                "Shows all agents with their current status (Available, On Call, Paused, Offline). Click on an agent to view their details or monitor their call.",
        },
    ],
    queues: [
        {
            question: "What are Voice Queues?",
            answer:
                "Voice Queues are holding areas for incoming calls that are answered by a group of agents. When a call comes in, it is placed in the queue and distributed to available agents based on the configured strategy.",
        },
        {
            question: "What is an Agent Penalty and how does it work?",
            answer: `Agent Penalty determines the priority order for call distribution:
• **Penalty 0**: Highest priority - called first
• **Penalty 1**: Called when penalty 0 agents are busy
• **Penalty 2+**: Backup agents - called when lower penalty agents are unavailable

**Use Cases**:
• Tiered support: Junior agents (0) first, seniors (1+) as backup
• Skill-based routing: Specialists (0) for complex issues
• Overflow: Primary team (0), other departments (1+) during peak`,
            highlight: true,
        },
        {
            question: "What queue strategies are available?",
            answer: `**Ring All**: Rings all available agents simultaneously - fastest answer time

**Round Robin Memory**: Remembers the last agent who answered, starts from next agent - fair distribution

**Least Recent**: Rings the agent who has been idle the longest - balances workload

**Fewest Calls**: Rings the agent who has taken the fewest calls - balances call count

**Random**: Randomly selects an available agent - unpredictable but fair

**Ring In Order**: Rings agents in the order added to queue - predictable routing`,
        },
        {
            question: "How do I configure Queue Settings?",
            answer: `Navigate to **Voice > Voice Queues** and click on a queue:

**General Settings**:
• **Name**: Queue identifier (no spaces, used in dialplan)
• **Strategy**: Call distribution method
• **Timeout**: Seconds to ring each agent (recommended: 15-30)
• **Retry**: Seconds before retrying agents (recommended: 5)
• **Wrapup Time**: Post-call delay before next call (0-60 seconds)
• **Max Length**: Maximum callers allowed in queue (0 = unlimited)

**Music on Hold**: Audio played while callers wait
**Announcements**: Periodic messages to callers`,
        },
        {
            question: "How do I add/remove agents from a queue?",
            answer: `1. Go to **Voice > Voice Queues**
2. Click on the queue name
3. Click **Add Agent** button
4. Select agents from the Available list
5. Set individual **Penalty** values for each agent
6. Click **Commit Changes**

**Bulk Operations**:
• Use **>>** to add all available agents
• Use **<<** to remove all associated agents`,
        },
        {
            question: "What does Wrapup Time do?",
            answer:
                "Wrapup Time adds a delay (in seconds) after an agent completes a call before they receive another. This gives agents time for post-call tasks like notes, follow-ups, or system updates. Typical values: 5-30 seconds.",
        },
    ],
    agents: [
        {
            question: "How do I create a new agent?",
            answer: `1. Go to **Staff > Agents**
2. Click **Add Agent**
3. Fill required fields:
   • **Username**: Login name
   • **Extension**: Phone number (e.g., 1001)
   • **Password**: Initial password
4. Configure optional settings in tabs
5. Click **Save**`,
        },
        {
            question: "What are the Agent Edit tabs?",
            answer: `**Account Tab**: Basic info (name, email, extension, role)

**Voice Tab**: SIP/Telephony settings
• Transport (UDP/TCP/TLS)
• Codecs (audio formats)
• NAT settings
• DTMF mode

**Other Channels**: Email, SMS integrations

**Phonebar**: Desktop softphone settings
• Auto-answer configuration
• Ringtone selection
• Hotkeys

**Dialplan**: View extension routing rules

**Security**: Password management`,
        },
        {
            question: "What Voice settings should I configure?",
            answer: `**Essential Settings**:
• **Transport**: Usually UDP (default), use TLS for encryption
• **Context**: Set to "from-internal" for internal calls
• **NAT**: Enable if agent is behind router/firewall

**Codec Priority** (recommended order):
1. G.722 (HD audio)
2. ULAW (G.711 - standard quality)
3. ALAW (European standard)
4. GSM (low bandwidth)

**DTMF Mode**: RFC4733 recommended (works with most systems)`,
        },
        {
            question: "How do I reset an agent password?",
            answer: `1. Go to **Staff > Agents**
2. Click on the agent
3. Go to **Security** tab
4. Click **Reset Password**
5. Enter and confirm new password
6. Click **Submit**

The agent will need to use the new password on next login.`,
        },
        {
            question: "How do I pause/unpause an agent?",
            answer:
                "Go to **Voice > Realtime**. Find the agent and click the pause/play button. Paused agents remain logged in but will not receive queue calls. Use this for breaks, meetings, or training.",
        },
    ],
    trunks: [
        {
            question: "What are SIP Trunks?",
            answer:
                "SIP Trunks connect your phone system to external networks (PSTN or VoIP providers). They handle outgoing calls to external numbers and receive incoming calls from outside.",
        },
        {
            question: "How do I configure a SIP Trunk?",
            answer: `Go to **Tools > Trunks** and click **Add** or edit existing:

**Settings Tab**:
• **Name**: Trunk identifier
• **Type**: PJSIP (recommended)
• **Host**: Provider IP or domain
• **Username/Password**: Authentication credentials
• **Context**: Usually "from-trunk" for inbound

**Advanced Tab**:
• **Transport**: UDP/TCP/TLS
• **Codecs**: Match provider requirements
• **Registration**: Enable if provider requires
• **Qualify**: Enable for health monitoring`,
        },
        {
            question: "What trunk settings does my provider need?",
            answer: `Ask your SIP provider for:
• **SIP Server Address** (Host)
• **SIP Port** (usually 5060)
• **Username and Password**
• **Supported Codecs**
• **Whether registration is required**
• **Any specific caller ID requirements**
• **Outbound proxy (if any)**`,
        },
    ],
    routes: [
        {
            question: "What are Inbound Routes?",
            answer: `Inbound Routes control how incoming calls are handled based on:
• **DID Number**: The number that was called
• **Caller ID Pattern**: Who is calling
• **Time Conditions**: Business hours vs after-hours

Each route directs calls to a destination (queue, extension, IVR, voicemail).`,
        },
        {
            question: "How do I create an Inbound Route?",
            answer: `1. Go to **Voice > Inbound Routes**
2. Click **Add Route**
3. Configure:
   • **DID Pattern**: Number or pattern (e.g., 2567XXXXXXX)
   • **Caller ID Pattern**: Optional filter
   • **Destination**: Where to send calls
4. Set priority (lower = higher priority)
5. Save the route`,
        },
        {
            question: "What are Outbound Routes?",
            answer: `Outbound Routes determine how outgoing calls are placed:
• **Dial Pattern**: What numbers match this route
• **Trunk**: Which connection to use
• **Caller ID**: What number to display

Example: Route all numbers starting with "0" through the main trunk.`,
        },
        {
            question: "How do dial patterns work?",
            answer: `Dial patterns use special characters:
• **X**: Any digit 0-9
• **Z**: Any digit 1-9
• **N**: Any digit 2-9
• **[123]**: Match 1, 2, or 3
• **.**: Match one or more characters
• **|**: Prefix to strip

**Examples**:
• NXXNXXXXXX - US 10-digit
• 0XXXXXXXXX - Local with leading 0
• 00. - International (00 + any)`,
        },
    ],
    recordings: [
        {
            question: "Where are call recordings stored?",
            answer:
                "Recordings are stored on the server and accessible via **Voice > Recordings**. They can be played in-browser or downloaded as audio files.",
        },
        {
            question: "How do I enable call recording?",
            answer: `Recording can be enabled at multiple levels:

**Queue Level**: Edit queue settings and enable recording
**Route Level**: Enable in inbound route settings
**Extension Level**: Configure in agent voice settings

Recordings are saved in WAV or MP3 format based on system configuration.`,
        },
        {
            question: "How do I search recordings?",
            answer: `Go to **Voice > Recordings** and use filters:
• **Date Range**: Select start and end dates
• **Queue**: Filter by specific queue
• **Agent**: Filter by agent extension
• **Caller ID**: Search by caller number
• **Duration**: Filter by call length`,
        },
    ],
    monitoring: [
        {
            question: "What is Call Monitoring (ChanSpy)?",
            answer: `Call Monitoring allows supervisors to listen to live calls:

**Listen Mode** (Silent): Hear both parties, neither knows you are listening. Use for quality assurance.

**Whisper Mode**: Speak to agent only, caller cannot hear. Use for real-time coaching.

**Barge Mode**: Speak to both parties (3-way call). Use for escalation or assistance.`,
            highlight: true,
        },
        {
            question: "How do I monitor a call?",
            answer: `1. Go to **Voice > Call Monitoring**
2. View list of active calls
3. Click the monitoring icon on a call
4. Select mode (Listen/Whisper/Barge)
5. Your phone will ring - answer to start monitoring
6. Hang up to end monitoring session`,
        },
        {
            question: "What is the Realtime view?",
            answer: `**Voice > Realtime** shows live system status:

**Queue Status**: Calls waiting, agents available per queue
**Agent Status**: Each agent with current state
• Available (green)
• On Call (blue)
• Paused (yellow)
• Offline (gray)

**Live Calls**: All active calls with duration and status`,
        },
    ],
    ivr: [
        {
            question: "What is an IVR?",
            answer:
                "IVR (Interactive Voice Response) is an automated phone menu. Callers hear options and press digits to navigate (e.g., Press 1 for Sales, Press 2 for Support).",
        },
        {
            question: "How do I create an IVR?",
            answer: `1. Go to **IVR > IVR Projects**
2. Click **Create New**
3. Design your call flow:
   • Add **Play Audio** nodes for prompts
   • Add **Menu** nodes for options
   • Connect to destinations (queues, extensions)
4. Save and assign to an inbound route`,
        },
    ],
    integrations: [
        {
            question: "What integrations are available?",
            answer: `**Salesforce**: Sync contacts, log calls automatically
**WhatsApp**: Business messaging integration
**ODBC**: Connect to external databases for dynamic routing`,
        },
        {
            question: "How do I set up WhatsApp?",
            answer: `1. Go to **Integrations > WhatsApp**
2. Connect your WhatsApp Business account
3. Configure message templates
4. Assign agents to handle WhatsApp messages`,
        },
    ],
    settings: [
        {
            question: "What are Networks?",
            answer:
                "**Settings > Networks** configures network interfaces and SIP binding addresses. Important for multi-homed servers or specific network routing requirements.",
        },
        {
            question: "How do I manage my license?",
            answer: `Go to **Settings > License** to:
• View current license status
• See available features
• Check concurrent user limit
• View license expiration date
• Request license updates`,
        },
        {
            question: "What are Time Intervals?",
            answer: `**Tools > Intervals** defines business hours and schedules:
• Create named intervals (e.g., "Business Hours")
• Set days and times
• Use in inbound routes for time-based routing
• Route calls differently after hours`,
        },
    ],
};

// ============================================
// KNOWLEDGE BASE ARTICLES
// ============================================
const knowledgeArticles = [
    {
        title: "Complete Queue Management Guide",
        category: "Queues",
        description: "Everything you need to know about creating and managing voice queues",
        content: `## Creating a Queue

1. Navigate to **Voice > Voice Queues**
2. Click **Add Queue**
3. Enter queue details:
   - Name (no spaces)
   - Strategy
   - Timeout and retry values

## Queue Parameters Explained

| Parameter | Description | Recommended |
|-----------|-------------|-------------|
| Strategy | How calls are distributed | Round Robin Memory |
| Timeout | Ring time per agent | 15-30 seconds |
| Retry | Wait before retrying | 5 seconds |
| Wrapup Time | Post-call delay | 10-30 seconds |
| Max Length | Queue capacity | 0 (unlimited) |
| Music Class | Hold music | default |

## Agent Penalties

Penalties create call priority tiers:
- **Penalty 0**: Primary agents (first to receive calls)
- **Penalty 1**: Secondary agents (when primary busy)
- **Penalty 2+**: Overflow agents (emergency backup)

## Best Practices

1. **Balance workload**: Use Round Robin or Least Recent strategy
2. **Set realistic timeouts**: 15-30 seconds prevents caller frustration
3. **Use wrapup time**: Give agents time for post-call work
4. **Monitor performance**: Check Dashboard for wait times and abandonment`,
    },
    {
        title: "Agent Configuration Reference",
        category: "Agents",
        description: "Complete reference for all agent settings and configuration options",
        content: `## Account Settings

| Field | Description |
|-------|-------------|
| Username | Login identifier |
| Extension | Phone number (1000-9999) |
| Email | Contact email |
| Role | admin, manager, or agent |

## Voice/SIP Settings

| Setting | Options | Notes |
|---------|---------|-------|
| Transport | UDP, TCP, TLS | UDP is default |
| Context | from-internal | For internal routing |
| NAT | yes, no, force_rport | Enable if behind NAT |
| DTMF Mode | rfc4733, inband, info | rfc4733 recommended |

## Codec Priority

Best to worst quality:
1. **G.722** - HD voice (16kHz)
2. **ULAW** - Standard (North America)
3. **ALAW** - Standard (Europe/International)
4. **GSM** - Low bandwidth

## Phonebar Settings

| Setting | Description |
|---------|-------------|
| Auto Answer | Answer calls automatically |
| Ringtone | Sound for incoming calls |
| Hotkeys | Keyboard shortcuts |

## Security

- Passwords must be 8+ characters
- Include numbers and symbols
- Change every 90 days (recommended)`,
    },
    {
        title: "SIP Trunk Configuration",
        category: "Trunks",
        description: "How to set up and troubleshoot SIP trunk connections",
        content: `## Required Information

Get from your SIP provider:
- SIP Server/Host address
- Port (usually 5060 or 5061 for TLS)
- Username and Password
- Authentication method
- Supported codecs

## Basic Configuration

1. **Name**: Descriptive identifier
2. **Host**: Provider SIP server
3. **Username**: Your account ID
4. **Password**: Account password
5. **Context**: from-trunk (for inbound)

## Registration

Enable registration if your provider requires it. This sends periodic "heartbeat" messages to keep the connection active.

## Common Issues

| Problem | Solution |
|---------|----------|
| No outbound calls | Check trunk credentials and host |
| No inbound calls | Verify registration and context |
| One-way audio | Check NAT settings and port forwarding |
| Poor quality | Check codecs and network bandwidth |

## Testing

After setup:
1. Check Tools > Trunks for status
2. Make test outbound call
3. Make test inbound call
4. Verify audio both directions`,
    },
    {
        title: "Inbound and Outbound Routing",
        category: "Routes",
        description: "Configure how calls enter and leave your system",
        content: `## Inbound Routes

Direct incoming calls based on:
- **DID**: The number that was called
- **Caller ID**: Who is calling
- **Time**: Business hours conditions

### Priority

Lower numbers = higher priority. If multiple routes match, lowest priority wins.

### Destinations

- Queue
- Extension
- IVR
- Voicemail
- External Number

## Outbound Routes

Control how outgoing calls are placed.

### Dial Patterns

| Pattern | Matches | Example |
|---------|---------|---------|
| NXXNXXXXXX | 10-digit US | 2125551234 |
| 1NXXNXXXXXX | 11-digit US | 12125551234 |
| 0XXXXXXXXX | Local | 0771234567 |
| 00. | International | 0044... |

### Pattern Syntax

- X = any digit (0-9)
- N = any digit (2-9)
- Z = any digit (1-9)
- [abc] = a, b, or c
- . = one or more of any

## Route Order

Routes are evaluated top to bottom. More specific patterns should be higher priority.`,
    },
    {
        title: "Call Monitoring for Supervisors",
        category: "Management",
        description: "Guide to monitoring, coaching, and managing live calls",
        content: `## Monitoring Modes

### Listen (Silent)
- You hear both parties
- No one knows you are listening
- Best for: Quality assurance, training review

### Whisper
- You speak to agent only
- Caller cannot hear you
- Best for: Real-time coaching, providing info

### Barge
- You speak to both parties
- Creates 3-way call
- Best for: Escalation, customer intervention

## How to Monitor

1. Go to **Voice > Call Monitoring**
2. See list of active calls
3. Click monitor icon on target call
4. Select mode
5. Your phone rings - answer it
6. Hang up when done

## Best Practices

- Use Listen mode for routine QA
- Use Whisper sparingly to avoid agent distraction
- Use Barge only for escalations
- Document coaching sessions
- Review recordings for training`,
    },
    {
        title: "Dashboard Metrics Explained",
        category: "Reporting",
        description: "Understanding real-time and historical call center metrics",
        content: `## Real-Time Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| Waiting Calls | Calls in queue | < 5 |
| Talking Calls | Active conversations | - |
| Available Agents | Ready for calls | > Waiting |
| Abandoned Calls | Caller hung up | < 5% |
| Avg Wait Time | Queue wait | < 30 sec |

## Service Level

Percentage of calls answered within target time (e.g., 80% in 20 seconds).

Formula: (Calls answered in X seconds / Total calls) x 100

## Agent States

| State | Color | Meaning |
|-------|-------|---------|
| Available | Green | Ready for calls |
| On Call | Blue | Currently talking |
| Paused | Yellow | Temporarily unavailable |
| Offline | Gray | Logged out |

## Improving Metrics

**High Abandonment**:
- Add more agents
- Reduce wait times
- Improve announcements

**Long Wait Times**:
- Adjust strategies
- Lower penalties on backups
- Review agent availability

**Low Service Level**:
- Monitor peak hours
- Schedule appropriately
- Consider callback options`,
    },
];

// Categories for FAQ navigation
const faqCategories = [
    { key: "dashboard", label: "Dashboard", icon: <DashboardIcon /> },
    { key: "queues", label: "Queues", icon: <QueueIcon /> },
    { key: "agents", label: "Agents", icon: <GroupIcon /> },
    { key: "trunks", label: "Trunks", icon: <PhoneIcon /> },
    { key: "routes", label: "Routes", icon: <RouteIcon /> },
    { key: "recordings", label: "Recordings", icon: <RecordVoiceOverIcon /> },
    { key: "monitoring", label: "Monitoring", icon: <RecordVoiceOverIcon /> },
    { key: "ivr", label: "IVR", icon: <PhoneIcon /> },
    { key: "integrations", label: "Integrations", icon: <SettingsIcon /> },
    { key: "settings", label: "Settings", icon: <SettingsIcon /> },
];

const TabPanel = ({ children, value, index }) => (
    <div hidden={value !== index} style={{ paddingTop: 16 }}>
        {value === index && children}
    </div>
);

const WikiFAQ = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [tabValue, setTabValue] = useState(0);
    const [expandedArticle, setExpandedArticle] = useState(null);

    // Filter FAQs based on search
    const filterFAQs = (faqs) => {
        if (!searchTerm) return faqs;
        return faqs.filter(
            (faq) =>
                faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    // Filter articles based on search
    const filteredArticles = knowledgeArticles.filter(
        (article) =>
            !searchTerm ||
            article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            article.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            article.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Count total matching FAQs
    const totalFAQs = faqCategories.reduce(
        (sum, cat) => sum + filterFAQs(faqData[cat.key] || []).length,
        0
    );

    return (
        <Box sx={{ p: 3 }}>
            <Paper elevation={3} sx={{ p: 4, maxWidth: 1400, mx: "auto" }}>
                {/* Header */}
                <Box sx={{ mb: 4 }}>
                    <Typography
                        sx={{
                            color: "primary.main",
                            fontWeight: "bold",
                            fontSize: "2rem",
                            fontFamily: "fantasy",
                            letterSpacing: "0.1em",
                            textShadow: "2px 2px 4px rgba(0, 0, 0, 0.1)",
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                        }}
                        variant="h4"
                        gutterBottom
                    >
                        <HelpOutlineIcon sx={{ fontSize: 40 }} />
                        Mayday Help Center
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Comprehensive documentation for administrators. Find answers, learn
                        configurations, and master Mayday CRM.
                    </Typography>
                </Box>

                {/* Search */}
                <TextField
                    fullWidth
                    placeholder="Search FAQs and knowledge base..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                    }}
                    sx={{ mb: 3 }}
                />

                {searchTerm && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Found {totalFAQs} FAQs and {filteredArticles.length} articles
                        matching &quot;{searchTerm}&quot;
                    </Typography>
                )}

                {/* Tabs */}
                <Tabs
                    value={tabValue}
                    onChange={(e, newValue) => setTabValue(newValue)}
                    sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}
                >
                    <Tab
                        label={`FAQs (${totalFAQs})`}
                        icon={<HelpOutlineIcon />}
                        iconPosition="start"
                    />
                    <Tab
                        label={`Guides (${filteredArticles.length})`}
                        icon={<ArticleIcon />}
                        iconPosition="start"
                    />
                </Tabs>

                {/* FAQs Tab */}
                <TabPanel value={tabValue} index={0}>
                    {/* Category Navigation */}
                    <Box sx={{ display: "flex", gap: 1, mb: 3, flexWrap: "wrap" }}>
                        {faqCategories.map((cat) => {
                            const count = filterFAQs(faqData[cat.key] || []).length;
                            if (searchTerm && count === 0) return null;
                            return (
                                <Chip
                                    key={cat.key}
                                    icon={cat.icon}
                                    label={`${cat.label} (${count})`}
                                    onClick={() => {
                                        document
                                            .getElementById(`category-${cat.key}`)
                                            ?.scrollIntoView({ behavior: "smooth" });
                                    }}
                                    sx={{ cursor: "pointer" }}
                                    variant="outlined"
                                />
                            );
                        })}
                    </Box>

                    {/* FAQ Sections */}
                    {faqCategories.map((cat) => {
                        const faqs = filterFAQs(faqData[cat.key] || []);
                        if (faqs.length === 0) return null;

                        return (
                            <Box key={cat.key} id={`category-${cat.key}`} sx={{ mb: 4 }}>
                                <Typography
                                    variant="h6"
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1,
                                        mb: 2,
                                        color: "primary.main",
                                    }}
                                >
                                    {cat.icon}
                                    {cat.label}
                                </Typography>

                                {faqs.map((faq, index) => (
                                    <Accordion
                                        key={index}
                                        sx={{
                                            border: faq.highlight ? "2px solid" : "1px solid",
                                            borderColor: faq.highlight ? "primary.main" : "divider",
                                            mb: 1,
                                            "&:before": { display: "none" },
                                        }}
                                    >
                                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                            <Typography fontWeight={faq.highlight ? 600 : 400}>
                                                {faq.question}
                                                {faq.highlight && (
                                                    <Chip
                                                        label="Important"
                                                        size="small"
                                                        color="primary"
                                                        sx={{ ml: 1 }}
                                                    />
                                                )}
                                            </Typography>
                                        </AccordionSummary>
                                        <AccordionDetails>
                                            <Typography
                                                component="div"
                                                sx={{
                                                    whiteSpace: "pre-wrap",
                                                    lineHeight: 1.8,
                                                    "& strong": { fontWeight: 600, color: "primary.main" },
                                                }}
                                            >
                                                {faq.answer}
                                            </Typography>
                                        </AccordionDetails>
                                    </Accordion>
                                ))}
                            </Box>
                        );
                    })}
                </TabPanel>

                {/* Knowledge Base Tab */}
                <TabPanel value={tabValue} index={1}>
                    {filteredArticles.length === 0 ? (
                        <Typography
                            color="text.secondary"
                            sx={{ textAlign: "center", py: 4 }}
                        >
                            No articles found matching your search.
                        </Typography>
                    ) : (
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            {filteredArticles.map((article, index) => (
                                <Card
                                    key={index}
                                    variant="outlined"
                                    sx={{
                                        cursor: "pointer",
                                        transition: "all 0.2s",
                                        "&:hover": { boxShadow: 2 },
                                    }}
                                    onClick={() =>
                                        setExpandedArticle(expandedArticle === index ? null : index)
                                    }
                                >
                                    <CardContent>
                                        <Box
                                            sx={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "flex-start",
                                            }}
                                        >
                                            <Box>
                                                <Chip
                                                    label={article.category}
                                                    size="small"
                                                    color="primary"
                                                    variant="outlined"
                                                    sx={{ mb: 1 }}
                                                />
                                                <Typography variant="h6">{article.title}</Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {article.description}
                                                </Typography>
                                            </Box>
                                            <ExpandMoreIcon
                                                sx={{
                                                    transform:
                                                        expandedArticle === index
                                                            ? "rotate(180deg)"
                                                            : "none",
                                                    transition: "transform 0.2s",
                                                }}
                                            />
                                        </Box>

                                        {expandedArticle === index && (
                                            <Box sx={{ mt: 3, pt: 2, borderTop: "1px solid #eee" }}>
                                                <Typography
                                                    component="div"
                                                    sx={{
                                                        whiteSpace: "pre-wrap",
                                                        lineHeight: 1.8,
                                                        "& h2, & h3": {
                                                            color: "primary.main",
                                                            fontWeight: 600,
                                                            mt: 2,
                                                            mb: 1,
                                                        },
                                                        "& strong": { fontWeight: 600 },
                                                        "& code": {
                                                            bgcolor: "grey.100",
                                                            px: 0.5,
                                                            borderRadius: 1,
                                                        },
                                                    }}
                                                >
                                                    {article.content}
                                                </Typography>
                                            </Box>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </Box>
                    )}
                </TabPanel>

                {/* Footer */}
                <Divider sx={{ mt: 4, mb: 2 }} />
                <Typography variant="body2" color="text.secondary" align="center">
                    Need more help? Contact your system administrator or check the full
                    documentation.
                </Typography>
            </Paper>
        </Box>
    );
};

export default WikiFAQ;
